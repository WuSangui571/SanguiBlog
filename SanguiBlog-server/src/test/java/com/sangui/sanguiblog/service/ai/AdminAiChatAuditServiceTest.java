package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDetailDto;
import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.AiChatMessage;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AiChatMessageRepository;
import com.sangui.sanguiblog.model.repository.AiChatSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
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

class AdminAiChatAuditServiceTest {

    @Test
    void shouldReturnPageResponseWithMetadata() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        AiChatSession session = buildSession(12L, 8L, "alice", "Alice", "SUPER_ADMIN", "超级管理员");
        session.setTitle("RAG 调试");
        session.setLastMessagePreview("请总结最近发布的文章");
        session.setUpdatedAt(Instant.parse("2026-03-18T08:00:00Z"));
        session.setUserVisible(Boolean.FALSE);
        session.setUserHiddenAt(Instant.parse("2026-03-18T08:05:00Z"));

        PageRequest expectedPageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "updatedAt", "id"));
        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(session), expectedPageable, 1));

        PageResponse<AdminAiChatSessionDto> result = service.listSessions(1, 20, "ALL", "ALL");

        assertEquals(1, result.getRecords().size());
        assertEquals(1L, result.getTotal());
        assertEquals(1, result.getPage());
        assertEquals(20, result.getSize());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(sessionRepository).findAll(any(Specification.class), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("updatedAt").getDirection());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("id").getDirection());
    }

    @Test
    void shouldMapSessionDtoFieldsCompletely() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        AiChatSession session = buildSession(12L, 8L, "alice", "Alice", "SUPER_ADMIN", "超级管理员");
        session.setTitle("RAG 调试");
        session.setLastMessagePreview("请总结最近发布的文章");
        session.setUpdatedAt(Instant.parse("2026-03-18T08:00:00Z"));
        session.setUserVisible(Boolean.FALSE);
        session.setUserHiddenAt(Instant.parse("2026-03-18T08:05:00Z"));

        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(session), PageRequest.of(0, 20), 1));

        PageResponse<AdminAiChatSessionDto> result = service.listSessions(1, 20, "ALL", "ALL");
        AdminAiChatSessionDto dto = result.getRecords().get(0);

        assertEquals(12L, dto.getId());
        assertEquals("alice", dto.getUsername());
        assertEquals("Alice", dto.getDisplayName());
        assertEquals("SUPER_ADMIN", dto.getRoleCode());
        assertEquals("超级管理员", dto.getRoleName());
        assertEquals("RAG 调试", dto.getTitle());
        assertEquals(Boolean.FALSE, dto.getUserVisible());
        assertEquals(Instant.parse("2026-03-18T08:05:00Z"), dto.getUserHiddenAt());
        assertEquals(Boolean.FALSE, dto.getGuest());
    }

    @Test
    void shouldMapGuestSessionFields() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        AiChatSession session = new AiChatSession();
        session.setId(21L);
        session.setTitle("访客临时对话");
        session.setLastMessagePreview("帮我总结一下首页内容");
        session.setGuestVisitorId("visitor-001");
        session.setSessionStartIp("203.0.113.10");
        session.setLatestIp("198.51.100.23");
        session.setIpChanged(Boolean.TRUE);
        session.setIpChangedAt(Instant.parse("2026-03-24T08:03:00Z"));
        session.setCreatedAt(Instant.parse("2026-03-24T08:00:00Z"));
        session.setUpdatedAt(Instant.parse("2026-03-24T08:05:00Z"));
        session.setUserVisible(Boolean.TRUE);

        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(session), PageRequest.of(0, 20), 1));

        PageResponse<AdminAiChatSessionDto> result = service.listSessions(1, 20, "ALL", "ALL");
        AdminAiChatSessionDto dto = result.getRecords().get(0);

        assertEquals(Boolean.TRUE, dto.getGuest());
        assertEquals("203.0.113.10", dto.getSessionStartIp());
        assertEquals("198.51.100.23", dto.getLatestIp());
        assertEquals(Boolean.TRUE, dto.getIpChanged());
        assertEquals(Instant.parse("2026-03-24T08:03:00Z"), dto.getIpChangedAt());
        assertEquals("visitor-001", dto.getGuestVisitorId());
        assertEquals("", dto.getUsername());
        assertEquals("", dto.getDisplayName());
    }

    @Test
    void shouldClampInvalidPageAndSize() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<AiChatSession>(List.of(), invocation.getArgument(1), 0));

        PageResponse<AdminAiChatSessionDto> result = service.listSessions(0, 60, "ALL", "ALL");
        assertEquals(1, result.getPage());
        assertEquals(50, result.getSize());

        PageResponse<AdminAiChatSessionDto> result2 = service.listSessions(-5, 0, "ALL", "ALL");
        assertEquals(1, result2.getPage());
        assertEquals(1, result2.getSize());

        PageResponse<AdminAiChatSessionDto> result3 = service.listSessions(1, 100, "ALL", "ALL");
        assertEquals(50, result3.getSize());
    }

    @Test
    void shouldThrowForInvalidVisibility() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.listSessions(1, 20, "INVALID", "ALL"));
        assertTrue(ex.getMessage().contains("visibility"));
    }

    @Test
    void shouldThrowForInvalidIdentity() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.listSessions(1, 20, "ALL", "BAD"));
        assertTrue(ex.getMessage().contains("identity"));
    }

    @Test
    void shouldAcceptAllValidVisibilityAndIdentityCombinations() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        AiChatSession session = buildSession(1L, 1L, "test", "Test", "USER", "普通用户");

        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(session), PageRequest.of(0, 20), 1));

        PageResponse<AdminAiChatSessionDto> result;

        result = service.listSessions(1, 20, "ALL", "ALL");
        assertNotNull(result);
        result = service.listSessions(1, 20, "VISIBLE", "ALL");
        assertNotNull(result);
        result = service.listSessions(1, 20, "HIDDEN", "ALL");
        assertNotNull(result);
        result = service.listSessions(1, 20, "ALL", "LOGGED_IN");
        assertNotNull(result);
        result = service.listSessions(1, 20, "ALL", "GUEST");
        assertNotNull(result);
    }

    @Test
    void shouldReturnEmptyPageWhenNoSessionsMatch() {
        AiChatSessionRepository sessionRepository = mock(AiChatSessionRepository.class);
        AiChatMessageRepository messageRepository = mock(AiChatMessageRepository.class);
        AdminAiChatAuditService service = new AdminAiChatAuditService(sessionRepository, messageRepository);

        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        PageResponse<AdminAiChatSessionDto> result = service.listSessions(1, 20, "VISIBLE", "GUEST");

        assertEquals(0, result.getRecords().size());
        assertEquals(0L, result.getTotal());
        assertEquals(1, result.getPage());
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
        assistantMessage.setModelName("gpt-4o-mini");
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
        assertEquals("gpt-4o-mini", detail.getMessages().get(1).getModelName());
        assertEquals(Boolean.FALSE, detail.getSession().getGuest());
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
