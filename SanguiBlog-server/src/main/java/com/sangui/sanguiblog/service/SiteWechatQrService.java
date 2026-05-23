package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.SiteWechatQrDto;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SiteWechatQrService {

    private static final Logger log = LoggerFactory.getLogger(SiteWechatQrService.class);
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif", "image/avif");
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(
            ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif");
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    private final UserRepository userRepository;
    private final StoragePathResolver storagePathResolver;

    public User resolveSuperAdminUser() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && "SUPER_ADMIN".equals(u.getRole().getCode()))
                .findFirst()
                .orElseGet(() -> userRepository.findByUsername("sangui")
                        .orElseThrow(() -> new IllegalArgumentException("未找到超级管理员用户")));
    }

    @Transactional
    public SiteWechatQrDto upload(MultipartFile file, Long operatorId) {
        validateImageFile(file);

        User superAdmin = resolveSuperAdminUser();
        String extension = extractExtension(file.getOriginalFilename());
        if (!StringUtils.hasText(extension)) {
            extension = ".png";
        }

        Path dir = storagePathResolver.ensureSubDirectory("site", "wechat");
        String filename = UUID.randomUUID() + extension;
        Path target = dir.resolve(filename).normalize();

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("保存微信二维码失败: " + e.getMessage(), e);
        }

        String previousUrl = superAdmin.getWechatQrUrl();
        String relativePath = "uploads/site/wechat/" + filename;
        superAdmin.setWechatQrUrl("/" + relativePath);
        userRepository.save(superAdmin);

        if (previousUrl != null && isOwnedLocalUpload(previousUrl)) {
            deleteLocalFileQuietly(previousUrl);
        }

        log.info("SUPER_ADMIN 更新首页微信二维码: url={}, fileSize={}, contentType={}, operatorId={}",
                "/" + relativePath, file.getSize(), file.getContentType(), operatorId);

        return SiteWechatQrDto.builder()
                .url("/" + relativePath)
                .build();
    }

    @Transactional
    public SiteWechatQrDto delete(Long operatorId) {
        User superAdmin = resolveSuperAdminUser();
        String previousUrl = superAdmin.getWechatQrUrl();

        superAdmin.setWechatQrUrl(null);
        userRepository.save(superAdmin);

        if (previousUrl != null && isOwnedLocalUpload(previousUrl)) {
            deleteLocalFileQuietly(previousUrl);
        }

        log.info("SUPER_ADMIN 删除首页微信二维码: previousUrl={}, operatorId={}", previousUrl, operatorId);

        return SiteWechatQrDto.builder()
                .url(null)
                .build();
    }

    private boolean isOwnedLocalUpload(String url) {
        if (url == null || url.isBlank()) return false;
        String normalized = url.trim().replace('\\', '/');
        return normalized.startsWith("/uploads/site/wechat/") || normalized.startsWith("uploads/site/wechat/");
    }

    private void deleteLocalFileQuietly(String filePath) {
        if (!StringUtils.hasText(filePath)) return;
        try {
            String relative = filePath.replace('\\', '/').replaceFirst("^/+", "");
            if (relative.startsWith("uploads/")) {
                relative = relative.substring("uploads/".length());
            }
            Path target = storagePathResolver.getRootPath().resolve(relative).normalize();
            if (!target.startsWith(storagePathResolver.getRootPath())) return;
            if (Files.exists(target)) {
                Files.delete(target);
            }
        } catch (IOException ignored) {
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请先选择微信二维码图片");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("微信二维码图片过大，最大支持 5MB");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("微信二维码仅支持 png/jpg/jpeg/webp/gif/avif");
        }
        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("微信二维码图片类型不被允许: " + contentType);
        }
    }

    private String extractExtension(String filename) {
        if (!StringUtils.hasText(filename)) {
            return "";
        }
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex >= filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex).toLowerCase();
    }
}
