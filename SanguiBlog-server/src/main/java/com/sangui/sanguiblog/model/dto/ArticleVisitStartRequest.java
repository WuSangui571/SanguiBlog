package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class ArticleVisitStartRequest {
    private String visitId;
    private Long articleId;
    private String path;
    private String title;
    private String referrer;
    private String timezone;
    private String screenSize;
    private String viewportSize;
    private Double devicePixelRatio;
    private Boolean webdriver;
    private String visibilityState;
    private String referrerClient;
}
