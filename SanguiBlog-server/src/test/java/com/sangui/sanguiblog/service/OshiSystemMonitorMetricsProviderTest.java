package com.sangui.sanguiblog.service;

import org.junit.jupiter.api.Test;

import java.lang.management.ManagementFactory;

import static org.junit.jupiter.api.Assertions.assertTrue;

class OshiSystemMonitorMetricsProviderTest {

    @Test
    void shouldUseProjectProcessUptimeInsteadOfOperatingSystemUptime() {
        OshiSystemMonitorMetricsProvider provider = new OshiSystemMonitorMetricsProvider();

        long beforeSeconds = Math.max(0L, ManagementFactory.getRuntimeMXBean().getUptime() / 1000L);
        SystemMonitorRawSnapshot snapshot = provider.sample();
        long afterSeconds = Math.max(0L, ManagementFactory.getRuntimeMXBean().getUptime() / 1000L);

        assertTrue(snapshot.uptimeSeconds() >= beforeSeconds && snapshot.uptimeSeconds() <= afterSeconds + 2,
                "系统监控里的 uptime 应该是当前 Java 项目的运行时长，而不是操作系统开机时长");
    }
}
