package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.UpdateProfileRequest;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldRejectUnsafeAvatarUrlDuringProfileUpdate() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        JwtUtil jwtUtil = mock(JwtUtil.class);
        LoginAttemptService loginAttemptService = mock(LoginAttemptService.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        AuthService service = new AuthService(
                authenticationManager,
                userRepository,
                passwordEncoder,
                jwtUtil,
                storagePathResolver,
                loginAttemptService
        );

        User user = new User();
        user.setId(7L);
        user.setUsername("tester");
        user.setDisplayName("测试用户");
        user.setAvatarUrl("safe-avatar.png");
        user.setPasswordHash("encoded");
        user.setRole(defaultRole());
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setAvatarUrl("../../sanguiblog_db.sql");

        assertThrows(IllegalArgumentException.class, () -> service.updateProfile(7L, request));
        assertEquals("safe-avatar.png", user.getAvatarUrl());
        verify(userRepository, never()).save(user);
    }

    private Role defaultRole() {
        Role role = new Role();
        role.setId(3L);
        role.setCode("USER");
        role.setName("普通用户");
        return role;
    }
}
