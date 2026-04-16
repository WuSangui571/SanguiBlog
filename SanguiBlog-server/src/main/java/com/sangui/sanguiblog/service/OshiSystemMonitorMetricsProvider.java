package com.sangui.sanguiblog.service;

import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.NetworkIF;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.lang.management.ManagementFactory;
import java.util.Comparator;
import java.util.List;

@Service
public class OshiSystemMonitorMetricsProvider implements SystemMonitorMetricsProvider {

    private final SystemInfo systemInfo = new SystemInfo();
    private final HardwareAbstractionLayer hardware = systemInfo.getHardware();
    private final OperatingSystem operatingSystem = systemInfo.getOperatingSystem();
    private final CentralProcessor processor = hardware.getProcessor();
    private long[] previousCpuTicks = processor.getSystemCpuLoadTicks();

    @Override
    public synchronized SystemMonitorRawSnapshot sample() {
        GlobalMemory memory = hardware.getMemory();
        long totalMemory = safeLong(memory.getTotal());
        long availableMemory = safeLong(memory.getAvailable());
        long swapTotal = safeLong(memory.getVirtualMemory().getSwapTotal());
        long swapUsed = safeLong(memory.getVirtualMemory().getSwapUsed());

        long totalDisk = 0L;
        long availableDisk = 0L;
        for (OSFileStore fileStore : operatingSystem.getFileSystem().getFileStores()) {
            long storeTotal = safeLong(fileStore.getTotalSpace());
            if (storeTotal <= 0) {
                continue;
            }
            totalDisk += storeTotal;
            availableDisk += Math.max(0L, safeLong(fileStore.getUsableSpace()));
        }

        double cpuLoad = normalizePercent(processor.getSystemCpuLoadBetweenTicks(previousCpuTicks) * 100.0);
        previousCpuTicks = processor.getSystemCpuLoadTicks();

        List<NetworkInterfaceSnapshot> interfaces = hardware.getNetworkIFs()
                .stream()
                .peek(NetworkIF::updateAttributes)
                .filter(this::isUsefulInterface)
                .map(item -> new NetworkInterfaceSnapshot(
                        item.getName(),
                        StringUtils.hasText(item.getDisplayName()) ? item.getDisplayName() : item.getName(),
                        item.getMacaddr(),
                        Math.max(0L, item.getSpeed()),
                        Math.max(0L, item.getBytesRecv()),
                        Math.max(0L, item.getBytesSent()),
                        Math.max(0L, item.getPacketsRecv()),
                        Math.max(0L, item.getPacketsSent())
                ))
                .sorted(Comparator.comparingLong((NetworkInterfaceSnapshot item) -> item.receivedBytes() + item.sentBytes()).reversed())
                .toList();

        long totalReceived = interfaces.stream().mapToLong(NetworkInterfaceSnapshot::receivedBytes).sum();
        long totalSent = interfaces.stream().mapToLong(NetworkInterfaceSnapshot::sentBytes).sum();
        long totalPacketsReceived = interfaces.stream().mapToLong(NetworkInterfaceSnapshot::receivedPackets).sum();
        long totalPacketsSent = interfaces.stream().mapToLong(NetworkInterfaceSnapshot::sentPackets).sum();
        long projectUptimeSeconds = Math.max(0L, ManagementFactory.getRuntimeMXBean().getUptime() / 1000L);

        return new SystemMonitorRawSnapshot(
                Instant.now(),
                operatingSystem.getFamily(),
                operatingSystem.getVersionInfo().getVersion(),
                operatingSystem.toString(),
                projectUptimeSeconds,
                processor.getProcessorIdentifier().getName(),
                processor.getPhysicalProcessorCount(),
                processor.getLogicalProcessorCount(),
                cpuLoad,
                totalMemory,
                availableMemory,
                swapTotal,
                swapUsed,
                totalDisk,
                availableDisk,
                totalReceived,
                totalSent,
                totalPacketsReceived,
                totalPacketsSent,
                interfaces
        );
    }

    private boolean isUsefulInterface(NetworkIF item) {
        String name = StringUtils.hasText(item.getName()) ? item.getName().toLowerCase() : "";
        String displayName = StringUtils.hasText(item.getDisplayName()) ? item.getDisplayName().toLowerCase() : "";
        boolean loopback = "lo".equals(name)
                || name.contains("loopback")
                || displayName.contains("loopback");
        if (loopback) {
            return false;
        }
        return item.getBytesRecv() > 0
                || item.getBytesSent() > 0
                || item.getPacketsRecv() > 0
                || item.getPacketsSent() > 0
                || item.getSpeed() > 0;
    }

    private long safeLong(long value) {
        return Math.max(0L, value);
    }

    private double normalizePercent(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0;
        }
        if (value < 0) {
            return 0.0;
        }
        return Math.min(100.0, value);
    }
}
