package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AboutDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SaveAboutRequest;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AboutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AboutController {

    private final AboutService aboutService;

    @GetMapping("/about")
    public ApiResponse<AboutDto> getAbout() {
        return ApiResponse.ok(aboutService.getAbout().orElse(null));
    }

    @GetMapping("/admin/about")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<AboutDto> adminGetAbout() {
        return ApiResponse.ok(aboutService.getAbout().orElse(null));
    }

    @PutMapping("/admin/about")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<AboutDto> saveAbout(@Valid @RequestBody SaveAboutRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = principal != null ? principal.getId() : null;
        return ApiResponse.ok(aboutService.saveOrUpdate(request.getContentMd(), userId));
    }
}
