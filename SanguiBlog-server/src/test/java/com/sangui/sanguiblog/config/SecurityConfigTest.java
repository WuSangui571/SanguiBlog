package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

class SecurityConfigTest {

    @Test
    void gameCspShouldAllowInlineScripts() {
        assertTrue(SecurityConfig.GAME_CSP.contains("script-src 'self' 'unsafe-inline'"),
                "GAME_CSP must allow inline scripts");
    }

    @Test
    void gameCspShouldAllowJsDelivrCdn() {
        assertTrue(SecurityConfig.GAME_CSP.contains("https://cdn.jsdelivr.net"),
                "GAME_CSP must allow jsDelivr CDN for Chart.js");
    }

    @Test
    void gameCspShouldAllowSameOriginFrame() {
        assertTrue(SecurityConfig.GAME_CSP.contains("frame-ancestors 'self'"),
                "GAME_CSP must allow same-origin iframe embedding");
    }

    @Test
    void gameCspShouldNotContainFrameAncestorsNone() {
        assertFalse(SecurityConfig.GAME_CSP.contains("frame-ancestors 'none'"),
                "GAME_CSP must NOT contain frame-ancestors 'none'");
    }

    @Test
    void gameCspShouldRetainDefaultStyleSrc() {
        assertTrue(SecurityConfig.GAME_CSP.contains("style-src 'self' 'unsafe-inline'"),
                "GAME_CSP must retain style-src 'unsafe-inline'");
    }

    @Test
    void gameCspShouldRetainDefaultImgSrc() {
        assertTrue(SecurityConfig.GAME_CSP.contains("img-src 'self' data: blob:"),
                "GAME_CSP must retain default img-src");
    }

    @Test
    void gameCspShouldRetainDefaultConnectSrc() {
        assertTrue(SecurityConfig.GAME_CSP.contains("connect-src 'self'"),
                "GAME_CSP must retain default connect-src");
    }

    @Test
    void gameCspShouldRetainDefaultFontSrc() {
        assertTrue(SecurityConfig.GAME_CSP.contains("font-src 'self' data:"),
                "GAME_CSP must retain default font-src");
    }

    @Test
    void gameCspShouldRetainDefaultFrameSrc() {
        assertTrue(SecurityConfig.GAME_CSP.contains("frame-src 'self'"),
                "GAME_CSP must retain default frame-src");
    }

    @Test
    void gameCspShouldRetainDefaultFormAction() {
        assertTrue(SecurityConfig.GAME_CSP.contains("form-action 'self'"),
                "GAME_CSP must retain default form-action");
    }

    @Test
    void gameCspShouldRetainUpgradeInsecureRequests() {
        assertTrue(SecurityConfig.GAME_CSP.contains("upgrade-insecure-requests"),
                "GAME_CSP must retain upgrade-insecure-requests directive");
    }

    // --- Default CSP assertions ---

    @Test
    void defaultCspShouldNotAllowInlineScripts() {
        assertTrue(SecurityConfig.DEFAULT_CSP.contains("script-src 'self'"),
                "DEFAULT_CSP must contain script-src 'self'");
        assertFalse(SecurityConfig.DEFAULT_CSP.contains("script-src 'self' 'unsafe-inline'"),
                "DEFAULT_CSP must NOT contain 'unsafe-inline' for scripts");
    }

    @Test
    void defaultCspShouldNotAllowJsDelivrCdn() {
        assertFalse(SecurityConfig.DEFAULT_CSP.contains("cdn.jsdelivr.net"),
                "DEFAULT_CSP must NOT allow jsDelivr CDN");
    }

    @Test
    void defaultCspShouldDenyFrameEmbedding() {
        assertTrue(SecurityConfig.DEFAULT_CSP.contains("frame-ancestors 'none'"),
                "DEFAULT_CSP must deny frame embedding");
        assertFalse(SecurityConfig.DEFAULT_CSP.contains("frame-ancestors 'self'"),
                "DEFAULT_CSP must NOT contain frame-ancestors 'self'");
    }

    // --- Nginx config alignment ---

    @Test
    void dockerNginxGameCspShouldAlignWithSpringSecurity() throws Exception {
        Path nginxConf = Paths.get("docker/nginx/default.conf").toAbsolutePath().normalize();
        if (!Files.exists(nginxConf)) {
            nginxConf = Paths.get("../docker/nginx/default.conf").toAbsolutePath().normalize();
        }
        if (!Files.exists(nginxConf)) {
            fail("docker/nginx/default.conf must exist for game CSP alignment check");
        }

        String content = Files.readString(nginxConf);
        assertTrue(content.contains("Content-Security-Policy \"" + SecurityConfig.GAME_CSP + "\""),
                "Nginx /uploads/games/ CSP must stay aligned with SecurityConfig.GAME_CSP");
        assertTrue(content.contains("X-Frame-Options SAMEORIGIN"),
                "Nginx /uploads/games/ must set X-Frame-Options: SAMEORIGIN");
    }
}
