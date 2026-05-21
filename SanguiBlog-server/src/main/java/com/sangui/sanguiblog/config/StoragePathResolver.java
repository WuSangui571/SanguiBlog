package com.sangui.sanguiblog.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;

/**
 * 统一管理所有本地静态资源的根路径，支持通过配置切换存储位置。
 */
@Component
public class StoragePathResolver {

    private static final Pattern SAFE_AVATAR_FILENAME = Pattern.compile("^[A-Za-z0-9._-]+$");

    private final Path rootPath;

    public StoragePathResolver(@Value("${storage.base-path:uploads}") String rootPath) {
        this.rootPath = Paths.get(rootPath).toAbsolutePath().normalize();
        initializeDefaultDirectories();
    }

    private void initializeDefaultDirectories() {
        ensureDirectoryExists(this.rootPath);
        ensureDirectoryExists(getAvatarDir());
        ensureDirectoryExists(getPostsDir());
        ensureDirectoryExists(getCoversDir());
    }

    public Path getRootPath() {
        return rootPath;
    }

    public Path getAvatarDir() {
        return resolve("avatar");
    }

    public Path getPostsDir() {
        return resolve("posts");
    }

    public Path getCoversDir() {
        return resolve("covers");
    }

    public Path resolve(String first, String... more) {
        Path path = rootPath.resolve(Paths.get(first, more)).normalize();
        if (!path.startsWith(rootPath)) {
            throw new IllegalArgumentException("非法存储路径: " + path);
        }
        return path;
    }

    public Path ensureSubDirectory(String first, String... more) {
        Path dir = resolve(first, more);
        ensureDirectoryExists(dir);
        return dir;
    }

    public Path ensureRelativePath(String relative) {
        Path dir = resolve(relative);
        ensureDirectoryExists(dir);
        return dir;
    }

    public Path resolveAvatarFile(String filename) {
        ensureDirectoryExists(getAvatarDir());
        String safeFilename = normalizeAvatarFilename(filename);
        return resolve("avatar", safeFilename);
    }

    public String normalizeAvatarFilename(String avatarPath) {
        if (avatarPath == null || avatarPath.isBlank()) {
            return null;
        }
        String value = avatarPath.trim().replace('\\', '/');
        if (value.startsWith("/avatar/")) {
            value = value.substring("/avatar/".length());
        } else if (value.startsWith("avatar/")) {
            value = value.substring("avatar/".length());
        } else if (value.contains("/avatar/")) {
            value = value.substring(value.lastIndexOf("/avatar/") + "/avatar/".length());
        } else if (value.startsWith("http://") || value.startsWith("https://")) {
            int idx = value.lastIndexOf('/');
            value = idx >= 0 && idx < value.length() - 1 ? value.substring(idx + 1) : "";
        }
        if (!SAFE_AVATAR_FILENAME.matcher(value).matches() || value.contains("..")) {
            throw new IllegalArgumentException("非法头像路径: " + avatarPath);
        }
        return value;
    }

    public String toResourceLocation(Path directory) {
        return directory.toUri().toString();
    }

    private void ensureDirectoryExists(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new IllegalStateException("无法创建存储目录: " + path, e);
        }
        if (!Files.isWritable(path)) {
            throw new IllegalStateException(
                    "存储目录存在但不可写: " + path
                    + " (请检查目录权限，Docker 环境下可执行: "
                    + "docker compose exec -u root backend sh -c \"chown -R sangui:sangui /data/uploads\")");
        }
    }
}
