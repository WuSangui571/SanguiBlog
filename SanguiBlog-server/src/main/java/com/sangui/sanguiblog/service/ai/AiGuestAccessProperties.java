package com.sangui.sanguiblog.service.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Data
@Component
@ConfigurationProperties(prefix = "ai.chat.public-access")
public class AiGuestAccessProperties {

    private boolean enabled = true;
    private String visitorCookieName = "sg_ai_vid";
    private Duration visitorCookieTtl = Duration.ofDays(30);

    private int guestMinIntervalMs = 12000;
    private int guestPerVisitorHour = 5;
    private int guestPerVisitorDay = 15;
    private int guestPerIpHour = 12;
    private int guestPerIpDay = 40;
    private int guestCaptchaStrikeThreshold = 2;
    private int guestBlockStrikeThreshold = 4;
    private Duration guestBlockDuration = Duration.ofMinutes(20);
    private int guestGlobalDailyBudget = 300;

    private int userMinIntervalMs = 3000;
    private int userPerHour = 60;
    private int userPerDay = 240;
}
