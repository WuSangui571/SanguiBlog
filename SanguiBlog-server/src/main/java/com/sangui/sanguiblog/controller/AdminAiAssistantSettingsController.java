package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsDto;
import com.sangui.sanguiblog.model.dto.AiAssistantAdminSettingsUpdateRequest;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.service.ai.AiAssistantSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai-assistant-settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAiAssistantSettingsController {

    private final AiAssistantSettingService aiAssistantSettingService;

    @GetMapping
    public ApiResponse<AiAssistantAdminSettingsDto> getSettings() {
        return ApiResponse.ok(aiAssistantSettingService.adminSettings());
    }

    @PutMapping
    public ApiResponse<AiAssistantAdminSettingsDto> updateSettings(
            @RequestBody AiAssistantAdminSettingsUpdateRequest request
    ) {
        return ApiResponse.ok(aiAssistantSettingService.updateSettings(request));
    }
}
