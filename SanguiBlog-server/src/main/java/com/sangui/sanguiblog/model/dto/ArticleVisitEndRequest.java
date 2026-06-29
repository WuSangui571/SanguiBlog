package com.sangui.sanguiblog.model.dto;

import lombok.Data;

@Data
public class ArticleVisitEndRequest {
    private String visitId;
    private Integer totalDurationSeconds;
    private Integer activeDurationSeconds;
}
