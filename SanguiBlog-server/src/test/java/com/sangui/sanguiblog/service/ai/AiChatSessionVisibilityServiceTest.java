package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiChatSessionVisibilityServiceTest {

    @Test
    void shouldHideOverflowSessionsBeyondLatestTen() {
        AiChatSessionRepository repository = mock(AiChatSessionRepository.class);
        AiChatSessionVisibilityService service = new AiChatSessionVisibilityService(repository);

        List<AiChatSession> sessions = new ArrayList<>();
        for (long i = 1; i <= 12; i++) {
            AiChatSession session = new AiChatSession();
            session.setId(i);
            session.setUserVisible(Boolean.TRUE);
            session.setUpdatedAt(Instant.parse("2026-03-18T08:00:00Z").minusSeconds(i));
            sessions.add(session);
        }

        when(repository.findByUserIdAndUserVisibleTrueOrderByUpdatedAtDescIdDesc(7L)).thenReturn(sessions);

        service.enforceRecentVisibleLimit(7L);

        verify(repository).saveAll(any());
        assertTrue(Boolean.FALSE.equals(sessions.get(10).getUserVisible()));
        assertTrue(Boolean.FALSE.equals(sessions.get(11).getUserVisible()));
        assertNotNull(sessions.get(10).getUserHiddenAt());
        assertNotNull(sessions.get(11).getUserHiddenAt());
        assertEquals(Boolean.TRUE, sessions.get(0).getUserVisible());
    }

    @Test
    void shouldSoftHideOwnedSessionInsteadOfDeletingIt() {
        AiChatSessionRepository repository = mock(AiChatSessionRepository.class);
        AiChatSessionVisibilityService service = new AiChatSessionVisibilityService(repository);

        AiChatSession session = new AiChatSession();
        session.setId(15L);
        session.setUserVisible(Boolean.TRUE);

        when(repository.findByIdAndUserId(15L, 3L)).thenReturn(Optional.of(session));

        service.hideSessionForUser(3L, 15L);

        verify(repository).save(session);
        assertEquals(Boolean.FALSE, session.getUserVisible());
        assertNotNull(session.getUserHiddenAt());
    }

    @Test
    void shouldRejectDeletingSessionNotOwnedByUser() {
        AiChatSessionRepository repository = mock(AiChatSessionRepository.class);
        AiChatSessionVisibilityService service = new AiChatSessionVisibilityService(repository);

        when(repository.findByIdAndUserId(99L, 5L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.hideSessionForUser(5L, 99L)
        );

        assertTrue(exception.getReason().contains("会话"));
    }
}
