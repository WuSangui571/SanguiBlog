package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiChatResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final AiAssistantSettingService aiAssistantSettingService;
    private final ChatMemory chatMemory;

    @Value("${spring.ai.dashscope.chat.options.model:qwen-flash}")
    private String configuredModel;

    public AiChatResponse chat(String conversationId, String message) {
        String normalizedConversationId = conversationId == null ? "" : conversationId.trim();
        String userMessage = message == null ? "" : message.trim();

        if (!StringUtils.hasText(normalizedConversationId)) {
            throw new IllegalArgumentException("会话ID不能为空");
        }
        if (!StringUtils.hasText(userMessage)) {
            throw new IllegalArgumentException("消息不能为空");
        }

        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();
        if (builder == null) {
            throw new IllegalStateException("AI聊天服务尚未配置，请先注入 AI_DASHSCOPE_API_KEY 环境变量");
        }

        try {
            String reply = builder.build()
                    .prompt()
                    .advisors(advisorSpec -> advisorSpec
                            .advisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                            .param(ChatMemory.CONVERSATION_ID, normalizedConversationId))
                    .system(aiAssistantSettingService.systemPrompt())
                    .user(userMessage)
                    .call()
                    .content();

            if (!StringUtils.hasText(reply)) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI服务未返回有效内容，请稍后再试");
            }

            return AiChatResponse.builder()
                    .reply(reply.trim())
                    .model(configuredModel)
                    .mode("CHAT_MEMORY_JDBC")
                    .references(List.of())
                    .build();
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("调用通义千问聊天接口失败", ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI服务调用失败，请稍后再试");
        }
    }
}
