package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.SystemMonitorDto;
import com.sangui.sanguiblog.service.SystemMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system-monitor")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminSystemMonitorController {

    private final SystemMonitorService systemMonitorService;

    @GetMapping
    public ApiResponse<SystemMonitorDto> current() {
        return ApiResponse.ok(systemMonitorService.current());
    }
}
