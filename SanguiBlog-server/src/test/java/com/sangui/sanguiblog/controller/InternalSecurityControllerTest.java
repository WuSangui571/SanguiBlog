package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.service.ClientIpResolver;
import com.sangui.sanguiblog.service.IpBanService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InternalSecurityControllerTest {

    private IpBanService ipBanService;
    private ClientIpResolver clientIpResolver;
    private InternalSecurityController controller;

    @BeforeEach
    void setUp() {
        ipBanService = mock(IpBanService.class);
        clientIpResolver = mock(ClientIpResolver.class);
        controller = new InternalSecurityController(ipBanService, clientIpResolver);
    }

    @Test
    void shouldReturn204WhenAccessAllowed() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(clientIpResolver.resolve(req)).thenReturn("203.0.113.10");
        when(ipBanService.isAccessAllowed("203.0.113.10")).thenReturn(true);

        ResponseEntity<Void> response = controller.ipAccessCheck(req);

        assertEquals(204, response.getStatusCode().value());
        assertNull(response.getBody());
    }

    @Test
    void shouldReturn403WhenBanned() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(clientIpResolver.resolve(req)).thenReturn("203.0.113.10");
        when(ipBanService.isAccessAllowed("203.0.113.10")).thenReturn(false);

        ResponseEntity<Void> response = controller.ipAccessCheck(req);

        assertEquals(403, response.getStatusCode().value());
        assertNull(response.getBody());
    }

    @Test
    void shouldDelegateToBanServiceWithResolvedIp() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(clientIpResolver.resolve(req)).thenReturn("203.0.113.10");
        when(ipBanService.isAccessAllowed("203.0.113.10")).thenReturn(true);

        controller.ipAccessCheck(req);

        org.mockito.Mockito.verify(ipBanService).isAccessAllowed("203.0.113.10");
    }
}
