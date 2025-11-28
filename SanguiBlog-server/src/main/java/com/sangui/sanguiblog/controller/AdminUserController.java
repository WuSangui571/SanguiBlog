package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AdminUserDto;
import com.sangui.sanguiblog.model.dto.AdminUserRequest;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.RoleOptionDto;
import com.sangui.sanguiblog.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_USER_MANAGE')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ApiResponse<PageResponse<AdminUserDto>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(adminUserService.list(keyword, role, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminUserDto> get(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.get(id));
    }

    @PostMapping
    public ApiResponse<AdminUserDto> create(@Valid @RequestBody AdminUserRequest request) {
        return ApiResponse.ok(adminUserService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<AdminUserDto> update(@PathVariable Long id, @Valid @RequestBody AdminUserRequest request) {
        return ApiResponse.ok(adminUserService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        adminUserService.delete(id);
        return ApiResponse.ok();
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleOptionDto>> roles() {
        return ApiResponse.ok(adminUserService.listRoles());
    }
}
