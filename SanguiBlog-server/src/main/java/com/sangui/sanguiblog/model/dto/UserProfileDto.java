package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserProfileDto {
    private Long id;
    private String username;
    private String displayName;
    private String title;
    private String bio;
    private String avatar;
    private String github;
    private String wechatQr;
    private String role;
}
