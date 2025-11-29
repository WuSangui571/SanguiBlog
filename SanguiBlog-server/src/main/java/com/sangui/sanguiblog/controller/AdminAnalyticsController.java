package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.service.AnalyticsService;
import com.sangui.sanguiblog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW')")
    public ApiResponse<AdminAnalyticsSummaryDto> summary(
            @RequestParam(value = "days", defaultValue = "14") int days,
            @RequestParam(value = "top", defaultValue = "5") int top,
            @RequestParam(value = "recent", defaultValue = "30") int recent) {
        return ApiResponse.ok(analyticsService.loadAdminSummary(days, top, recent));
    }

    @DeleteMapping("/page-views/me")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')")
    public ApiResponse<Long> deleteMyPageViews(@AuthenticationPrincipal UserPrincipal principal) {
        Long count = analyticsService.deletePageViewsByUser(principal.getId());
        return ApiResponse.ok(count);
    }

    @GetMapping("/page-views")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW')")
    public ApiResponse<PageResponse<AdminAnalyticsSummaryDto.RecentVisit>> visitLogs(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "days", required = false, defaultValue = "7") int days,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        LocalDate effectiveStart = startDate;
        LocalDate effectiveEnd = endDate;
        if (effectiveStart == null && effectiveEnd == null) {
            effectiveEnd = LocalDate.now();
            effectiveStart = effectiveEnd.minusDays(Math.max(days - 1L, 0));
        }
        return ApiResponse.ok(analyticsService.loadVisitLogs(effectiveStart, effectiveEnd, page, size));
    }
}
