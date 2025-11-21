package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PostDetailDto {
    private PostSummaryDto summary;
    private String contentMd;
    private String contentHtml;
}
