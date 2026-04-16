package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.SystemMonitorDto;
import com.sangui.sanguiblog.model.entity.SystemMonitorSnapshot;
import com.sangui.sanguiblog.model.repository.SystemMonitorSnapshotRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SystemMonitorServiceTest {

    @Test
    void shouldBuildServerSystemSnapshotWithTrafficRangesAndScore() {
        Instant now = Instant.parse("2026-04-16T08:00:00Z");
        SystemMonitorMetricsProvider provider = () -> new SystemMonitorRawSnapshot(
                now,
                "Linux",
                "Ubuntu 24.04",
                "Ubuntu",
                12_345L,
                "AMD EPYC",
                8,
                16,
                42.5,
                16_000L,
                6_000L,
                2_000L,
                400L,
                100_000L,
                60_000L,
                1_000_000L,
                2_000_000L,
                10_000L,
                20_000L,
                List.of(new NetworkInterfaceSnapshot("eth0", "eth0", "00:11:22:33:44:55", 1_000_000_000L, 1_000_000L, 2_000_000L, 10_000L, 20_000L))
        );

        SystemMonitorSnapshotRepository repository = mock(SystemMonitorSnapshotRepository.class);
        SystemMonitorSnapshot baseline = new SystemMonitorSnapshot();
        baseline.setSampledAt(now.minusSeconds(3600));
        baseline.setNetworkBytesReceived(900_000L);
        baseline.setNetworkBytesSent(1_800_000L);
        when(repository.findFirstBySampledAtGreaterThanEqualOrderBySampledAtAsc(org.mockito.ArgumentMatchers.any()))
                .thenReturn(Optional.of(baseline));
        when(repository.findTopByOrderBySampledAtAsc()).thenReturn(Optional.of(baseline));

        SystemMonitorService service = new SystemMonitorService(provider, repository);

        SystemMonitorDto result = service.current();

        assertEquals("Linux", result.getHost().getOsFamily());
        assertEquals(42.5, result.getCpu().getPercent());
        assertEquals(10_000L, result.getMemory().getUsedBytes());
        assertEquals(40_000L, result.getDisk().getUsedBytes());
        assertEquals(3_000_000L, result.getNetwork().getTotalBytes());
        assertFalse(result.getTrafficRanges().isEmpty());
        assertTrue(result.getTrafficRanges().stream().anyMatch(item -> "today".equals(item.getKey())));
        assertNotNull(result.getScore());
        assertTrue(result.getScore().getValue() >= 0);
        assertTrue(result.getScore().getValue() <= 100);
    }
}
