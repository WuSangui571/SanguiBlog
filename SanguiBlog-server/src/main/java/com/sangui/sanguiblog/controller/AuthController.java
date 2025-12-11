package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.CaptchaResponse;
import com.sangui.sanguiblog.model.dto.LoginRequest;
import com.sangui.sanguiblog.model.dto.LoginResponse;
import com.sangui.sanguiblog.service.AuthService;
import com.sangui.sanguiblog.service.LoginAttemptService;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginAttemptService loginAttemptService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String ip = IpUtils.resolveIp(servletRequest);
        return ApiResponse.ok(authService.login(request, ip));
    }

    @org.springframework.web.bind.annotation.GetMapping("/captcha")
    public ApiResponse<CaptchaResponse> captcha(HttpServletRequest servletRequest) {
        String ip = IpUtils.resolveIp(servletRequest);
        String ua = servletRequest.getHeader("User-Agent");
        return ApiResponse.ok(loginAttemptService.generateCaptcha(ip, ua));
    }

    @org.springframework.web.bind.annotation.GetMapping("/me")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<com.sangui.sanguiblog.model.dto.UserProfileDto> me(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.sangui.sanguiblog.security.UserPrincipal userPrincipal) {
        return ApiResponse.ok(authService.getCurrentUser(userPrincipal.getId()));
    }
}
