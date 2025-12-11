package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    @Size(min = 3, max = 32, message = "长度需在 3-32 之间")
    @Pattern(regexp = "[ -~]+", message = "只能包含可打印 ASCII 字符")
    private String username;
    @NotBlank
    @Size(min = 6, max = 64, message = "长度需在 6-64 之间")
    @Pattern(regexp = "[ -~]+", message = "只能包含可打印 ASCII 字符")
    private String password;
    /**
     * 当触发风控需要验证码时填写
     */
    private String captcha;
}
