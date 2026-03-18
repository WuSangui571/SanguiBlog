package com.sangui.sanguiblog.service.ai.rag;

import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.UUID;

public final class AiCustomKnowledgeSupport {

    private AiCustomKnowledgeSupport() {
    }

    public static String buildVectorDocumentId(Long documentId, int chunkNo) {
        String raw = "admin-text-" + documentId + "-chunk-" + chunkNo;
        return UUID.nameUUIDFromBytes(raw.getBytes(StandardCharsets.UTF_8)).toString();
    }

    public static String deriveTitle(String explicitTitle, String originalFilename) {
        if (StringUtils.hasText(explicitTitle)) {
            return explicitTitle.trim();
        }
        String fallback = originalFilename == null ? "" : originalFilename.trim();
        if (!StringUtils.hasText(fallback)) {
            return "未命名知识库";
        }
        int slash = Math.max(fallback.lastIndexOf('/'), fallback.lastIndexOf('\\'));
        if (slash >= 0) {
            fallback = fallback.substring(slash + 1);
        }
        int dot = fallback.lastIndexOf('.');
        if (dot > 0) {
            fallback = fallback.substring(0, dot);
        }
        return StringUtils.hasText(fallback) ? fallback : "未命名知识库";
    }

    public static String normalizeImportedText(String rawText) {
        String normalized = rawText == null ? "" : rawText.replace("\uFEFF", "");
        normalized = normalized.replace("\r\n", "\n").replace('\r', '\n').trim();
        if (!StringUtils.hasText(normalized)) {
            throw new IllegalArgumentException("导入的知识库文本不能为空");
        }
        return normalized;
    }

    public static String buildKnowledgeText(String title, String originalFilename, String contentText) {
        return String.join("\n",
                "标题: " + safe(title),
                "原始文件名: " + safe(originalFilename),
                "正文:",
                safe(contentText));
    }

    public static String buildContentHash(String title, String originalFilename, String contentText, boolean enabled) {
        return sha256(String.join("\n",
                safe(title),
                safe(originalFilename),
                safe(contentText),
                String.valueOf(enabled)));
    }

    public static boolean isSupportedTextFile(String filename) {
        if (!StringUtils.hasText(filename)) {
            return false;
        }
        String lower = filename.trim().toLowerCase(Locale.ROOT);
        return lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
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
            throw new IllegalStateException("当前环境不支持 SHA-256", ex);
        }
    }
}
