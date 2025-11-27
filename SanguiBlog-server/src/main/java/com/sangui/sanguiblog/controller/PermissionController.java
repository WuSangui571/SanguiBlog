package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<String>> myPermissions(@AuthenticationPrincipal UserPrincipal principal) {
        List<String> codes = permissionService.permissionsForRole(principal.getRoleCode());
        return ApiResponse.ok(codes);
    }
}
