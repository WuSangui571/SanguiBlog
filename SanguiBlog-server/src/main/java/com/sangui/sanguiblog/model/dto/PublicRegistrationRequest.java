package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class PublicRegistrationRequest {
    private String inviteCode;
    private String username;
    private String displayName;
    private String password;
    private String confirmPassword;
}
