package com.sangui.sanguiblog.model.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class AboutDto {
    private String contentMd;
    private String contentHtml;
    private Instant updatedAt;
    private String updatedBy;
}
