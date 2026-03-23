package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiCurrentPageContextDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiCurrentPageContextServiceTest {

    @Test
    void shouldUseArticlePageContextWhenQuestionRefersToCurrentPage() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("article");
        context.setTitle("记一次网站迁移：从 HTTPS 配置到异地容灾备份");
        context.setExcerpt("一次网站迁移中的 HTTPS、备份与容灾记录");
        context.setContent("这里是文章正文内容。");
        context.setUrl("/article/site-migration");

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("此页面主要说了什么？", context);

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("记一次网站迁移"));
        assertTrue(advice.systemContext().contains("当前页面内容"));
    }

    @Test
    void shouldUseNonArticlePageContextWhenQuestionRefersToCurrentPage() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("tools");
        context.setTitle("工具页");
        context.setContent("这是站点工具页，用来展示博客内置工具和独立 HTML 工具。");
        context.setUrl("/tools");

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("当前页面是干什么的？", context);

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("/tools"));
        assertTrue(advice.systemContext().contains("工具页"));
    }

    @Test
    void shouldIgnoreCurrentPageContextForUnrelatedQuestion() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("article");
        context.setTitle("记一次网站迁移：从 HTTPS 配置到异地容灾备份");
        context.setContent("这里是文章正文内容。");

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("最新发的文章是什么？", context);

        assertFalse(advice.useContext());
    }
}
