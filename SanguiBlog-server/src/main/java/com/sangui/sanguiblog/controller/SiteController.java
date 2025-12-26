package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/site")
@RequiredArgsConstructor
public class SiteController {

    private static final Logger log = LoggerFactory.getLogger(SiteController.class);

    private final SiteService siteService;

    @GetMapping("/meta")
    public ApiResponse<SiteMetaDto> meta() {
        return ApiResponse.ok(siteService.meta());
    }

    @org.springframework.web.bind.annotation.PostMapping("/broadcast")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> updateBroadcast(
            @org.springframework.web.bind.annotation.RequestBody BroadcastRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long uid = principal != null ? principal.getId() : null;
        int contentLen = request != null && request.getContent() != null ? request.getContent().length() : 0;
        String style = request != null ? request.getStyle() : null;
        boolean active = request != null && request.isActive();
        // 日志不输出完整 content，避免污染/泄露（仅记录长度与状态）
        log.info("收到广播更新请求: active={}, style={}, contentLen={}, userId={}", active, style, contentLen, uid);
        siteService.updateBroadcast(
                request.getContent(),
                request.isActive(),
                request.getStyle(),
                uid);
        return ApiResponse.ok();
    }

    @lombok.Data
    @lombok.ToString
    public static class BroadcastRequest {
        private String content;
        private boolean active;
        private String style;
    }
}
