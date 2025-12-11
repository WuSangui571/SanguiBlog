package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GamePageDto {
    private Long id;
    private String title;
    private String description;
    private String url;
    private String slug;
    private Instant updatedAt;
}
