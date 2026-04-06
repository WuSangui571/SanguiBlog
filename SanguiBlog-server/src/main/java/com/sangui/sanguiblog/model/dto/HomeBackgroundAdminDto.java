package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class HomeBackgroundAdminDto {
    private Long id;
    private String originalFilename;
    private String url;
    private String contentType;
    private Long fileSize;
    private boolean current;
    private Long uploadedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
