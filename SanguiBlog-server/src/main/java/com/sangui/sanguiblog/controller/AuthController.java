package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.LoginRequest;
import com.sangui.sanguiblog.model.dto.LoginResponse;
import com.sangui.sanguiblog.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }
}
