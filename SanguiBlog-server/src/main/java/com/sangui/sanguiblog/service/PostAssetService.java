package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PostAssetService {

    private static final Pattern SAFE_CHARS = Pattern.compile("[^a-zA-Z0-9/_-]");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final StoragePathResolver storagePathResolver;

    public String normalizeFolderSlug(String candidate) {
        String normalized = StringUtils.hasText(candidate) ? candidate : "";
        normalized = normalized.trim().replace("\\", "/");
        normalized = normalized.replace("..", "");
        normalized = SAFE_CHARS.matcher(normalized).replaceAll("-");
        normalized = normalized.replaceAll("/{2,}", "/");
        normalized = normalized.replaceAll("^/+", "").replaceAll("/+$", "");
        if (!StringUtils.hasText(normalized)) {
            normalized = generateFolderSlug();
        }
        if (!normalized.startsWith("posts/")) {
            normalized = "posts/" + normalized;
        }
        return normalized;
    }

    public String generateFolderSlug() {
        return "posts/" + LocalDate.now().format(DATE_FMT) + "/" + UUID.randomUUID().toString().replace("-", "");
    }

    public Path ensureFolder(String slug) {
        String normalized = normalizeFolderSlug(slug);
        return storagePathResolver.ensureRelativePath(normalized);
    }

    public Path prepareCleanFolder(String slug) {
        Path dir = ensureFolder(slug);
        cleanDirectory(dir);
        return dir;
    }

    public void cleanDirectory(Path dir) {
        if (!Files.exists(dir)) {
            return;
        }
        try (var walk = Files.walk(dir)) {
            walk.sorted((a, b) -> b.compareTo(a)) // delete children first
                    .forEach(path -> {
                        try {
                            if (!path.equals(dir)) {
                                Files.deleteIfExists(path);
                            }
                        } catch (IOException ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
    }

    public void storeFiles(Path baseDir, List<MultipartFile> files) {
        String commonPrefix = detectCommonPrefix(files);
        for (MultipartFile file : files) {
            String relativeName = sanitizeRelativePath(file.getOriginalFilename());
            if (commonPrefix != null && relativeName.startsWith(commonPrefix + "/")) {
                relativeName = relativeName.substring(commonPrefix.length() + 1);
            }
            if (!StringUtils.hasText(relativeName)) {
                continue;
            }
            Path target = baseDir.resolve(relativeName).normalize();
            if (!target.startsWith(baseDir)) {
                throw new IllegalArgumentException("非法文件路径: " + relativeName);
            }
            try {
                Files.createDirectories(target.getParent());
                Files.copy(file.getInputStream(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                throw new IllegalStateException("保存文件失败: " + relativeName, e);
            }
        }
    }

    private String sanitizeRelativePath(String raw) {
        String relativeName = raw != null ? raw : "";
        relativeName = relativeName.replace("\\", "/");
        relativeName = relativeName.replace("..", "");
        relativeName = relativeName.replace("./", "");
        relativeName = relativeName.replaceAll("^/+", "");
        relativeName = relativeName.replaceAll("/{2,}", "/");
        return relativeName;
    }

    private String detectCommonPrefix(List<MultipartFile> files) {
        String prefix = null;
        boolean hasPrefix = true;
        for (MultipartFile file : files) {
            String name = sanitizeRelativePath(file.getOriginalFilename());
            int idx = name.indexOf('/');
            if (idx <= 0) {
                hasPrefix = false;
                break;
            }
            String current = name.substring(0, idx);
            if (!StringUtils.hasText(current)) {
                hasPrefix = false;
                break;
            }
            if (prefix == null) {
                prefix = current;
            } else if (!prefix.equals(current)) {
                hasPrefix = false;
                break;
            }
        }
        return hasPrefix ? prefix : null;
    }
}
