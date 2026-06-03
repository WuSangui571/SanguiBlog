package com.sangui.sanguiblog.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Semaphore;

@Component
public class AiProviderConcurrencyGuard {

    private static final Logger log = LoggerFactory.getLogger(AiProviderConcurrencyGuard.class);

    private final Semaphore semaphore;
    private final int maxConcurrency;

    public AiProviderConcurrencyGuard(
            @Value("${ai.provider.max-concurrency:3}") int maxConcurrency
    ) {
        this.maxConcurrency = Math.max(1, maxConcurrency);
        this.semaphore = new Semaphore(this.maxConcurrency);
        log.info("AI provider concurrency guard initialized: maxConcurrency={}", this.maxConcurrency);
    }

    public boolean tryAcquire() {
        boolean acquired = semaphore.tryAcquire();
        if (!acquired) {
            log.warn("AI provider concurrency guard: permit denied, current load may be at capacity");
        }
        return acquired;
    }

    public synchronized void release() {
        if (semaphore.availablePermits() >= maxConcurrency) {
            log.warn("AI provider concurrency guard: release ignored because no permit is currently held");
            return;
        }
        semaphore.release();
    }

    int availablePermits() {
        return semaphore.availablePermits();
    }
}
