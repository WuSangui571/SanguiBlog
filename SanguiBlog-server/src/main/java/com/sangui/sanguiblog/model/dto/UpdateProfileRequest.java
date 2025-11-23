package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String displayName;
    private String title;
    private String bio;
    private String avatarUrl;
    private String githubUrl;
    private String wechatQrUrl;
}
