package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.DeleteEmptyFoldersRequest;
import com.sangui.sanguiblog.model.dto.DeleteEmptyFoldersResponse;
import com.sangui.sanguiblog.model.dto.DeleteUnusedAssetsRequest;
import com.sangui.sanguiblog.model.dto.DeleteUnusedAssetsResponse;
import com.sangui.sanguiblog.model.dto.EmptyFolderScanResponse;
import com.sangui.sanguiblog.model.dto.UnusedAssetDto;
import com.sangui.sanguiblog.model.dto.UnusedAssetScanResponse;
import com.sangui.sanguiblog.model.entity.AboutPage;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AboutPageRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceService {

    private static final Pattern MARKDOWN_IMG = Pattern.compile("!\\[[^\\]]*]\\(([^)]+)\\)");
    private static final Pattern HTML_SRC = Pattern.compile("src\\s*=\\s*[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
    private static final Set<String> IMAGE_EXT = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif");

    private final StoragePathResolver storagePathResolver;
    private final PostRepository postRepository;
    private final AboutPageRepository aboutPageRepository;

    @Transactional(readOnly = true)
    public UnusedAssetScanResponse scanUnusedAssets() {
        Set<String> referenced = collectReferencedAssetPaths();
        Path postsDir = storagePathResolver.getPostsDir();
        List<UnusedAssetDto> unused = new ArrayList<>();
        long total = 0L;

        if (Files.exists(postsDir)) {
            try (var walk = Files.walk(postsDir)) {
                for (Path path : walk.filter(Files::isRegularFile).toList()) {
                    String relative = postsDir.relativize(path).toString().replace("\\", "/");
                    String normalized = "posts/" + relative;
                    if (isImageFile(path) && !referenced.contains(normalized)) {
                        long size = Files.size(path);
                        total += size;
                        unused.add(UnusedAssetDto.builder()
                                .path(normalized)
                                .url("/uploads/" + normalized)
                                .size(size)
                                .build());
                    }
                }
            } catch (IOException e) {
                throw new IllegalStateException("扫描上传目录失败: " + e.getMessage(), e);
            }
        }

        unused.sort(Comparator.comparing(UnusedAssetDto::getPath));

        return UnusedAssetScanResponse.builder()
                .unused(unused)
                .totalSize(total)
                .build();
    }

    @Transactional(readOnly = true)
    public EmptyFolderScanResponse scanEmptyFolders() {
        Path postsDir = storagePathResolver.getPostsDir();
        if (!Files.exists(postsDir)) {
            return EmptyFolderScanResponse.builder().emptyFolders(List.of()).build();
        }
        List<String> empty = new ArrayList<>();
        try (var walk = Files.walk(postsDir)) {
            // Collect directories only
            List<Path> dirs = walk.filter(Files::isDirectory).sorted(Comparator.reverseOrder()).toList();
            for (Path dir : dirs) {
                if (dir.equals(postsDir)) continue;
                try (var children = Files.list(dir)) {
                    boolean hasAny = children.findAny().isPresent();
                    if (!hasAny) {
                        String relative = postsDir.relativize(dir).toString().replace("\\", "/");
                        empty.add("posts/" + relative);
                    }
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException("扫描空目录失败: " + e.getMessage(), e);
        }
        empty.sort(Comparator.naturalOrder());
        return EmptyFolderScanResponse.builder().emptyFolders(empty).build();
    }

    @Transactional
    public DeleteUnusedAssetsResponse deleteUnusedAssets(DeleteUnusedAssetsRequest request) {
        Set<String> requested = normalizeInputPaths(request.getPaths());
        if (requested.isEmpty()) {
            return DeleteUnusedAssetsResponse.builder()
                    .deletedCount(0)
                    .freedSize(0)
                    .deletedPaths(List.of())
                    .skippedPaths(List.of())
                    .build();
        }

        Set<String> referenced = collectReferencedAssetPaths();
        Path root = storagePathResolver.getRootPath();
        Path postsDir = storagePathResolver.getPostsDir();

        List<String> deleted = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        long freed = 0L;

        for (String rel : requested) {
            if (referenced.contains(rel)) {
                skipped.add(rel);
                continue;
            }
            Path target = root.resolve(rel).normalize();
            if (!target.startsWith(postsDir)) {
                skipped.add(rel);
                continue;
            }
            try {
                if (Files.exists(target)) {
                    long size = Files.size(target);
                    Files.delete(target);
                    freed += size;
                    deleted.add(rel);
                    removeEmptyParents(target.getParent(), postsDir);
                } else {
                    skipped.add(rel);
                }
            } catch (IOException e) {
                log.warn("删除文件失败 {}: {}", target, e.getMessage());
                skipped.add(rel);
            }
        }

        return DeleteUnusedAssetsResponse.builder()
                .deletedCount(deleted.size())
                .freedSize(freed)
                .deletedPaths(deleted)
                .skippedPaths(skipped)
                .build();
    }

    @Transactional
    public DeleteEmptyFoldersResponse deleteEmptyFolders(DeleteEmptyFoldersRequest request) {
        Set<String> requested = normalizeInputPaths(request.getPaths());
        if (requested.isEmpty()) {
            return DeleteEmptyFoldersResponse.builder()
                    .deletedCount(0)
                    .deletedPaths(List.of())
                    .skippedPaths(List.of())
                    .build();
        }

        Path root = storagePathResolver.getRootPath();
        Path postsDir = storagePathResolver.getPostsDir();
        List<String> deleted = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        for (String rel : requested) {
            Path target = root.resolve(rel).normalize();
            if (!target.startsWith(postsDir) || target.equals(postsDir)) {
                skipped.add(rel);
                continue;
            }
            if (!Files.exists(target) || !Files.isDirectory(target)) {
                skipped.add(rel);
                continue;
            }
            try (var children = Files.list(target)) {
                boolean hasAny = children.findAny().isPresent();
                if (hasAny) {
                    skipped.add(rel);
                    continue;
                }
            } catch (IOException e) {
                skipped.add(rel);
                continue;
            }
            try {
                Files.deleteIfExists(target);
                deleted.add(rel);
                removeEmptyParents(target.getParent(), postsDir);
            } catch (IOException e) {
                log.warn("删除空目录失败 {}: {}", target, e.getMessage());
                skipped.add(rel);
            }
        }

        return DeleteEmptyFoldersResponse.builder()
                .deletedCount(deleted.size())
                .deletedPaths(deleted)
                .skippedPaths(skipped)
                .build();
    }

    private void removeEmptyParents(Path start, Path stopAtInclusive) throws IOException {
        Path current = start;
        while (current != null && current.startsWith(stopAtInclusive)) {
            if (Files.isDirectory(current)) {
                boolean empty;
                try (var children = Files.list(current)) {
                    empty = children.findAny().isEmpty();
                }
                if (empty) {
                    Files.deleteIfExists(current);
                    current = current.getParent();
                    continue;
                }
            }
            break;
        }
    }

    private Set<String> normalizeInputPaths(List<String> paths) {
        if (paths == null) return Set.of();
        return paths.stream()
                .map(this::normalizeAssetPath)
                .filter(StringUtils::hasText)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean isImageFile(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        if (dot < 0) return false;
        String ext = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        return IMAGE_EXT.contains(ext);
    }

    private Set<String> collectReferencedAssetPaths() {
        Set<String> referenced = new HashSet<>();

        List<Post> posts = postRepository.findAll();
        posts.forEach(post -> {
            referenced.addAll(extractAssetPaths(post.getContentMd()));
            referenced.addAll(extractAssetPaths(post.getContentHtml()));
        });

        aboutPageRepository.findTopByOrderByUpdatedAtDesc().ifPresent(about -> {
            referenced.addAll(extractAssetPaths(about.getContentMd()));
            referenced.addAll(extractAssetPaths(about.getContentHtml()));
        });

        return referenced;
    }

    private Set<String> extractAssetPaths(String content) {
        if (content == null || content.isBlank()) return Set.of();
        Set<String> results = new HashSet<>();

        Matcher md = MARKDOWN_IMG.matcher(content);
        while (md.find()) {
            String normalized = normalizeAssetPath(md.group(1));
            if (StringUtils.hasText(normalized)) {
                results.add(normalized);
            }
        }

        Matcher html = HTML_SRC.matcher(content);
        while (html.find()) {
            String normalized = normalizeAssetPath(html.group(1));
            if (StringUtils.hasText(normalized)) {
                results.add(normalized);
            }
        }

        return results;
    }

    private String normalizeAssetPath(String raw) {
        if (!StringUtils.hasText(raw)) return null;
        String cleaned = raw.trim();
        int hash = cleaned.indexOf('#');
        if (hash >= 0) cleaned = cleaned.substring(0, hash);
        int q = cleaned.indexOf('?');
        if (q >= 0) cleaned = cleaned.substring(0, q);

        if (cleaned.startsWith("data:")) return null;

        int uploadsIdx = cleaned.indexOf("/uploads/");
        if (uploadsIdx >= 0) {
            cleaned = cleaned.substring(uploadsIdx + "/uploads/".length());
        } else if (cleaned.startsWith("uploads/")) {
            cleaned = cleaned.substring("uploads/".length());
        }

        cleaned = cleaned.replace("\\", "/").replaceAll("^/+", "");
        if (!cleaned.startsWith("posts/")) {
            return null;
        }
        return cleaned;
    }
}
