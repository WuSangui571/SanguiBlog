package com.sangui.sanguiblog.security.botguard;

import java.util.concurrent.atomic.AtomicIntegerArray;
import java.util.concurrent.atomic.AtomicLongArray;

public final class RollingWindowCounter60s {
    private static final int WINDOW_SECONDS = 60;
    private final AtomicIntegerArray counts = new AtomicIntegerArray(WINDOW_SECONDS);
    private final AtomicLongArray seconds = new AtomicLongArray(WINDOW_SECONDS);

    public void increment(long nowSec) {
        int idx = (int) (nowSec % WINDOW_SECONDS);
        long bucketSec = seconds.get(idx);
        if (bucketSec != nowSec) {
            if (seconds.compareAndSet(idx, bucketSec, nowSec)) {
                counts.set(idx, 0);
            }
        }
        counts.incrementAndGet(idx);
    }

    public int sum(long nowSec) {
        int total = 0;
        for (int i = 0; i < WINDOW_SECONDS; i++) {
            long sec = seconds.get(i);
            if (sec <= 0) {
                continue;
            }
            long delta = nowSec - sec;
            if (delta >= 0 && delta < WINDOW_SECONDS) {
                total += counts.get(i);
            }
        }
        return total;
    }
}

