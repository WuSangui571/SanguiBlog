package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class AiCustomKnowledgeUpdateRequest {
    private String title;
    private String contentText;
    private Boolean enabled;
}
