package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SiteWechatQrDto;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.SiteWechatQrService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/site/wechat-qr")
@RequiredArgsConstructor
public class SiteWechatQrController {

    private final SiteWechatQrService siteWechatQrService;

    @PostMapping(consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<SiteWechatQrDto> upload(@RequestParam("file") MultipartFile file,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(siteWechatQrService.upload(file, principal != null ? principal.getId() : null));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<SiteWechatQrDto> delete(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(siteWechatQrService.delete(principal != null ? principal.getId() : null));
    }
}
