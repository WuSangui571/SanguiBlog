package com.sangui.sanguiblog.security.botguard;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BotGuardEngineTest {

    private static final String IP = "203.0.113.1";
    private static final String BROWSER_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36";

    private BotGuardProperties props;
    private BotGuardEngine engine;

    @BeforeEach
    void setUp() {
        props = new BotGuardProperties();
        props.setEnabled(true);
        props.setIgnoreLoopback(false);

        BotGuardCaptchaService captchaService = mock(BotGuardCaptchaService.class);
        when(captchaService.isVerified(any(), any(), any())).thenReturn(false);

        engine = new BotGuardEngine(props, captchaService);
    }

    @Test
    void shouldPassForNormalGuestBrowsingPublicReadEndpoints() {
        List<String> paths = List.of(
                "/api/site/meta",
                "/api/categories/tree",
                "/api/tags",
                "/api/comments/recent",
                "/api/about",
                "/api/analytics/client-ip",
                "/api/games",
                "/api/games/sudoku",
                "/api/posts",
                "/api/posts/archive/summary",
                "/api/posts/archive/month"
        );

        for (String path : paths) {
            for (int i = 0; i < 3; i++) {
                MockHttpServletRequest req = getRequest(path);
                req.addHeader("User-Agent", BROWSER_UA);
                BotGuardDecision decision = engine.decide(req);
                assertEquals(BotGuardAction.PASS, decision.action(),
                        "normal guest with public-read relief should PASS; path=" + path + ", iteration=" + i);
            }
        }
    }

    @Test
    void shouldStillEscalateForHighFrequencyScriptOnPublicReadPath() {
        for (int i = 0; i < 200; i++) {
            MockHttpServletRequest req = getRequest("/api/posts");
            req.setParameter("page", "1");
            req.setParameter("size", "10");
            req.addHeader("User-Agent", "curl/7.68.0");
            BotGuardDecision decision = engine.decide(req);
            if (decision.action() != BotGuardAction.PASS) {
                assertTrue(decision.riskScore() > 0,
                        "high-frequency script should accumulate risk despite public-read relief");
                return;
            }
        }
        fail("expected at least DELAY for high-frequency script; check thresholds");
    }

    @Test
    void shouldNotApplyPublicReadReliefToNonGetRequest() {
        for (int i = 0; i < 30; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest();
            req.setRemoteAddr(IP);
            req.setMethod("POST");
            req.setRequestURI("/api/posts/1/comments");
            req.addHeader("User-Agent", BROWSER_UA);

            BotGuardDecision decision = engine.decide(req);
            if (decision.action() != BotGuardAction.PASS) {
                assertTrue(decision.riskScore() > 0,
                        "non-GET under public prefix should escalate without public-read relief");
                return;
            }
        }
        fail("expected escalation for non-GET without public-read relief; check thresholds");
    }

    @Test
    void shouldStillDetectScannerPathDespitePublicReadPrefixes() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(IP);
        req.setMethod("GET");
        req.setRequestURI("/.env");
        req.addHeader("User-Agent", BROWSER_UA);

        BotGuardDecision decision = engine.decide(req);
        assertTrue(decision.riskScore() > 0,
                "scanner path should increase risk score; got " + decision.riskScore());
        assertTrue(decision.riskScore() >= 30,
                "scanner path should contribute significant delta; got " + decision.riskScore());
    }

    private static MockHttpServletRequest getRequest(String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(IP);
        req.setMethod("GET");
        req.setRequestURI(uri);
        return req;
    }
}
