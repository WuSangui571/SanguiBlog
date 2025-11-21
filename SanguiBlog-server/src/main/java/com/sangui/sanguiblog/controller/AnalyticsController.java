package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/page-view")
    public ApiResponse<Void> record(@RequestBody PageViewRequest request,
                                    HttpServletRequest httpServletRequest,
                                    @AuthenticationPrincipal UserPrincipal principal) {
        String ip = httpServletRequest.getRemoteAddr();
        String userAgent = httpServletRequest.getHeader("User-Agent");
        Long userId = principal != null ? principal.getId() : null;
        analyticsService.recordPageView(request, ip, userAgent, userId);
        return ApiResponse.ok();
    }
}
