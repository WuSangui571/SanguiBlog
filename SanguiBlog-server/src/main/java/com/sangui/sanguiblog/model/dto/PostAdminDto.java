package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PostAdminDto {
    private Long id;
    private String title;
    private String slug;
    private String excerpt;
    private String status;
    private String themeColor;
    private Long categoryId;
    private String categoryName;
    private String authorName;
    private LocalDateTime publishedAt;
    private List<TagDto> tags;
}
