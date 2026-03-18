package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminAiChatSessionDetailDto {
    private AdminAiChatSessionDto session;
    private List<AdminAiChatMessageDto> messages;
}
