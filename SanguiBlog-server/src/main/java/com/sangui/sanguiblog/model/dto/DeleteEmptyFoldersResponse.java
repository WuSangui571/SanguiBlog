package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteEmptyFoldersResponse {
    private int deletedCount;
    private List<String> deletedPaths;
    private List<String> skippedPaths;
}
