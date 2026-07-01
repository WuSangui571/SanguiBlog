package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class PageViewRequest {
    private Long postId;
    private String pageTitle;
    private String referrer;
    private String geo;
    private String userAgent;
    private String clientIp;
    private String sourceLabel;
    private String timezone;
    private String screenSize;
    private String viewportSize;
    private Double devicePixelRatio;
    private Boolean webdriver;
    private String visibilityState;
    private String referrerClient;
}
