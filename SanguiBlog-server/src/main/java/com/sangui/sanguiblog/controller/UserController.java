package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.UpdateProfileRequest;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UserProfileDto> updateProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(authService.updateProfile(userPrincipal.getId(), request));
    }
}
