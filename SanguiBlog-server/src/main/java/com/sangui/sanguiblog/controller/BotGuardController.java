package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.GuardCaptchaResponse;
import com.sangui.sanguiblog.model.dto.GuardVerifyRequest;
import com.sangui.sanguiblog.model.dto.GuardVerifyResponse;
import com.sangui.sanguiblog.security.botguard.BotGuardCaptchaService;
import com.sangui.sanguiblog.security.botguard.BotGuardProperties;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

@RestController
@RequestMapping("/api/guard")
@RequiredArgsConstructor
public class BotGuardController {

    private final BotGuardCaptchaService captchaService;
    private final BotGuardProperties props;

    @GetMapping("/captcha")
    public ApiResponse<GuardCaptchaResponse> captcha(
            HttpServletRequest request,
            @RequestParam(required = false, defaultValue = "false") boolean force) {
        String ip = IpUtils.resolveIp(request);
        String ua = request.getHeader("User-Agent");
        return ApiResponse.ok(captchaService.generateCaptcha(ip, ua, force));
    }

    @PostMapping("/verify")
    public ApiResponse<GuardVerifyResponse> verify(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestBody GuardVerifyRequest body) {
        String ip = IpUtils.resolveIp(request);
        String ua = request.getHeader("User-Agent");
        String cSegment = toCSegment(ip);
        String captcha = body != null ? body.getCaptcha() : null;
        ResponseCookie cookie = captchaService.verifyAndIssueCookie(ip, ua, cSegment, captcha);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ApiResponse.ok(new GuardVerifyResponse(true, props.getGuardTtl().toSeconds()));
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
}

