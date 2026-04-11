package com.sangui.sanguiblog.security;

import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.PermissionService;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    private static final String JWT_SECRET = "12345678901234567890123456789012";

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldAuthenticateByStableUserIdClaimWhenUsernameHasChanged() throws ServletException, IOException {
        UserRepository userRepository = mock(UserRepository.class);
        PermissionService permissionService = mock(PermissionService.class);
        JwtUtil jwtUtil = new JwtUtil(JWT_SECRET, 180, "sangui-blog");
        CustomUserDetailsService userDetailsService = new CustomUserDetailsService(userRepository, permissionService);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtUtil, userDetailsService);

        User renamedUser = user(7L, "new-name");
        when(userRepository.findByUsername("old-name")).thenReturn(Optional.empty());
        when(userRepository.findById(7L)).thenReturn(Optional.of(renamedUser));
        when(permissionService.permissionsForRole("USER")).thenReturn(List.of("PERM_PROFILE_UPDATE"));
        String token = jwtUtil.generateToken("old-name", Map.of("uid", 7L, "role", "USER"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertTrue(authentication.getPrincipal() instanceof UserPrincipal);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertEquals(7L, principal.getId());
        assertEquals("new-name", principal.getUsername());
    }

    private User user(Long id, String username) {
        Role role = new Role();
        role.setId(3L);
        role.setCode("USER");
        role.setName("普通用户");

        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setDisplayName("测试用户");
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        return user;
    }
}
