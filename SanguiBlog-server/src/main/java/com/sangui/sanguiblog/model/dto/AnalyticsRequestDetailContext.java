package com.sangui.sanguiblog.model.dto;

public record AnalyticsRequestDetailContext(
        String method,
        String requestUri,
        String refererRaw,
        String xForwardedFor,
        String xRealIp,
        String acceptLanguage,
        String entryPage,
        String fromPage,
        String visitorId,
        String sessionId
) {
}
