package com.sangui.sanguiblog.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assumptions.assumeFalse;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.junit.jupiter.api.Assertions.*;

class StoragePathResolverTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldCreateAndResolveDefaultDirectories() {
        StoragePathResolver resolver = new StoragePathResolver(tempDir.toString());

        assertNotNull(resolver.getRootPath());
        assertNotNull(resolver.getAvatarDir());
        assertNotNull(resolver.getPostsDir());
        assertNotNull(resolver.getCoversDir());
    }

    @Test
    void shouldEnsureDirectoriesExistAndAreWritable() {
        StoragePathResolver resolver = new StoragePathResolver(tempDir.toString());

        assertTrue(Files.isDirectory(resolver.getRootPath()));
        assertTrue(Files.isWritable(resolver.getRootPath()));
        assertTrue(Files.isDirectory(resolver.getAvatarDir()));
        assertTrue(Files.isWritable(resolver.getAvatarDir()));
        assertTrue(Files.isDirectory(resolver.getPostsDir()));
        assertTrue(Files.isWritable(resolver.getPostsDir()));
        assertTrue(Files.isDirectory(resolver.getCoversDir()));
        assertTrue(Files.isWritable(resolver.getCoversDir()));
    }

    @Test
    void shouldRejectUnwritableDirectory() {
        String os = System.getProperty("os.name").toLowerCase();
        assumeFalse(os.contains("win"), "Windows directory writable flags are not reliable for this check");

        Path unwritableDir = tempDir.resolve("readonly");
        try {
            Files.createDirectories(unwritableDir);
        } catch (Exception e) {
            assumeTrue(false, "Unable to create test directory: " + e.getMessage());
        }
        assumeTrue(unwritableDir.toFile().setWritable(false), "Unable to make test directory read-only");

        try {
            new StoragePathResolver(unwritableDir.toString());
            fail("Expected IllegalStateException for non-writable directory");
        } catch (IllegalStateException e) {
            assertTrue(e.getMessage().contains("不可写"));
        } finally {
            unwritableDir.toFile().setWritable(true);
        }
    }

    @Test
    void shouldRejectAvatarPathTraversal() {
        StoragePathResolver resolver = new StoragePathResolver(tempDir.toString());

        assertThrows(IllegalArgumentException.class, () -> resolver.resolveAvatarFile("../../sanguiblog_db.sql"));
    }

    @Test
    void shouldRejectPathTraversalInResolve() {
        StoragePathResolver resolver = new StoragePathResolver(tempDir.toString());

        assertThrows(IllegalArgumentException.class, () -> resolver.resolve(".."));
    }
}
