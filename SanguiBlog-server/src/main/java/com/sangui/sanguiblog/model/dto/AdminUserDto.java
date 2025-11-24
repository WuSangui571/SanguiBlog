package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminUserDto {
    private Long id;
    private String username;
    private String displayName;
    private String email;
    private String title;
    private String bio;
    private String githubUrl;
    private String wechatQrUrl;
    private String avatarUrl;
    private String roleCode;
    private String roleName;
    private String status;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;
}
