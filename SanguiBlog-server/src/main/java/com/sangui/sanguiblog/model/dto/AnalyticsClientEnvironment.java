package com.sangui.sanguiblog.model.dto;

public record AnalyticsClientEnvironment(
        String timezone,
        String screenSize,
        String viewportSize,
        Double devicePixelRatio,
        Boolean webdriver,
        String visibilityState,
        String referrerClient
) {
}
