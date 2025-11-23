package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String username;
    private String displayName;
    private String email;
    private String title;
    private String bio;
    private String avatarUrl;
    private String githubUrl;
    private String wechatQrUrl;
    private String oldPassword;
    private String newPassword;
    private Boolean verifyOnly;
}
