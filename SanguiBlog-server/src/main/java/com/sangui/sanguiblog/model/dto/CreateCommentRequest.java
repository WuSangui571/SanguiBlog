package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCommentRequest {
    @NotBlank
    private String authorName;
    @NotBlank
    private String content;
    private String avatarUrl;
}
