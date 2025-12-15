package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AnalyticsService;
import com.sangui.sanguiblog.util.IpUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/page-view")
    public ApiResponse<Void> record(@RequestBody PageViewRequest request,
                                    HttpServletRequest httpServletRequest,
                                    @AuthenticationPrincipal UserPrincipal principal) {
        String ip = IpUtils.resolveIp(httpServletRequest);
        if (request != null && StringUtils.hasText(request.getClientIp())) {
            String candidate = IpUtils.normalizeIp(request.getClientIp());
            if (StringUtils.hasText(candidate)
                    && !IpUtils.isLoopback(candidate)
                    && IpUtils.isLoopback(ip)) {
                ip = candidate;
            }
        }
        String userAgent = httpServletRequest.getHeader("User-Agent");
        Long userId = principal != null ? principal.getId() : null;
        analyticsService.recordPageView(request, ip, userAgent, userId);
        return ApiResponse.ok();
    }

    @GetMapping("/client-ip")
    public ApiResponse<Map<String, String>> clientIp(HttpServletRequest httpServletRequest) {
        String ip = IpUtils.normalizeIp(IpUtils.resolveIp(httpServletRequest));
        return ApiResponse.ok(Map.of("ip", ip));
    }
}
