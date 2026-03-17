package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AiChatSessionDto {
    private Long id;
    private String title;
    private String lastMessagePreview;
    private Instant updatedAt;
}
