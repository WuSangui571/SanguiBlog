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
        context.setImageCount(2);

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("此页面主要说了什么？", context);

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("记一次网站迁移"));
        assertTrue(advice.systemContext().contains("当前页面内容"));
        assertTrue(advice.systemContext().contains("本文包含 2 张图片"));
        assertTrue(advice.systemContext().contains("可以自然提到文章配有图片"));
        assertTrue(advice.systemContext().contains("不要臆测图片里的具体内容"));
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
    void shouldUseArticlePageContextWhenQuestionRefersToThisBlogPostNaturally() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("article");
        context.setTitle("带图博客");
        context.setContent("这里是文章正文内容。");
        context.setImageCount(1);

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("如何评价这篇博客？", context);

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("带图博客"));
        assertTrue(advice.systemContext().contains("本文包含 1 张图片"));
    }

    @Test
    void shouldExplicitlyStateImageRecognitionIsUnavailableWhenAskedAboutImageDetails() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("article");
        context.setTitle("带图博客");
        context.setContent("这里是文章正文内容。");
        context.setImageCount(3);

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("讲解下文中的配图信息", context);

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("当前暂未实装图片识别功能"));
        assertTrue(advice.systemContext().contains("只能确认本文包含 3 张图片"));
        assertTrue(advice.systemContext().contains("不能判断图片里具体展示了什么"));
        assertTrue(advice.systemContext().contains("不要编造任何图中细节"));
    }

    @Test
    void shouldUseLoginPageContextWhenQuestionRefersToCurrentPage() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("login");
        context.setTitle("登录页");
        context.setContent("这是博客登录页，用于已有账号的用户输入用户名、密码和必要时的验证码，登录后进入站内功能。");
        context.setUrl("/login");

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("当前页面是干什么的？", context);

        assertTrue(advice.useContext());
        assertTrue(advice.systemContext().contains("/login"));
        assertTrue(advice.systemContext().contains("登录页"));
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

    @Test
    void shouldNotMentionImagesWhenArticleHasNoImageContext() {
        AiCurrentPageContextService service = new AiCurrentPageContextService();

        AiCurrentPageContextDto context = new AiCurrentPageContextDto();
        context.setPageType("article");
        context.setTitle("纯文本文章");
        context.setContent("这里只有纯文本，没有媒体线索。");

        AiCurrentPageContextService.PageContextAdvice advice = service.advise("请总结此页面", context);

        assertTrue(advice.useContext());
        assertFalse(advice.systemContext().contains("图片"));
        assertFalse(advice.systemContext().contains("配图"));
    }
}
