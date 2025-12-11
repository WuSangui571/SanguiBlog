package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GamePageDetailDto {
    private Long id;
    private String title;
    private String description;
    private String url;
    private String slug;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
