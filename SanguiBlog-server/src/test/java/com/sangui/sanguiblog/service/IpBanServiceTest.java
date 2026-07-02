package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminBannedIpDto;
import com.sangui.sanguiblog.model.dto.AdminCreateIpBanRequest;
import com.sangui.sanguiblog.model.dto.AdminUnbanIpRequest;
import com.sangui.sanguiblog.model.entity.BannedIp;
import com.sangui.sanguiblog.model.entity.IpBanAuditLog;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.BannedIpRepository;
import com.sangui.sanguiblog.model.repository.IpBanAuditLogRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IpBanServiceTest {

    private BannedIpRepository bannedIpRepository;
    private IpBanAuditLogRepository auditRepository;
    private UserRepository userRepository;
    private IpBanService service;

    @BeforeEach
    void setUp() {
        bannedIpRepository = mock(BannedIpRepository.class);
        auditRepository = mock(IpBanAuditLogRepository.class);
        userRepository = mock(UserRepository.class);
        service = new IpBanService(bannedIpRepository, auditRepository, userRepository);
        User admin = new User();
        admin.setId(1L);
        admin.setUsername("admin");
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(auditRepository.save(any(IpBanAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void shouldCreateBanForPublicIp() {
        when(bannedIpRepository.findByIp("203.0.113.10")).thenReturn(Optional.empty());
        when(bannedIpRepository.save(any(BannedIp.class))).thenAnswer(inv -> {
            BannedIp b = inv.getArgument(0);
            b.setId(7L);
            return b;
        });

        AdminBannedIpDto dto = service.createBan(new AdminCreateIpBanRequest("203.0.113.10", "spam", null), 1L, "8.8.8.8");

        assertEquals(7L, dto.getId());
        assertEquals("203.0.113.10", dto.getIp());
        assertTrue(dto.isEnabled());
        assertEquals("spam", dto.getReason());

        ArgumentCaptor<IpBanAuditLog> captor = ArgumentCaptor.forClass(IpBanAuditLog.class);
        verify(auditRepository).save(captor.capture());
        assertEquals(IpBanService.ACTION_BAN, captor.getValue().getAction());
        assertEquals("203.0.113.10", captor.getValue().getIp());
        assertEquals("admin", captor.getValue().getActorUsername());
    }

    @Test
    void shouldBeIdempotentWhenAlreadyEnabled() {
        BannedIp existing = ban(7L, "203.0.113.10", true);
        when(bannedIpRepository.findByIp("203.0.113.10")).thenReturn(Optional.of(existing));

        AdminBannedIpDto dto = service.createBan(new AdminCreateIpBanRequest("203.0.113.10", "again", null), 1L, "8.8.8.8");

        assertEquals(7L, dto.getId());
        assertTrue(dto.isEnabled());
        verify(bannedIpRepository, never()).save(any(BannedIp.class));
        verify(auditRepository, never()).save(any(IpBanAuditLog.class));
    }

    @Test
    void shouldReEnablePreviouslyUnbannedRow() {
        BannedIp existing = ban(7L, "203.0.113.10", false);
        existing.setUnbannedAt(LocalDateTime.now());
        when(bannedIpRepository.findByIp("203.0.113.10")).thenReturn(Optional.of(existing));
        when(bannedIpRepository.save(any(BannedIp.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminBannedIpDto dto = service.createBan(new AdminCreateIpBanRequest("203.0.113.10", "reban", null), 1L, "8.8.8.8");

        assertTrue(dto.isEnabled());
        org.junit.jupiter.api.Assertions.assertNull(dto.getUnbannedAt());
        org.junit.jupiter.api.Assertions.assertNull(dto.getUnbanReason());

        ArgumentCaptor<IpBanAuditLog> captor = ArgumentCaptor.forClass(IpBanAuditLog.class);
        verify(auditRepository).save(captor.capture());
        assertEquals(IpBanService.ACTION_REBAN, captor.getValue().getAction());
    }

    @Test
    void shouldRejectProtectedIp() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createBan(new AdminCreateIpBanRequest("127.0.0.1", null, null), 1L, "8.8.8.8"));
        assertTrue(ex.getMessage().contains("受保护"));
    }

    @Test
    void shouldRejectPrivateIp() {
        assertThrows(IllegalArgumentException.class,
                () -> service.createBan(new AdminCreateIpBanRequest("192.168.1.1", null, null), 1L, "8.8.8.8"));
    }

    @Test
    void shouldRejectCidr() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createBan(new AdminCreateIpBanRequest("203.0.113.0/24", null, null), 1L, "8.8.8.8"));
        assertTrue(ex.getMessage().contains("CIDR") || ex.getMessage().contains("非法"));
    }

    @Test
    void shouldRejectSelfBan() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createBan(new AdminCreateIpBanRequest("203.0.113.10", null, null), 1L, "203.0.113.10"));
        assertTrue(ex.getMessage().contains("自身"));
    }

    @Test
    void shouldRejectTooLongReason() {
        String tooLong = "x".repeat(513);
        when(bannedIpRepository.findByIp("203.0.113.10")).thenReturn(Optional.empty());
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createBan(new AdminCreateIpBanRequest("203.0.113.10", tooLong, null), 1L, "8.8.8.8"));
        assertTrue(ex.getMessage().contains("512"));
    }

    @Test
    void shouldUnbanActiveBan() {
        BannedIp existing = ban(7L, "203.0.113.10", true);
        when(bannedIpRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(bannedIpRepository.save(any(BannedIp.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminBannedIpDto dto = service.unban(7L, new AdminUnbanIpRequest("review passed"), 1L);

        assertFalse(dto.isEnabled());
        assertNotNull(dto.getUnbannedAt());
        assertEquals("review passed", dto.getUnbanReason());

        ArgumentCaptor<IpBanAuditLog> captor = ArgumentCaptor.forClass(IpBanAuditLog.class);
        verify(auditRepository).save(captor.capture());
        assertEquals(IpBanService.ACTION_UNBAN, captor.getValue().getAction());
    }

    @Test
    void shouldRecordHitAndReturnForbiddenForBannedIp() {
        BannedIp ban = ban(7L, "203.0.113.10", true);
        when(bannedIpRepository.findByIpAndEnabledTrue("203.0.113.10")).thenReturn(Optional.of(ban));
        when(bannedIpRepository.incrementHit(eq("203.0.113.10"), any())).thenReturn(1);

        assertFalse(service.isAccessAllowed("203.0.113.10"));
        verify(bannedIpRepository).incrementHit(eq("203.0.113.10"), any());
    }

    @Test
    void incrementHitRepositoryMethodShouldRunInTransaction() throws Exception {
        Method method = BannedIpRepository.class.getMethod("incrementHit", String.class, LocalDateTime.class);

        assertNotNull(method.getAnnotation(Transactional.class));
    }

    @Test
    void shouldReturnAllowedForUnbannedIp() {
        when(bannedIpRepository.findByIpAndEnabledTrue("203.0.113.10")).thenReturn(Optional.empty());

        assertTrue(service.isAccessAllowed("203.0.113.10"));
        verify(bannedIpRepository, never()).incrementHit(anyString(), any());
    }

    @Test
    void shouldFailOpenOnDbLookupError() {
        when(bannedIpRepository.findByIpAndEnabledTrue("203.0.113.10")).thenThrow(new RuntimeException("db down"));

        assertTrue(service.isAccessAllowed("203.0.113.10"));
    }

    @Test
    void shouldInvalidateCacheAfterBan() {
        when(bannedIpRepository.findByIpAndEnabledTrue("203.0.113.10")).thenReturn(Optional.empty());
        assertTrue(service.isAccessAllowed("203.0.113.10")); // caches allowed

        when(bannedIpRepository.findByIp("203.0.113.10")).thenReturn(Optional.empty());
        when(bannedIpRepository.save(any(BannedIp.class))).thenAnswer(inv -> {
            BannedIp b = inv.getArgument(0);
            b.setId(7L);
            return b;
        });
        service.createBan(new AdminCreateIpBanRequest("203.0.113.10", "x", null), 1L, "8.8.8.8"); // invalidates

        BannedIp ban = ban(7L, "203.0.113.10", true);
        when(bannedIpRepository.findByIpAndEnabledTrue("203.0.113.10")).thenReturn(Optional.of(ban));
        when(bannedIpRepository.incrementHit(eq("203.0.113.10"), any())).thenReturn(1);
        assertFalse(service.isAccessAllowed("203.0.113.10")); // re-queried DB due to invalidation
    }

    @Test
    void shouldResolveEnabledBanIdsFromEntities() {
        BannedIp ban = ban(7L, "203.0.113.10", true);
        when(bannedIpRepository.findByEnabledTrueAndIpIn(any())).thenReturn(List.of(ban));

        Map<String, Long> result = service.resolveEnabledBanIds(List.of("203.0.113.10", "203.0.113.20"));

        assertEquals(Map.of("203.0.113.10", 7L), result);
    }

    private BannedIp ban(long id, String ip, boolean enabled) {
        BannedIp b = new BannedIp();
        b.setId(id);
        b.setIp(ip);
        b.setEnabled(enabled);
        b.setHitCount(0L);
        b.setCreatedAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());
        return b;
    }
}
