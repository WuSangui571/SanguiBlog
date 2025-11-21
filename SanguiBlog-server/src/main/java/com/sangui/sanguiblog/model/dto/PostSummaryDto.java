package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PostSummaryDto {
    private Long id;
    private String title;
    private String excerpt;
    private String category;
    private String parentCategory;
    private List<String> tags;
    private String color;
    private Integer likes;
    private Integer comments;
    private Long views;
    private String date;
    private String slug;
}
