package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ArchiveSummaryDto {
    private Long totalCount;
    private Integer totalYears;
    private String lastUpdated;
    private List<ArchiveYearSummaryDto> years;
}
