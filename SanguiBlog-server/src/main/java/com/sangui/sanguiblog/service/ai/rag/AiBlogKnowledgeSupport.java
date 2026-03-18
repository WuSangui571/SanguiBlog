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
                normalize(post.getTags().stream().map(tag -> tag.getName() == null ? "" : tag.getName()).sorted().reduce((a, b) -> a + "," + b).orElse(""))
        );
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

    public static String buildRagContext(List<Document> documents) {
        if (documents == null || documents.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("以下是三桂博客已发布文章知识库中检索到的相关内容。");
        builder.append("仅在这些内容与用户问题相关时优先使用；若知识库没有提供足够信息，请明确说明，不要编造。");
        builder.append(System.lineSeparator()).append(System.lineSeparator());

        for (int i = 0; i < documents.size(); i++) {
            Document document = documents.get(i);
            Map<String, Object> metadata = document.getMetadata();
            builder.append("【资料").append(i + 1).append("】").append(System.lineSeparator());
            builder.append("标题: ").append(stringValue(metadata.get("title"), "未命名文章")).append(System.lineSeparator());
            builder.append("链接: ").append(stringValue(metadata.get("url"), "")).append(System.lineSeparator());
            builder.append("内容片段:").append(System.lineSeparator());
            builder.append(trimToLength(document.getText(), 1500)).append(System.lineSeparator()).append(System.lineSeparator());
        }

        return builder.toString().trim();
    }

    public static List<AiChatResponse.ReferenceDto> buildReferences(List<Document> documents) {
        Map<Long, AiChatResponse.ReferenceDto> unique = new LinkedHashMap<>();
        if (documents == null) {
            return List.of();
        }

        for (Document document : documents) {
            Map<String, Object> metadata = document.getMetadata();
            Long sourceId = toLong(metadata.get("sourceId"));
            if (sourceId == null || unique.containsKey(sourceId)) {
                continue;
            }
            unique.put(sourceId, AiChatResponse.ReferenceDto.builder()
                    .sourceType(stringValue(metadata.get("sourceType"), "POST"))
                    .sourceId(sourceId)
                    .title(stringValue(metadata.get("title"), "未命名文章"))
                    .url(stringValue(metadata.get("url"), buildPostUrl(sourceId)))
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
}
