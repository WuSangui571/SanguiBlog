package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuardVerifyResponse {
    private boolean verified;
    private long expiresInSeconds;
}

