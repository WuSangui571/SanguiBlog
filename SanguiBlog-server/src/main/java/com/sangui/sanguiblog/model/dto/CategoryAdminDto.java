package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class CategoryAdminDto {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private Integer sortOrder;
    private Long parentId;
    private String parentName;
    private Instant createdAt;
    private Instant updatedAt;
}
