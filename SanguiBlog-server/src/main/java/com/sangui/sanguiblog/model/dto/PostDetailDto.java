package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PostDetailDto {
    private PostSummaryDto summary;
    private String contentMd;
    private String contentHtml;
    private Long wordCount;
    private String readingTime;
    private String metaTitle;
    private String metaDescription;
}
