package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsPageViewDetailFieldsDto {
    private String userAgent;
    private String refererRaw;
    private String method;
    private String requestUri;
    private Integer status;
    private Long durationMs;
    private String ip;
    private String xForwardedFor;
    private String xRealIp;
    private String acceptLanguage;
    private String visitorId;
    private String sessionId;
    private String entryPage;
    private String fromPage;
    private Boolean isFirstVisit;
    private Boolean botDetected;
    private String botName;
    private String deviceType;
    private String browser;
    private String os;
    private String asn;
    private String isp;
    private String ipType;
    private String timezone;
    private String screenSize;
    private String viewportSize;
    private Double devicePixelRatio;
    private Boolean webdriver;
    private String visibilityState;
    private String referrerClient;
}
