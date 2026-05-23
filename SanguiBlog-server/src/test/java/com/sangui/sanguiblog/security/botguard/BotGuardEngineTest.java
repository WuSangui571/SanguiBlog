package com.sangui.sanguiblog.security.botguard;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BotGuardEngineTest {

    @Mock
    private BotGuardCaptchaService captchaService;

    private BotGuardProperties props;
    private BotGuardEngine engine;

    @BeforeEach
    void setUp() {
        props = new BotGuardProperties();
        props.setEnabled(true);
        props.setIgnoreLoopback(true);
        props.setExposeDebugHeaders(false);
        props.setDelayThreshold(18);
        props.setCaptchaThreshold(35);
        props.setBlockThreshold(60);
        props.setBlockStrikeThreshold(3);
        props.setBlockDuration(Duration.ofSeconds(120));
        props.setScoreHalfLife(Duration.ofSeconds(60));
        props.setDelayMinMs(120);
        props.setDelayMaxMs(420);
        props.setGuardCookieName("sg_guard");
        props.setGuardTtl(Duration.ofDays(1));
        props.setCaptchaPathPrefixes(List.of("/api/posts", "/api/comments"));
        props.setPublicReadPathPrefixes(List.of(
                "/api/site",
                "/api/categories",
                "/api/tags",
                "/api/comments/recent",
                "/api/about",
                "/api/analytics/client-ip",
                "/api/games",
                "/api/posts"
        ));
        props.setPublicReadGoodScore(6);

        engine = new BotGuardEngine(props, captchaService);
    }

    @Test
    void normalPublicFirstScreenShouldPass() {
        String ip = "203.0.113.10";
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
        String[] publicPaths = {
                "/api/site/meta",
                "/api/categories/tree",
                "/api/tags",
                "/api/comments/recent?size=5",
                "/api/about",
                "/api/analytics/client-ip",
                "/api/posts?page=1&size=10",
                "/api/games"
        };

        for (String path : publicPaths) {
            HttpServletRequest req = mockRequest("GET", path, ip, ua, null, null);
            BotGuardDecision decision = engine.decide(req);
            assertEquals(BotGuardAction.PASS, decision.action(),
                    "Public GET " + path + " should PASS");
        }
    }

    @Test
    void publicReadRequestsShouldNotAccumulateNoCookieCounter() {
        String ip = "203.0.113.11";
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        for (int i = 0; i < 15; i++) {
            HttpServletRequest req = mockRequest("GET", "/api/site/meta", ip, ua, null, null);
            BotGuardDecision decision = engine.decide(req);
            assertEquals(BotGuardAction.PASS, decision.action(),
                    "Repeated public GET should still PASS on iteration " + i);
        }
    }

    @Test
    void publicReadRequestsShouldGetGoodScoreBoost() {
        String ip = "203.0.113.12";
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        HttpServletRequest publicReq = mockRequest("GET", "/api/site/meta", ip, ua, null, null);
        BotGuardDecision publicDecision = engine.decide(publicReq);

        HttpServletRequest nonPublicReq = mockRequest("POST", "/api/comments", ip, ua, null, null);
        BotGuardDecision nonPublicDecision = engine.decide(nonPublicReq);

        assertTrue(publicDecision.riskScore() <= nonPublicDecision.riskScore(),
                "Public GET should have <= risk score than non-public POST");
    }

    @Test
    void maliciousHighFrequencyShouldStillTriggerProtection() {
        String ip = "198.51.100.50";

        for (int i = 0; i < 80; i++) {
            HttpServletRequest req = mockRequest("GET", "/api/posts?page=" + (i % 10 + 1), ip,
                    "curl/7.88.1", null, null);
            engine.decide(req);
        }

        HttpServletRequest finalReq = mockRequest("GET", "/api/posts?page=1&size=10", ip,
                "curl/7.88.1", null, null);
        BotGuardDecision decision = engine.decide(finalReq);
        assertNotEquals(BotGuardAction.PASS, decision.action(),
                "Malicious high-frequency should not PASS - action=" + decision.action());
        assertTrue(decision.riskScore() > 0,
                "Malicious high-frequency should have positive risk score");
    }

    @Test
    void scannerPathShouldIncreaseRisk() {
        String ip = "198.51.100.60";
        String ua = "Mozilla/5.0";

        HttpServletRequest req = mockRequest("GET", "/wp-admin/install.php", ip, ua, null, null);
        BotGuardDecision decision = engine.decide(req);
        assertTrue(decision.riskScore() >= 35,
                "Scanner path should have high risk score, got " + decision.riskScore());
    }

    @Test
    void bypassPathsShouldAlwaysPass() {
        String ip = "203.0.113.20";
        String ua = "Mozilla/5.0";
        String[] bypassPaths = {
                "/sitemap.xml",
                "/robots.txt",
                "/api/auth/login",
                "/api/guard/captcha",
                "/api/admin/posts",
                "/api/notifications/unread",
                "/api/users/me",
                "/api/permissions/me",
                "/api/upload/avatar",
                "/swagger-ui/index.html",
                "/v3/api-docs",
                "/api-docs",
                "/error"
        };

        for (String path : bypassPaths) {
            HttpServletRequest req = mockRequest("GET", path, ip, ua, null, null);
            BotGuardDecision decision = engine.decide(req);
            assertEquals(BotGuardAction.PASS, decision.action(),
                    "Bypass path " + path + " should PASS");
            assertEquals(0.0, decision.riskScore(),
                    "Bypass path " + path + " should have 0 risk score");
        }
    }

    @Test
    void loopbackShouldBeBypassedWhenConfigured() {
        props.setIgnoreLoopback(true);
        engine = new BotGuardEngine(props, captchaService);
        String ua = "Mozilla/5.0";

        HttpServletRequest req = mockRequest("GET", "/api/site/meta", "127.0.0.1", ua, null, null);
        BotGuardDecision decision = engine.decide(req);
        assertEquals(BotGuardAction.PASS, decision.action());
        assertEquals(0.0, decision.riskScore());
    }

    @Test
    void loopbackShouldNotBeBypassedWhenDisabled() {
        props.setIgnoreLoopback(false);
        engine = new BotGuardEngine(props, captchaService);
        String ua = "Mozilla/5.0";

        HttpServletRequest req = mockRequest("GET", "/api/site/meta", "127.0.0.1", ua, null, null);
        BotGuardDecision decision = engine.decide(req);
        decision.riskScore();
    }

    @Test
    void optionsMethodShouldBypass() {
        String ua = "Mozilla/5.0";
        HttpServletRequest req = mockRequest("OPTIONS", "/api/posts", "203.0.113.30", ua, null, null);
        BotGuardDecision decision = engine.decide(req);
        assertEquals(BotGuardAction.PASS, decision.action());
        assertEquals(0.0, decision.riskScore());
    }

    @Test
    void captchaCandidateRequiresMatchingPrefixAndParams() {
        String ip = "203.0.113.40";
        String ua = "curl/7.88.1";

        for (int i = 0; i < 80; i++) {
            HttpServletRequest req = mockRequest("GET", "/api/posts?page=" + (i % 10 + 1), ip, ua, null, null);
            engine.decide(req);
        }

        HttpServletRequest reqWithParams = mockRequest("GET", "/api/posts?page=1&size=10", ip, ua, null, null);
        BotGuardDecision decision = engine.decide(reqWithParams);
        assertNotEquals(BotGuardAction.PASS, decision.action(),
                "High-frequency requests to captcha-candidate path should trigger protection");
    }

    @Test
    void nonCaptchaPrefixShouldNotReturnCaptcha() {
        String ip = "203.0.113.45";
        String ua = "curl/7.88.1";

        for (int i = 0; i < 80; i++) {
            HttpServletRequest req = mockRequest("GET", "/api/games?page=" + (i % 5 + 1), ip, ua, null, null);
            engine.decide(req);
        }

        HttpServletRequest finalReq = mockRequest("GET", "/api/games?page=1", ip, ua, null, null);
        BotGuardDecision decision = engine.decide(finalReq);
        assertNotEquals(BotGuardAction.CAPTCHA, decision.action(),
                "/api/games should not be a captcha candidate even with params");
    }

    @Test
    void dockerProxyChainCorrectlyResolvesRealIp() {
        String realClientIp = "203.0.113.100";
        String nginxIp = "172.18.0.3";
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

        HttpServletRequest req = mockRequestWithForwardedFor(
                "GET", "/api/site/meta", realClientIp, nginxIp, ua, null, null);

        BotGuardDecision decision = engine.decide(req);
        assertEquals(BotGuardAction.PASS, decision.action());

        for (int i = 0; i < 5; i++) {
            HttpServletRequest extraReq = mockRequestWithForwardedFor(
                    "GET", "/api/site/meta", "203.0.113.200", nginxIp, ua, null, null);
            engine.decide(extraReq);
        }

        BotGuardDecision finalDecision = engine.decide(req);
        assertEquals(BotGuardAction.PASS, finalDecision.action(),
                "Distinct Docker clients should not collide in BotGuard risk key");
    }

    @Test
    void publicReadPostListShouldGetDiscount() {
        String ua = "curl/7.88.1";

        HttpServletRequest publicReq = mockRequest("GET", "/api/posts?page=1&size=10",
                "203.0.113.60", ua, null, null);
        BotGuardDecision publicDecision = engine.decide(publicReq);

        HttpServletRequest nonPublicReq = mockRequest("POST", "/api/posts",
                "203.0.113.61", ua, null, null);
        BotGuardDecision nonPublicDecision = engine.decide(nonPublicReq);

        assertTrue(publicDecision.riskScore() < nonPublicDecision.riskScore(),
                "Public GET posts should receive a discount");
    }

    @Test
    void nonGetPublicPathShouldNotGetDiscount() {
        String ip = "203.0.113.70";
        String ua = "curl/7.88.1";

        HttpServletRequest postReq = mockRequest("POST", "/api/site/meta", ip, ua, null, null);
        BotGuardDecision postDecision = engine.decide(postReq);

        HttpServletRequest getReq = mockRequest("GET", "/api/site/meta", ip, ua, null, null);
        BotGuardDecision getDecision = engine.decide(getReq);

        assertTrue(postDecision.riskScore() >= getDecision.riskScore() - 1,
                "POST to public prefix should not get GET discount");
    }

    @Test
    void verifiedUsersGetExtraGoodPoints() {
        String ip = "203.0.113.50";
        String ua = "Mozilla/5.0";
        when(captchaService.isVerified("token123", ua, toCSegment(ip)))
                .thenReturn(true);

        HttpServletRequest req = mockRequest("GET", "/api/posts", ip,
                ua, null, new Cookie[]{new Cookie("sg_guard", "token123")});
        BotGuardDecision decision = engine.decide(req);
        assertEquals(BotGuardAction.PASS, decision.action());
        assertEquals(0.0, decision.riskScore(),
                "Verified user should have 0 risk score for normal traffic");
    }

    @Test
    void disabledEngineShouldPassAll() {
        props.setEnabled(false);
        engine = new BotGuardEngine(props, captchaService);

        for (int i = 0; i < 200; i++) {
            HttpServletRequest req = mockRequest("GET", "/api/posts", "198.51.100.99",
                    "curl/7.88.1", null, null);
            BotGuardDecision decision = engine.decide(req);
            assertEquals(BotGuardAction.PASS, decision.action());
        }
    }

    private HttpServletRequest mockRequest(String method, String uri, String remoteAddr,
                                            String userAgent, String referer, Cookie[] cookies) {
        HttpServletRequest req = org.mockito.Mockito.mock(HttpServletRequest.class);
        String requestUri = uri;
        String queryString = null;
        int queryIndex = uri.indexOf('?');
        if (queryIndex >= 0) {
            requestUri = uri.substring(0, queryIndex);
            queryString = uri.substring(queryIndex + 1);
        }
        when(req.getMethod()).thenReturn(method);
        when(req.getRequestURI()).thenReturn(requestUri);
        when(req.getQueryString()).thenReturn(queryString);
        stubQueryParameters(req, queryString);
        when(req.getRemoteAddr()).thenReturn(remoteAddr);
        when(req.getHeader("User-Agent")).thenReturn(userAgent);
        when(req.getHeader("Referer")).thenReturn(referer);
        when(req.getHeader("X-SG-Referrer")).thenReturn(null);
        if (cookies != null && cookies.length > 0) {
            when(req.getCookies()).thenReturn(cookies);
            lenient().when(req.getHeader("Cookie")).thenReturn("sg_guard=token123");
        } else {
            when(req.getCookies()).thenReturn(null);
            lenient().when(req.getHeader("Cookie")).thenReturn(null);
        }
        return req;
    }

    private static void stubQueryParameters(HttpServletRequest req, String queryString) {
        if (queryString == null || queryString.isBlank()) {
            return;
        }
        for (String pair : queryString.split("&")) {
            int equalsIndex = pair.indexOf('=');
            String name = equalsIndex >= 0 ? pair.substring(0, equalsIndex) : pair;
            String value = equalsIndex >= 0 ? pair.substring(equalsIndex + 1) : "";
            if (!name.isBlank()) {
                when(req.getParameter(name)).thenReturn(value);
            }
        }
    }

    private HttpServletRequest mockRequestWithForwardedFor(String method, String uri,
                                                            String realClientIp, String nginxIp,
                                                            String userAgent, String referer,
                                                            Cookie[] cookies) {
        HttpServletRequest req = mockRequest(method, uri, realClientIp, userAgent, referer, cookies);
        when(req.getRemoteAddr()).thenReturn(nginxIp);
        when(req.getHeader("X-Forwarded-For")).thenReturn(realClientIp + ", " + nginxIp);
        return req;
    }

    private static String toCSegment(String ip) {
        if (ip == null || ip.isBlank()) return "0.0.0";
        String normalized = com.sangui.sanguiblog.util.IpUtils.normalizeIp(ip);
        if (normalized.contains(".")) {
            String[] parts = normalized.split("\\.");
            if (parts.length >= 3) {
                return parts[0] + "." + parts[1] + "." + parts[2];
            }
            return normalized;
        }
        return normalized.toLowerCase(java.util.Locale.ROOT);
    }
}
