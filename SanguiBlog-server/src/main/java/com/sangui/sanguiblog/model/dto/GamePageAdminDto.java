package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GamePageAdminDto {
    private Long id;
    private String title;
    private String description;
    private String slug;
    private String url;
    private String status;
    private Integer sortOrder;
    private Long createdBy;
    private Long updatedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
