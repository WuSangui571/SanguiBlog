package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.ClientIpProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    private ClientIpResolver resolver(ClientIpProperties props) {
        return new ClientIpResolver(props);
    }

    private ClientIpProperties props(List<String> trusted) {
        ClientIpProperties p = new ClientIpProperties();
        p.setTrustedProxies(trusted);
        return p;
    }

    @Test
    void shouldIgnoreHeadersWhenNoTrustedProxyConfigured() {
        ClientIpResolver r = resolver(props(List.of()));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("203.0.113.99");
        when(req.getHeader("X-Forwarded-For")).thenReturn("1.1.1.1");

        assertEquals("203.0.113.99", r.resolve(req));
    }

    @Test
    void shouldIgnoreSpoofedHeadersWhenRemoteIsNotTrusted() {
        ClientIpResolver r = resolver(props(List.of("172.18.0.1")));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("203.0.113.99");
        when(req.getHeader("X-Forwarded-For")).thenReturn("1.1.1.1");

        assertEquals("203.0.113.99", r.resolve(req));
    }

    @Test
    void shouldPreferCfConnectingIpWhenRemoteIsTrusted() {
        ClientIpResolver r = resolver(props(List.of("172.18.0.1")));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");
        when(req.getHeader("CF-Connecting-IP")).thenReturn("203.0.113.50");
        when(req.getHeader("X-Real-IP")).thenReturn("203.0.113.51");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.52");

        assertEquals("203.0.113.50", r.resolve(req));
    }

    @Test
    void shouldUseXRealIpWhenCfMissing() {
        ClientIpResolver r = resolver(props(List.of("172.18.0.1")));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");
        when(req.getHeader("X-Real-IP")).thenReturn("203.0.113.20");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.21");

        assertEquals("203.0.113.20", r.resolve(req));
    }

    @Test
    void shouldUseFirstXForwardedForWhenOthersMissing() {
        ClientIpResolver r = resolver(props(List.of("172.18.0.1")));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10, 172.18.0.1");

        assertEquals("203.0.113.10", r.resolve(req));
    }

    @Test
    void shouldFallBackToRemoteAddrWhenTrustedProxyButNoHeaders() {
        ClientIpResolver r = resolver(props(List.of("172.18.0.1")));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        assertEquals("172.18.0.1", r.resolve(req));
    }

    @Test
    void shouldMatchCidrTrustedProxy() {
        ClientIpResolver r = resolver(props(List.of("172.16.0.0/12")));
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("172.18.0.5");
        when(req.getHeader("X-Real-IP")).thenReturn("203.0.113.77");

        assertEquals("203.0.113.77", r.resolve(req));
    }

    @Test
    void shouldReturnDefaultForNullRequest() {
        ClientIpResolver r = resolver(props(List.of("172.18.0.1")));
        assertEquals("0.0.0.0", r.resolve(null));
    }
}
