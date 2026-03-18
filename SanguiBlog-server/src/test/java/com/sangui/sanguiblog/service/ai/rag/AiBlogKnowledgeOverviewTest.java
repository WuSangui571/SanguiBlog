package com.sangui.sanguiblog.service.ai.rag;

import com.sangui.sanguiblog.model.entity.Post;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AiBlogKnowledgeOverviewTest {

    @Test
    void shouldBuildOverviewTextContainingCountAndTitles() {
        Post first = new Post();
        first.setId(1L);
        first.setTitle("Spring Boot 3 升级实践");
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
        assertTrue(text.contains("Spring Boot 3 升级实践"));
        assertTrue(text.contains("React 状态管理整理"));
    }
}
