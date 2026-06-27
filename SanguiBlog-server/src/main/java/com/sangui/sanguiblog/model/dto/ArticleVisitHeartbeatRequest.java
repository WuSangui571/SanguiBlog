package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class ArticleVisitHeartbeatRequest {
    private String visitId;
    private Integer activeDurationSeconds;
}
