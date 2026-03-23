package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.service.SiteService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiAssistantCapabilityServiceTest {

    @Test
    void shouldAnswerKnowledgeCapabilityQuestionDirectly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        when(postRepository.countByStatus("PUBLISHED")).thenReturn(94L);
        when(knowledgeRepository.countBySyncStatus("READY")).thenReturn(94L);

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("你是否连接我已发布的文章知识库？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("已连接"));
        assertTrue(answer.reply().contains("94"));
        assertTrue(answer.reply().contains("总浏览量"));
    }

    @Test
    void shouldAnswerLatestPublishedPostQuestionExactly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        when(postRepository.findFirstByStatusOrderByPublishedAtDesc("PUBLISHED"))
                .thenReturn(Optional.of(buildPost(101L, "记一次网站迁移：从 HTTPS 配置到异地容灾备份", "site-migration", LocalDateTime.of(2026, 3, 18, 10, 0))));

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("最新发的文章是什么？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("记一次网站迁移：从 HTTPS 配置到异地容灾备份"));
        assertTrue(answer.reply().contains("/article/101"));
    }

    @Test
    void shouldAnswerPublishedPostCountQuestionExactly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        when(postRepository.countByStatus("PUBLISHED")).thenReturn(94L);

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("你现在一共有多少篇已发布文章？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("94"));
        assertTrue(answer.reply().contains("已发布文章"));
    }

    @Test
    void shouldAnswerSiteStatsQuestionsExactly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        when(siteService.currentStats()).thenReturn(SiteMetaDto.SiteStats.builder()
                .posts(95L)
                .comments(18L)
                .categories(6L)
                .tags(32L)
                .views(4096L)
                .lastUpdated("2026/03/20")
                .lastUpdatedFull("2026-03-20 22:18:00")
                .build());

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);

        assertTrue(service.answer("当前总浏览量是多少？").reply().contains("4096"));
        assertTrue(service.answer("总评论数是多少？").reply().contains("18"));
        assertTrue(service.answer("现在一共有多少个标签？").reply().contains("32"));
        assertTrue(service.answer("站点最后更新时间是什么时候？").reply().contains("2026-03-20 22:18:00"));
    }

    @Test
    void shouldFallbackSafelyForUnhandledRankingQuestion() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("哪篇文章排第二新？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("建议直接查看"));
        assertTrue(answer.reply().contains("归档页"));
    }

    @Test
    void shouldNotInterceptArticleContentQuestion() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);

        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("《记一次网站迁移：从 HTTPS 配置到异地容灾备份》这篇文章主要讲了什么？");

        assertFalse(answer.answered());
    }

    @Test
    void shouldPreferExistingSitePostsWhenUserAsksForArticleRecommendation() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        when(postRepository.searchPublishedCandidates(eq("JVM"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(
                        buildPost(301L, "JVM 内存模型与 GC 实战", "jvm-memory-gc", LocalDateTime.of(2026, 3, 21, 9, 30)),
                        buildPost(199L, "从字节码到类加载：JVM 运行时笔记", "jvm-classloading", LocalDateTime.of(2026, 1, 8, 20, 0))
                )));

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("给我一篇关于JVM的站内文章");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("优先从站内已发布文章里帮你找"));
        assertTrue(answer.reply().contains("JVM 内存模型与 GC 实战"));
        assertTrue(answer.reply().contains("/article/301"));
    }

    @Test
    void shouldNormalizeLookupKeywordForPublishedBlogQuestion() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        when(postRepository.searchPublishedCandidates(eq("JVM"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(
                        buildPost(301L, "JVM 内存模型与 GC 实战", "jvm-memory-gc", LocalDateTime.of(2026, 3, 21, 9, 30))
                )));

        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);
        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("给我一篇JVM的已发布的博客");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("JVM 内存模型与 GC 实战"));
        assertFalse(answer.reply().contains("JVM的已发布"));
    }

    @Test
    void shouldExplainSitePagesAndSitemapDirectly() {
        PostRepository postRepository = mock(PostRepository.class);
        AiBlogKnowledgeDocumentRepository knowledgeRepository = mock(AiBlogKnowledgeDocumentRepository.class);
        SiteService siteService = mock(SiteService.class);
        AiAssistantCapabilityService service = new AiAssistantCapabilityService(postRepository, knowledgeRepository, siteService);

        AiAssistantCapabilityService.CapabilityAnswer answer = service.answer("你的 sitemap.xml 里有哪些页面？tools 页面是干什么的？");

        assertTrue(answer.answered());
        assertTrue(answer.reply().contains("/sitemap.xml"));
        assertTrue(answer.reply().contains("/tools"));
        assertTrue(answer.reply().contains("/archive"));
        assertTrue(answer.reply().contains("/about"));
    }

    private static Post buildPost(Long id, String title, String slug, LocalDateTime publishedAt) {
        Post post = new Post();
        post.setId(id);
        post.setTitle(title);
        post.setSlug(slug);
        post.setPublishedAt(publishedAt);
        return post;
    }
}
