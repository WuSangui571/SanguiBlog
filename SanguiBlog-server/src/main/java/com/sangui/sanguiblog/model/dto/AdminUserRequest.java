package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUserRequest {
    @NotBlank
    @Size(max = 64)
    private String username;

    @NotBlank
    @Size(max = 128)
    private String displayName;

    @Email
    private String email;

    @Size(max = 128)
    private String title;

    @Size(max = 512)
    private String bio;

    @Size(max = 512)
    private String githubUrl;

    @Size(max = 512)
    private String wechatQrUrl;

    private String status;

    @NotBlank
    private String roleCode;

    private String password;
}
