package com.sangui.sanguiblog.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 统一管理所有本地静态资源的根路径，便于通过配置切换存储位置。
 */
@Component
public class StoragePathResolver {

    private final Path rootPath;

    public StoragePathResolver(@Value("${storage.base-path:uploads}") String rootPath) {
        this.rootPath = Paths.get(rootPath).toAbsolutePath().normalize();
        initializeDefaultDirectories();
    }

    private void initializeDefaultDirectories() {
        ensureDirectoryExists(this.rootPath);
        ensureDirectoryExists(getAvatarDir());
    }

    private void ensureDirectoryExists(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new IllegalStateException("无法创建存储目录: " + path, e);
        }
    }

    public Path getRootPath() {
        return rootPath;
    }

    public Path getAvatarDir() {
        return resolve("avatar");
    }

    public Path resolve(String first, String... more) {
        return rootPath.resolve(Paths.get(first, more)).normalize();
    }

    public Path ensureSubDirectory(String first, String... more) {
        Path dir = resolve(first, more);
        ensureDirectoryExists(dir);
        return dir;
    }

    public Path resolveAvatarFile(String filename) {
        ensureDirectoryExists(getAvatarDir());
        return getAvatarDir().resolve(filename).normalize();
    }

    public String toResourceLocation(Path directory) {
        return directory.toUri().toString();
    }
}
