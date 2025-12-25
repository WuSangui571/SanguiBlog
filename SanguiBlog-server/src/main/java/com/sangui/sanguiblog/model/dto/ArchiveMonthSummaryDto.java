package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ArchiveMonthSummaryDto {
    private Integer year;
    private Integer month;
    private Long count;
    private String lastDate;
}
