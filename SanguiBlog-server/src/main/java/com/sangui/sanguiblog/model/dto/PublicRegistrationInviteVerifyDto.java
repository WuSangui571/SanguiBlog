package com.sangui.sanguiblog.model.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class PublicRegistrationInviteVerifyDto {
    private String inviteCode;
    private Instant expiresAt;
    private String expiresAtLabel;
}
