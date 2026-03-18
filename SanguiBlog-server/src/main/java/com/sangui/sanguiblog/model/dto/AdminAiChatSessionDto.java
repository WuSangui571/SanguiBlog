package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminAiChatSessionDto {
    private Long id;
    private String title;
    private String lastMessagePreview;
    private Instant createdAt;
    private Instant updatedAt;
    private Long userId;
    private String username;
    private String displayName;
    private String userTitle;
    private String roleCode;
    private String roleName;
    private Boolean userVisible;
    private Instant userHiddenAt;
}
