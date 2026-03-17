package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AiChatResponse {
    private String reply;
    private String model;
    private String mode;
    private List<ReferenceDto> references;

    @Data
    @Builder
    public static class ReferenceDto {
        private String sourceType;
        private Long sourceId;
        private String title;
        private String url;
    }
}
