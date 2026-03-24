package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.CaptchaResponse;
import com.sangui.sanguiblog.model.dto.LoginRequest;
import com.sangui.sanguiblog.model.dto.LoginResponse;
import com.sangui.sanguiblog.model.dto.PublicRegistrationInviteVerifyDto;
import com.sangui.sanguiblog.model.dto.PublicRegistrationInviteVerifyRequest;
import com.sangui.sanguiblog.model.dto.PublicRegistrationRequest;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.service.AuthService;
import com.sangui.sanguiblog.service.LoginAttemptService;
import com.sangui.sanguiblog.service.PublicRegistrationService;
import com.sangui.sanguiblog.service.RegistrationInviteService;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginAttemptService loginAttemptService;
    private final RegistrationInviteService registrationInviteService;
    private final PublicRegistrationService publicRegistrationService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String ip = IpUtils.resolveIp(servletRequest);
        return ApiResponse.ok(authService.login(request, ip));
    }

    @org.springframework.web.bind.annotation.GetMapping("/captcha")
    public ApiResponse<CaptchaResponse> captcha(
            HttpServletRequest servletRequest,
            @org.springframework.web.bind.annotation.RequestParam(name = "force", defaultValue = "false") boolean force) {
        String ip = IpUtils.resolveIp(servletRequest);
        String ua = servletRequest.getHeader("User-Agent");
        return ApiResponse.ok(loginAttemptService.generateCaptcha(ip, ua, force));
    }

    @PostMapping("/register/invite/verify")
    public ApiResponse<PublicRegistrationInviteVerifyDto> verifyInvite(
            @RequestBody(required = false) PublicRegistrationInviteVerifyRequest request) {
        return ApiResponse.ok(registrationInviteService.verifyInvite(request != null ? request.getInviteCode() : null));
    }

    @PostMapping(value = "/register", consumes = "multipart/form-data")
    public ApiResponse<UserProfileDto> register(
            @RequestParam("inviteCode") String inviteCode,
            @RequestParam("username") String username,
            @RequestParam("displayName") String displayName,
            @RequestParam("password") String password,
            @RequestParam("confirmPassword") String confirmPassword,
            @RequestParam("avatar") MultipartFile avatar) {
        PublicRegistrationRequest request = new PublicRegistrationRequest();
        request.setInviteCode(inviteCode);
        request.setUsername(username);
        request.setDisplayName(displayName);
        request.setPassword(password);
        request.setConfirmPassword(confirmPassword);
        return ApiResponse.ok(publicRegistrationService.register(request, avatar));
    }

    @org.springframework.web.bind.annotation.GetMapping("/me")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ApiResponse<com.sangui.sanguiblog.model.dto.UserProfileDto> me(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.sangui.sanguiblog.security.UserPrincipal userPrincipal) {
        return ApiResponse.ok(authService.getCurrentUser(userPrincipal.getId()));
    }
}
