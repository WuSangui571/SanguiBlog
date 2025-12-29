package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.GamePageAdminDto;
import com.sangui.sanguiblog.model.dto.GamePageDetailDto;
import com.sangui.sanguiblog.model.dto.GamePageDto;
import com.sangui.sanguiblog.model.dto.GamePageRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.entity.GamePage;
import com.sangui.sanguiblog.model.repository.GamePageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GamePageService {

    private final GamePageRepository gamePageRepository;
    private final StoragePathResolver storagePathResolver;

    public record CreateResult(GamePageAdminDto data, String message) {
    }

    @Transactional(readOnly = true)
    public List<GamePageDto> listActive() {
        return gamePageRepository.findAllByStatusOrderBySortOrderDescUpdatedAtDesc(GamePage.Status.ACTIVE)
                .stream()
                .sorted(Comparator.comparing(GamePage::getSortOrder, Comparator.nullsLast(Integer::compareTo)).reversed()
                        .thenComparing(GamePage::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<GamePageAdminDto> adminList(String keyword, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page - 1, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<GamePage> result;
        if (StringUtils.hasText(keyword)) {
            result = gamePageRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(keyword, keyword, pageable);
        } else {
            result = gamePageRepository.findAll(pageable);
        }
        List<GamePageAdminDto> records = result.getContent().stream()
                .map(this::toAdminDto)
                .toList();
        return PageResponse.<GamePageAdminDto>builder()
                .records(records)
                .total(result.getTotalElements())
                .page(page)
                .size(size)
                .build();
    }

    @Transactional(readOnly = true)
    public GamePageDetailDto getDetail(Long idOrNull) {
        if (idOrNull == null) {
            throw new NotFoundException("游戏页面不存在");
        }
        GamePage page = gamePageRepository.findById(idOrNull)
                .orElseThrow(() -> new NotFoundException("游戏页面不存在"));
        if (page.getStatus() != GamePage.Status.ACTIVE) {
            throw new IllegalStateException("该页面未发布或已停用");
        }
        return toDetailDto(page);
    }

    @Transactional
    public CreateResult create(GamePageRequest request, MultipartFile file, Long operatorId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请上传 HTML 文件");
        }
        SlugResolution slugResolution = resolveSlugByUploadedFilename(file, request != null ? request.getTitle() : null);
        GamePage entity = new GamePage();
        entity.setTitle(request.getTitle());
        entity.setDescription(request.getDescription());
        entity.setStatus(parseStatus(request.getStatus(), GamePage.Status.ACTIVE));
        entity.setSortOrder(Optional.ofNullable(request.getSortOrder()).orElse(0));
        entity.setSlug(slugResolution.slug());
        entity.setCreatedBy(operatorId);
        entity.setUpdatedBy(operatorId);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());

        String filePath = storeHtmlFile(entity.getSlug(), file);
        entity.setFilePath(filePath);
        GamePage saved = gamePageRepository.save(entity);
        String message = "ok";
        if (slugResolution.renamedDueToConflict()) {
            message = "检测到同名游戏目录已存在，已自动改为 `" + slugResolution.slug() + "`（原计划目录为 `" + slugResolution.baseSlug() + "`），请避免重复上传同名 HTML。";
        }
        return new CreateResult(toAdminDto(saved), message);
    }

    @Transactional
    public GamePageAdminDto update(Long id, GamePageRequest request, MultipartFile file, Long operatorId) {
        GamePage entity = gamePageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("游戏页面不存在"));
        if (StringUtils.hasText(request.getTitle())) {
            entity.setTitle(request.getTitle());
        }
        entity.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            entity.setStatus(parseStatus(request.getStatus(), entity.getStatus()));
        }
        if (request.getSortOrder() != null) {
            entity.setSortOrder(request.getSortOrder());
        }
        if (file != null && !file.isEmpty()) {
            String filePath = storeHtmlFile(entity.getSlug(), file);
            entity.setFilePath(filePath);
        }
        entity.setUpdatedBy(operatorId);
        entity.setUpdatedAt(Instant.now());
        return toAdminDto(gamePageRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        GamePage entity = gamePageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("游戏页面不存在"));
        deleteFileQuietly(entity.getFilePath());
        gamePageRepository.delete(entity);
    }

    private GamePage.Status parseStatus(String status, GamePage.Status defaultStatus) {
        if (!StringUtils.hasText(status)) return defaultStatus;
        try {
            return GamePage.Status.valueOf(status.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return defaultStatus;
        }
    }

    private record SlugResolution(String baseSlug, String slug, boolean renamedDueToConflict) {
    }

    private SlugResolution resolveSlugByUploadedFilename(MultipartFile file, String fallbackTitle) {
        String originalFilename = file != null ? file.getOriginalFilename() : null;
        String baseName = extractFilenameBase(originalFilename);
        String normalizedBase = normalizeSlugBase(StringUtils.hasText(baseName) ? baseName : fallbackTitle);
        return resolveUniqueSlug(normalizedBase);
    }

    private SlugResolution resolveUniqueSlug(String baseSlug) {
        String base = normalizeSlugBase(baseSlug);
        String candidate = base;
        boolean renamed = false;
        if (isSlugOccupied(candidate)) {
            renamed = true;
            int suffix = 2;
            while (isSlugOccupied(base + suffix)) {
                suffix++;
            }
            candidate = base + suffix;
        }
        return new SlugResolution(base, candidate, renamed);
    }

    private boolean isSlugOccupied(String slug) {
        if (!StringUtils.hasText(slug)) return true;
        if (gamePageRepository.existsBySlug(slug)) return true;
        try {
            Path dir = storagePathResolver.resolve("games", slug);
            return Files.exists(dir);
        } catch (RuntimeException e) {
            return true;
        }
    }

    private String extractFilenameBase(String originalFilename) {
        if (!StringUtils.hasText(originalFilename)) return null;
        String name = originalFilename.replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        if (!StringUtils.hasText(name)) return null;
        int dot = name.lastIndexOf('.');
        if (dot > 0) {
            return name.substring(0, dot);
        }
        return name;
    }

    private String normalizeSlugBase(String base) {
        String raw = StringUtils.hasText(base) ? base : "game";
        String normalized = raw.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return StringUtils.hasText(normalized) ? normalized : "game";
    }

    private String storeHtmlFile(String slug, MultipartFile file) {
        String original = file.getOriginalFilename();
        String extension = "html";
        if (original != null && original.contains(".")) {
            extension = original.substring(original.lastIndexOf('.') + 1);
        }
        if (!extension.equalsIgnoreCase("html") && !extension.equalsIgnoreCase("htm")) {
            throw new IllegalArgumentException("仅支持上传 HTML 文件");
        }
        String filename = "index.html";
        Path dir = storagePathResolver.ensureSubDirectory("games", slug);
        try {
            Path target = dir.resolve(filename).normalize();
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            Path relative = storagePathResolver.getRootPath().relativize(target.toAbsolutePath().normalize());
            String normalized = relative.toString().replace('\\', '/');
            if (!normalized.startsWith("uploads/")) {
                normalized = "uploads/" + normalized;
            }
            return normalized;
        } catch (IOException e) {
            throw new IllegalStateException("保存 HTML 文件失败: " + e.getMessage(), e);
        }
    }

    private void deleteFileQuietly(String filePath) {
        if (!StringUtils.hasText(filePath)) return;
        try {
            String relative = filePath.replace('\\', '/');
            relative = relative.replaceFirst("^/+", "");
            if (relative.startsWith("uploads/")) {
                relative = relative.substring("uploads/".length());
            }
            Path target = storagePathResolver.getRootPath().resolve(relative).normalize();
            if (Files.exists(target)) {
                Files.delete(target);
            }
            // also try to delete parent directory if empty
            Path parent = target.getParent();
            if (parent != null && Files.isDirectory(parent)) {
                try (var stream = Files.list(parent)) {
                    if (!stream.findAny().isPresent()) {
                        Files.delete(parent);
                    }
                }
            }
        } catch (IOException ignored) {
        }
    }

    private String buildUrl(GamePage entity) {
        if (entity == null || !StringUtils.hasText(entity.getFilePath())) return null;
        String normalized = entity.getFilePath().replace('\\', '/');
        if (!normalized.startsWith("uploads/") && !normalized.startsWith("/uploads/")) {
            normalized = "uploads/" + normalized.replaceFirst("^/+", "");
        }
        return normalized.startsWith("/") ? normalized : "/" + normalized;
    }

    private GamePageDto toDto(GamePage entity) {
        return GamePageDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .url(buildUrl(entity))
                .slug(entity.getSlug())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private GamePageAdminDto toAdminDto(GamePage entity) {
        return GamePageAdminDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .slug(entity.getSlug())
                .url(buildUrl(entity))
                .status(entity.getStatus().name())
                .sortOrder(entity.getSortOrder())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private GamePageDetailDto toDetailDto(GamePage entity) {
        return GamePageDetailDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .slug(entity.getSlug())
                .url(buildUrl(entity))
                .status(entity.getStatus().name())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
