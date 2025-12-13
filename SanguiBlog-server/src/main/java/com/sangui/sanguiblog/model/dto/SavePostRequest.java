package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SavePostRequest {
    private Long id;

    @NotBlank
    private String title;

    @NotBlank
    private String slug;

    private String excerpt;
    private String coverImage;
    private String contentMd;
    private String contentHtml;
    private String themeColor;

    @NotNull
    private Long categoryId;

    private List<Long> tagIds;

    @NotBlank
    private String status;
}
