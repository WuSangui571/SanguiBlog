package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AdminPostDetailDto {
    private Long id;
    private String title;
    private String slug;
    private String excerpt;
    private String contentMd;
    private String contentHtml;
    private String themeColor;
    private String status;
    private Long categoryId;
    private Long parentCategoryId;
    private LocalDateTime publishedAt;
    private List<Long> tagIds;
    private java.util.List<TagDto> tags;
}
