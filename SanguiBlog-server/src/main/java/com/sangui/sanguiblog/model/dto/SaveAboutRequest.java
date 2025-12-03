package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SaveAboutRequest {
    @NotBlank
    private String contentMd;
}
