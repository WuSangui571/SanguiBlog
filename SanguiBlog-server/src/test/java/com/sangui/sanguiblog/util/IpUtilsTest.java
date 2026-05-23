package com.sangui.sanguiblog.util;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IpUtilsTest {

    @Test
    void shouldExtractFirstIpFromXForwardedFor() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10, 172.18.0.1, 10.0.0.1");
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.10", ip);
    }

    @Test
    void shouldUseXRealIpWhenXForwardedForMissing() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn(null);
        when(req.getHeader("X-Real-IP")).thenReturn("203.0.113.20");
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.20", ip);
    }

    @Test
    void shouldFallbackToRemoteAddrWhenNoHeaders() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader(anyString())).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("192.168.1.100");

        String ip = IpUtils.resolveIp(req);
        assertEquals("192.168.1.100", ip);
    }

    @Test
    void shouldIgnoreUnknownHeaderValue() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown");
        when(req.getHeader("X-Real-IP")).thenReturn("203.0.113.30");
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.30", ip);
    }

    @Test
    void shouldNormalizeIpv4MappedIpv6() {
        String ip = IpUtils.normalizeIp("::ffff:192.168.0.1");
        assertEquals("192.168.0.1", ip);
    }

    @Test
    void shouldNormalizeLocalhostLoopback() {
        assertEquals("127.0.0.1", IpUtils.normalizeIp("0:0:0:0:0:0:0:1"));
        assertEquals("127.0.0.1", IpUtils.normalizeIp("::1"));
        assertEquals("127.0.0.1", IpUtils.normalizeIp("localhost"));
    }

    @Test
    void shouldDetectLoopback() {
        assertTrue(IpUtils.isLoopback("127.0.0.1"));
        assertTrue(IpUtils.isLoopback("::1"));
        assertTrue(IpUtils.isLoopback("0:0:0:0:0:0:0:1"));
    }

    @Test
    void shouldNotDetectExternalIpAsLoopback() {
        assertFalse(IpUtils.isLoopback("203.0.113.10"));
        assertFalse(IpUtils.isLoopback("172.18.0.1"));
        assertFalse(IpUtils.isLoopback("192.168.1.1"));
    }

    @Test
    void shouldDetectLoopbackForNull() {
        assertTrue(IpUtils.isLoopback(null));
    }

    @Test
    void shouldDetectLoopbackForEmpty() {
        assertTrue(IpUtils.isLoopback(""));
    }

    @Test
    void shouldReturnDefaultForNullRequest() {
        String ip = IpUtils.resolveIp(null);
        assertEquals("0.0.0.0", ip);
    }

    @Test
    void shouldNormalizeEmptyIp() {
        assertEquals("0.0.0.0", IpUtils.normalizeIp(null));
        assertEquals("0.0.0.0", IpUtils.normalizeIp(""));
        assertEquals("0.0.0.0", IpUtils.normalizeIp("   "));
    }

    @Test
    void dockerProxySingleXForwardedFor() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10, 172.18.0.1");
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.10", ip);
    }

    @Test
    void dockerProxyNoForwardedHeadersFallsBackToRemoteAddr() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader(anyString())).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("172.18.0.1", ip);
    }

    @Test
    void shouldUseCFConnectingIp() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("CF-Connecting-IP")).thenReturn("203.0.113.50");
        when(req.getRemoteAddr()).thenReturn("172.70.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.50", ip);
    }

    @Test
    void shouldTruncateLongIp() {
        String longIp = "2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra:long:value";
        String result = IpUtils.normalizeIp(longIp);
        assertTrue(result.length() <= 45);
    }

    @Test
    void shouldHandleMixedCaseXForwardedFor() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn(" 203.0.113.10 , Unknown ");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.10", ip);
    }
}
