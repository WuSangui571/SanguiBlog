package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class AiAssistantAdminSettingsUpdateRequest {
    private Boolean enabled;
    private Boolean aiChatAdminEnabled;
    private Boolean aiRagAdminEnabled;
}
