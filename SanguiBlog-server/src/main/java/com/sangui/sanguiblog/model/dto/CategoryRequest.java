package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequest {
    @NotBlank
    private String name;
    private String slug;
    private String description;
    private Long parentId;
    private Integer sortOrder;
}
