package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.PostRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiReferencedPostContextServiceTest {

    @Test
    void shouldResolveReferencedPostFromRecentAssistantReplyWhenUserAsksToSummarizeThisArticle() {
        PostRepository postRepository = mock(PostRepository.class);
        when(postRepository.findFirstByTitleAndStatus("记一次网站迁移：从 HTTPS 配置到异地容灾备份", "PUBLISHED"))
                .thenReturn(Optional.of(buildPost(
                        101L,
                        "记一次网站迁移：从 HTTPS 配置到异地容灾备份",
                        "一次关于 HTTPS、迁移和异地容灾的完整复盘。",
                        "正文里详细记录了 HTTPS 配置、迁移流程、备份与容灾方案。"
                )));

        AiReferencedPostContextService service = new AiReferencedPostContextService(postRepository);
        AiReferencedPostContextService.ReferencedPostAdvice advice = service.advise(
                "总结此文的内容",
                List.of(
                        "最新发的文章是什么？",
                        """
                                当前最新发布的文章是《记一次网站迁移：从 HTTPS 配置到异地容灾备份》。
                                发布时间：2026-03-18 10:00
                                文章链接：https://www.sangui.top/article/101
                                如果你愿意，我也可以继续帮你总结这篇文章的主要内容。
                                """.trim()
                )
        );

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("记一次网站迁移：从 HTTPS 配置到异地容灾备份"));
        assertTrue(advice.systemContext().contains("HTTPS"));
        assertTrue(advice.systemContext().contains("/article/101"));
    }

    @Test
    void shouldResolveReferencedPostFromDirectArticleLinkMention() {
        PostRepository postRepository = mock(PostRepository.class);
        when(postRepository.findById(205L)).thenReturn(Optional.of(buildPost(
                205L,
                "深入理解 JVM 类加载机制",
                "关于 JVM 类加载流程的梳理。",
                "正文介绍了双亲委派、类加载时机和常见排查思路。"
        )));

        AiReferencedPostContextService service = new AiReferencedPostContextService(postRepository);
        AiReferencedPostContextService.ReferencedPostAdvice advice = service.advise(
                "帮我总结 https://www.sangui.top/article/205 这篇文章",
                List.of()
        );

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("深入理解 JVM 类加载机制"));
        assertTrue(advice.systemContext().contains("双亲委派"));
    }

    @Test
    void shouldIgnoreThisArticleReferenceWhenRecentConversationDoesNotContainConcretePost() {
        PostRepository postRepository = mock(PostRepository.class);
        AiReferencedPostContextService service = new AiReferencedPostContextService(postRepository);

        AiReferencedPostContextService.ReferencedPostAdvice advice = service.advise(
                "总结此文",
                List.of("首页有什么内容？", "这是博客首页，主要展示站点首页信息、系统状态和最新文章列表。")
        );

        assertFalse(advice.useContext());
    }

    @Test
    void shouldResolveReferencedPostFromRecentCandidateListWhenUserAsksToExplainRecentlyMentionedArticle() {
        PostRepository postRepository = mock(PostRepository.class);
        when(postRepository.findFirstByTitleAndStatus("OpenClaw", "PUBLISHED"))
                .thenReturn(Optional.empty());
        when(postRepository.findFirstByTitleAndStatus("OpenClaw 安装与通关记录", "PUBLISHED"))
                .thenReturn(Optional.of(buildPost(
                        301L,
                        "OpenClaw 安装与通关记录",
                        "关于 OpenClaw 安装、兼容性与通关体验的记录。",
                        "正文详细记录了 OpenClaw 的安装步骤、运行环境配置、常见报错与通关体验。"
                )));

        AiReferencedPostContextService service = new AiReferencedPostContextService(postRepository);
        AiReferencedPostContextService.ReferencedPostAdvice advice = service.advise(
                "你刚刚提出的《OpenClaw》这篇文章，给我讲解一下",
                List.of(
                        "博客有关于OpenClaw的文章吗？",
                        """
                                我先优先从站内已发布文章里帮你找，下面是和“OpenClaw”更匹配的候选：
                                - 《OpenClaw 安装与通关记录》：https://www.sangui.top/article/301
                                如果你想继续看其中某一篇，我也可以直接按那篇文章帮你总结重点。
                                """.trim()
                )
        );

        assertTrue(advice.useContext());
        assertTrue(advice.explicitReference());
        assertTrue(advice.systemContext().contains("OpenClaw 安装与通关记录"));
        assertTrue(advice.systemContext().contains("安装步骤"));
        assertTrue(advice.systemContext().contains("/article/301"));
    }

    @Test
    void shouldNotFallbackToFirstCandidateWhenRecentConversationContainsMultipleArticlesButUserDidNotIdentifyOne() {
        PostRepository postRepository = mock(PostRepository.class);
        when(postRepository.findFirstByTitleAndStatus("OpenClaw 安装与通关记录", "PUBLISHED"))
                .thenReturn(Optional.of(buildPost(
                        301L,
                        "OpenClaw 安装与通关记录",
                        "关于 OpenClaw 安装、兼容性与通关体验的记录。",
                        "正文详细记录了 OpenClaw 的安装步骤。"
                )));
        when(postRepository.findFirstByTitleAndStatus("OpenClaw Mod 配置笔记", "PUBLISHED"))
                .thenReturn(Optional.of(buildPost(
                        302L,
                        "OpenClaw Mod 配置笔记",
                        "关于 OpenClaw Mod 的配置整理。",
                        "正文详细记录了 OpenClaw Mod 的资源替换与配置流程。"
                )));

        AiReferencedPostContextService service = new AiReferencedPostContextService(postRepository);
        AiReferencedPostContextService.ReferencedPostAdvice advice = service.advise(
                "这篇文章给我讲解一下",
                List.of(
                        """
                                我先优先从站内已发布文章里帮你找，下面是和“OpenClaw”更匹配的候选：
                                - 《OpenClaw 安装与通关记录》：https://www.sangui.top/article/301
                                - 《OpenClaw Mod 配置笔记》：https://www.sangui.top/article/302
                                如果你想继续看其中某一篇，我也可以直接按那篇文章帮你总结重点。
                                """.trim()
                )
        );

        assertFalse(advice.useContext());
    }

    private static Post buildPost(Long id, String title, String excerpt, String contentMd) {
        Post post = new Post();
        post.setId(id);
        post.setTitle(title);
        post.setExcerpt(excerpt);
        post.setContentMd(contentMd);
        post.setStatus("PUBLISHED");
        return post;
    }
}
