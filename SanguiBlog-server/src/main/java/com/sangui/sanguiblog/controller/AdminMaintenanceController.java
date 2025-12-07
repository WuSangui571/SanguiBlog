package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.DeleteEmptyFoldersRequest;
import com.sangui.sanguiblog.model.dto.DeleteEmptyFoldersResponse;
import com.sangui.sanguiblog.model.dto.DeleteUnusedAssetsRequest;
import com.sangui.sanguiblog.model.dto.DeleteUnusedAssetsResponse;
import com.sangui.sanguiblog.model.dto.EmptyFolderScanResponse;
import com.sangui.sanguiblog.model.dto.UnusedAssetScanResponse;
import com.sangui.sanguiblog.service.MaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/maintenance")
@RequiredArgsConstructor
public class AdminMaintenanceController {

    private final MaintenanceService maintenanceService;

    @GetMapping("/unused-assets")
    @PreAuthorize("hasAuthority('PERM_SYSTEM_CLEAN_STORAGE')")
    public ApiResponse<UnusedAssetScanResponse> scanUnusedAssets() {
        return ApiResponse.ok(maintenanceService.scanUnusedAssets());
    }

    @GetMapping("/empty-folders")
    @PreAuthorize("hasAuthority('PERM_SYSTEM_CLEAN_STORAGE')")
    public ApiResponse<EmptyFolderScanResponse> scanEmptyFolders() {
        return ApiResponse.ok(maintenanceService.scanEmptyFolders());
    }

    @PostMapping("/unused-assets/delete")
    @PreAuthorize("hasAuthority('PERM_SYSTEM_CLEAN_STORAGE')")
    public ApiResponse<DeleteUnusedAssetsResponse> deleteUnusedAssets(@Valid @RequestBody DeleteUnusedAssetsRequest request) {
        return ApiResponse.ok(maintenanceService.deleteUnusedAssets(request));
    }

    @PostMapping("/empty-folders/delete")
    @PreAuthorize("hasAuthority('PERM_SYSTEM_CLEAN_STORAGE')")
    public ApiResponse<DeleteEmptyFoldersResponse> deleteEmptyFolders(@Valid @RequestBody DeleteEmptyFoldersRequest request) {
        return ApiResponse.ok(maintenanceService.deleteEmptyFolders(request));
    }
}
