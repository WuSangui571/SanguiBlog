package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class SystemMonitorDto {

    private Instant sampledAt;
    private boolean historyAvailable;
    private String historyNote;
    private HostDto host;
    private CpuDto cpu;
    private MemoryDto memory;
    private DiskDto disk;
    private NetworkDto network;
    private ThroughputDto throughput;
    private List<TrafficRangeDto> trafficRanges;
    private ScoreDto score;

    @Data
    @Builder
    public static class HostDto {
        private String osFamily;
        private String osVersion;
        private String displayName;
        private String processorName;
        private int physicalCores;
        private int logicalCores;
        private long uptimeSeconds;
    }

    @Data
    @Builder
    public static class CpuDto {
        private double percent;
        private int physicalCores;
        private int logicalCores;
        private String description;
    }

    @Data
    @Builder
    public static class MemoryDto {
        private long totalBytes;
        private long usedBytes;
        private long availableBytes;
        private long swapTotalBytes;
        private long swapUsedBytes;
        private double percent;
    }

    @Data
    @Builder
    public static class DiskDto {
        private long totalBytes;
        private long usedBytes;
        private long availableBytes;
        private double percent;
    }

    @Data
    @Builder
    public static class NetworkDto {
        private long receivedBytes;
        private long sentBytes;
        private long totalBytes;
        private List<NetworkInterfaceDto> interfaces;
    }

    @Data
    @Builder
    public static class NetworkInterfaceDto {
        private String name;
        private String displayName;
        private String macAddress;
        private long speedBitsPerSecond;
        private long receivedBytes;
        private long sentBytes;
        private long throughputReceivedBytesPerSecond;
        private long throughputSentBytesPerSecond;
    }

    @Data
    @Builder
    public static class ThroughputDto {
        private long receivedBytesPerSecond;
        private long sentBytesPerSecond;
        private long totalBytesPerSecond;
    }

    @Data
    @Builder
    public static class TrafficRangeDto {
        private String key;
        private String label;
        private long receivedBytes;
        private long sentBytes;
        private long totalBytes;
    }

    @Data
    @Builder
    public static class ScoreDto {
        private int value;
        private String label;
        private String summary;
    }
}
