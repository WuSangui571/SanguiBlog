package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AiCustomKnowledgeAdminDto {
    private Long id;
    private String title;
    private String originalFilename;
    private String contentPreview;
    private Boolean enabled;
    private String syncStatus;
    private String lastError;
    private Instant lastSyncedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
