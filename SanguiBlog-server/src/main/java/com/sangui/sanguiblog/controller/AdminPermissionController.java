package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PermissionMatrixDto;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;

import java.util.List;

@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
public class AdminPermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<PermissionMatrixDto> matrix() {
        return ApiResponse.ok(permissionService.buildMatrix());
    }

    @PutMapping("/{roleCode}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> updateRolePermissions(@PathVariable String roleCode,
                                                   @RequestBody UpdateRolePermissionRequest request) {
        if (request.getPermissions() == null) {
            throw new IllegalArgumentException("请至少选择一个权限");
        }
        permissionService.updateRolePermissions(roleCode, request.getPermissions());
        return ApiResponse.ok();
    }

    @Data
    public static class UpdateRolePermissionRequest {
        private List<String> permissions;
    }
}
