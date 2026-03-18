package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiAssistantCapabilityService {

    private static final DateTimeFormatter PUBLISHED_AT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final List<String> CAPABILITY_KEYWORDS = List.of(
            "知识库", "已发布文章", "博客文章", "连接", "接入", "能访问", "能读取", "能看到",
            "你能做什么", "哪些能力", "当前能力", "全文检索", "所有文章"
    );
    private static final List<String> POST_NOUNS = List.of("文章", "博客", "博文");
    private static final List<String> LATEST_KEYWORDS = List.of("最新", "最近发布", "刚发布", "最新发");
    private static final List<String> COUNT_KEYWORDS = List.of("多少篇", "几篇", "总数", "一共多少", "有多少");
    private static final List<String> STRUCTURED_LISTING_KEYWORDS = List.of(
            "第二新", "第三新", "排第", "第几篇", "最早", "排行", "排序", "上一篇", "下一篇"
    );

    private final PostRepository postRepository;
    private final AiBlogKnowledgeDocumentRepository knowledgeDocumentRepository;

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
        if (isCapabilityQuestion(normalized)) {
            return answerKnowledgeCapability();
        }
        if (isStructuredListingQuestion(normalized)) {
            return CapabilityAnswer.answered("""
                    这类按时间顺序、排名或第几篇来确认的问题，建议直接查看博客首页、归档页或文章列表，以页面实际展示结果为准。
                    我当前更适合帮你总结文章内容、按主题归纳已发布文章，或解释某篇具体文章讲了什么，这样可以避免给出不准确的排序结论。
                    """.trim());
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
                当前暂未接入后台自定义文件知识库，也不会自动读取未发布文章或任意页面的临时内容。
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
        String reply = "当前三桂博客一共有 %d 篇已发布文章。".formatted(publishedCount);
        return CapabilityAnswer.answered(reply);
    }

    private String buildLatestPublishedPostReply(Post post) {
        String publishedAt = post.getPublishedAt() != null ? post.getPublishedAt().format(PUBLISHED_AT_FORMATTER) : "发布时间暂未记录";
        String slug = StringUtils.hasText(post.getSlug()) ? post.getSlug().trim() : "";
        String url = StringUtils.hasText(slug) ? "/posts/" + slug : "文章详情页";
        return """
                当前最新发布的文章是《%s》。
                发布时间：%s
                文章链接：%s
                如果你愿意，我也可以继续帮你总结这篇文章的主要内容。
                """.formatted(post.getTitle(), publishedAt, url).trim();
    }

    private boolean isCapabilityQuestion(String question) {
        return CAPABILITY_KEYWORDS.stream().anyMatch(question::contains);
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

    private boolean containsAny(String question, List<String> keywords) {
        return keywords.stream().anyMatch(question::contains);
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
