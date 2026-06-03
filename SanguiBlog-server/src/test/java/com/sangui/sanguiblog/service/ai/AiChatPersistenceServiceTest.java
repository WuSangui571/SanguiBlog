package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.ai.rag.AiBlogRagService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiChatPersistenceServiceTest {

    @Test
    void shouldPreserveSessionTitleAndPreviewWhenCompletingSyncReply() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        AiChatSessionVisibilityService visibilityService = mock(AiChatSessionVisibilityService.class);
        AiChatPersistenceService service = new AiChatPersistenceService(
                sessionRepository,
                messageRepository,
                userRepository,
                visibilityService
        );

        User user = new User();
        user.setId(7L);
        AiChatSession session = new AiChatSession();
        session.setId(21L);
        session.setUser(user);
        session.setTitle("新对话");

        when(messageRepository.save(any(AiChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(AiChatSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant at = Instant.parse("2026-06-03T12:00:00Z");
        service.saveUserMessageAndCompleteSession(
                session,
                "请介绍一下这个站点",
                "这是站点介绍回复",
                "qwen-flash",
                AiBlogRagService.AiBlogRagContext.empty(),
                at
        );

        ArgumentCaptor<AiChatMessage> messageCaptor = ArgumentCaptor.forClass(AiChatMessage.class);
        verify(messageRepository, times(2)).save(messageCaptor.capture());

        assertEquals("user", messageCaptor.getAllValues().get(0).getRole());
        assertEquals("请介绍一下这个站点", messageCaptor.getAllValues().get(0).getContent());
        assertEquals("assistant", messageCaptor.getAllValues().get(1).getRole());
        assertEquals("这是站点介绍回复", messageCaptor.getAllValues().get(1).getContent());
        assertEquals("qwen-flash", messageCaptor.getAllValues().get(1).getModelName());
        assertEquals("请介绍一下这个站点", session.getTitle());
        assertEquals("这是站点介绍回复", session.getLastMessagePreview());
        assertEquals(at, session.getUpdatedAt());
        verify(sessionRepository).save(session);
        verify(visibilityService).enforceRecentVisibleLimit(7L);
    }
}
