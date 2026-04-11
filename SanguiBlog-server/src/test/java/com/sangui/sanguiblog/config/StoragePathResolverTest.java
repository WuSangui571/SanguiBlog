package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertThrows;

class StoragePathResolverTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldRejectAvatarPathTraversal() {
        StoragePathResolver resolver = new StoragePathResolver(tempDir.toString());

        assertThrows(IllegalArgumentException.class, () -> resolver.resolveAvatarFile("../../sanguiblog_db.sql"));
    }
}
