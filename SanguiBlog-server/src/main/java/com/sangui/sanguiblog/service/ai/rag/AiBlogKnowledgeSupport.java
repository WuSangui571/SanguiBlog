package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.model.dto.AiChatResponse;
import com.sangui.sanguiblog.model.entity.Post;
import org.springframework.ai.document.Document;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AiBlogKnowledgeSupport {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private AiBlogKnowledgeSupport() {
    }

    public static String buildContentHash(Post post) {
        String base = String.join("\n",
                normalize(post.getTitle()),
                normalize(post.getSlug()),
                normalize(post.getExcerpt()),
                normalize(post.getContentMd()),
                normalize(post.getStatus()),
                format(post.getPublishedAt()),
                post.getUpdatedAt() == null ? "" : post.getUpdatedAt().toString(),
                normalize(post.getCategory() != null ? post.getCategory().getName() : ""),
                normalize(post.getTags().stream()
                        .map(tag -> tag.getName() == null ? "" : tag.getName())
                        .sorted()
                        .reduce((a, b) -> a + "," + b)
                        .orElse("")));
        return sha256(base);
    }

    public static String buildKnowledgeText(Post post) {
        List<String> sections = new ArrayList<>();
        sections.add("标题: " + normalize(post.getTitle()));
        if (StringUtils.hasText(post.getExcerpt())) {
            sections.add("摘要: " + normalize(post.getExcerpt()));
        }
        if (post.getCategory() != null && StringUtils.hasText(post.getCategory().getName())) {
            sections.add("分类: " + post.getCategory().getName().trim());
        }
        String tags = post.getTags().stream()
                .map(tag -> tag.getName() == null ? "" : tag.getName().trim())
                .filter(StringUtils::hasText)
                .sorted()
                .reduce((a, b) -> a + "、" + b)
                .orElse("");
        if (StringUtils.hasText(tags)) {
            sections.add("标签: " + tags);
        }
        if (post.getPublishedAt() != null) {
            sections.add("发布时间: " + format(post.getPublishedAt()));
        }
        sections.add("正文:\n" + normalize(post.getContentMd()));
        return String.join("\n", sections);
    }

    public static String buildVectorDocumentId(Long postId, int chunkNo) {
        String raw = "post-" + postId + "-chunk-" + chunkNo;
        return UUID.nameUUIDFromBytes(raw.getBytes(StandardCharsets.UTF_8)).toString();
    }

    public static String buildPostUrl(Long postId) {
        return "/article/" + postId;
    }

    public static String buildOverviewDocumentId() {
        return UUID.nameUUIDFromBytes("blog-overview".getBytes(StandardCharsets.UTF_8)).toString();
    }

    public static String buildOverviewText(List<Post> posts) {
        List<Post> safePosts = posts == null ? List.of() : posts;
        StringBuilder builder = new StringBuilder();
        builder.append("三桂博客已发布文章知识总览").append(System.lineSeparator());
        builder.append("当前共收录 ").append(safePosts.size()).append(" 篇已发布文章。").append(System.lineSeparator());
        builder.append("以下内容用于帮助回答“博客写过什么”“有哪些主题”“总结已发布文章”等泛问题。")
                .append(System.lineSeparator())
                .append(System.lineSeparator());

        for (int i = 0; i < safePosts.size(); i++) {
            Post post = safePosts.get(i);
            builder.append(i + 1).append(". ").append(normalize(post.getTitle()));
            if (post.getPublishedAt() != null) {
                builder.append("（").append(format(post.getPublishedAt())).append("）");
            }
            builder.append(System.lineSeparator());
            if (StringUtils.hasText(post.getExcerpt())) {
                builder.append("摘要: ").append(normalize(post.getExcerpt())).append(System.lineSeparator());
            }
            if (post.getCategory() != null && StringUtils.hasText(post.getCategory().getName())) {
                builder.append("分类: ").append(normalize(post.getCategory().getName())).append(System.lineSeparator());
            }
            String tags = post.getTags().stream()
                    .map(tag -> tag.getName() == null ? "" : tag.getName().trim())
                    .filter(StringUtils::hasText)
                    .sorted()
                    .reduce((a, b) -> a + "、" + b)
                    .orElse("");
            if (StringUtils.hasText(tags)) {
                builder.append("标签: ").append(tags).append(System.lineSeparator());
            }
            builder.append("链接: ").append(buildPostUrl(post.getId())).append(System.lineSeparator()).append(System.lineSeparator());
        }
        return builder.toString().trim();
    }

    public static String buildRagContext(List<Document> documents) {
        if (documents == null || documents.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("以下是三桂博客站点知识库中检索到的相关内容，可能来自已发布文章或超级管理员导入的文本知识库。");
        builder.append("仅在这些内容与用户问题相关时优先使用；若知识库没有提供足够信息，请明确说明，不要编造。");
        builder.append(System.lineSeparator()).append(System.lineSeparator());

        for (int i = 0; i < documents.size(); i++) {
            Document document = documents.get(i);
            Map<String, Object> metadata = document.getMetadata();
            builder.append("【资料").append(i + 1).append("】").append(System.lineSeparator());
            builder.append("标题: ").append(stringValue(metadata.get("title"), "未命名文档")).append(System.lineSeparator());
            String url = stringValue(metadata.get("url"), "");
            if (StringUtils.hasText(url)) {
                builder.append("链接: ").append(url).append(System.lineSeparator());
            }
            builder.append("内容片段:").append(System.lineSeparator());
            builder.append(trimToLength(document.getText(), 1500)).append(System.lineSeparator()).append(System.lineSeparator());
        }
        return builder.toString().trim();
    }

    public static List<AiChatResponse.ReferenceDto> buildReferences(List<Document> documents) {
        Map<String, AiChatResponse.ReferenceDto> unique = new LinkedHashMap<>();
        if (documents == null) {
            return List.of();
        }

        for (Document document : documents) {
            Map<String, Object> metadata = document.getMetadata();
            String sourceType = stringValue(metadata.get("sourceType"), "POST");
            Long sourceId = toLong(metadata.get("sourceId"));
            if (sourceId == null) {
                continue;
            }
            String uniqueKey = sourceType + ":" + sourceId;
            if (unique.containsKey(uniqueKey)) {
                continue;
            }
            unique.put(uniqueKey, AiChatResponse.ReferenceDto.builder()
                    .sourceType(sourceType)
                    .sourceId(sourceId)
                    .title(stringValue(metadata.get("title"), "未命名文档"))
                    .url(resolveReferenceUrl(sourceType, sourceId, metadata.get("url")))
                    .build());
        }
        return List.copyOf(unique.values());
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private static String format(LocalDateTime value) {
        return value == null ? "" : DATE_TIME_FORMATTER.format(value);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("当前运行环境不支持 SHA-256", ex);
        }
    }

    private static String trimToLength(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private static String stringValue(Object value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? defaultValue : text;
    }

    private static Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String resolveReferenceUrl(String sourceType, Long sourceId, Object value) {
        String url = stringValue(value, "");
        if (StringUtils.hasText(url)) {
            return url;
        }
        if ("POST".equalsIgnoreCase(sourceType)) {
            return buildPostUrl(sourceId);
        }
        return "";
    }
}
