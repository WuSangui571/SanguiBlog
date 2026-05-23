package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SiteWechatQrServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldUploadAndStoreFileUnderSiteWechatDirectory() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = spy(new SiteWechatQrService(userRepository, storagePathResolver));

        User superAdmin = superAdminUser();
        when(userRepository.findAll()).thenReturn(List.of(superAdmin));
        doReturn(superAdmin).when(service).resolveSuperAdminUser();

        MockMultipartFile file = new MockMultipartFile(
                "file", "qr.png", "image/png", "test-png-content".getBytes());

        var result = service.upload(file, 1L);

        assertNotNull(result.getUrl());
        assertTrue(result.getUrl().startsWith("/uploads/site/wechat/"));
        assertTrue(result.getUrl().endsWith(".png"));

        Path stored = tempDir.resolve(
                result.getUrl().replaceFirst("^/uploads/", ""));
        assertTrue(Files.exists(stored));

        verify(userRepository).save(superAdmin);
        assertNotNull(superAdmin.getWechatQrUrl());
    }

    @Test
    void shouldDeletePreviousOwnedLocalUploadWhenReplacing() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = spy(new SiteWechatQrService(userRepository, storagePathResolver));

        Path oldFile = tempDir.resolve("site").resolve("wechat").resolve("old-qr.png");
        Files.createDirectories(oldFile.getParent());
        Files.writeString(oldFile, "old");

        User superAdmin = superAdminUser();
        superAdmin.setWechatQrUrl("/uploads/site/wechat/old-qr.png");
        doReturn(superAdmin).when(service).resolveSuperAdminUser();

        MockMultipartFile file = new MockMultipartFile(
                "file", "qr.webp", "image/webp", "new-content".getBytes());

        service.upload(file, 1L);

        assertFalse(Files.exists(oldFile));
        assertTrue(superAdmin.getWechatQrUrl().startsWith("/uploads/site/wechat/"));
        assertTrue(superAdmin.getWechatQrUrl().endsWith(".webp"));
    }

    @Test
    void shouldRejectEmptyFile() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = new SiteWechatQrService(userRepository, storagePathResolver);

        MockMultipartFile file = new MockMultipartFile(
                "file", "qr.png", "image/png", new byte[0]);

        assertThrows(IllegalArgumentException.class, () -> service.upload(file, 1L));
    }

    @Test
    void shouldRejectUnsupportedExtension() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = new SiteWechatQrService(userRepository, storagePathResolver);

        MockMultipartFile file = new MockMultipartFile(
                "file", "qr.svg", "image/svg+xml", "svg".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.upload(file, 1L));
    }

    @Test
    void shouldRejectTooLargeFile() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = new SiteWechatQrService(userRepository, storagePathResolver);

        MockMultipartFile file = new MockMultipartFile(
                "file", "qr.png", "image/png", new byte[6 * 1024 * 1024]);

        assertThrows(IllegalArgumentException.class, () -> service.upload(file, 1L));
    }

    @Test
    void shouldDeleteAndClearWechatQrUrl() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = spy(new SiteWechatQrService(userRepository, storagePathResolver));

        User superAdmin = superAdminUser();
        Path oldFile = tempDir.resolve("site").resolve("wechat").resolve("existing-qr.png");
        try {
            Files.createDirectories(oldFile.getParent());
            Files.writeString(oldFile, "old");
        } catch (java.io.IOException e) {
            throw new AssertionError(e);
        }
        superAdmin.setWechatQrUrl("/uploads/site/wechat/existing-qr.png");
        doReturn(superAdmin).when(service).resolveSuperAdminUser();

        var result = service.delete(1L);

        assertNull(result.getUrl());
        assertNull(superAdmin.getWechatQrUrl());
        assertFalse(Files.exists(oldFile));
        verify(userRepository).save(superAdmin);
    }

    @Test
    void shouldRejectNonSuperAdminWechatQrUrlUpdate() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());

        User normalUser = new User();
        normalUser.setId(42L);
        normalUser.setUsername("normal");
        normalUser.setDisplayName("普通用户");
        normalUser.setRole(normalRole());
        when(userRepository.findById(42L)).thenReturn(Optional.of(normalUser));

        AuthService authService = new AuthService(
                mock(org.springframework.security.authentication.AuthenticationManager.class),
                userRepository,
                mock(org.springframework.security.crypto.password.PasswordEncoder.class),
                mock(com.sangui.sanguiblog.security.JwtUtil.class),
                storagePathResolver,
                mock(LoginAttemptService.class)
        );

        com.sangui.sanguiblog.model.dto.UpdateProfileRequest request =
                new com.sangui.sanguiblog.model.dto.UpdateProfileRequest();
        request.setWechatQrUrl("/uploads/site/wechat/hacked.png");

        assertThrows(SecurityException.class, () -> authService.updateProfile(42L, request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldAllowSuperAdminWechatQrUrlUpdate() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());

        User superAdmin = superAdminUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(superAdmin));

        AuthService authService = new AuthService(
                mock(org.springframework.security.authentication.AuthenticationManager.class),
                userRepository,
                mock(org.springframework.security.crypto.password.PasswordEncoder.class),
                mock(com.sangui.sanguiblog.security.JwtUtil.class),
                storagePathResolver,
                mock(LoginAttemptService.class)
        );

        com.sangui.sanguiblog.model.dto.UpdateProfileRequest request =
                new com.sangui.sanguiblog.model.dto.UpdateProfileRequest();
        request.setWechatQrUrl("/uploads/site/wechat/new.png");
        request.setUsername("sangui");
        request.setDisplayName("三桂");

        var result = authService.updateProfile(7L, request);

        assertEquals("/uploads/site/wechat/new.png", superAdmin.getWechatQrUrl());
        verify(userRepository).save(superAdmin);
    }

    @Test
    void shouldRejectUnsupportedContentType() {
        UserRepository userRepository = mock(UserRepository.class);
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        SiteWechatQrService service = new SiteWechatQrService(userRepository, storagePathResolver);

        MockMultipartFile file = new MockMultipartFile(
                "file", "qr.jpg", "application/octet-stream", "binary".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.upload(file, 1L));
    }

    private User superAdminUser() {
        Role role = new Role();
        role.setId(1L);
        role.setCode("SUPER_ADMIN");
        role.setName("超级管理员");

        User user = new User();
        user.setId(7L);
        user.setUsername("sangui");
        user.setDisplayName("三桂");
        user.setRole(role);
        return user;
    }

    private Role normalRole() {
        Role role = new Role();
        role.setId(3L);
        role.setCode("USER");
        role.setName("普通用户");
        return role;
    }
}
