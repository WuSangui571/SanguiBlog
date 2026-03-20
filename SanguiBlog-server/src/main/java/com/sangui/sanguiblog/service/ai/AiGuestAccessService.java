package com.sangui.sanguiblog.service.ai;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.sangui.sanguiblog.exception.AiAccessControlException;
import com.sangui.sanguiblog.security.botguard.BotGuardCaptchaService;
import com.sangui.sanguiblog.security.botguard.BotGuardProperties;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiGuestAccessService {

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Shanghai");
    private static final String CAPTCHA_URL = "/api/guard/captcha";
    private static final String VERIFY_URL = "/api/guard/verify";

    private final AiGuestAccessProperties properties;
    private final BotGuardCaptchaService botGuardCaptchaService;
    private final BotGuardProperties botGuardProperties;

    private final SecureRandom random = new SecureRandom();
    private final Cache<String, AccessState> guestVisitorStates = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofDays(2))
            .maximumSize(100_000)
            .build();
    private final Cache<String, AccessState> guestIpStates = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofDays(2))
            .maximumSize(100_000)
            .build();
    private final Cache<String, AccessState> userStates = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofDays(2))
            .maximumSize(50_000)
            .build();
    private final Cache<String, DailyBudgetState> guestBudgetStates = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofDays(2))
            .maximumSize(8)
            .build();

    public AccessContext resolveContext(Long userId, HttpServletRequest request, HttpServletResponse response) {
        String ip = IpUtils.resolveIp(request);
        if (userId != null) {
            return AccessContext.authenticated(userId, ip);
        }

        if (!properties.isEnabled()) {
            throw new AiAccessControlException(
                    HttpStatus.FORBIDDEN,
                    "当前仅已登录用户可使用 AI 助理",
                    Map.of("guestAccessEnabled", false)
            );
        }

        String visitorId = resolveVisitorId(request, response);
        return AccessContext.guest(ip, visitorId, isGuardVerified(request, ip));
    }

    public void assertCanSend(AccessContext context) {
        Instant now = Instant.now();
        if (context.guest()) {
            assertGuestBudget(now);
            AccessState visitorState = guestVisitorStates.get(context.visitorId(), key -> new AccessState());
            AccessState ipState = guestIpStates.get(context.ip(), key -> new AccessState());

            synchronized (visitorState) {
                synchronized (ipState) {
                    assertNotBlocked(visitorState, now);
                    assertNotBlocked(ipState, now);

                    if (context.guardVerified()) {
                        visitorState.rapidStrikes = 0;
                        ipState.rapidStrikes = 0;
                    }

                    long retryAfterSeconds = detectRetryAfter(visitorState, ipState, now, properties.getGuestMinIntervalMs());
                    if (retryAfterSeconds > 0) {
                        registerRapidStrike(visitorState, now);
                        registerRapidStrike(ipState, now);
                        handleGuestAbuse(context, visitorState, ipState, now, retryAfterSeconds);
                    }

                    if (wouldExceedWindow(visitorState, now, properties.getGuestPerVisitorHour(), properties.getGuestPerVisitorDay())) {
                        throw tooManyRequests("访客提问过于频繁，请稍后再试", secondsUntilGuestWindowReset(visitorState, now));
                    }
                    if (wouldExceedWindow(ipState, now, properties.getGuestPerIpHour(), properties.getGuestPerIpDay())) {
                        throw tooManyRequests("当前访问来源提问过于频繁，请稍后再试", secondsUntilGuestWindowReset(ipState, now));
                    }

                    incrementWindow(visitorState, now);
                    incrementWindow(ipState, now);
                    incrementGuestBudget(now);
                }
            }
            return;
        }

        AccessState userState = userStates.get("user:" + context.userId(), key -> new AccessState());
        synchronized (userState) {
            long retryAfterSeconds = detectRetryAfter(userState, null, now, properties.getUserMinIntervalMs());
            if (retryAfterSeconds > 0) {
                throw tooManyRequests("提问太快了，请稍后再试", retryAfterSeconds);
            }
            if (wouldExceedWindow(userState, now, properties.getUserPerHour(), properties.getUserPerDay())) {
                throw tooManyRequests("当前账号提问过于频繁，请稍后再试", secondsUntilUserWindowReset(userState, now));
            }
            incrementWindow(userState, now);
        }
    }

    private void assertGuestBudget(Instant now) {
        DailyBudgetState state = guestBudgetStates.get("guest-budget", key -> new DailyBudgetState());
        synchronized (state) {
            state.roll(now);
            if (state.used >= properties.getGuestGlobalDailyBudget()) {
                throw new AiAccessControlException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "今日访客 AI 额度已用完，请稍后再试或登录后继续使用",
                        Map.of(
                                "dailyBudgetExceeded", true,
                                "retryAfterSeconds", secondsUntilTomorrow(now)
                        )
                );
            }
        }
    }

    private void incrementGuestBudget(Instant now) {
        DailyBudgetState state = guestBudgetStates.get("guest-budget", key -> new DailyBudgetState());
        synchronized (state) {
            state.roll(now);
            state.used += 1;
        }
    }

    private void assertNotBlocked(AccessState state, Instant now) {
        if (state.blockedUntil != null && state.blockedUntil.isAfter(now)) {
            throw tooManyRequests("请求过于频繁，请稍后再试", Duration.between(now, state.blockedUntil).getSeconds());
        }
    }

    private long detectRetryAfter(AccessState primary, AccessState secondary, Instant now, int minIntervalMs) {
        long retryMs = 0;
        if (primary.lastRequestAt != null) {
            retryMs = Math.max(retryMs, minIntervalMs - Duration.between(primary.lastRequestAt, now).toMillis());
        }
        if (secondary != null && secondary.lastRequestAt != null) {
            retryMs = Math.max(retryMs, minIntervalMs - Duration.between(secondary.lastRequestAt, now).toMillis());
        }
        return retryMs > 0 ? (long) Math.ceil(retryMs / 1000.0) : 0;
    }

    private void handleGuestAbuse(
            AccessContext context,
            AccessState visitorState,
            AccessState ipState,
            Instant now,
            long retryAfterSeconds
    ) {
        int strikes = Math.max(visitorState.rapidStrikes, ipState.rapidStrikes);
        if (strikes >= properties.getGuestBlockStrikeThreshold()) {
            Instant blockedUntil = now.plus(properties.getGuestBlockDuration());
            visitorState.blockedUntil = blockedUntil;
            ipState.blockedUntil = blockedUntil;
            throw tooManyRequests("请求过于频繁，请稍后再试", Duration.between(now, blockedUntil).getSeconds());
        }

        if (!context.guardVerified() && strikes >= properties.getGuestCaptchaStrikeThreshold()) {
            throw new AiAccessControlException(
                    HttpStatus.FORBIDDEN,
                    "需要验证码验证后才能继续提问",
                    Map.of(
                            "captchaRequired", true,
                            "captchaUrl", CAPTCHA_URL,
                            "verifyUrl", VERIFY_URL,
                            "retryAfterSeconds", retryAfterSeconds
                    )
            );
        }

        throw tooManyRequests("提问太快了，请稍后再试", retryAfterSeconds);
    }

    private boolean wouldExceedWindow(AccessState state, Instant now, int hourLimit, int dayLimit) {
        state.roll(now);
        return state.hourCount + 1 > hourLimit || state.dayCount + 1 > dayLimit;
    }

    private void incrementWindow(AccessState state, Instant now) {
        state.roll(now);
        state.hourCount += 1;
        state.dayCount += 1;
        state.lastRequestAt = now;
        state.rapidStrikes = 0;
    }

    private void registerRapidStrike(AccessState state, Instant now) {
        state.roll(now);
        state.rapidStrikes += 1;
    }

    private AiAccessControlException tooManyRequests(String message, long retryAfterSeconds) {
        return new AiAccessControlException(
                HttpStatus.TOO_MANY_REQUESTS,
                message,
                Map.of("retryAfterSeconds", Math.max(1, retryAfterSeconds))
        );
    }

    private long secondsUntilGuestWindowReset(AccessState state, Instant now) {
        return Math.max(secondsUntilHour(now), secondsUntilDay(now));
    }

    private long secondsUntilUserWindowReset(AccessState state, Instant now) {
        return Math.max(secondsUntilHour(now), secondsUntilDay(now));
    }

    private long secondsUntilHour(Instant now) {
        Instant next = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);
        return Math.max(1, Duration.between(now, next).getSeconds());
    }

    private long secondsUntilDay(Instant now) {
        return secondsUntilTomorrow(now);
    }

    private long secondsUntilTomorrow(Instant now) {
        LocalDate tomorrow = now.atZone(ZONE_ID).toLocalDate().plusDays(1);
        Instant nextDay = tomorrow.atStartOfDay(ZONE_ID).toInstant();
        return Math.max(1, Duration.between(now, nextDay).getSeconds());
    }

    private boolean isGuardVerified(HttpServletRequest request, String ip) {
        String token = readCookie(request.getCookies(), botGuardProperties.getGuardCookieName());
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        return botGuardCaptchaService.isVerified(token, userAgent, toCSegment(ip));
    }

    private String resolveVisitorId(HttpServletRequest request, HttpServletResponse response) {
        String existing = readCookie(request.getCookies(), properties.getVisitorCookieName());
        if (StringUtils.hasText(existing)) {
            return existing.trim();
        }

        String value = generateVisitorId();
        ResponseCookie cookie = ResponseCookie.from(properties.getVisitorCookieName(), value)
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(properties.getVisitorCookieTtl())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return value;
    }

    private String generateVisitorId() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String readCookie(Cookie[] cookies, String name) {
        if (cookies == null || cookies.length == 0 || !StringUtils.hasText(name)) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private String toCSegment(String ip) {
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

    public record AccessContext(Long userId, boolean guest, String ip, String visitorId, boolean guardVerified) {
        public static AccessContext authenticated(Long userId, String ip) {
            return new AccessContext(userId, false, ip, null, false);
        }

        public static AccessContext guest(String ip, String visitorId, boolean guardVerified) {
            return new AccessContext(null, true, ip, visitorId, guardVerified);
        }
    }

    private static final class AccessState {
        private Instant lastRequestAt;
        private Instant blockedUntil;
        private int rapidStrikes;
        private Instant currentHourStart;
        private int hourCount;
        private LocalDate currentDay;
        private int dayCount;

        private void roll(Instant now) {
            Instant hourStart = now.truncatedTo(ChronoUnit.HOURS);
            if (currentHourStart == null || !currentHourStart.equals(hourStart)) {
                currentHourStart = hourStart;
                hourCount = 0;
            }
            LocalDate day = now.atZone(ZONE_ID).toLocalDate();
            if (currentDay == null || !currentDay.equals(day)) {
                currentDay = day;
                dayCount = 0;
            }
        }
    }

    private static final class DailyBudgetState {
        private LocalDate day;
        private int used;

        private void roll(Instant now) {
            LocalDate current = now.atZone(ZONE_ID).toLocalDate();
            if (day == null || !day.equals(current)) {
                day = current;
                used = 0;
            }
        }
    }
}
