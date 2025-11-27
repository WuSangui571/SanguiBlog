package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
public class PermissionMatrixDto {

    private List<ModuleDto> modules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModuleDto {
        private String module;
        private String label;
        private String description;
        private List<ActionDto> actions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActionDto {
        private String code;
        private String label;
        private String description;
        private boolean superAdmin;
        private boolean admin;
        private boolean user;
    }
}
