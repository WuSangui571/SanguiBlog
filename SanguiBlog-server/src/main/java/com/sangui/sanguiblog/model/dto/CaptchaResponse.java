package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaptchaResponse {
    /**
    * data:image/png;base64,...
    */
    private String imageBase64;
    private long expiresInSeconds;
    private boolean required;
}
