package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.service.AnalyticsService;
import com.sangui.sanguiblog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ApiResponse<AdminAnalyticsSummaryDto> summary(
            @RequestParam(value = "days", defaultValue = "14") int days,
            @RequestParam(value = "top", defaultValue = "5") int top,
            @RequestParam(value = "recent", defaultValue = "30") int recent) {
        return ApiResponse.ok(analyticsService.loadAdminSummary(days, top, recent));
    }

    @DeleteMapping("/page-views/me")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Long> deleteMyPageViews(@AuthenticationPrincipal UserPrincipal principal) {
        Long count = analyticsService.deletePageViewsByUser(principal.getId());
        return ApiResponse.ok(count);
    }
}
