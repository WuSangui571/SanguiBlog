package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/site")
@RequiredArgsConstructor
public class SiteController {

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
        System.out.println("Received broadcast update request: " + request);
        siteService.updateBroadcast(
                request.getContent(),
                request.isActive(),
                request.getStyle(),
                principal != null ? principal.getId() : null);
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
