package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AiChatMessageDto;
import com.sangui.sanguiblog.model.dto.AiChatResponse;
import com.sangui.sanguiblog.model.dto.AiChatSessionDto;
import com.sangui.sanguiblog.model.dto.AiCurrentPageContextDto;
import com.sangui.sanguiblog.model.dto.AiLocalChatMessageDto;
import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.ai.rag.AiBlogRagService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);
    private static final String DEFAULT_SESSION_TITLE = "新对话";
    private static final String DEFAULT_MODE = "DATABASE_SESSION_HISTORY";
    private static final String SYSTEM_FACTS_MODE = "SYSTEM_FACTS";

    private final ChatModel chatModel;
    private final AiAssistantSettingService aiAssistantSettingService;
    private final AiAssistantCapabilityService aiAssistantCapabilityService;
    private final AiCurrentPageContextService aiCurrentPageContextService;
    private final AiCurrentUserContextService aiCurrentUserContextService;
    private final AiChatSessionVisibilityService aiChatSessionVisibilityService;
    private final AiGuestAccessService aiGuestAccessService;
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
        aiAssistantSettingService.assertEnabled();
        User user = findUser(userId);
        Instant now = Instant.now();

        AiChatSession session = new AiChatSession();
        session.setUser(user);
        session.setGuestVisitorId(null);
        session.setTitle(DEFAULT_SESSION_TITLE);
        session.setLastMessagePreview(null);
        session.setSessionStartIp(null);
        session.setLatestIp(null);
        session.setIpChanged(Boolean.FALSE);
        session.setIpChangedAt(null);
        session.setUserVisible(Boolean.TRUE);
        session.setUserHiddenAt(null);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);

        AiChatSession savedSession = aiChatSessionRepository.save(session);
        aiChatSessionVisibilityService.enforceRecentVisibleLimit(userId);
        return toSessionDto(savedSession);
    }

    @Transactional
    public List<AiChatSessionDto> sessions(Long userId) {
        aiAssistantSettingService.assertEnabled();
        aiChatSessionVisibilityService.enforceRecentVisibleLimit(userId);
        return aiChatSessionRepository.findByUserIdAndUserVisibleTrueOrderByUpdatedAtDescIdDesc(userId).stream()
                .limit(AiChatSessionVisibilityService.USER_VISIBLE_SESSION_LIMIT)
                .map(this::toSessionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AiChatMessageDto> sessionMessages(Long userId, Long sessionId) {
        aiAssistantSettingService.assertEnabled();
        AiChatSession session = findOwnedSession(userId, sessionId);
        return aiChatMessageRepository.findBySessionIdOrderByCreatedAtAscIdAsc(session.getId()).stream()
                .map(this::toMessageDto)
                .toList();
    }

    @Transactional
    public void deleteSession(Long userId, Long sessionId) {
        aiAssistantSettingService.assertEnabled();
        aiChatSessionVisibilityService.hideSessionForUser(userId, sessionId);
    }

    @Transactional
    public AiChatResponse chat(
            Long userId,
            Long sessionId,
            String message,
            AiCurrentPageContextDto currentPageContext,
            List<AiLocalChatMessageDto> localHistory,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        aiAssistantSettingService.assertEnabled();
        AiGuestAccessService.AccessContext accessContext = aiGuestAccessService.resolveContext(userId, request, response);
        aiGuestAccessService.assertCanSend(accessContext);

        User currentUser = userId != null ? findUser(userId) : null;
        AiChatSession session = resolveChatSession(accessContext, userId, sessionId);
        String userMessage = normalizeMessage(message);

        AiAssistantCapabilityService.CapabilityAnswer capabilityAnswer = aiAssistantCapabilityService.answer(userMessage);
        if (capabilityAnswer.answered()) {
            return completeDirectAnswer(session, userMessage, capabilityAnswer.reply(), SYSTEM_FACTS_MODE);
        }

        AiBlogRagService.AiBlogRagContext ragContext = aiBlogRagService.retrieve(userMessage);
        AiCurrentPageContextService.PageContextAdvice pageContextAdvice =
                aiCurrentPageContextService.advise(userMessage, currentPageContext);
        List<Message> promptMessages = buildPromptMessages(
                accessContext,
                session != null ? session.getId() : null,
                localHistory,
                userMessage,
                ragContext,
                pageContextAdvice,
                currentUser
        );

        try {
            ChatResponse responsePayload = chatModel.call(new Prompt(promptMessages));
            AssistantMessage output = responsePayload.getResult() != null ? responsePayload.getResult().getOutput() : null;
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

    public SseEmitter streamChat(
            Long userId,
            Long sessionId,
            String message,
            AiCurrentPageContextDto currentPageContext,
            List<AiLocalChatMessageDto> localHistory,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        aiAssistantSettingService.assertEnabled();
        AiGuestAccessService.AccessContext accessContext = aiGuestAccessService.resolveContext(userId, request, response);
        aiGuestAccessService.assertCanSend(accessContext);

        User currentUser = userId != null ? findUser(userId) : null;
        AiChatSession session = resolveChatSession(accessContext, userId, sessionId);
        String userMessage = normalizeMessage(message);

        AiAssistantCapabilityService.CapabilityAnswer capabilityAnswer = aiAssistantCapabilityService.answer(userMessage);
        if (capabilityAnswer.answered()) {
            return streamDirectAnswer(session, userMessage, capabilityAnswer.reply(), SYSTEM_FACTS_MODE);
        }

        AiBlogRagService.AiBlogRagContext ragContext = aiBlogRagService.retrieve(userMessage);
        AiCurrentPageContextService.PageContextAdvice pageContextAdvice =
                aiCurrentPageContextService.advise(userMessage, currentPageContext);
        List<Message> promptMessages = buildPromptMessages(
                accessContext,
                session != null ? session.getId() : null,
                localHistory,
                userMessage,
                ragContext,
                pageContextAdvice,
                currentUser
        );

        Instant userMessageAt = Instant.now();
        if (DEFAULT_SESSION_TITLE.equals(session.getTitle())) {
            session.setTitle(buildSessionTitle(userMessage));
        }
        session.setLastMessagePreview(trimToPreview(userMessage));
        session.setUpdatedAt(userMessageAt);
        aiChatSessionRepository.save(session);
        aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, userMessageAt));

        SseEmitter emitter = new SseEmitter(0L);
        StringBuilder replyBuilder = new StringBuilder();

        Disposable subscription = chatModel.stream(new Prompt(promptMessages)).subscribe(
                chatResponse -> {
                    String chunk = extractChunk(chatResponse);
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

    private AiChatResponse completeDirectAnswer(AiChatSession session, String userMessage, String reply, String mode) {
        Instant now = Instant.now();
        aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, now));
        aiChatMessageRepository.save(buildMessage(session, "assistant", reply, configuredModel, now));
        updateSessionAfterReply(session, userMessage, reply, now);

        return AiChatResponse.builder()
                .sessionId(session.getId())
                .reply(reply)
                .model(configuredModel)
                .mode(mode)
                .references(List.of())
                .build();
    }

    private SseEmitter streamDirectAnswer(AiChatSession session, String userMessage, String reply, String mode) {
        Instant now = Instant.now();
        aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, now));
        aiChatMessageRepository.save(buildMessage(session, "assistant", reply, configuredModel, now));
        updateSessionAfterReply(session, userMessage, reply, now);

        SseEmitter emitter = new SseEmitter(0L);
        sendSseEvent(emitter, "complete", Map.of(
                "reply", reply,
                "sessionId", session.getId(),
                "model", configuredModel,
                "mode", mode,
                "references", List.of()
        ));
        emitter.complete();
        return emitter;
    }

    private List<Message> buildPromptMessages(
            AiGuestAccessService.AccessContext accessContext,
            Long sessionId,
            List<AiLocalChatMessageDto> localHistory,
            String userMessage,
            AiBlogRagService.AiBlogRagContext ragContext,
            AiCurrentPageContextService.PageContextAdvice pageContextAdvice,
            User currentUser
    ) {
        List<Message> promptMessages = new ArrayList<>();
        promptMessages.add(new SystemMessage(buildSystemPrompt(accessContext, ragContext, pageContextAdvice, currentUser)));
        promptMessages.addAll(loadContextMessages(accessContext, sessionId, localHistory));
        promptMessages.add(new UserMessage(userMessage));
        return promptMessages;
    }

    private String buildSystemPrompt(
            AiGuestAccessService.AccessContext accessContext,
            AiBlogRagService.AiBlogRagContext ragContext,
            AiCurrentPageContextService.PageContextAdvice pageContextAdvice,
            User currentUser
    ) {
        List<String> sections = new ArrayList<>();
        sections.add(aiAssistantSettingService.systemPrompt());
        if (accessContext.guest()) {
            sections.add("当前为未登录访客对话。请正常回答站内相关问题，但不要假定你知道访客身份信息，也不要捏造访客账号、权限或后台能力。");
        }
        String userContext = aiCurrentUserContextService.buildSystemContext(currentUser);
        if (StringUtils.hasText(userContext)) {
            sections.add(userContext);
        }
        if (ragContext.hasContext()) {
            sections.add(ragContext.getSystemContext());
        }
        if (pageContextAdvice.useContext()) {
            sections.add(pageContextAdvice.systemContext());
        }
        return String.join(System.lineSeparator() + System.lineSeparator(), sections);
    }

    private List<Message> loadContextMessages(
            AiGuestAccessService.AccessContext accessContext,
            Long sessionId,
            List<AiLocalChatMessageDto> localHistory
    ) {
        if (!accessContext.guest()) {
            return aiChatMessageRepository.findBySessionIdOrderByCreatedAtDescIdDesc(
                            sessionId,
                            PageRequest.of(0, Math.max(1, maxContextMessages)))
                    .stream()
                    .sorted(Comparator.comparing(AiChatMessage::getCreatedAt).thenComparing(AiChatMessage::getId))
                    .map(this::toPromptMessage)
                    .toList();
        }

        if (localHistory == null || localHistory.isEmpty()) {
            return List.of();
        }

        int fromIndex = Math.max(0, localHistory.size() - Math.max(1, maxContextMessages));
        return localHistory.subList(fromIndex, localHistory.size()).stream()
                .filter(item -> item != null && StringUtils.hasText(item.getContent()))
                .map(this::toPromptMessage)
                .toList();
    }

    private User findUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在"));
    }

    private AiChatSession findOwnedSession(Long userId, Long sessionId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在");
        }
        if (sessionId == null) {
            throw new IllegalArgumentException("会话 ID 不能为空");
        }
        return aiChatSessionRepository.findByIdAndUserIdAndUserVisibleTrue(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会话不存在或无权访问"));
    }

    private AiChatSession resolveChatSession(
            AiGuestAccessService.AccessContext accessContext,
            Long userId,
            Long sessionId
    ) {
        if (!accessContext.guest()) {
            return findOwnedSession(userId, sessionId);
        }
        return findOrCreateGuestSession(accessContext, sessionId);
    }

    private AiChatSession findOrCreateGuestSession(
            AiGuestAccessService.AccessContext accessContext,
            Long sessionId
    ) {
        if (sessionId != null) {
            AiChatSession existing = aiChatSessionRepository.findByIdAndGuestVisitorId(sessionId, accessContext.visitorId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "访客会话不存在或无权访问"));
            applyGuestSessionIp(existing, accessContext.ip());
            return aiChatSessionRepository.save(existing);
        }

        Instant now = Instant.now();
        AiChatSession session = new AiChatSession();
        session.setUser(null);
        session.setGuestVisitorId(accessContext.visitorId());
        session.setTitle(DEFAULT_SESSION_TITLE);
        session.setLastMessagePreview(null);
        session.setSessionStartIp(accessContext.ip());
        session.setLatestIp(accessContext.ip());
        session.setIpChanged(Boolean.FALSE);
        session.setIpChangedAt(null);
        session.setUserVisible(Boolean.FALSE);
        session.setUserHiddenAt(null);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        return aiChatSessionRepository.save(session);
    }

    private void applyGuestSessionIp(AiChatSession session, String currentIp) {
        if (session == null || !StringUtils.hasText(currentIp)) {
            return;
        }
        if (!StringUtils.hasText(session.getSessionStartIp())) {
            session.setSessionStartIp(currentIp);
        }
        session.setLatestIp(currentIp);
        session.setUserVisible(Boolean.FALSE);
        if (!currentIp.equals(session.getSessionStartIp())) {
            session.setIpChanged(Boolean.TRUE);
            if (session.getIpChangedAt() == null) {
                session.setIpChangedAt(Instant.now());
            }
        }
    }

    private Message toPromptMessage(AiChatMessage message) {
        return switch (message.getRole()) {
            case "assistant" -> new AssistantMessage(message.getContent());
            case "user" -> new UserMessage(message.getContent());
            default -> new UserMessage(message.getContent());
        };
    }

    private Message toPromptMessage(AiLocalChatMessageDto message) {
        String content = message.getContent().trim();
        return "assistant".equals(message.getRole())
                ? new AssistantMessage(content)
                : new UserMessage(content);
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
        return trimToLength(firstUserMessage == null ? DEFAULT_SESSION_TITLE : firstUserMessage.trim(), 60, DEFAULT_SESSION_TITLE);
    }

    private String trimToPreview(String value) {
        return trimToLength(value, 500, DEFAULT_SESSION_TITLE);
    }

    private String trimToLength(String value, int maxLength, String defaultValue) {
        if (!StringUtils.hasText(value)) {
            return defaultValue;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private boolean sendSseEvent(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
            return true;
        } catch (IOException ex) {
            log.warn("AI 流式响应发送失败: event={}", eventName, ex);
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
        session.setLastMessagePreview(trimToPreview(reply));
        session.setUpdatedAt(assistantMessageAt);
        aiChatSessionRepository.save(session);
        if (session.getUser() != null) {
            aiChatSessionVisibilityService.enforceRecentVisibleLimit(session.getUser().getId());
        }

        sendSseEvent(emitter, "complete", buildCompleteEventPayload(
                reply,
                session.getId(),
                configuredModel,
                resolveMode(ragContext),
                ragContext != null ? ragContext.getReferences() : null
        ));
        emitter.complete();
    }

    static Map<String, Object> buildCompleteEventPayload(
            String reply,
            Long sessionId,
            String model,
            String mode,
            List<?> references
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("reply", reply);
        payload.put("sessionId", sessionId);
        payload.put("model", model);
        payload.put("mode", mode);
        payload.put("references", references == null ? List.of() : references);
        return payload;
    }

    private void updateSessionAfterReply(AiChatSession session, String userMessage, String reply, Instant now) {
        if (DEFAULT_SESSION_TITLE.equals(session.getTitle())) {
            session.setTitle(buildSessionTitle(userMessage));
        }
        session.setLastMessagePreview(trimToPreview(reply));
        session.setUpdatedAt(now);
        aiChatSessionRepository.save(session);
        if (session.getUser() != null) {
            aiChatSessionVisibilityService.enforceRecentVisibleLimit(session.getUser().getId());
        }
    }

    private String resolveMode(AiBlogRagService.AiBlogRagContext ragContext) {
        return ragContext.hasContext() ? ragContext.getMode() : DEFAULT_MODE;
    }
}
