package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoleOptionDto {
    private Long id;
    private String code;
    private String name;
}
