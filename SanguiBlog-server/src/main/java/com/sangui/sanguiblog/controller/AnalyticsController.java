package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/page-view")
    public ApiResponse<Void> record(@RequestBody PageViewRequest request,
                                    HttpServletRequest httpServletRequest,
                                    @AuthenticationPrincipal UserPrincipal principal) {
        String ip = httpServletRequest.getRemoteAddr();
        String userAgent = httpServletRequest.getHeader("User-Agent");
        Long userId = principal != null ? principal.getId() : null;
        try {
            analyticsService.recordPageView(request, ip, userAgent, userId);
        } catch (Exception ex) {
            log.warn("记录页面访问失败，已忽略。pageTitle={}, postId={}", request != null ? request.getPageTitle() : null,
                    request != null ? request.getPostId() : null, ex);
        }
        return ApiResponse.ok();
    }
}
