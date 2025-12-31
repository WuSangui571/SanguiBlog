package com.sangui.sanguiblog.security.botguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.security.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class BotGuardFilter extends OncePerRequestFilter {

    private final BotGuardEngine engine;
    private final BotGuardProperties props;
    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;

    public BotGuardFilter(BotGuardEngine engine, BotGuardProperties props, ObjectMapper objectMapper, JwtUtil jwtUtil) {
        this.engine = engine;
        this.props = props;
        this.objectMapper = objectMapper;
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 若携带有效 JWT，则视为已认证请求（管理端/通知等），避免 BotGuard 在鉴权前置阶段误伤真实用户。
        // 注意：这里只做“有效 token”判断，不改变权限控制，权限仍由 Spring Security 负责。
        if (hasValidJwt(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        BotGuardDecision decision = engine.decide(request);
        if (props.isExposeDebugHeaders()) {
            response.setHeader("X-SG-Guard-Score", String.format(java.util.Locale.ROOT, "%.2f", decision.riskScore()));
            response.setHeader("X-SG-Guard-Action", decision.action().name());
        }

        if (decision.action() == BotGuardAction.PASS) {
            filterChain.doFilter(request, response);
            return;
        }

        if (decision.action() == BotGuardAction.DELAY) {
            safeSleep(decision.delayMs());
            filterChain.doFilter(request, response);
            return;
        }

        if (decision.action() == BotGuardAction.CAPTCHA) {
            writeCaptchaRequired(request, response, decision);
            return;
        }

        if (decision.action() == BotGuardAction.BLOCK) {
            writeBlocked(request, response, decision);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean hasValidJwt(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return false;
        }
        String token = authHeader.substring(7);
        if (token.isBlank()) {
            return false;
        }
        try {
            String username = jwtUtil.extractUsername(token);
            return username != null && !username.isBlank();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void writeCaptchaRequired(HttpServletRequest request, HttpServletResponse response, BotGuardDecision decision)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setHeader("X-SG-Captcha-Required", "1");

        if (wantsJson(request)) {
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("captchaRequired", true);
            data.put("captchaUrl", "/api/guard/captcha");
            data.put("verifyUrl", "/api/guard/verify");
            data.put("riskScore", decision.riskScore());
            objectMapper.writeValue(response.getWriter(), ApiResponse.fail("需要验证码", data));
            return;
        }

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.TEXT_PLAIN_VALUE);
        response.getWriter().write("需要验证码，请访问 /api/guard/captcha 获取验证码并提交到 /api/guard/verify\n");
    }

    private void writeBlocked(HttpServletRequest request, HttpServletResponse response, BotGuardDecision decision)
            throws IOException {
        response.setStatus(429);
        int retryAfter = Math.max(1, decision.retryAfterSeconds());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter));
        response.setHeader("X-SG-Guard-Blocked", "1");

        if (wantsJson(request)) {
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("retryAfterSeconds", retryAfter);
            data.put("riskScore", decision.riskScore());
            objectMapper.writeValue(response.getWriter(), ApiResponse.fail("请求过于频繁，请稍后再试", data));
            return;
        }

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.TEXT_PLAIN_VALUE);
        response.getWriter().write("请求过于频繁，请稍后再试\n");
    }

    private boolean wantsJson(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri != null && uri.startsWith("/api/")) {
            return true;
        }
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        return accept != null && accept.contains(MediaType.APPLICATION_JSON_VALUE);
    }

    private static void safeSleep(int ms) {
        if (ms <= 0) return;
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }
}
