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
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

    private final StoragePathResolver storagePathResolver;
    private final PostAssetService postAssetService;

    @PostMapping("/avatar")
    public ApiResponse<Map<String, String>> uploadAvatar(@RequestParam("avatar") MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;

            Path filePath = storagePathResolver.resolveAvatarFile(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String url = "/avatar/" + filename;
            return ApiResponse.ok(Map.of("url", url, "filename", filename));

        } catch (IOException e) {
            throw new RuntimeException("文件上传失败: " + e.getMessage());
        }
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
}
