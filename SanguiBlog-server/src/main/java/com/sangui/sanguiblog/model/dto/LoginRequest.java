package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    /**
     * 当触发风控需要验证码时填写
     */
    private String captcha;
}
