package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TagRequest {
    @NotBlank
    private String name;
    private String slug;
    private String description;
}
