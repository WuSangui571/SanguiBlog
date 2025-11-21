package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CategoryTreeDto {
    private Long id;
    private String label;
    private Long parentId;
    private List<CategoryTreeDto> children;
}
