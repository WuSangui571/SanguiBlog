package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AiReferencedPostContextService {

    private static final int MAX_CONTENT_LENGTH = 8000;
    private static final String PUBLISHED_STATUS = "PUBLISHED";
    private static final Pattern ARTICLE_URL_PATTERN =
            Pattern.compile("(?i)(?:https?://[^\\s)）]+)?/article/([A-Za-z0-9_-]+)");
    private static final Pattern QUOTED_TITLE_PATTERN = Pattern.compile("《([^》]{2,255})》");

    private static final List<String> ARTICLE_REFERENCE_KEYWORDS = List.of(
            "此文", "本文", "这篇文章", "这篇博客", "这篇博文", "这篇内容", "这篇", "当前文章", "上面那篇"
    );
    private static final List<String> ARTICLE_EXPLAIN_KEYWORDS = List.of(
            "总结", "概括", "主要内容", "主要讲了什么", "讲了什么", "写了什么", "内容是什么", "重点"
    );

    private final PostRepository postRepository;

    public ReferencedPostAdvice advise(String question, List<String> recentMessages) {
        if (!StringUtils.hasText(question)) {
            return ReferencedPostAdvice.unused();
        }

        String normalizedQuestion = question.trim();
        Optional<Post> directPost = resolvePostFromText(normalizedQuestion);
        if (directPost.isPresent()) {
            return ReferencedPostAdvice.used(buildSystemContext(directPost.get()), true);
        }

        if (!shouldResolveFromRecentMessages(normalizedQuestion) || recentMessages == null || recentMessages.isEmpty()) {
            return ReferencedPostAdvice.unused();
        }

        for (int i = recentMessages.size() - 1; i >= 0; i--) {
            Optional<Post> referencedPost = resolvePostFromText(recentMessages.get(i));
            if (referencedPost.isPresent()) {
                return ReferencedPostAdvice.used(buildSystemContext(referencedPost.get()), false);
            }
        }

        return ReferencedPostAdvice.unused();
    }

    private boolean shouldResolveFromRecentMessages(String question) {
        return containsAny(question, ARTICLE_REFERENCE_KEYWORDS) && containsAny(question, ARTICLE_EXPLAIN_KEYWORDS);
    }

    private Optional<Post> resolvePostFromText(String text) {
        if (!StringUtils.hasText(text)) {
            return Optional.empty();
        }

        Optional<Post> fromUrl = resolvePostFromArticleUrl(text);
        if (fromUrl.isPresent()) {
            return fromUrl;
        }

        Matcher titleMatcher = QUOTED_TITLE_PATTERN.matcher(text);
        while (titleMatcher.find()) {
            String title = trim(titleMatcher.group(1));
            if (!StringUtils.hasText(title)) {
                continue;
            }
            Optional<Post> post = postRepository.findFirstByTitleAndStatus(title, PUBLISHED_STATUS);
            if (post.isPresent() && hasSummarizableContent(post.get())) {
                return post;
            }
        }

        return Optional.empty();
    }

    private Optional<Post> resolvePostFromArticleUrl(String text) {
        Matcher matcher = ARTICLE_URL_PATTERN.matcher(text);
        while (matcher.find()) {
            String identifier = trim(matcher.group(1));
            if (!StringUtils.hasText(identifier)) {
                continue;
            }

            Optional<Post> post = identifier.chars().allMatch(Character::isDigit)
                    ? postRepository.findById(Long.parseLong(identifier)).filter(this::isPublished)
                    : postRepository.findBySlugAndStatus(identifier, PUBLISHED_STATUS);
            if (post.isPresent() && hasSummarizableContent(post.get())) {
                return post;
            }
        }
        return Optional.empty();
    }

    private String buildSystemContext(Post post) {
        String content = articleContent(post);
        StringBuilder builder = new StringBuilder();
        builder.append("用户或 AI 最近已经明确指向一篇站内已发布文章。").append(System.lineSeparator());
        builder.append("如果用户使用“此文”“本文”“这篇文章”“这篇博客”“上面那篇”等指代，请把下面这篇文章视为当前指代对象。").append(System.lineSeparator());
        builder.append("请严格基于下面的真实文章标题、摘要和正文回答；不要根据标题、常识或对话氛围补写不存在的文章内容。");
        builder.append(System.lineSeparator()).append(System.lineSeparator());
        builder.append("【指代文章标题】").append(trim(post.getTitle())).append(System.lineSeparator());
        if (post.getId() != null) {
            builder.append("【指代文章链接】/article/").append(post.getId()).append(System.lineSeparator());
        }
        String excerpt = trim(post.getExcerpt());
        if (StringUtils.hasText(excerpt)) {
            builder.append("【指代文章摘要】").append(excerpt).append(System.lineSeparator());
        }
        builder.append("【指代文章正文】").append(System.lineSeparator()).append(truncate(content, MAX_CONTENT_LENGTH));
        return builder.toString().trim();
    }

    private boolean hasSummarizableContent(Post post) {
        return post != null && isPublished(post) && StringUtils.hasText(articleContent(post));
    }

    private boolean isPublished(Post post) {
        return post != null && PUBLISHED_STATUS.equals(post.getStatus());
    }

    private String articleContent(Post post) {
        String markdown = trim(post.getContentMd());
        if (StringUtils.hasText(markdown)) {
            return markdown;
        }
        String html = trim(post.getContentHtml());
        if (StringUtils.hasText(html)) {
            return stripHtmlTags(html);
        }
        return trim(post.getExcerpt());
    }

    private String stripHtmlTags(String value) {
        return trim(value)
                .replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean containsAny(String question, List<String> keywords) {
        return keywords.stream().anyMatch(question::contains);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String truncate(String value, int maxLength) {
        String normalized = trim(value);
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    public record ReferencedPostAdvice(boolean useContext, String systemContext, boolean explicitReference) {
        public static ReferencedPostAdvice unused() {
            return new ReferencedPostAdvice(false, "", false);
        }

        public static ReferencedPostAdvice used(String systemContext, boolean explicitReference) {
            return new ReferencedPostAdvice(true, systemContext, explicitReference);
        }
    }
}
