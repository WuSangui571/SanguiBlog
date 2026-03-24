package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminRegistrationInviteDto;
import com.sangui.sanguiblog.model.dto.PublicRegistrationInviteVerifyDto;
import com.sangui.sanguiblog.model.entity.RegistrationInvite;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.RegistrationInviteRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RegistrationInviteServiceTest {

    @Test
    void shouldGenerateInviteWithExpectedExpirationAndCreator() {
        RegistrationInviteRepository inviteRepository = mock(RegistrationInviteRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        RegistrationInviteService service = new RegistrationInviteService(inviteRepository, userRepository);

        User creator = new User();
        creator.setId(9L);
        when(userRepository.findById(9L)).thenReturn(Optional.of(creator));
        when(inviteRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(inviteRepository.save(any(RegistrationInvite.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        AdminRegistrationInviteDto result = service.createInvite(9L, "MINUTES_5");
        Instant after = Instant.now();

        ArgumentCaptor<RegistrationInvite> captor = ArgumentCaptor.forClass(RegistrationInvite.class);
        verify(inviteRepository).save(captor.capture());
        RegistrationInvite saved = captor.getValue();

        assertNotNull(result);
        assertTrue(result.getInviteCode().startsWith("SG-"));
        assertEquals("MINUTES_5", result.getDurationCode());
        assertEquals(creator, saved.getCreatedBy());
        assertTrue(saved.getExpiresAt().isAfter(before.plus(Duration.ofMinutes(4))));
        assertTrue(saved.getExpiresAt().isBefore(after.plus(Duration.ofMinutes(6))));
    }

    @Test
    void shouldRejectExpiredInviteDuringVerification() {
        RegistrationInviteRepository inviteRepository = mock(RegistrationInviteRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        RegistrationInviteService service = new RegistrationInviteService(inviteRepository, userRepository);

        RegistrationInvite invite = new RegistrationInvite();
        invite.setInviteCode("SG-EXPIRED-001");
        invite.setExpiresAt(Instant.now().minus(Duration.ofMinutes(1)));
        when(inviteRepository.findByInviteCodeIgnoreCase("SG-EXPIRED-001")).thenReturn(Optional.of(invite));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.verifyInvite("SG-EXPIRED-001")
        );

        assertTrue(exception.getMessage().contains("过期"));
    }

    @Test
    void shouldReturnInviteMetadataWhenInviteIsStillUsable() {
        RegistrationInviteRepository inviteRepository = mock(RegistrationInviteRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        RegistrationInviteService service = new RegistrationInviteService(inviteRepository, userRepository);

        RegistrationInvite invite = new RegistrationInvite();
        invite.setInviteCode("SG-READY-001");
        invite.setExpiresAt(Instant.now().plus(Duration.ofDays(1)));
        when(inviteRepository.findByInviteCodeIgnoreCase("SG-READY-001")).thenReturn(Optional.of(invite));

        PublicRegistrationInviteVerifyDto result = service.verifyInvite("SG-READY-001");

        assertEquals("SG-READY-001", result.getInviteCode());
        assertNotNull(result.getExpiresAt());
        assertNotNull(result.getExpiresAtLabel());
    }
}
