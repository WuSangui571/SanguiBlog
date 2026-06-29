package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class ArticleVisitStartRequest {
    private String visitId;
    private Long articleId;
    private String path;
    private String title;
    private String referrer;
}
