package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiAssistantAdminSettingsDto {
    private boolean enabled;
}
