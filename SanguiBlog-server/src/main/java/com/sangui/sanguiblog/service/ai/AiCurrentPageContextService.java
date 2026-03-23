package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiCurrentPageContextDto;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class AiCurrentPageContextService {

    private static final int MAX_CONTENT_LENGTH = 8000;
    private static final List<String> PAGE_REFERENCE_KEYWORDS = List.of(
            "此页面", "这个页面", "当前页面", "本页", "这一页", "当前页", "这里"
    );
    private static final List<String> PAGE_EXPLAIN_KEYWORDS = List.of(
            "主要说了什么", "讲了什么", "总结", "概括", "内容是什么", "写了什么", "是干什么的", "有什么", "是什么页面"
    );

    public PageContextAdvice advise(String question, AiCurrentPageContextDto currentPageContext) {
        if (!StringUtils.hasText(question) || !isValidContext(currentPageContext)) {
            return PageContextAdvice.unused();
        }

        String normalizedQuestion = question.trim();
        if (!shouldUseCurrentPageContext(normalizedQuestion)) {
            return PageContextAdvice.unused();
        }

        return PageContextAdvice.used(buildSystemContext(currentPageContext));
    }

    private boolean shouldUseCurrentPageContext(String question) {
        return containsAny(question, PAGE_REFERENCE_KEYWORDS) || containsAny(question, PAGE_EXPLAIN_KEYWORDS);
    }

    private boolean isValidContext(AiCurrentPageContextDto currentPageContext) {
        return currentPageContext != null
                && StringUtils.hasText(trim(currentPageContext.getPageType()))
                && StringUtils.hasText(trim(currentPageContext.getTitle()))
                && StringUtils.hasText(trim(currentPageContext.getContent()));
    }

    private String buildSystemContext(AiCurrentPageContextDto currentPageContext) {
        String pageType = trim(currentPageContext.getPageType()).toLowerCase();
        String excerpt = trim(currentPageContext.getExcerpt());
        String url = trim(currentPageContext.getUrl());
        String content = truncate(trim(currentPageContext.getContent()), MAX_CONTENT_LENGTH);

        StringBuilder builder = new StringBuilder();
        builder.append("当前用户正在查看站内页面。").append(System.lineSeparator());
        builder.append("如果用户提到“此页面”“当前页面”“本页”“这里”等指代，请优先基于下面这份当前页面信息回答。").append(System.lineSeparator());
        builder.append("若用户明显是在询问当前页面主要讲了什么、当前页面是干什么的，或让你总结当前页面，请直接基于这些信息回答，不要再说你无法访问当前页面。");
        builder.append(System.lineSeparator()).append(System.lineSeparator());

        if ("article".equals(pageType)) {
            builder.append("【当前页面类型】文章详情页").append(System.lineSeparator());
            builder.append("【当前页面文章标题】").append(trim(currentPageContext.getTitle())).append(System.lineSeparator());
            if (StringUtils.hasText(excerpt)) {
                builder.append("【当前页面文章摘要】").append(excerpt).append(System.lineSeparator());
            }
            if (StringUtils.hasText(url)) {
                builder.append("【当前页面文章链接】").append(url).append(System.lineSeparator());
            }
            builder.append("【当前页面内容】").append(System.lineSeparator()).append(content);
            return builder.toString().trim();
        }

        builder.append("【当前页面类型】").append(resolvePageTypeLabel(pageType)).append(System.lineSeparator());
        builder.append("【当前页面标题】").append(trim(currentPageContext.getTitle())).append(System.lineSeparator());
        if (StringUtils.hasText(excerpt)) {
            builder.append("【当前页面摘要】").append(excerpt).append(System.lineSeparator());
        }
        if (StringUtils.hasText(url)) {
            builder.append("【当前页面链接】").append(url).append(System.lineSeparator());
        }
        builder.append("【当前页面内容】").append(System.lineSeparator()).append(content);
        return builder.toString().trim();
    }

    private String resolvePageTypeLabel(String pageType) {
        return switch (pageType) {
            case "home" -> "首页";
            case "archive" -> "归档页";
            case "about" -> "关于页";
            case "tools" -> "工具页";
            default -> "站内页面";
        };
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
