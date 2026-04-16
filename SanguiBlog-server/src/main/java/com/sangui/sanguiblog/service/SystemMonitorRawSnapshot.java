package com.sangui.sanguiblog.service;

import java.time.Instant;
import java.util.List;

public record SystemMonitorRawSnapshot(
        Instant sampledAt,
        String osFamily,
        String osVersion,
        String displayName,
        long uptimeSeconds,
        String processorName,
        int physicalCores,
        int logicalCores,
        double cpuLoadPercent,
        long memoryTotalBytes,
        long memoryAvailableBytes,
        long swapTotalBytes,
        long swapUsedBytes,
        long diskTotalBytes,
        long diskAvailableBytes,
        long networkBytesReceived,
        long networkBytesSent,
        long networkPacketsReceived,
        long networkPacketsSent,
        List<NetworkInterfaceSnapshot> interfaces
) {
}
