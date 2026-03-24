package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.PublicRegistrationRequest;
import com.sangui.sanguiblog.model.dto.UserProfileDto;
import com.sangui.sanguiblog.model.entity.RegistrationInvite;
import com.sangui.sanguiblog.model.entity.Role;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.RoleRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PublicRegistrationServiceTest {

    @Test
    void shouldCreateUserWithInviteAndConsumeInvite() {
        UserRepository userRepository = mock(UserRepository.class);
        RoleRepository roleRepository = mock(RoleRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        RegistrationInviteService inviteService = mock(RegistrationInviteService.class);
        AvatarStorageService avatarStorageService = mock(AvatarStorageService.class);

        PublicRegistrationService service = new PublicRegistrationService(
                userRepository,
                roleRepository,
                passwordEncoder,
                inviteService,
                avatarStorageService
        );

        RegistrationInvite invite = new RegistrationInvite();
        invite.setInviteCode("SG-READY-001");
        invite.setExpiresAt(Instant.now().plusSeconds(300));

        Role userRole = new Role();
        userRole.setId(3L);
        userRole.setCode("USER");
        userRole.setName("普通用户");

        MultipartFile avatar = mock(MultipartFile.class);
        when(inviteService.lockUsableInvite("SG-READY-001")).thenReturn(invite);
        when(userRepository.findByUsernameIgnoreCase("newbie")).thenReturn(Optional.empty());
        when(roleRepository.findByCode("USER")).thenReturn(Optional.of(userRole));
        when(passwordEncoder.encode("Pass123!")).thenReturn("encoded-password");
        when(avatarStorageService.storeAvatar(avatar)).thenReturn("avatar-file.png");
        doAnswer(invocation -> {
            RegistrationInvite targetInvite = invocation.getArgument(0);
            User consumedUser = invocation.getArgument(1);
            targetInvite.setConsumedBy(consumedUser);
            targetInvite.setConsumedAt(Instant.now());
            return null;
        }).when(inviteService).markConsumed(eq(invite), any(User.class));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(88L);
            return saved;
        });

        PublicRegistrationRequest request = new PublicRegistrationRequest();
        request.setInviteCode("SG-READY-001");
        request.setUsername("newbie");
        request.setDisplayName("新用户");
        request.setPassword("Pass123!");
        request.setConfirmPassword("Pass123!");

        UserProfileDto result = service.register(request, avatar);

        assertEquals(88L, result.getId());
        assertEquals("newbie", result.getUsername());
        assertEquals("新用户", result.getDisplayName());
        assertEquals("USER", result.getRole());
        assertEquals("/avatar/avatar-file.png", result.getAvatar());
        assertNotNull(invite.getConsumedAt());
        assertNotNull(invite.getConsumedBy());
        assertEquals("USER", invite.getConsumedBy().getRole().getCode());
        verify(inviteService).markConsumed(invite, invite.getConsumedBy());
    }
}
