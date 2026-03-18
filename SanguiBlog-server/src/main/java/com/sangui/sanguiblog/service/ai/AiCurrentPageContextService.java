package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiCurrentPageContextDto;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class AiCurrentPageContextService {

    private static final int MAX_CONTENT_LENGTH = 8000;
    private static final List<String> PAGE_REFERENCE_KEYWORDS = List.of(
            "此页面", "这个页面", "当前页面", "本页", "这篇文章", "本文", "这一页"
    );
    private static final List<String> SUMMARY_INTENT_KEYWORDS = List.of(
            "主要说了什么", "讲了什么", "总结", "概括", "内容是什么", "写了什么"
    );

    public PageContextAdvice advise(String question, AiCurrentPageContextDto currentPageContext) {
        if (!StringUtils.hasText(question) || !isValidArticleContext(currentPageContext)) {
            return PageContextAdvice.unused();
        }

        String normalizedQuestion = question.trim();
        if (!shouldUseCurrentArticleContext(normalizedQuestion)) {
            return PageContextAdvice.unused();
        }

        return PageContextAdvice.used(buildSystemContext(currentPageContext));
    }

    private boolean shouldUseCurrentArticleContext(String question) {
        return containsAny(question, PAGE_REFERENCE_KEYWORDS) || containsAny(question, SUMMARY_INTENT_KEYWORDS);
    }

    private boolean isValidArticleContext(AiCurrentPageContextDto currentPageContext) {
        return currentPageContext != null
                && "article".equalsIgnoreCase(trim(currentPageContext.getPageType()))
                && StringUtils.hasText(trim(currentPageContext.getTitle()))
                && StringUtils.hasText(trim(currentPageContext.getContent()));
    }

    private String buildSystemContext(AiCurrentPageContextDto currentPageContext) {
        String excerpt = trim(currentPageContext.getExcerpt());
        String url = trim(currentPageContext.getUrl());
        String content = truncate(trim(currentPageContext.getContent()), MAX_CONTENT_LENGTH);

        StringBuilder builder = new StringBuilder();
        builder.append("当前用户正在查看一篇具体文章页面。");
        builder.append(System.lineSeparator());
        builder.append("如果用户提到“此页面”“当前页面”“这篇文章”“本文”等指代，请优先基于下面这篇当前页面文章的内容回答。");
        builder.append(System.lineSeparator());
        builder.append("若问题明显是在询问当前页面主要讲了什么，请直接总结，不要再说你无法访问当前页面。");
        builder.append(System.lineSeparator()).append(System.lineSeparator());
        builder.append("【当前页面文章标题】").append(trim(currentPageContext.getTitle())).append(System.lineSeparator());
        if (StringUtils.hasText(excerpt)) {
            builder.append("【当前页面文章摘要】").append(excerpt).append(System.lineSeparator());
        }
        if (StringUtils.hasText(url)) {
            builder.append("【当前页面文章链接】").append(url).append(System.lineSeparator());
        }
        builder.append("【当前页面文章正文节选】").append(System.lineSeparator()).append(content);
        return builder.toString().trim();
    }

    private boolean containsAny(String question, List<String> keywords) {
        return keywords.stream().anyMatch(question::contains);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record PageContextAdvice(boolean useContext, String systemContext) {
        public static PageContextAdvice unused() {
            return new PageContextAdvice(false, "");
        }

        public static PageContextAdvice used(String systemContext) {
            return new PageContextAdvice(true, systemContext);
        }
    }
}
