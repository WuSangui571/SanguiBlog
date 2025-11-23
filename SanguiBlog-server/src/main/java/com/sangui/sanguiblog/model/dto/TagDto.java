package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class TagDto {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
