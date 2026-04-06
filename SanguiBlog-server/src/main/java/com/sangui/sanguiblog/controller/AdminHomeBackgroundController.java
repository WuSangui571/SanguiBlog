package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.HomeBackgroundAdminDto;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.HomeBackgroundAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/home-backgrounds")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_SYSTEM_CLEAN_STORAGE')")
public class AdminHomeBackgroundController {

    private final HomeBackgroundAdminService homeBackgroundAdminService;

    @GetMapping
    public ApiResponse<List<HomeBackgroundAdminDto>> list() {
        return ApiResponse.ok(homeBackgroundAdminService.list());
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ApiResponse<HomeBackgroundAdminDto> upload(@RequestPart("file") MultipartFile file,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(homeBackgroundAdminService.upload(file, principal != null ? principal.getId() : null));
    }

    @PutMapping("/{id}/current")
    public ApiResponse<HomeBackgroundAdminDto> setCurrent(@PathVariable Long id) {
        return ApiResponse.ok(homeBackgroundAdminService.setCurrent(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        homeBackgroundAdminService.delete(id);
        return ApiResponse.ok();
    }
}
