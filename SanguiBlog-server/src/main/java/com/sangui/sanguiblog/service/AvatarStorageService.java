package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AvatarStorageService {

    private static final List<String> ALLOWED_IMAGE_EXT = List.of(".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif");
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif", "image/avif");
    private static final long AVATAR_MAX_BYTES = 2 * 1024 * 1024;

    private final StoragePathResolver storagePathResolver;

    public String storeAvatar(MultipartFile file) {
        validateAvatar(file);
        String extension = extractExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + extension;
        Path filePath = storagePathResolver.resolveAvatarFile(filename);
        try {
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("头像上传失败: " + e.getMessage(), e);
        }
    }

    public void validateAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("头像文件不能为空");
        }
        if (file.getSize() > AVATAR_MAX_BYTES) {
            throw new IllegalArgumentException("头像文件过大，限制 2MB");
        }
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXT.contains(ext)) {
            throw new IllegalArgumentException("头像文件类型不支持，仅允许 " + String.join("/", ALLOWED_IMAGE_EXT));
        }
        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("头像 Content-Type 不被允许: " + contentType);
        }
    }

    private String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot).toLowerCase();
    }
}
