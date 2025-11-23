package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public ApiResponse<Void> updateBroadcast(
            @org.springframework.web.bind.annotation.RequestBody BroadcastRequest request) {
        System.out.println("Received broadcast update request: " + request);
        siteService.updateBroadcast(request.getContent(), request.isActive());
        return ApiResponse.ok();
    }

    @lombok.Data
    @lombok.ToString
    public static class BroadcastRequest {
        private String content;
        private boolean active;
    }
}
