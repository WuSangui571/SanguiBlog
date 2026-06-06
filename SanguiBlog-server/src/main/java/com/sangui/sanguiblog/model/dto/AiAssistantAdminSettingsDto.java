package com.sangui.sanguiblog.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiAssistantAdminSettingsDto {
    private boolean aiChatAdminEnabled;
    private boolean aiRagAdminEnabled;
    private boolean aiChatCapable;
    private boolean aiRagCapable;
    private boolean aiChatEffectiveEnabled;
    private boolean aiRagEffectiveEnabled;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String aiChatDisabledReason;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String aiRagDisabledReason;
    private boolean enabled;
}
