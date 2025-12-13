package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class AdminPostUpdateRequest {
    @NotBlank
    private String title;
    private String slug;
    private String excerpt;
    private String coverImage;
    private String status;
    private String themeColor;
    @NotNull
    private Long categoryId;
    private Set<Long> tagIds;
}
