package com.sangui.sanguiblog.model.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUnbanIpRequest {
    @Size(max = 512)
    private String unbanReason;
}
