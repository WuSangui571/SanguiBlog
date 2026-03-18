package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.model.entity.Post;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiBlogKnowledgeOverviewTest {

    @Test
    void shouldBuildOverviewTextContainingCountAndTitles() {
        Post first = new Post();
        first.setId(1L);
        first.setTitle("Spring Boot 3 升级实战");
        first.setExcerpt("记录升级过程中的兼容点");
        first.setPublishedAt(LocalDateTime.of(2026, 3, 1, 10, 0));
        first.setStatus("PUBLISHED");

        Post second = new Post();
        second.setId(2L);
        second.setTitle("React 状态管理整理");
        second.setExcerpt("总结常用方案");
        second.setPublishedAt(LocalDateTime.of(2026, 3, 2, 10, 0));
        second.setStatus("PUBLISHED");

        String text = AiBlogKnowledgeSupport.buildOverviewText(List.of(first, second));

        assertTrue(text.contains("当前共收录 2 篇已发布文章"));
        assertTrue(text.contains("Spring Boot 3 升级实战"));
        assertTrue(text.contains("React 状态管理整理"));
    }

    @Test
    void shouldSplitOverviewIntoStableChunkDocumentsWhenTextIsLarge() {
        List<Post> posts = IntStream.rangeClosed(1, 60)
                .mapToObj(index -> {
                    Post post = new Post();
                    post.setId((long) index);
                    post.setTitle("测试文章 " + index);
                    post.setExcerpt(("这是一段为了拉长知识总览文档而准备的摘要内容，编号 " + index + "。").repeat(10));
                    post.setPublishedAt(LocalDateTime.of(2026, 3, 1, 10, 0).plusDays(index));
                    post.setStatus("PUBLISHED");
                    return post;
                })
                .toList();

        List<Document> documents = AiBlogKnowledgeSupport.buildOverviewDocuments(posts, new TokenTextSplitter());

        assertFalse(documents.isEmpty());
        UUID.fromString(documents.get(0).getId());
        if (documents.size() > 1) {
            assertNotEquals(documents.get(0).getId(), documents.get(1).getId());
        }
        assertTrue(documents.stream().allMatch(doc -> "BLOG_OVERVIEW".equals(doc.getMetadata().get("sourceType"))));
    }
}
