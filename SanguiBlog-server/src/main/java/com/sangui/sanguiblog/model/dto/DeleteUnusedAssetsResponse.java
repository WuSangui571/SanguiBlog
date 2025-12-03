package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DeleteUnusedAssetsResponse {
    private int deletedCount;
    private long freedSize;
    private List<String> deletedPaths;
    private List<String> skippedPaths;
}
