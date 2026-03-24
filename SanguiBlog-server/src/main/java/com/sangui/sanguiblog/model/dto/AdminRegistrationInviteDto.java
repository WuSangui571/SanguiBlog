package com.sangui.sanguiblog.model.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class AdminRegistrationInviteDto {
    private String inviteCode;
    private String durationCode;
    private String durationLabel;
    private Instant expiresAt;
    private String expiresAtLabel;
    private Instant createdAt;
}
