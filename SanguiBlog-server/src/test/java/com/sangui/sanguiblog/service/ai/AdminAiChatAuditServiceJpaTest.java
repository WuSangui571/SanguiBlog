package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.dto.AdminAiChatSessionDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.AiChatSession;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@ActiveProfiles("test")
@Import(AdminAiChatAuditService.class)
class AdminAiChatAuditServiceJpaTest {

    @Autowired
    private AdminAiChatAuditService service;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void shouldFilterAuditSessionsAcrossFullDataset() {
        Role role = persistRole("USER", "普通用户");
        User visibleUser = persistUser(role, "visible-user", "Visible User");
        User hiddenUser = persistUser(role, "hidden-user", "Hidden User");

        persistSession(visibleUser, "visible-user-session", Boolean.TRUE, Instant.parse("2026-03-18T08:00:00Z"));
        persistSession(hiddenUser, "hidden-user-session", Boolean.FALSE, Instant.parse("2026-03-18T09:00:00Z"));
        persistSession(null, "guest-session", Boolean.TRUE, Instant.parse("2026-03-18T10:00:00Z"));
        entityManager.flush();
        entityManager.clear();

        assertEquals(List.of("visible-user-session"), titles(service.listSessions(1, 20, "VISIBLE", "ALL")));
        assertEquals(List.of("guest-session", "hidden-user-session"), titles(service.listSessions(1, 20, "HIDDEN", "ALL")));
        assertEquals(List.of("hidden-user-session", "visible-user-session"), titles(service.listSessions(1, 20, "ALL", "LOGGED_IN")));
        assertEquals(List.of("guest-session"), titles(service.listSessions(1, 20, "ALL", "GUEST")));
        assertTrue(service.listSessions(1, 20, "VISIBLE", "GUEST").getRecords().isEmpty());
    }

    @Test
    void shouldSortByUpdatedAtThenIdAndReturnOneBasedPageMetadata() {
        Role role = persistRole("ADMIN", "管理员");
        User user = persistUser(role, "audit-user", "Audit User");
        Instant sameUpdatedAt = Instant.parse("2026-03-18T09:00:00Z");

        persistSession(user, "older-session", Boolean.TRUE, Instant.parse("2026-03-18T08:00:00Z"));
        persistSession(user, "same-time-lower-id", Boolean.TRUE, sameUpdatedAt);
        persistSession(user, "same-time-higher-id", Boolean.TRUE, sameUpdatedAt);
        entityManager.flush();
        entityManager.clear();

        PageResponse<AdminAiChatSessionDto> firstPage = service.listSessions(1, 1, "ALL", "ALL");
        PageResponse<AdminAiChatSessionDto> secondPage = service.listSessions(2, 1, "ALL", "ALL");

        assertEquals(List.of("same-time-higher-id"), titles(firstPage));
        assertEquals(List.of("same-time-lower-id"), titles(secondPage));
        assertEquals(3L, firstPage.getTotal());
        assertEquals(1, firstPage.getPage());
        assertEquals(1, firstPage.getSize());
        assertEquals(2, secondPage.getPage());
    }

    private Role persistRole(String code, String name) {
        Role role = new Role();
        role.setCode(code);
        role.setName(name);
        return entityManager.persist(role);
    }

    private User persistUser(Role role, String username, String displayName) {
        User user = new User();
        user.setUsername(username);
        user.setDisplayName(displayName);
        user.setRole(role);
        user.setStatus("ACTIVE");
        return entityManager.persist(user);
    }

    private AiChatSession persistSession(User user, String title, Boolean userVisible, Instant updatedAt) {
        AiChatSession session = new AiChatSession();
        session.setUser(user);
        session.setTitle(title);
        session.setLastMessagePreview(title + " preview");
        session.setGuestVisitorId(user == null ? title + "-visitor" : null);
        session.setUserVisible(userVisible);
        session.setCreatedAt(updatedAt.minusSeconds(60));
        session.setUpdatedAt(updatedAt);
        return entityManager.persist(session);
    }

    private List<String> titles(PageResponse<AdminAiChatSessionDto> page) {
        return page.getRecords().stream()
                .map(AdminAiChatSessionDto::getTitle)
                .toList();
    }
}
