package com.sangui.sanguiblog.security.botguard;

public record BotGuardDecision(
        BotGuardAction action,
        double riskScore,
        int delayMs,
        int retryAfterSeconds
) {
}

