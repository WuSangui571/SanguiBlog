package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBannedIpDto {
    private Long id;
    private String ip;
    private String reason;
    private boolean enabled;
    private long hitCount;
    private String lastHitTime;
    private String createdAt;
    private Long createdBy;
    private String createdByUsername;
    private String updatedAt;
    private Long updatedBy;
    private String updatedByUsername;
    private String unbannedAt;
    private Long unbannedBy;
    private String unbannedByUsername;
    private String unbanReason;
}
