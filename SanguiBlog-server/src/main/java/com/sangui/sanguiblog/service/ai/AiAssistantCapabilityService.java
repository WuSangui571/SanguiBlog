package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.repository.AiBlogKnowledgeDocumentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiAssistantCapabilityService {

    private static final List<String> CAPABILITY_KEYWORDS = List.of(
            "知识库", "已发布文章", "博客文章", "连接", "接入", "能访问", "能读取", "能看到",
            "你能做什么", "哪些能力", "当前能力", "全文检索", "所有文章", "已发布的文章"
    );

    private final PostRepository postRepository;
    private final AiBlogKnowledgeDocumentRepository knowledgeDocumentRepository;

    public CapabilityAnswer answer(String question) {
        if (!isCapabilityQuestion(question)) {
            return CapabilityAnswer.unanswered();
        }

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

    private boolean isCapabilityQuestion(String question) {
        if (!StringUtils.hasText(question)) {
            return false;
        }
        String normalized = question.trim();
        return CAPABILITY_KEYWORDS.stream().anyMatch(normalized::contains);
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
