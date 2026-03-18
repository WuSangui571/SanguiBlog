package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiChatMessageDto;
import com.sangui.sanguiblog.model.dto.AiChatResponse;
import com.sangui.sanguiblog.model.dto.AiChatSessionDto;
import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.ai.rag.AiBlogRagService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.Disposable;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);
    private static final String DEFAULT_SESSION_TITLE = "新对话";
    private static final String DEFAULT_MODE = "DATABASE_SESSION_HISTORY";

    private final ChatModel chatModel;
    private final AiAssistantSettingService aiAssistantSettingService;
    private final AiChatSessionRepository aiChatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final UserRepository userRepository;
    private final AiBlogRagService aiBlogRagService;

    @Value("${spring.ai.dashscope.chat.options.model:qwen-flash}")
    private String configuredModel;

    @Value("${ai.chat.context.max-messages:16}")
    private int maxContextMessages;

    @Transactional
    public AiChatSessionDto createSession(Long userId) {
        User user = findUser(userId);
        Instant now = Instant.now();

        AiChatSession session = new AiChatSession();
        session.setUser(user);
        session.setTitle(DEFAULT_SESSION_TITLE);
        session.setLastMessagePreview(null);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);

        return toSessionDto(aiChatSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<AiChatSessionDto> sessions(Long userId) {
        return aiChatSessionRepository.findByUserIdOrderByUpdatedAtDescIdDesc(userId).stream()
                .map(this::toSessionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AiChatMessageDto> sessionMessages(Long userId, Long sessionId) {
        AiChatSession session = findOwnedSession(userId, sessionId);
        return aiChatMessageRepository.findBySessionIdOrderByCreatedAtAscIdAsc(session.getId()).stream()
                .map(this::toMessageDto)
                .toList();
    }

    @Transactional
    public AiChatResponse chat(Long userId, Long sessionId, String message) {
        AiChatSession session = findOwnedSession(userId, sessionId);
        String userMessage = normalizeMessage(message);
        AiBlogRagService.AiBlogRagContext ragContext = aiBlogRagService.retrieve(userMessage);

        List<Message> promptMessages = buildPromptMessages(session.getId(), userMessage, ragContext);

        try {
            ChatResponse response = chatModel.call(new Prompt(promptMessages));
            AssistantMessage output = response.getResult() != null ? response.getResult().getOutput() : null;
            String reply = output != null ? output.getText() : null;
            if (!StringUtils.hasText(reply)) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 服务未返回有效内容，请稍后再试");
            }

            String normalizedReply = reply.trim();
            Instant now = Instant.now();
            aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, now));
            aiChatMessageRepository.save(buildMessage(session, "assistant", normalizedReply, configuredModel, now));

            updateSessionAfterReply(session, userMessage, normalizedReply, now);

            return AiChatResponse.builder()
                    .sessionId(session.getId())
                    .reply(normalizedReply)
                    .model(configuredModel)
                    .mode(resolveMode(ragContext))
                    .references(ragContext.getReferences())
                    .build();
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("调用通义千问聊天接口失败", ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 服务调用失败，请稍后再试");
        }
    }

    public SseEmitter streamChat(Long userId, Long sessionId, String message) {
        AiChatSession session = findOwnedSession(userId, sessionId);
        String userMessage = normalizeMessage(message);
        AiBlogRagService.AiBlogRagContext ragContext = aiBlogRagService.retrieve(userMessage);
        List<Message> promptMessages = buildPromptMessages(session.getId(), userMessage, ragContext);

        Instant userMessageAt = Instant.now();
        if (DEFAULT_SESSION_TITLE.equals(session.getTitle())) {
            session.setTitle(buildSessionTitle(userMessage));
        }
        session.setLastMessagePreview(trimToLength(userMessage, 500));
        session.setUpdatedAt(userMessageAt);
        aiChatSessionRepository.save(session);
        aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, userMessageAt));

        SseEmitter emitter = new SseEmitter(0L);
        StringBuilder replyBuilder = new StringBuilder();

        Disposable subscription = chatModel.stream(new Prompt(promptMessages)).subscribe(
                response -> {
                    String chunk = extractChunk(response);
                    if (!StringUtils.hasText(chunk)) {
                        return;
                    }
                    replyBuilder.append(chunk);
                    if (!sendSseEvent(emitter, "chunk", Map.of("text", chunk))) {
                        emitter.complete();
                    }
                },
                error -> {
                    log.error("调用通义千问流式聊天接口失败", error);
                    try {
                        String reply = callSyncReply(promptMessages);
                        if (!StringUtils.hasText(reply)) {
                            sendSseEvent(emitter, "error", Map.of("message", "AI 服务调用失败，请稍后再试"));
                            emitter.complete();
                            return;
                        }
                        completeAssistantReply(emitter, session, reply, ragContext);
                    } catch (Exception fallbackError) {
                        log.error("流式失败后回退同步聊天也失败", fallbackError);
                        sendSseEvent(emitter, "error", Map.of("message", "AI 服务调用失败，请稍后再试"));
                        emitter.complete();
                    }
                },
                () -> {
                    String reply = replyBuilder.toString().trim();
                    if (!StringUtils.hasText(reply)) {
                        sendSseEvent(emitter, "error", Map.of("message", "AI 服务未返回有效内容，请稍后再试"));
                        emitter.complete();
                        return;
                    }

                    completeAssistantReply(emitter, session, reply, ragContext);
                }
        );

        emitter.onCompletion(subscription::dispose);
        emitter.onTimeout(() -> {
            subscription.dispose();
            emitter.complete();
        });
        emitter.onError(error -> subscription.dispose());

        return emitter;
    }

    private List<Message> buildPromptMessages(
            Long sessionId,
            String userMessage,
            AiBlogRagService.AiBlogRagContext ragContext
    ) {
        List<Message> promptMessages = new ArrayList<>();
        promptMessages.add(new SystemMessage(buildSystemPrompt(ragContext)));
        promptMessages.addAll(loadContextMessages(sessionId));
        promptMessages.add(new UserMessage(userMessage));
        return promptMessages;
    }

    private String buildSystemPrompt(AiBlogRagService.AiBlogRagContext ragContext) {
        String basePrompt = aiAssistantSettingService.systemPrompt();
        if (!ragContext.hasContext()) {
            return basePrompt;
        }
        return basePrompt
                + System.lineSeparator()
                + System.lineSeparator()
                + ragContext.getSystemContext();
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在"));
    }

    private AiChatSession findOwnedSession(Long userId, Long sessionId) {
        if (sessionId == null) {
            throw new IllegalArgumentException("会话ID不能为空");
        }
        return aiChatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会话不存在或无权访问"));
    }

    private List<Message> loadContextMessages(Long sessionId) {
        return aiChatMessageRepository.findBySessionIdOrderByCreatedAtDescIdDesc(
                        sessionId,
                        PageRequest.of(0, Math.max(1, maxContextMessages)))
                .stream()
                .sorted(Comparator.comparing(AiChatMessage::getCreatedAt).thenComparing(AiChatMessage::getId))
                .map(this::toPromptMessage)
                .toList();
    }

    private Message toPromptMessage(AiChatMessage message) {
        return switch (message.getRole()) {
            case "assistant" -> new AssistantMessage(message.getContent());
            case "user" -> new UserMessage(message.getContent());
            default -> new UserMessage(message.getContent());
        };
    }

    private String extractChunk(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return "";
        }
        String text = response.getResult().getOutput().getText();
        return text == null ? "" : text;
    }

    private String callSyncReply(List<Message> promptMessages) {
        ChatResponse response = chatModel.call(new Prompt(promptMessages));
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return "";
        }
        String text = response.getResult().getOutput().getText();
        return text == null ? "" : text.trim();
    }

    private String normalizeMessage(String message) {
        String userMessage = message == null ? "" : message.trim();
        if (!StringUtils.hasText(userMessage)) {
            throw new IllegalArgumentException("消息不能为空");
        }
        return userMessage;
    }

    private AiChatMessage buildMessage(AiChatSession session, String role, String content, String modelName, Instant createdAt) {
        AiChatMessage message = new AiChatMessage();
        message.setSession(session);
        message.setRole(role);
        message.setContent(content);
        message.setModelName(modelName);
        message.setCreatedAt(createdAt);
        return message;
    }

    private AiChatSessionDto toSessionDto(AiChatSession session) {
        return AiChatSessionDto.builder()
                .id(session.getId())
                .title(session.getTitle())
                .lastMessagePreview(session.getLastMessagePreview())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private AiChatMessageDto toMessageDto(AiChatMessage message) {
        return AiChatMessageDto.builder()
                .id(message.getId())
                .role(message.getRole())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String buildSessionTitle(String firstUserMessage) {
        return trimToLength(firstUserMessage == null ? DEFAULT_SESSION_TITLE : firstUserMessage.trim(), 60);
    }

    private String trimToLength(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return DEFAULT_SESSION_TITLE;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private boolean sendSseEvent(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
            return true;
        } catch (IOException ex) {
            log.warn("AI 流式响应发送失败, event={}", eventName, ex);
            return false;
        }
    }

    private void completeAssistantReply(
            SseEmitter emitter,
            AiChatSession session,
            String reply,
            AiBlogRagService.AiBlogRagContext ragContext
    ) {
        Instant assistantMessageAt = Instant.now();
        aiChatMessageRepository.save(buildMessage(session, "assistant", reply, configuredModel, assistantMessageAt));
        session.setLastMessagePreview(trimToLength(reply, 500));
        session.setUpdatedAt(assistantMessageAt);
        aiChatSessionRepository.save(session);

        sendSseEvent(emitter, "complete", Map.of(
                "reply", reply,
                "sessionId", session.getId(),
                "model", configuredModel,
                "mode", resolveMode(ragContext),
                "references", ragContext.getReferences()
        ));
        emitter.complete();
    }

    private void updateSessionAfterReply(AiChatSession session, String userMessage, String reply, Instant now) {
        if (DEFAULT_SESSION_TITLE.equals(session.getTitle())) {
            session.setTitle(buildSessionTitle(userMessage));
        }
        session.setLastMessagePreview(trimToLength(reply, 500));
        session.setUpdatedAt(now);
        aiChatSessionRepository.save(session);
    }

    private String resolveMode(AiBlogRagService.AiBlogRagContext ragContext) {
        return ragContext.hasContext() ? ragContext.getMode() : DEFAULT_MODE;
    }
}
