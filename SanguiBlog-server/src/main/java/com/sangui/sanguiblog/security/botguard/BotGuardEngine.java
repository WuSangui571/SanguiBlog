package com.sangui.sanguiblog.security.botguard;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Locale;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class BotGuardEngine {

    private final BotGuardProperties props;
    private final BotGuardCaptchaService captchaService;

    private final Cache<String, IpRiskState> ipStates;
    private final Cache<String, CSegmentState> cSegmentStates;

    public BotGuardEngine(BotGuardProperties props, BotGuardCaptchaService captchaService) {
        this.props = props;
        this.captchaService = captchaService;
        this.ipStates = Caffeine.newBuilder()
                .expireAfterAccess(Duration.ofMinutes(10))
                .maximumSize(Math.max(1000, props.getMaxIpStates()))
                .build();
        this.cSegmentStates = Caffeine.newBuilder()
                .expireAfterAccess(Duration.ofMinutes(2))
                .maximumSize(Math.max(1000, props.getMaxCSegmentStates()))
                .build();
    }

    public BotGuardDecision decide(HttpServletRequest request) {
        if (!props.isEnabled() || request == null) {
            return new BotGuardDecision(BotGuardAction.PASS, 0, 0, 0);
        }
        String method = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return new BotGuardDecision(BotGuardAction.PASS, 0, 0, 0);
        }

        String ip = IpUtils.resolveIp(request);
        if (props.isIgnoreLoopback() && IpUtils.isLoopback(ip)) {
            return new BotGuardDecision(BotGuardAction.PASS, 0, 0, 0);
        }

        String path = safePath(request);
        if (isBypassPath(path)) {
            return new BotGuardDecision(BotGuardAction.PASS, 0, 0, 0);
        }

        long nowMs = System.currentTimeMillis();
        long nowSec = nowMs / 1000;

        String ua = request.getHeader("User-Agent");
        String referer = request.getHeader("Referer");
        if (!StringUtils.hasText(referer)) {
            referer = request.getHeader("X-SG-Referrer");
        }
        boolean hasCookie = request.getHeader("Cookie") != null || (request.getCookies() != null && request.getCookies().length > 0);

        String cSegment = toCSegment(ip);
        int cSegmentUnique = cSegmentStates.get(cSegment, k -> new CSegmentState()).touchAndCount(ip, nowSec);

        String guardToken = findCookieValue(request.getCookies(), props.getGuardCookieName());
        boolean verified = captchaService.isVerified(guardToken, ua, cSegment);

        IpRiskState state = ipStates.get(ip, k -> new IpRiskState());
        state.total.increment(nowSec);
        if (!hasCookie) {
            state.noCookie.increment(nowSec);
        }
        if (!StringUtils.hasText(referer)) {
            state.emptyReferer.increment(nowSec);
        }
        boolean assetReq = isAssetRequest(path);
        if (assetReq) {
            state.asset.increment(nowSec);
        } else {
            state.content.increment(nowSec);
        }
        state.touchInterval(nowMs);

        int perMin = state.total.sum(nowSec);
        int noCookiePerMin = state.noCookie.sum(nowSec);
        int emptyRefPerMin = state.emptyReferer.sum(nowSec);
        int contentPerMin = state.content.sum(nowSec);
        int assetPerMin = state.asset.sum(nowSec);

        double delta = 0.0;

        if (perMin >= 300) delta += 10;
        else if (perMin >= 180) delta += 6;
        else if (perMin >= 120) delta += 4;
        else if (perMin >= 60) delta += 2;

        if (cSegmentUnique >= 80) delta += 4;
        else if (cSegmentUnique >= 50) delta += 2;
        else if (cSegmentUnique >= 30) delta += 1;

        if (noCookiePerMin >= 40) delta += 12;
        else if (noCookiePerMin >= 20) delta += 8;
        else if (noCookiePerMin >= 10) delta += 4;

        if (emptyRefPerMin >= 40) delta += 8;
        else if (emptyRefPerMin >= 20) delta += 5;
        else if (emptyRefPerMin >= 10) delta += 2;

        if (contentPerMin >= 30 && assetPerMin == 0) delta += 10;
        else if (contentPerMin >= 15 && assetPerMin == 0) delta += 6;

        if (state.stableIntervalHits() >= 10) delta += 14;
        else if (state.stableIntervalHits() >= 6) delta += 10;

        delta += uaScore(ua);

        if (looksLikeScanner(path)) {
            delta += 35;
        }

        double good = 0.0;
        if (verified) {
            good += 18;
        }
        if (hasCookie) {
            good += 4;
        }
        if (assetReq) {
            good += 3;
        }
        if (StringUtils.hasText(referer)) {
            good += 2;
        }
        delta -= good;

        long halfLifeMs = Math.max(1, props.getScoreHalfLife().toMillis());
        double score = state.applyScore(nowMs, delta, halfLifeMs);

        long blockedUntil = state.blockedUntilMs();
        if (blockedUntil > nowMs) {
            int retry = (int) Math.max(1, (blockedUntil - nowMs + 999) / 1000);
            return new BotGuardDecision(BotGuardAction.BLOCK, score, 0, retry);
        }

        boolean highRisk = !verified && score >= props.getBlockThreshold();
        int strikes = state.updateHighRiskStrikes(highRisk);
        if (highRisk && strikes >= props.getBlockStrikeThreshold()) {
            long until = nowMs + Math.max(1, props.getBlockDuration().toMillis());
            state.blockUntil(until);
            int retry = (int) Math.max(1, props.getBlockDuration().toSeconds());
            return new BotGuardDecision(BotGuardAction.BLOCK, score, 0, retry);
        }

        if (!verified && score >= props.getCaptchaThreshold() && isCaptchaCandidate(request, path)) {
            return new BotGuardDecision(BotGuardAction.CAPTCHA, score, 0, 0);
        }

        if (score >= props.getDelayThreshold() && shouldDelay(path)) {
            int delay = randomDelay();
            return new BotGuardDecision(BotGuardAction.DELAY, score, delay, 0);
        }

        return new BotGuardDecision(BotGuardAction.PASS, score, 0, 0);
    }

    private boolean isBypassPath(String path) {
        if (path == null) {
            return true;
        }
        return path.startsWith("/api/auth/")
                || path.startsWith("/api/guard/")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/api-docs")
                || Objects.equals(path, "/error");
    }

    private boolean shouldDelay(String path) {
        if (!StringUtils.hasText(path)) {
            return false;
        }
        return !path.startsWith("/uploads/")
                && !path.startsWith("/avatar/")
                && !path.startsWith("/contact/");
    }

    private boolean isCaptchaCandidate(HttpServletRequest request, String path) {
        if (!StringUtils.hasText(path)) {
            return false;
        }
        boolean prefixOk = props.getCaptchaPathPrefixes().stream()
                .filter(StringUtils::hasText)
                .anyMatch(path::startsWith);
        if (!prefixOk) {
            return false;
        }
        return request.getParameter("page") != null
                || request.getParameter("size") != null
                || StringUtils.hasText(request.getParameter("keyword"))
                || request.getParameter("tagId") != null
                || request.getParameter("categoryId") != null
                || path.contains("/archive/");
    }

    private int randomDelay() {
        int min = Math.max(0, props.getDelayMinMs());
        int max = Math.max(min, props.getDelayMaxMs());
        if (max == min) return min;
        return ThreadLocalRandom.current().nextInt(min, max + 1);
    }

    private static String safePath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (!StringUtils.hasText(uri)) {
            return "/";
        }
        return uri.length() > 512 ? uri.substring(0, 512) : uri;
    }

    private static String findCookieValue(Cookie[] cookies, String name) {
        if (cookies == null || cookies.length == 0 || !StringUtils.hasText(name)) {
            return null;
        }
        for (Cookie c : cookies) {
            if (c != null && name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private static String toCSegment(String ip) {
        if (!StringUtils.hasText(ip)) {
            return "0.0.0";
        }
        String normalized = IpUtils.normalizeIp(ip);
        if (normalized.contains(".")) {
            String[] parts = normalized.split("\\.");
            if (parts.length >= 3) {
                return parts[0] + "." + parts[1] + "." + parts[2];
            }
            return normalized;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        String[] parts = lower.split(":");
        if (parts.length >= 4) {
            return parts[0] + ":" + parts[1] + ":" + parts[2] + ":" + parts[3];
        }
        return lower;
    }

    private static boolean isAssetRequest(String path) {
        if (!StringUtils.hasText(path)) {
            return false;
        }
        if (path.startsWith("/uploads/") || path.startsWith("/avatar/") || path.startsWith("/contact/")) {
            return true;
        }
        String lower = path.toLowerCase(Locale.ROOT);
        return lower.endsWith(".js")
                || lower.endsWith(".css")
                || lower.endsWith(".png")
                || lower.endsWith(".jpg")
                || lower.endsWith(".jpeg")
                || lower.endsWith(".gif")
                || lower.endsWith(".svg")
                || lower.endsWith(".ico")
                || lower.endsWith(".webp")
                || lower.endsWith(".woff")
                || lower.endsWith(".woff2")
                || lower.endsWith(".ttf")
                || lower.endsWith(".map");
    }

    private static boolean looksLikeScanner(String path) {
        if (!StringUtils.hasText(path)) {
            return false;
        }
        String p = path.toLowerCase(Locale.ROOT);
        return p.contains("wp-admin")
                || p.contains("wp-login")
                || p.contains(".env")
                || p.contains(".git")
                || p.contains("actuator")
                || p.contains("phpmyadmin")
                || p.contains("robots.txt")
                || p.contains("sitemap.xml");
    }

    private static double uaScore(String ua) {
        if (!StringUtils.hasText(ua)) {
            return 8;
        }
        String trimmed = ua.trim();
        if (trimmed.length() < 10) {
            return 6;
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.contains("curl") || lower.contains("wget") || lower.contains("python")
                || lower.contains("scrapy") || lower.contains("httpclient")
                || lower.contains("okhttp") || lower.contains("java")
                || lower.contains("go-http-client") || lower.contains("node-fetch")) {
            return 6;
        }
        if (lower.contains("bot") || lower.contains("spider") || lower.contains("crawler")) {
            return 5;
        }
        return 0;
    }
}

