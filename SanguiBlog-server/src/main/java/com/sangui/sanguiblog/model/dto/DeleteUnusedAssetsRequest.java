package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class DeleteUnusedAssetsRequest {
    @NotEmpty
    private List<String> paths;
}
