package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiAssistantCapabilityServiceTest {

    @Test
    void shouldAnswerKnowledgeCapabilityQuestionDirectly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        when(postRepository.countByStatus("PUBLISHED")).thenReturn(94L);
        when(knowledgeRepository.countBySyncStatus("READY")).thenReturn(94L);

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("你是否连接我已发布的文章知识库？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("已连接"));
        assertTrue(answer.reply().contains("94"));
        assertTrue(answer.reply().contains("已发布文章"));
    }

    @Test
    void shouldAnswerLatestPublishedPostQuestionExactly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        when(postRepository.findFirstByStatusOrderByPublishedAtDesc("PUBLISHED"))
                .thenReturn(Optional.of(buildPost("记一次网站迁移：从 HTTPS 配置到异地容灾备份", "site-migration", LocalDateTime.of(2026, 3, 18, 10, 0))));

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("最新发的文章是什么？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("记一次网站迁移：从 HTTPS 配置到异地容灾备份"));
        assertTrue(answer.reply().contains("/posts/site-migration"));
    }

    @Test
    void shouldAnswerPublishedPostCountQuestionExactly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        when(postRepository.countByStatus("PUBLISHED")).thenReturn(94L);

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("你现在一共有多少篇已发布文章？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("94"));
        assertTrue(answer.reply().contains("已发布文章"));
    }

    @Test
    void shouldFallbackSafelyForUnhandledRankingQuestion() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("哪篇文章排第二新？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("建议直接查看"));
        assertTrue(answer.reply().contains("归档"));
    }

    @Test
    void shouldNotInterceptArticleContentQuestion() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository);

        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("《记一次网站迁移：从 HTTPS 配置到异地容灾备份》这篇文章主要讲了什么？");

        assertFalse(answer.answered());
    }

    private static Post buildPost(String title, String slug, LocalDateTime publishedAt) {
        Post post = new Post();
        post.setTitle(title);
        post.setSlug(slug);
        post.setPublishedAt(publishedAt);
        return post;
    }
}
