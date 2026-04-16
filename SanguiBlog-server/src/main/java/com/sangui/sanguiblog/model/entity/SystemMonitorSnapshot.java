package com.sangui.sanguiblog.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "system_monitor_snapshots")
@Getter
@Setter
public class SystemMonitorSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sampled_at", nullable = false)
    private Instant sampledAt;

    @Column(name = "os_family", length = 128)
    private String osFamily;

    @Column(name = "os_version", length = 255)
    private String osVersion;

    @Column(name = "uptime_seconds")
    private Long uptimeSeconds;

    @Column(name = "cpu_load_percent")
    private Double cpuLoadPercent;

    @Column(name = "memory_total_bytes")
    private Long memoryTotalBytes;

    @Column(name = "memory_used_bytes")
    private Long memoryUsedBytes;

    @Column(name = "disk_total_bytes")
    private Long diskTotalBytes;

    @Column(name = "disk_used_bytes")
    private Long diskUsedBytes;

    @Column(name = "network_bytes_received")
    private Long networkBytesReceived;

    @Column(name = "network_bytes_sent")
    private Long networkBytesSent;

    @PrePersist
    public void onCreate() {
        if (sampledAt == null) {
            sampledAt = Instant.now();
        }
    }
}
