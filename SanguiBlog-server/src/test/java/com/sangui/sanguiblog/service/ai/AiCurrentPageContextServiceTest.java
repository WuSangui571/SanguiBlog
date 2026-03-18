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
        assertTrue(advice.systemContext().contains("当前页面文章正文节选"));
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
