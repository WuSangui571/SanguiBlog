package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminRegistrationInviteCreateRequest;
import com.sangui.sanguiblog.model.dto.AdminRegistrationInviteDto;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.RegistrationInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/registration-invites")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminRegistrationInviteController {

    private final RegistrationInviteService registrationInviteService;

    @GetMapping("/latest")
    public ApiResponse<AdminRegistrationInviteDto> latestInvite() {
        return ApiResponse.ok(registrationInviteService.getLatestInvite());
    }

    @PostMapping
    public ApiResponse<AdminRegistrationInviteDto> createInvite(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody(required = false) AdminRegistrationInviteCreateRequest request
    ) {
        String durationCode = request != null ? request.getDurationCode() : null;
        return ApiResponse.ok(registrationInviteService.createInvite(userPrincipal.getId(), durationCode));
    }
}
