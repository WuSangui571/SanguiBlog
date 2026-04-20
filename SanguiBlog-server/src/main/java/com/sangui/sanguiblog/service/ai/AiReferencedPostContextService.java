package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
            "总结", "概括", "主要内容", "主要讲了什么", "讲了什么", "写了什么", "内容是什么", "重点",
            "讲解", "介绍", "说说", "展开讲", "解读", "分析一下"
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

        Optional<Post> matchedFromRecentByQuotedTitle = resolveRecentPostByQuotedTitle(normalizedQuestion, recentMessages);
        if (matchedFromRecentByQuotedTitle.isPresent()) {
            return ReferencedPostAdvice.used(buildSystemContext(matchedFromRecentByQuotedTitle.get()), true);
        }
        if (!extractQuotedTitles(normalizedQuestion).isEmpty()) {
            return ReferencedPostAdvice.unused();
        }

        if (!shouldResolveFromRecentMessages(normalizedQuestion) || recentMessages == null || recentMessages.isEmpty()) {
            return ReferencedPostAdvice.unused();
        }

        List<Post> recentReferencedPosts = collectRecentReferencedPosts(recentMessages);
        if (recentReferencedPosts.size() == 1) {
            return ReferencedPostAdvice.used(buildSystemContext(recentReferencedPosts.get(0)), false);
        }

        return ReferencedPostAdvice.unused();
    }

    private boolean shouldResolveFromRecentMessages(String question) {
        return containsAny(question, ARTICLE_REFERENCE_KEYWORDS) && containsAny(question, ARTICLE_EXPLAIN_KEYWORDS);
    }

    private Optional<Post> resolvePostFromText(String text) {
        List<Post> posts = resolvePostsFromText(text);
        return posts.isEmpty() ? Optional.empty() : Optional.of(posts.get(0));
    }

    private List<Post> resolvePostsFromText(String text) {
        if (!StringUtils.hasText(text)) {
            return List.of();
        }

        Map<Long, Post> uniqueById = new LinkedHashMap<>();
        resolvePostsFromArticleUrl(text).forEach(post -> {
            if (post.getId() != null) {
                uniqueById.putIfAbsent(post.getId(), post);
            }
        });

        Matcher titleMatcher = QUOTED_TITLE_PATTERN.matcher(text);
        while (titleMatcher.find()) {
            String title = trim(titleMatcher.group(1));
            if (!StringUtils.hasText(title)) {
                continue;
            }
            Optional<Post> post = postRepository.findFirstByTitleAndStatus(title, PUBLISHED_STATUS);
            if (post.isPresent() && hasSummarizableContent(post.get())) {
                Post resolved = post.get();
                if (resolved.getId() != null) {
                    uniqueById.putIfAbsent(resolved.getId(), resolved);
                }
            }
        }

        return List.copyOf(uniqueById.values());
    }

    private List<Post> resolvePostsFromArticleUrl(String text) {
        Map<Long, Post> uniqueById = new LinkedHashMap<>();
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
                Post resolved = post.get();
                if (resolved.getId() != null) {
                    uniqueById.putIfAbsent(resolved.getId(), resolved);
                }
            }
        }
        return List.copyOf(uniqueById.values());
    }

    private Optional<Post> resolveRecentPostByQuotedTitle(String question, List<String> recentMessages) {
        if (!StringUtils.hasText(question) || recentMessages == null || recentMessages.isEmpty()) {
            return Optional.empty();
        }

        List<String> quotedTitles = extractQuotedTitles(question);
        if (quotedTitles.isEmpty()) {
            return Optional.empty();
        }

        List<Post> candidates = collectRecentReferencedPosts(recentMessages);
        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        for (String quotedTitle : quotedTitles) {
            String normalizedQuotedTitle = normalizeComparableTitle(quotedTitle);
            if (!StringUtils.hasText(normalizedQuotedTitle)) {
                continue;
            }
            List<Post> matchedCandidates = candidates.stream()
                    .filter(post -> titleMatches(normalizedQuotedTitle, post.getTitle()))
                    .toList();
            if (matchedCandidates.size() == 1) {
                return Optional.of(matchedCandidates.get(0));
            }
        }

        return Optional.empty();
    }

    private List<Post> collectRecentReferencedPosts(List<String> recentMessages) {
        Map<Long, Post> uniqueById = new LinkedHashMap<>();
        for (int i = recentMessages.size() - 1; i >= 0; i--) {
            List<Post> posts = resolvePostsFromText(recentMessages.get(i));
            for (Post post : posts) {
                if (post != null && post.getId() != null) {
                    uniqueById.putIfAbsent(post.getId(), post);
                }
            }
        }
        return List.copyOf(uniqueById.values());
    }

    private List<String> extractQuotedTitles(String text) {
        Matcher matcher = QUOTED_TITLE_PATTERN.matcher(text);
        Map<String, String> uniqueTitles = new LinkedHashMap<>();
        while (matcher.find()) {
            String title = trim(matcher.group(1));
            if (StringUtils.hasText(title)) {
                uniqueTitles.putIfAbsent(title, title);
            }
        }
        return List.copyOf(uniqueTitles.values());
    }

    private boolean titleMatches(String normalizedQuotedTitle, String candidateTitle) {
        String normalizedCandidateTitle = normalizeComparableTitle(candidateTitle);
        if (!StringUtils.hasText(normalizedCandidateTitle)) {
            return false;
        }
        return normalizedCandidateTitle.equals(normalizedQuotedTitle)
                || normalizedCandidateTitle.contains(normalizedQuotedTitle)
                || normalizedQuotedTitle.contains(normalizedCandidateTitle);
    }

    private String normalizeComparableTitle(String title) {
        String normalized = trim(title).toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "");
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
