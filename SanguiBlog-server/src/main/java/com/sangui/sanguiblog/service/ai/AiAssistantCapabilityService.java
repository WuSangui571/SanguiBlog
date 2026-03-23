package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.SiteMetaDto;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AiAssistantCapabilityService {

    private static final String DEFAULT_SITE_BASE_URL = "https://www.sangui.top";
    private static final DateTimeFormatter PUBLISHED_AT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final int ARTICLE_LOOKUP_LIMIT = 3;

    private static final List<String> CAPABILITY_KEYWORDS = List.of(
            "知识库", "已发布文章", "博客文章", "连接", "接入", "能访问", "能读取", "能看到",
            "你能做什么", "哪些能力", "当前能力", "全文检索", "所有文章"
    );
    private static final List<String> POST_NOUNS = List.of("文章", "博客", "博文");
    private static final List<String> LATEST_KEYWORDS = List.of("最新", "最近发布", "刚发布", "最新发");
    private static final List<String> COUNT_KEYWORDS = List.of("多少篇", "几篇", "总数", "一共多少", "有多少");
    private static final List<String> STRUCTURED_LISTING_KEYWORDS = List.of(
            "第二", "第三", "排第", "第几篇", "最早", "排行", "排序", "上一篇", "下一篇"
    );
    private static final List<String> GENERAL_COUNT_KEYWORDS = List.of("多少", "几个", "几条", "总数", "一共", "有多少", "数量");
    private static final List<String> VIEW_KEYWORDS = List.of("浏览量", "访问量", "阅读量", "总浏览", "总访问");
    private static final List<String> COMMENT_KEYWORDS = List.of("评论数", "评论量", "总评论", "评论总数");
    private static final List<String> TAG_KEYWORDS = List.of("标签数", "标签数量", "总标签", "多少标签");
    private static final List<String> LAST_UPDATED_KEYWORDS = List.of("最后更新时间", "最后更新", "最近更新", "最新更新时间");
    private static final List<String> ARTICLE_LOOKUP_INTENT_KEYWORDS = List.of(
            "给我一篇", "来一篇", "找一篇", "推荐一篇", "有没有", "写过", "站内文章", "相关文章", "哪篇文章", "博客里"
    );
    private static final List<String> SITE_PAGE_KEYWORDS = List.of(
            "sitemap", "sitemap.xml", "站点地图", "网站地图", "站点结构", "哪些页面", "有什么页面",
            "/tools", "/archive", "/about", "tools页面", "archive页面", "about页面", "首页"
    );

    private static final Pattern TOPIC_AFTER_ABOUT_PATTERN =
            Pattern.compile("关于\\s*([A-Za-z0-9#+._\\-\\u4e00-\\u9fa5]{2,}?)(?=的?(?:站内)?(?:文章|博文|博客)|[？?，,。.]|$)");
    private static final Pattern TOPIC_AFTER_WRITTEN_PATTERN =
            Pattern.compile("写过\\s*([A-Za-z0-9#+._\\-\\u4e00-\\u9fa5]{2,}?)(?=的?(?:文章|博文|博客)|[？?，,。.]|$)");
    private static final Pattern TOPIC_AFTER_ARTICLE_PATTERN =
            Pattern.compile("一篇\\s*([A-Za-z0-9#+._\\-\\u4e00-\\u9fa5]{2,}?)\\s*(?:的)?(?:站内)?(?:文章|博文|博客)");
    private static final Pattern ASCII_TOPIC_PATTERN =
            Pattern.compile("\\b([A-Za-z][A-Za-z0-9#+._\\-]{1,})\\b");

    private final PostRepository postRepository;
    private final AiBlogKnowledgeDocumentRepository knowledgeDocumentRepository;
    private final SiteService siteService;

    @Value("${site.base-url:https://www.sangui.top}")
    private String siteBaseUrl = DEFAULT_SITE_BASE_URL;

    public CapabilityAnswer answer(String question) {
        if (!StringUtils.hasText(question)) {
            return CapabilityAnswer.unanswered();
        }

        String normalized = question.trim();

        if (isLatestPublishedPostQuestion(normalized)) {
            return answerLatestPublishedPost();
        }
        if (isPublishedPostCountQuestion(normalized)) {
            return answerPublishedPostCount();
        }
        if (isViewCountQuestion(normalized)) {
            return answerTotalViews();
        }
        if (isCommentCountQuestion(normalized)) {
            return answerCommentCount();
        }
        if (isTagCountQuestion(normalized)) {
            return answerTagCount();
        }
        if (isLastUpdatedQuestion(normalized)) {
            return answerLastUpdated();
        }
        if (isSitePageQuestion(normalized)) {
            return answerSitePageGuide();
        }
        if (isStructuredListingQuestion(normalized)) {
            return CapabilityAnswer.answered("""
                    这类按时间顺序、排名或第几篇来确认的问题，建议直接查看博客首页、归档页或文章列表，以页面实际展示结果为准。
                    我当前更适合帮你总结文章内容、按主题归纳已发布文章，或解释某篇具体文章讲了什么，这样可以避免给出不准确的排序结论。
                    """.trim());
        }
        if (isArticleLookupQuestion(normalized)) {
            return answerExistingArticleLookup(normalized);
        }
        if (isCapabilityQuestion(normalized)) {
            return answerKnowledgeCapability();
        }

        return CapabilityAnswer.unanswered();
    }

    private CapabilityAnswer answerKnowledgeCapability() {
        long publishedCount = postRepository.countByStatus("PUBLISHED");
        long readyCount = knowledgeDocumentRepository.countBySyncStatus("READY");
        String reply = """
                已连接三桂博客的已发布文章知识库。
                当前已发布文章共 %d 篇，其中已完成知识同步的文章共 %d 篇。
                现在支持基于文章标题、摘要、标签和正文内容进行检索问答，也支持按主题对已发布文章做总结。
                同时，我也能读取站点实时统计信息，例如文章数、总浏览量、总评论数、总标签数和最后更新时间。
                当前暂未接入未发布文章内容，也不会随意编造站点状态；如果某项实时统计没有提供，我会明确说明。
                你可以继续直接问某篇文章讲了什么，或者让我总结某个主题下的已发布文章。
                """.formatted(publishedCount, readyCount).trim();
        return CapabilityAnswer.answered(reply);
    }

    private CapabilityAnswer answerLatestPublishedPost() {
        return postRepository.findFirstByStatusOrderByPublishedAtDesc("PUBLISHED")
                .map(post -> CapabilityAnswer.answered(buildLatestPublishedPostReply(post)))
                .orElseGet(() -> CapabilityAnswer.answered("当前还没有可确认的已发布文章，建议你直接查看博客首页或归档页。"));
    }

    private CapabilityAnswer answerPublishedPostCount() {
        long publishedCount = postRepository.countByStatus("PUBLISHED");
        return CapabilityAnswer.answered("当前三桂博客一共有 %d 篇已发布文章。".formatted(publishedCount));
    }

    private CapabilityAnswer answerTotalViews() {
        SiteMetaDto.SiteStats stats = siteService.currentStats();
        return CapabilityAnswer.answered("当前站点总浏览量为 %d。".formatted(stats.getViews()));
    }

    private CapabilityAnswer answerCommentCount() {
        SiteMetaDto.SiteStats stats = siteService.currentStats();
        return CapabilityAnswer.answered("当前站点总评论数为 %d。".formatted(stats.getComments()));
    }

    private CapabilityAnswer answerTagCount() {
        SiteMetaDto.SiteStats stats = siteService.currentStats();
        return CapabilityAnswer.answered("当前站点标签总数为 %d。".formatted(stats.getTags()));
    }

    private CapabilityAnswer answerLastUpdated() {
        SiteMetaDto.SiteStats stats = siteService.currentStats();
        String lastUpdated = StringUtils.hasText(stats.getLastUpdatedFull())
                ? stats.getLastUpdatedFull()
                : stats.getLastUpdated();
        if (!StringUtils.hasText(lastUpdated) || "-".equals(lastUpdated.trim())) {
            return CapabilityAnswer.answered("当前还没有可确认的最后更新时间，建议直接查看首页统计栏。");
        }
        return CapabilityAnswer.answered("当前站点最后更新时间为 %s。".formatted(lastUpdated.trim()));
    }

    private CapabilityAnswer answerExistingArticleLookup(String question) {
        String keyword = extractLookupKeyword(question);
        if (!StringUtils.hasText(keyword)) {
            return CapabilityAnswer.unanswered();
        }

        Page<Post> page = postRepository.searchPublishedCandidates(keyword, PageRequest.of(0, ARTICLE_LOOKUP_LIMIT));
        if (page == null) {
            return CapabilityAnswer.unanswered();
        }

        List<Post> candidates = page.getContent();
        if (candidates == null || candidates.isEmpty()) {
            return CapabilityAnswer.answered("""
                    我优先按站内已发布文章帮你检索了一次，但暂时没有找到和“%s”直接匹配的文章。
                    你可以换一个更具体的关键词继续问我，或者直接查看 /archive 归档页与首页文章列表。
                    """.formatted(keyword).trim());
        }

        StringBuilder builder = new StringBuilder();
        builder.append("我先优先从站内已发布文章里帮你找，下面是和“")
                .append(keyword)
                .append("”更匹配的候选：")
                .append(System.lineSeparator());
        for (Post post : candidates) {
            builder.append("- 《")
                    .append(safe(post.getTitle(), "未命名文章"))
                    .append("》");
            if (post.getPublishedAt() != null) {
                builder.append("（").append(post.getPublishedAt().format(PUBLISHED_AT_FORMATTER)).append("）");
            }
            if (post.getId() != null) {
                builder.append("：").append(buildAbsoluteArticleUrl(post.getId()));
            }
            builder.append(System.lineSeparator());
        }
        builder.append("如果你想继续看其中某一篇，我也可以直接按那篇文章帮你总结重点。");
        return CapabilityAnswer.answered(builder.toString().trim());
    }

    private CapabilityAnswer answerSitePageGuide() {
        return CapabilityAnswer.answered("""
                站点地图入口在 /sitemap.xml，我当前也知道站内这些核心页面的用途：
                1. / 表示首页，主要展示博客首页信息、文章列表和系统状态。
                2. /archive 表示归档页，按年月汇总已发布文章，适合查历史文章。
                3. /about 表示关于页，用来介绍站长或站点本身。
                4. /tools 表示工具页，用来展示站内工具和独立 HTML 工具页面。
                5. /article/{id} 表示具体文章详情页，对应单篇博客正文。
                如果你问我某个页面是做什么的，或者让我根据当前页面继续总结，我会优先按这些站内页面语义来回答。
                """.trim());
    }

    private String buildLatestPublishedPostReply(Post post) {
        String publishedAt = post.getPublishedAt() != null
                ? post.getPublishedAt().format(PUBLISHED_AT_FORMATTER)
                : "发布时间暂未记录";
        String url = post.getId() != null ? buildAbsoluteArticleUrl(post.getId()) : "文章详情页";
        return """
                当前最新发布的文章是《%s》。
                发布时间：%s
                文章链接：%s
                如果你愿意，我也可以继续帮你总结这篇文章的主要内容。
                """.formatted(post.getTitle(), publishedAt, url).trim();
    }

    private boolean isCapabilityQuestion(String question) {
        return containsAny(question, CAPABILITY_KEYWORDS);
    }

    private boolean isLatestPublishedPostQuestion(String question) {
        return containsAny(question, LATEST_KEYWORDS) && containsAny(question, POST_NOUNS);
    }

    private boolean isPublishedPostCountQuestion(String question) {
        return containsAny(question, COUNT_KEYWORDS) && containsAny(question, POST_NOUNS);
    }

    private boolean isStructuredListingQuestion(String question) {
        return containsAny(question, STRUCTURED_LISTING_KEYWORDS) && containsAny(question, POST_NOUNS);
    }

    private boolean isViewCountQuestion(String question) {
        return containsAny(question, VIEW_KEYWORDS)
                || (containsAny(question, GENERAL_COUNT_KEYWORDS) && containsAny(question, List.of("浏览", "访问", "阅读")));
    }

    private boolean isCommentCountQuestion(String question) {
        return containsAny(question, COMMENT_KEYWORDS)
                || (containsAny(question, GENERAL_COUNT_KEYWORDS) && question.contains("评论"));
    }

    private boolean isTagCountQuestion(String question) {
        return containsAny(question, TAG_KEYWORDS)
                || (containsAny(question, GENERAL_COUNT_KEYWORDS) && question.contains("标签"));
    }

    private boolean isLastUpdatedQuestion(String question) {
        return containsAny(question, LAST_UPDATED_KEYWORDS);
    }

    private boolean isArticleLookupQuestion(String question) {
        return containsAny(question, ARTICLE_LOOKUP_INTENT_KEYWORDS) && containsAny(question, POST_NOUNS);
    }

    private boolean isSitePageQuestion(String question) {
        return containsAny(question, SITE_PAGE_KEYWORDS);
    }

    private boolean containsAny(String question, List<String> keywords) {
        return keywords.stream().anyMatch(question::contains);
    }

    private String extractLookupKeyword(String question) {
        String fromAbout = extractByPattern(question, TOPIC_AFTER_ABOUT_PATTERN);
        if (StringUtils.hasText(fromAbout)) {
            return normalizeLookupKeyword(fromAbout);
        }

        String fromArticle = extractByPattern(question, TOPIC_AFTER_ARTICLE_PATTERN);
        if (StringUtils.hasText(fromArticle)) {
            return normalizeLookupKeyword(fromArticle);
        }

        String fromWritten = extractByPattern(question, TOPIC_AFTER_WRITTEN_PATTERN);
        if (StringUtils.hasText(fromWritten)) {
            return normalizeLookupKeyword(fromWritten);
        }

        Matcher ascii = ASCII_TOPIC_PATTERN.matcher(question);
        while (ascii.find()) {
            String candidate = ascii.group(1);
            if (StringUtils.hasText(candidate) && !candidate.equalsIgnoreCase("sitemap")) {
                return normalizeLookupKeyword(candidate);
            }
        }
        return "";
    }

    private String extractByPattern(String question, Pattern pattern) {
        Matcher matcher = pattern.matcher(question);
        if (!matcher.find()) {
            return "";
        }
        String value = matcher.group(1);
        return value == null ? "" : value.trim();
    }

    private String normalizeLookupKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return "";
        }

        String normalized = keyword.trim();
        normalized = normalized.replaceAll("^[的\\s]+", "");
        normalized = normalized.replaceAll("[\\s`\"'“”‘’《》<>]+", "");
        normalized = normalized.replaceAll("(的)?(已发布|站内|博客|博文|文章)+$", "");
        normalized = normalized.replaceAll("(的)+$", "");
        return normalized.trim();
    }

    private String safe(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private String buildAbsoluteArticleUrl(Long postId) {
        String baseUrl = StringUtils.hasText(siteBaseUrl) ? siteBaseUrl.trim() : DEFAULT_SITE_BASE_URL;
        baseUrl = baseUrl.replaceAll("/+$", "");
        return baseUrl + "/article/" + postId;
    }

    public record CapabilityAnswer(boolean answered, String reply) {
        public static CapabilityAnswer unanswered() {
            return new CapabilityAnswer(false, "");
        }

        public static CapabilityAnswer answered(String reply) {
            return new CapabilityAnswer(true, reply);
        }
    }
}
