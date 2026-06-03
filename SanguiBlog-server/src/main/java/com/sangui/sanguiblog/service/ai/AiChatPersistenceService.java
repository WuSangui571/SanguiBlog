package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.ai.rag.AiBlogRagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AiChatPersistenceService {

    private static final String DEFAULT_SESSION_TITLE = "新对话";

    private final AiChatSessionRepository aiChatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final UserRepository userRepository;
    private final AiChatSessionVisibilityService aiChatSessionVisibilityService;

    @Transactional
    public User findUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在"));
    }

    @Transactional
    public AiChatSession findOwnedSession(Long userId, Long sessionId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户未登录或不存在");
        }
        if (sessionId == null) {
            throw new IllegalArgumentException("会话 ID 不能为空");
        }
        return aiChatSessionRepository.findByIdAndUserIdAndUserVisibleTrue(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会话不存在或无权访问"));
    }

    @Transactional
    public AiChatSession findOrCreateGuestSession(String visitorId, Long sessionId, String ip) {
        if (sessionId != null) {
            AiChatSession existing = aiChatSessionRepository.findByIdAndGuestVisitorId(sessionId, visitorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "访客会话不存在或无权访问"));
            applyGuestSessionIp(existing, ip);
            return aiChatSessionRepository.save(existing);
        }

        Instant now = Instant.now();
        AiChatSession session = new AiChatSession();
        session.setUser(null);
        session.setGuestVisitorId(visitorId);
        session.setTitle(DEFAULT_SESSION_TITLE);
        session.setLastMessagePreview(null);
        session.setSessionStartIp(ip);
        session.setLatestIp(ip);
        session.setIpChanged(Boolean.FALSE);
        session.setIpChangedAt(null);
        session.setUserVisible(Boolean.FALSE);
        session.setUserHiddenAt(null);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        return aiChatSessionRepository.save(session);
    }

    @Transactional
    public AiChatMessage saveUserMessageAndUpdateSession(AiChatSession session, String userMessage, Instant at) {
        if (DEFAULT_SESSION_TITLE.equals(session.getTitle())) {
            session.setTitle(buildSessionTitle(userMessage));
        }
        session.setLastMessagePreview(trimToPreview(userMessage));
        session.setUpdatedAt(at);
        aiChatSessionRepository.save(session);
        return aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, at));
    }

    @Transactional
    public void saveUserMessageAndCompleteSession(
            AiChatSession session,
            String userMessage,
            String reply,
            String model,
            AiBlogRagService.AiBlogRagContext ragContext,
            Instant at
    ) {
        aiChatMessageRepository.save(buildMessage(session, "user", userMessage, null, at));
        saveAssistantAndCompleteSession(session, userMessage, reply, model, ragContext, at);
    }

    @Transactional
    public void saveAssistantAndCompleteSession(
            AiChatSession session,
            String reply,
            String model,
            AiBlogRagService.AiBlogRagContext ragContext,
            Instant at
    ) {
        saveAssistantAndCompleteSession(session, null, reply, model, ragContext, at);
    }

    private void saveAssistantAndCompleteSession(
            AiChatSession session,
            String userMessage,
            String reply,
            String model,
            AiBlogRagService.AiBlogRagContext ragContext,
            Instant at
    ) {
        aiChatMessageRepository.save(buildMessage(session, "assistant", reply, model, at));
        if (DEFAULT_SESSION_TITLE.equals(session.getTitle())) {
            session.setTitle(buildSessionTitle(userMessage));
        }
        session.setLastMessagePreview(trimToPreview(reply));
        session.setUpdatedAt(at);
        aiChatSessionRepository.save(session);
        if (session.getUser() != null) {
            aiChatSessionVisibilityService.enforceRecentVisibleLimit(session.getUser().getId());
        }
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
}
