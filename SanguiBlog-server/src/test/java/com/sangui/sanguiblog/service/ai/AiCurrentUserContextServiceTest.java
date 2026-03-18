package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AiCurrentUserContextServiceTest {

    @Test
    void shouldBuildStableUserIdentityContext() {
        AiCurrentUserContextService service = new AiCurrentUserContextService();

        Role role = new Role();
        role.setCode("SUPER_ADMIN");
        role.setName("超级管理员");

        User user = new User();
        user.setUsername("sangui");
        user.setDisplayName("三桂");
        user.setTitle("站长");
        user.setRole(role);

        String context = service.buildSystemContext(user);

        assertTrue(context.contains("sangui"));
        assertTrue(context.contains("三桂"));
        assertTrue(context.contains("站长"));
        assertTrue(context.contains("超级管理员"));
        assertTrue(context.contains("SUPER_ADMIN"));
    }
}
