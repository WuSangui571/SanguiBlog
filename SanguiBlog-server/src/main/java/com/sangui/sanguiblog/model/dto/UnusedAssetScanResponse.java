package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UnusedAssetScanResponse {
    private List<UnusedAssetDto> unused;
    private long totalSize;
}
