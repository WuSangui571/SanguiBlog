package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class PageViewRequest {
    private Long postId;
    private String pageTitle;
    private String referrer;
    private String geo;
    private String userAgent;
}
