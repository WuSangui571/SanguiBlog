package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.service.AnalyticsService;
import com.sangui.sanguiblog.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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

    @GetMapping("/page-views")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW')")
    public ApiResponse<PageResponse<AdminAnalyticsSummaryDto.RecentVisit>> pageViews(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "ip", required = false) String ip,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "loggedIn", required = false) Boolean loggedIn,
            @RequestParam(value = "postId", required = false) Long postId,
            @RequestParam(value = "pageType", required = false) String pageType,
            @RequestParam(value = "excludeSystemPages", required = false) Boolean excludeSystemPages,
            @RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        LocalDateTime startAt = start != null ? start.atStartOfDay() : null;
        LocalDateTime endExclusive = end != null ? end.plusDays(1).atStartOfDay() : null;
        AnalyticsService.AdminPageViewQuery query = new AnalyticsService.AdminPageViewQuery(
                ip, keyword, loggedIn, postId, startAt, endExclusive, excludeSystemPages, pageType
        );
        return ApiResponse.ok(analyticsService.loadPageViews(page, size, query));
    }

    @DeleteMapping("/page-views/me")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')")
    public ApiResponse<Long> deleteMyPageViews(@AuthenticationPrincipal UserPrincipal principal) {
        Long count = analyticsService.deletePageViewsByUser(principal.getId());
        return ApiResponse.ok(count);
    }

    @DeleteMapping("/page-views/{id}")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')")
    public ApiResponse<Long> deletePageView(@PathVariable("id") Long id) {
        return ApiResponse.ok(analyticsService.deletePageViewById(id));
    }

    @DeleteMapping("/page-views")
    @PreAuthorize("hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')")
    public ApiResponse<Long> deletePageViews(@RequestParam("ids") List<Long> ids) {
        return ApiResponse.ok(analyticsService.deletePageViews(ids));
    }
}
