package com.sangui.sanguiblog.service.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiProviderConcurrencyGuardTest {

    @Test
    void shouldRejectWhenFullAndIgnoreExtraRelease() {
        AiProviderConcurrencyGuard guard = new AiProviderConcurrencyGuard(1);

        assertTrue(guard.tryAcquire());
        assertFalse(guard.tryAcquire());

        guard.release();
        guard.release();

        assertEquals(1, guard.availablePermits());
        assertTrue(guard.tryAcquire());
        assertFalse(guard.tryAcquire());
    }
}
