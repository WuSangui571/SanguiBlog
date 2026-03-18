package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDetailDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDto;
import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminAiChatAuditServiceTest {

    @Test
    void shouldListSessionsWithUserMetadata() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        AiChatSession session = buildSession(12L, 8L, "alice", "Alice", "SUPER_ADMIN", "超级管理员");
        session.setTitle("RAG 调试");
        session.setLastMessagePreview("请总结最近发布的文章");
        session.setUpdatedAt(Instant.parse("2026-03-18T08:00:00Z"));
        session.setUserVisible(Boolean.FALSE);
        session.setUserHiddenAt(Instant.parse("2026-03-18T08:05:00Z"));

        when(sessionRepository.findAllByOrderByUpdatedAtDescIdDesc()).thenReturn(List.of(session));

        List<AdminAiChatSessionDto> sessions = service.listSessions();

        assertEquals(1, sessions.size());
        assertEquals(12L, sessions.get(0).getId());
        assertEquals("alice", sessions.get(0).getUsername());
        assertEquals("Alice", sessions.get(0).getDisplayName());
        assertEquals("SUPER_ADMIN", sessions.get(0).getRoleCode());
        assertEquals("超级管理员", sessions.get(0).getRoleName());
        assertEquals("RAG 调试", sessions.get(0).getTitle());
        assertEquals(Boolean.FALSE, sessions.get(0).getUserVisible());
        assertEquals(Instant.parse("2026-03-18T08:05:00Z"), sessions.get(0).getUserHiddenAt());
    }

    @Test
    void shouldLoadSessionDetailWithMessages() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        AiChatSession session = buildSession(15L, 3L, "bob", "Bob", "USER", "普通用户");
        session.setTitle("文章总结");
        session.setCreatedAt(Instant.parse("2026-03-18T07:00:00Z"));
        session.setUpdatedAt(Instant.parse("2026-03-18T07:10:00Z"));
        session.setUserVisible(Boolean.TRUE);

        AiChatMessage userMessage = new AiChatMessage();
        userMessage.setId(101L);
        userMessage.setSession(session);
        userMessage.setRole("user");
        userMessage.setContent("这篇文章讲了什么？");
        userMessage.setCreatedAt(Instant.parse("2026-03-18T07:01:00Z"));

        AiChatMessage assistantMessage = new AiChatMessage();
        assistantMessage.setId(102L);
        assistantMessage.setSession(session);
        assistantMessage.setRole("assistant");
        assistantMessage.setContent("这篇文章主要介绍了...");
        assistantMessage.setModelName("qwen-flash");
        assistantMessage.setCreatedAt(Instant.parse("2026-03-18T07:01:03Z"));

        when(sessionRepository.findDetailById(15L)).thenReturn(Optional.of(session));
        when(messageRepository.findBySessionIdOrderByCreatedAtAscIdAsc(15L)).thenReturn(List.of(userMessage, assistantMessage));

        AdminAiChatSessionDetailDto detail = service.getSessionDetail(15L);

        assertEquals(15L, detail.getSession().getId());
        assertEquals("bob", detail.getSession().getUsername());
        assertEquals(Boolean.TRUE, detail.getSession().getUserVisible());
        assertEquals(2, detail.getMessages().size());
        assertEquals(15L, detail.getMessages().get(0).getSessionId());
        assertEquals("assistant", detail.getMessages().get(1).getRole());
        assertEquals("qwen-flash", detail.getMessages().get(1).getModelName());
    }

    @Test
    void shouldThrowWhenSessionDoesNotExist() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        when(sessionRepository.findDetailById(99L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.getSessionDetail(99L));
        assertTrue(exception.getReason().contains("会话"));
    }

    private AiChatSession buildSession(Long sessionId, Long userId, String username, String displayName, String roleCode, String roleName) {
        Role role = new Role();
        role.setCode(roleCode);
        role.setName(roleName);

        User user = new User();
        user.setId(userId);
        user.setUsername(username);
        user.setDisplayName(displayName);
        user.setRole(role);

        AiChatSession session = new AiChatSession();
        session.setId(sessionId);
        session.setUser(user);
        session.setUserVisible(Boolean.TRUE);
        session.setCreatedAt(Instant.parse("2026-03-18T06:00:00Z"));
        session.setUpdatedAt(Instant.parse("2026-03-18T06:30:00Z"));
        return session;
    }
}
