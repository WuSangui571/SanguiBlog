package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiChatSessionVisibilityService {

    public static final int USER_VISIBLE_SESSION_LIMIT = 10;

    private final AiChatSessionRepository aiChatSessionRepository;

    @Transactional
    public void hideSessionForUser(Long userId, Long sessionId) {
        AiChatSession session = aiChatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会话不存在或无权访问"));

        if (Boolean.FALSE.equals(session.getUserVisible())) {
            return;
        }

        markHidden(session, Instant.now());
        aiChatSessionRepository.save(session);
    }

    @Transactional
    public void enforceRecentVisibleLimit(Long userId) {
        List<AiChatSession> visibleSessions = aiChatSessionRepository
                .findByUserIdAndUserVisibleTrueOrderByUpdatedAtDescIdDesc(userId);

        if (visibleSessions.size() <= USER_VISIBLE_SESSION_LIMIT) {
            return;
        }

        Instant hiddenAt = Instant.now();
        List<AiChatSession> overflowSessions = visibleSessions.subList(USER_VISIBLE_SESSION_LIMIT, visibleSessions.size());
        overflowSessions.forEach(session -> markHidden(session, hiddenAt));
        aiChatSessionRepository.saveAll(overflowSessions);
    }

    private void markHidden(AiChatSession session, Instant hiddenAt) {
        session.setUserVisible(Boolean.FALSE);
        session.setUserHiddenAt(hiddenAt);
    }
}
