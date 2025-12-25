package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ArchiveYearSummaryDto {
    private Integer year;
    private Long total;
    private List<ArchiveMonthSummaryDto> months;
}
