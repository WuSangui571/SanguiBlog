package com.sangui.sanguiblog.service;

public record NetworkInterfaceSnapshot(
        String name,
        String displayName,
        String macAddress,
        long speedBitsPerSecond,
        long receivedBytes,
        long sentBytes,
        long receivedPackets,
        long sentPackets
) {
}
