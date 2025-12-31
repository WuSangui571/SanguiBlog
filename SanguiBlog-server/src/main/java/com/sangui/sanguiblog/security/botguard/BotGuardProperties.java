package com.sangui.sanguiblog.security.botguard;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "security.bot-guard")
public class BotGuardProperties {
    private boolean enabled = true;
    private boolean ignoreLoopback = true;
    private boolean exposeDebugHeaders = false;

    private int delayThreshold = 18;
    private int captchaThreshold = 35;
    private int blockThreshold = 60;
    private int blockStrikeThreshold = 3;

    private Duration blockDuration = Duration.ofSeconds(120);
    private Duration scoreHalfLife = Duration.ofSeconds(60);

    private int delayMinMs = 120;
    private int delayMaxMs = 420;

    private long maxIpStates = 20000;
    private long maxCSegmentStates = 5000;
    private long maxGuardTokens = 20000;

    private String guardCookieName = "sg_guard";
    private Duration guardTtl = Duration.ofDays(1);
    private boolean guardCookieSecure = false;

    private List<String> captchaPathPrefixes = List.of(
            "/api/posts",
            "/api/comments"
    );
}

