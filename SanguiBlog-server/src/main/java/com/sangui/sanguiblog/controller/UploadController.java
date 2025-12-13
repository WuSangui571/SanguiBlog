package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.service.PostAssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private static final List<String> ALLOWED_IMAGE_EXT = List.of(".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif");
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif", "image/avif");
    private static final long AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
    private static final long ASSET_MAX_BYTES = 8 * 1024 * 1024;  // 8MB per file
    private static final long ASSET_TOTAL_MAX_BYTES = 30 * 1024 * 1024; // 30MB per request
    private static final int MAX_ASSET_FILES = 10;
    private static final long COVER_MAX_BYTES = 5 * 1024 * 1024; // 5MB per cover
    private static final DateTimeFormatter COVER_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final StoragePathResolver storagePathResolver;
    private final PostAssetService postAssetService;

    @PostMapping("/avatar")
    public ApiResponse<Map<String, String>> uploadAvatar(@RequestParam("avatar") MultipartFile file) {
        validateImageFile(file, AVATAR_MAX_BYTES, "头像");

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : "";
            String filename = UUID.randomUUID().toString() + extension;

            Path filePath = storagePathResolver.resolveAvatarFile(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String url = "/avatar/" + filename;
            return ApiResponse.ok(Map.of("url", url, "filename", filename));

        } catch (IOException e) {
            throw new RuntimeException("文件上传失败: " + e.getMessage());
        }
    }

    @PostMapping("/post-cover")
    public ApiResponse<Map<String, String>> uploadPostCover(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "postSlug", required = false) String postSlug) {
        validateImageFile(file, COVER_MAX_BYTES, "封面");
        String folder = sanitizeCoverFolder(postSlug);
        Path dir = storagePathResolver.ensureRelativePath(folder);
        String extension = extractExtension(file.getOriginalFilename());
        if (extension.isEmpty()) {
            extension = ".png";
        }
        String filename = UUID.randomUUID().toString() + extension;
        try {
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("封面上传失败: " + e.getMessage());
        }
        String relativePath = folder + "/" + filename;
        String url = "/uploads/" + relativePath;
        return ApiResponse.ok(Map.of(
                "url", url,
                "path", relativePath,
                "filename", filename
        ));
    }

    @PostMapping("/post-assets/reserve")
    public ApiResponse<Map<String, String>> reservePostAssetsFolder(
            @RequestParam(value = "folder", required = false) String folder) {
        String slug = StringUtils.hasText(folder)
                ? postAssetService.normalizeFolderSlug(folder)
                : postAssetService.generateFolderSlug();
        return ApiResponse.ok(Map.of("folder", slug));
    }

    @PostMapping("/post-assets")
    public ApiResponse<Map<String, Object>> uploadPostAssets(
            @RequestParam(value = "folder", required = false) String folder,
            @RequestParam("files") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("请至少选择一张图片");
        }
        if (files.size() > MAX_ASSET_FILES) {
            throw new IllegalArgumentException("单次最多上传 " + MAX_ASSET_FILES + " 个文件");
        }
        long totalSize = files.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalSize > ASSET_TOTAL_MAX_BYTES) {
            throw new IllegalArgumentException("本次上传总大小超限，最多允许 " + (ASSET_TOTAL_MAX_BYTES / 1024 / 1024) + "MB");
        }
        files.forEach(file -> validateImageFile(file, ASSET_MAX_BYTES, "文章资源"));

        String slug = StringUtils.hasText(folder)
                ? postAssetService.normalizeFolderSlug(folder)
                : postAssetService.generateFolderSlug();
        Path baseDir = postAssetService.ensureFolder(slug);
        List<String> storedFiles = postAssetService.storeFiles(baseDir, files);
        List<String> urls = storedFiles.stream()
                .map(name -> "/uploads/" + slug + "/" + name)
                .collect(Collectors.toList());
        return ApiResponse.ok(Map.of(
                "folder", slug,
                "count", storedFiles.size(),
                "files", storedFiles,
                "urls", urls,
                "joined", String.join(";", urls)));
    }

    private String sanitizeCoverFolder(String postSlug) {
        String candidate = StringUtils.hasText(postSlug) ? postSlug.trim() : "";
        candidate = candidate.replace("\\", "/");
        candidate = candidate.replace("..", "");
        candidate = candidate.replaceAll("/{2,}", "/");
        candidate = candidate.replaceAll("^/+", "").replaceAll("/+$", "");
        if (candidate.startsWith("posts/")) {
            candidate = candidate.substring("posts/".length());
        }
        if (!StringUtils.hasText(candidate)) {
            candidate = "covers/" + COVER_DATE_FMT.format(LocalDate.now());
        } else if (!candidate.startsWith("covers/")) {
            candidate = "covers/" + candidate;
        }
        return candidate;
    }

    private void validateImageFile(MultipartFile file, long maxBytes, String scene) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(scene + "文件不能为空");
        }

        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(scene + "文件过大，限制 " + (maxBytes / 1024 / 1024) + "MB");
        }

        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXT.contains(ext)) {
            throw new IllegalArgumentException(scene + "文件类型不支持，仅允许 " + String.join("/", ALLOWED_IMAGE_EXT));
        }

        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType) && !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException(scene + "Content-Type 不被允许: " + contentType);
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
