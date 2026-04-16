package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.SystemMonitorDto;
import com.sangui.sanguiblog.model.entity.SystemMonitorSnapshot;
import com.sangui.sanguiblog.model.repository.SystemMonitorSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class SystemMonitorService {

    private static final Logger log = LoggerFactory.getLogger(SystemMonitorService.class);
    private static final Duration API_PERSIST_MIN_INTERVAL = Duration.ofMinutes(1);

    private final SystemMonitorMetricsProvider metricsProvider;
    private final SystemMonitorSnapshotRepository snapshotRepository;

    private final AtomicBoolean historyAvailable = new AtomicBoolean(true);
    private volatile SystemMonitorRawSnapshot previousSnapshot;
    private volatile Instant lastPersistedAt;

    public SystemMonitorDto current() {
        SystemMonitorRawSnapshot current = metricsProvider.sample();
        SystemMonitorRawSnapshot previous = previousSnapshot;
        previousSnapshot = current;

        maybePersistSnapshot(current);

        List<SystemMonitorDto.TrafficRangeDto> trafficRanges = buildTrafficRanges(current);
        SystemMonitorDto.ThroughputDto throughput = buildThroughput(current, previous);
        List<SystemMonitorDto.NetworkInterfaceDto> interfaces = buildInterfaceDtos(current, previous);
        int scoreValue = calculateScore(current, throughput);

        return SystemMonitorDto.builder()
                .sampledAt(current.sampledAt())
                .historyAvailable(historyAvailable.get())
                .historyNote(historyAvailable.get()
                        ? "分时段总流量来自系统监控历史快照；若刚启用监控，今天/近 7 天会随采样逐步累积。"
                        : "历史快照暂不可用，当前流量区间已回退为本次开机以来累计值；如需今天/近 7 天/全部记录，请先执行 SQL 创建 system_monitor_snapshots 表。")
                .host(SystemMonitorDto.HostDto.builder()
                        .osFamily(current.osFamily())
                        .osVersion(current.osVersion())
                        .displayName(current.displayName())
                        .processorName(current.processorName())
                        .physicalCores(current.physicalCores())
                        .logicalCores(current.logicalCores())
                        .uptimeSeconds(current.uptimeSeconds())
                        .build())
                .cpu(SystemMonitorDto.CpuDto.builder()
                        .percent(roundPercent(current.cpuLoadPercent()))
                        .physicalCores(current.physicalCores())
                        .logicalCores(current.logicalCores())
                        .description(current.physicalCores() + " 核 / " + current.logicalCores() + " 线程")
                        .build())
                .memory(SystemMonitorDto.MemoryDto.builder()
                        .totalBytes(current.memoryTotalBytes())
                        .availableBytes(current.memoryAvailableBytes())
                        .usedBytes(Math.max(0L, current.memoryTotalBytes() - current.memoryAvailableBytes()))
                        .swapTotalBytes(current.swapTotalBytes())
                        .swapUsedBytes(current.swapUsedBytes())
                        .percent(calcPercent(
                                Math.max(0L, current.memoryTotalBytes() - current.memoryAvailableBytes()),
                                current.memoryTotalBytes()))
                        .build())
                .disk(SystemMonitorDto.DiskDto.builder()
                        .totalBytes(current.diskTotalBytes())
                        .availableBytes(current.diskAvailableBytes())
                        .usedBytes(Math.max(0L, current.diskTotalBytes() - current.diskAvailableBytes()))
                        .percent(calcPercent(
                                Math.max(0L, current.diskTotalBytes() - current.diskAvailableBytes()),
                                current.diskTotalBytes()))
                        .build())
                .network(SystemMonitorDto.NetworkDto.builder()
                        .receivedBytes(current.networkBytesReceived())
                        .sentBytes(current.networkBytesSent())
                        .totalBytes(current.networkBytesReceived() + current.networkBytesSent())
                        .interfaces(interfaces)
                        .build())
                .throughput(throughput)
                .trafficRanges(trafficRanges)
                .score(SystemMonitorDto.ScoreDto.builder()
                        .value(scoreValue)
                        .label(scoreLabel(scoreValue))
                        .summary(scoreSummary(scoreValue, current, throughput))
                        .build())
                .build();
    }

    @Scheduled(fixedDelayString = "${monitor.system.sample-delay-ms:300000}", initialDelayString = "${monitor.system.initial-delay-ms:45000}")
    public void captureHistorySnapshot() {
        SystemMonitorRawSnapshot raw = metricsProvider.sample();
        previousSnapshot = raw;
        persistSnapshotQuietly(raw);
    }

    private void maybePersistSnapshot(SystemMonitorRawSnapshot snapshot) {
        Instant lastPersisted = lastPersistedAt;
        if (lastPersisted != null && Duration.between(lastPersisted, snapshot.sampledAt()).compareTo(API_PERSIST_MIN_INTERVAL) < 0) {
            return;
        }
        persistSnapshotQuietly(snapshot);
    }

    private void persistSnapshotQuietly(SystemMonitorRawSnapshot snapshot) {
        try {
            SystemMonitorSnapshot entity = new SystemMonitorSnapshot();
            entity.setSampledAt(snapshot.sampledAt());
            entity.setOsFamily(snapshot.osFamily());
            entity.setOsVersion(snapshot.osVersion());
            entity.setUptimeSeconds(snapshot.uptimeSeconds());
            entity.setCpuLoadPercent(roundPercent(snapshot.cpuLoadPercent()));
            entity.setMemoryTotalBytes(snapshot.memoryTotalBytes());
            entity.setMemoryUsedBytes(Math.max(0L, snapshot.memoryTotalBytes() - snapshot.memoryAvailableBytes()));
            entity.setDiskTotalBytes(snapshot.diskTotalBytes());
            entity.setDiskUsedBytes(Math.max(0L, snapshot.diskTotalBytes() - snapshot.diskAvailableBytes()));
            entity.setNetworkBytesReceived(snapshot.networkBytesReceived());
            entity.setNetworkBytesSent(snapshot.networkBytesSent());
            snapshotRepository.save(entity);
            historyAvailable.set(true);
            lastPersistedAt = snapshot.sampledAt();
        } catch (DataAccessException ex) {
            if (historyAvailable.compareAndSet(true, false)) {
                log.warn("system monitor history snapshot unavailable, fallback to uptime counters only: {}", ex.getMessage());
            }
        }
    }

    private List<SystemMonitorDto.TrafficRangeDto> buildTrafficRanges(SystemMonitorRawSnapshot current) {
        if (!historyAvailable.get()) {
            long total = current.networkBytesReceived() + current.networkBytesSent();
            return List.of(
                    buildTrafficRange("today", "今天", current.networkBytesReceived(), current.networkBytesSent()),
                    buildTrafficRange("last7days", "近 7 天", current.networkBytesReceived(), current.networkBytesSent()),
                    buildTrafficRange("all", "全部记录", current.networkBytesReceived(), current.networkBytesSent()),
                    buildTrafficRange("sinceBoot", "本次开机", current.networkBytesReceived(), current.networkBytesSent())
            );
        }

        try {
            ZoneId zone = ZoneId.systemDefault();
            Instant startOfToday = LocalDate.now(zone).atStartOfDay(zone).toInstant();
            Optional<SystemMonitorSnapshot> todayBaseline = snapshotRepository.findFirstBySampledAtGreaterThanEqualOrderBySampledAtAsc(startOfToday);
            Optional<SystemMonitorSnapshot> last7DaysBaseline = snapshotRepository.findFirstBySampledAtGreaterThanEqualOrderBySampledAtAsc(current.sampledAt().minus(Duration.ofDays(7)));
            Optional<SystemMonitorSnapshot> allBaseline = snapshotRepository.findTopByOrderBySampledAtAsc();

            List<SystemMonitorDto.TrafficRangeDto> ranges = new ArrayList<>();
            ranges.add(toRange("today", "今天", current, todayBaseline.orElse(null)));
            ranges.add(toRange("last7days", "近 7 天", current, last7DaysBaseline.orElse(null)));
            ranges.add(toRange("all", "全部记录", current, allBaseline.orElse(null)));
            ranges.add(buildTrafficRange("sinceBoot", "本次开机", current.networkBytesReceived(), current.networkBytesSent()));
            return ranges;
        } catch (DataAccessException ex) {
            historyAvailable.set(false);
            log.warn("system monitor history query unavailable, fallback to uptime counters only: {}", ex.getMessage());
            return buildTrafficRanges(current);
        }
    }

    private SystemMonitorDto.TrafficRangeDto toRange(String key, String label, SystemMonitorRawSnapshot current, SystemMonitorSnapshot baseline) {
        if (baseline == null) {
            return buildTrafficRange(key, label, current.networkBytesReceived(), current.networkBytesSent());
        }
        long received = delta(current.networkBytesReceived(), baseline.getNetworkBytesReceived());
        long sent = delta(current.networkBytesSent(), baseline.getNetworkBytesSent());
        return buildTrafficRange(key, label, received, sent);
    }

    private SystemMonitorDto.TrafficRangeDto buildTrafficRange(String key, String label, long received, long sent) {
        return SystemMonitorDto.TrafficRangeDto.builder()
                .key(key)
                .label(label)
                .receivedBytes(Math.max(0L, received))
                .sentBytes(Math.max(0L, sent))
                .totalBytes(Math.max(0L, received) + Math.max(0L, sent))
                .build();
    }

    private SystemMonitorDto.ThroughputDto buildThroughput(SystemMonitorRawSnapshot current, SystemMonitorRawSnapshot previous) {
        if (previous == null) {
            return SystemMonitorDto.ThroughputDto.builder()
                    .receivedBytesPerSecond(0L)
                    .sentBytesPerSecond(0L)
                    .totalBytesPerSecond(0L)
                    .build();
        }
        double elapsedSeconds = Math.max(0.001d, Duration.between(previous.sampledAt(), current.sampledAt()).toMillis() / 1000.0d);
        long received = Math.round(delta(current.networkBytesReceived(), previous.networkBytesReceived()) / elapsedSeconds);
        long sent = Math.round(delta(current.networkBytesSent(), previous.networkBytesSent()) / elapsedSeconds);
        return SystemMonitorDto.ThroughputDto.builder()
                .receivedBytesPerSecond(Math.max(0L, received))
                .sentBytesPerSecond(Math.max(0L, sent))
                .totalBytesPerSecond(Math.max(0L, received) + Math.max(0L, sent))
                .build();
    }

    private List<SystemMonitorDto.NetworkInterfaceDto> buildInterfaceDtos(SystemMonitorRawSnapshot current, SystemMonitorRawSnapshot previous) {
        Map<String, NetworkInterfaceSnapshot> previousMap = new LinkedHashMap<>();
        if (previous != null) {
            previous.interfaces().forEach(item -> previousMap.put(interfaceKey(item), item));
        }
        double elapsedSeconds = previous == null
                ? 0.0d
                : Math.max(0.001d, Duration.between(previous.sampledAt(), current.sampledAt()).toMillis() / 1000.0d);

        return current.interfaces()
                .stream()
                .map(item -> {
                    NetworkInterfaceSnapshot previousItem = previousMap.get(interfaceKey(item));
                    long throughputRecv = 0L;
                    long throughputSent = 0L;
                    if (previousItem != null && elapsedSeconds > 0) {
                        throughputRecv = Math.round(delta(item.receivedBytes(), previousItem.receivedBytes()) / elapsedSeconds);
                        throughputSent = Math.round(delta(item.sentBytes(), previousItem.sentBytes()) / elapsedSeconds);
                    }
                    return SystemMonitorDto.NetworkInterfaceDto.builder()
                            .name(item.name())
                            .displayName(item.displayName())
                            .macAddress(item.macAddress())
                            .speedBitsPerSecond(item.speedBitsPerSecond())
                            .receivedBytes(item.receivedBytes())
                            .sentBytes(item.sentBytes())
                            .throughputReceivedBytesPerSecond(Math.max(0L, throughputRecv))
                            .throughputSentBytesPerSecond(Math.max(0L, throughputSent))
                            .build();
                })
                .sorted(Comparator.comparingLong((SystemMonitorDto.NetworkInterfaceDto item) -> item.getReceivedBytes() + item.getSentBytes()).reversed())
                .toList();
    }

    private int calculateScore(SystemMonitorRawSnapshot current, SystemMonitorDto.ThroughputDto throughput) {
        double cpuPenalty = roundPercent(current.cpuLoadPercent()) * 0.35d;
        double memoryPenalty = calcPercent(
                Math.max(0L, current.memoryTotalBytes() - current.memoryAvailableBytes()),
                current.memoryTotalBytes()) * 0.30d;
        double diskPenalty = calcPercent(
                Math.max(0L, current.diskTotalBytes() - current.diskAvailableBytes()),
                current.diskTotalBytes()) * 0.20d;
        long maxInterfaceSpeedBits = current.interfaces().stream()
                .mapToLong(NetworkInterfaceSnapshot::speedBitsPerSecond)
                .max()
                .orElse(0L);
        double throughputPercent = maxInterfaceSpeedBits > 0
                ? Math.min(100.0d, ((throughput.getTotalBytesPerSecond() * 8.0d) / maxInterfaceSpeedBits) * 100.0d)
                : Math.min(100.0d, throughput.getTotalBytesPerSecond() / (1024.0d * 1024.0d * 8.0d) * 100.0d);
        double throughputPenalty = throughputPercent * 0.15d;
        int score = (int) Math.round(100.0d - cpuPenalty - memoryPenalty - diskPenalty - throughputPenalty);
        if (score < 0) {
            return 0;
        }
        return Math.min(100, score);
    }

    private String scoreLabel(int score) {
        if (score >= 85) {
            return "优秀";
        }
        if (score >= 70) {
            return "良好";
        }
        if (score >= 55) {
            return "关注";
        }
        return "高压";
    }

    private String scoreSummary(int score, SystemMonitorRawSnapshot current, SystemMonitorDto.ThroughputDto throughput) {
        if (score >= 85) {
            return "系统负载较轻，资源空间充足，当前运行状态稳定。";
        }
        if (score >= 70) {
            return "系统整体健康，建议继续观察高峰期 CPU、内存和流量变化。";
        }
        if (score >= 55) {
            return "系统已进入需重点关注区间，建议排查高占用资源与网络峰值。";
        }
        return "系统压力偏高，建议优先检查 CPU、内存、磁盘余量与当前吞吐峰值。";
    }

    private String interfaceKey(NetworkInterfaceSnapshot item) {
        return item.name() + "#" + item.macAddress();
    }

    private long delta(long current, Long baseline) {
        if (baseline == null) {
            return current;
        }
        if (current >= baseline) {
            return current - baseline;
        }
        return current;
    }

    private double calcPercent(long used, long total) {
        if (total <= 0) {
            return 0.0d;
        }
        return roundPercent((used * 100.0d) / total);
    }

    private double roundPercent(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0d;
        }
        double normalized = Math.max(0.0d, Math.min(100.0d, value));
        return Math.round(normalized * 10.0d) / 10.0d;
    }
}
