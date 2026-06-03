package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StoragePathResolverTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldRejectAvatarPathTraversal() {
        StoragePathResolver resolver = new StoragePathResolver(tempDir.toString());

        assertThrows(IllegalArgumentException.class, () -> resolver.resolveAvatarFile("../../sanguiblog_db.sql"));
    }

    @Test
    void shouldFailFastWhenRootDirectoryIsNotWritable() throws IOException {
        Path root = tempDir.resolve("storage");
        Files.createDirectories(root);

        try {
            makeReadOnlyDirectory(root);
            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    new StoragePathResolver(root.toString()));
            assertTrue(ex.getMessage().contains("不可写"), "error message should mention 不可写");
            assertTrue(ex.getMessage().contains("chown"), "error message should include chown hint");
        } finally {
            restoreWritableDirectory(root);
        }
    }

    @Test
    void shouldFailFastWhenCriticalSubDirectoryIsNotWritable() throws IOException {
        Path root = tempDir.resolve("storage");
        Path covers = root.resolve("covers");
        Files.createDirectories(covers);

        try {
            makeReadOnlyDirectory(covers);
            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    new StoragePathResolver(root.toString()));
            assertTrue(ex.getMessage().contains("不可写"), "error message should mention 不可写");
            assertTrue(ex.getMessage().contains(covers.toAbsolutePath().normalize().toString()),
                    "error message should identify the non-writable directory");
            assertTrue(ex.getMessage().contains("chown"), "error message should include chown hint");
        } finally {
            restoreWritableDirectory(covers);
        }
    }

    private void makeReadOnlyDirectory(Path path) throws IOException {
        try {
            Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("r-xr-xr-x"));
        } catch (UnsupportedOperationException e) {
            Assumptions.abort("Platform does not support POSIX file permissions");
        }
        Assumptions.assumeFalse(Files.isWritable(path),
                "Current process can still write to POSIX read-only directory");
    }

    private void restoreWritableDirectory(Path path) throws IOException {
        try {
            Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rwxr-xr-x"));
        } catch (UnsupportedOperationException ignored) {
            // Nothing to restore on platforms that do not support POSIX permissions.
        }
    }
}
