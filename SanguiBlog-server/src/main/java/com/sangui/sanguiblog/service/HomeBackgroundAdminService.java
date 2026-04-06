package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.dto.HomeBackgroundAdminDto;
import com.sangui.sanguiblog.model.entity.HomeBackgroundImage;
import com.sangui.sanguiblog.model.repository.HomeBackgroundImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HomeBackgroundAdminService {

    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif", "image/avif");
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(
            ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif");
    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024;

    private final HomeBackgroundImageRepository homeBackgroundImageRepository;
    private final StoragePathResolver storagePathResolver;

    @Transactional(readOnly = true)
    public List<HomeBackgroundAdminDto> list() {
        return homeBackgroundImageRepository.findAllByOrderByIsCurrentDescUpdatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public String currentBackgroundUrl() {
        return homeBackgroundImageRepository.findFirstByIsCurrentTrueOrderByUpdatedAtDesc()
                .map(this::buildUrl)
                .orElse(null);
    }

    @Transactional
    public HomeBackgroundAdminDto upload(MultipartFile file, Long operatorId) {
        validateImageFile(file);

        String extension = extractExtension(file.getOriginalFilename());
        if (!StringUtils.hasText(extension)) {
            extension = ".jpg";
        }

        Path dir = storagePathResolver.ensureSubDirectory("home", "backgrounds");
        String filename = UUID.randomUUID() + extension;
        Path target = dir.resolve(filename).normalize();

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("保存首页背景图失败: " + e.getMessage(), e);
        }

        Instant now = Instant.now();
        clearCurrentFlag();

        HomeBackgroundImage entity = new HomeBackgroundImage();
        entity.setOriginalFilename(StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename().trim() : filename);
        entity.setFilePath("uploads/home/backgrounds/" + filename);
        entity.setContentType(file.getContentType());
        entity.setFileSize(file.getSize());
        entity.setIsCurrent(true);
        entity.setUploadedBy(operatorId);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        return toDto(homeBackgroundImageRepository.save(entity));
    }

    @Transactional
    public HomeBackgroundAdminDto setCurrent(Long id) {
        HomeBackgroundImage entity = homeBackgroundImageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("首页背景图不存在"));
        clearCurrentFlag();
        entity.setIsCurrent(true);
        entity.setUpdatedAt(Instant.now());
        return toDto(homeBackgroundImageRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        HomeBackgroundImage entity = homeBackgroundImageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("首页背景图不存在"));

        boolean deletingCurrent = Boolean.TRUE.equals(entity.getIsCurrent());
        deleteFileQuietly(entity.getFilePath());
        homeBackgroundImageRepository.delete(entity);

        if (deletingCurrent) {
            homeBackgroundImageRepository.findAll()
                    .stream()
                    .max(Comparator.comparing(HomeBackgroundImage::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .ifPresent(next -> {
                        clearCurrentFlag();
                        next.setIsCurrent(true);
                        next.setUpdatedAt(Instant.now());
                        homeBackgroundImageRepository.save(next);
                    });
        }
    }

    private void clearCurrentFlag() {
        homeBackgroundImageRepository.findAllByOrderByIsCurrentDescUpdatedAtDesc()
                .stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsCurrent()))
                .forEach(item -> {
                    item.setIsCurrent(false);
                    item.setUpdatedAt(Instant.now());
                    homeBackgroundImageRepository.save(item);
                });
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请先选择首页背景图文件");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("首页背景图过大，最大支持 20MB");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("首页背景图仅支持 png/jpg/jpeg/webp/gif/avif");
        }
        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("首页背景图类型不被允许: " + contentType);
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

    private void deleteFileQuietly(String filePath) {
        if (!StringUtils.hasText(filePath)) return;
        try {
            String relative = filePath.replace('\\', '/').replaceFirst("^/+", "");
            if (relative.startsWith("uploads/")) {
                relative = relative.substring("uploads/".length());
            }
            Path target = storagePathResolver.getRootPath().resolve(relative).normalize();
            if (Files.exists(target)) {
                Files.delete(target);
            }
        } catch (IOException ignored) {
        }
    }

    private String buildUrl(HomeBackgroundImage entity) {
        if (entity == null || !StringUtils.hasText(entity.getFilePath())) return null;
        String normalized = entity.getFilePath().replace('\\', '/');
        return normalized.startsWith("/") ? normalized : "/" + normalized;
    }

    private HomeBackgroundAdminDto toDto(HomeBackgroundImage entity) {
        return HomeBackgroundAdminDto.builder()
                .id(entity.getId())
                .originalFilename(entity.getOriginalFilename())
                .url(buildUrl(entity))
                .contentType(entity.getContentType())
                .fileSize(entity.getFileSize())
                .current(Boolean.TRUE.equals(entity.getIsCurrent()))
                .uploadedBy(entity.getUploadedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
