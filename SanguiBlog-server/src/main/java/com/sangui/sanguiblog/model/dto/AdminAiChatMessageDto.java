package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminAiChatMessageDto {
    private Long id;
    private Long sessionId;
    private String role;
    private String content;
    private String modelName;
    private Instant createdAt;
}
