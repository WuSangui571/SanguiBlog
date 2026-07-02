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

    @Test
    void shouldParseForwardedHeaderBasicFormat() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Forwarded")).thenReturn("for=203.0.113.40;proto=https");
        when(req.getRemoteAddr()).thenReturn("172.18.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.40", ip);
    }

    @Test
    void shouldParseForwardedHeaderWithPort() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Forwarded")).thenReturn("for=192.0.2.60:12345;proto=https;by=proxy");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("192.0.2.60", ip);
    }

    @Test
    void shouldParseForwardedHeaderIpv6WithBrackets() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Forwarded")).thenReturn("for=\"[2001:db8::1]\"");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("2001:db8::1", ip);
    }

    @Test
    void shouldParseForwardedHeaderIpv6WithBracketsAndPort() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Forwarded")).thenReturn("for=\"[2001:db8:cafe::17]:4711\"");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("2001:db8:cafe::17", ip);
    }

    @Test
    void shouldSkipUnknownInXForwardedForTokens() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown, 172.29.0.1");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("172.29.0.1", ip);
    }

    @Test
    void shouldSkipUnknownTokensAndUseNextValidInXFF() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown, unknown, 203.0.113.70, 172.29.0.1");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.70", ip);
    }

    @Test
    void xForwardedForAllUnknownFallsThrough() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown, Unknown, UNKNOWN");
        when(req.getHeader("X-Real-IP")).thenReturn("203.0.113.80");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.80", ip);
    }

    @Test
    void shouldUseXClientIp() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Client-IP")).thenReturn("192.168.99.100");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("192.168.99.100", ip);
    }

    @Test
    void dockerBridgeIpFallback() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader(anyString())).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("172.29.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("172.29.0.1", ip);
    }

    @Test
    void shouldPreferXFFOverForwardedHeader() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("203.0.113.90");
        when(req.getHeader("Forwarded")).thenReturn("for=192.0.2.99");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.90", ip);
    }

    @Test
    void shouldNormalizeLeadingTrailingWhitespaceHeaderValue() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Real-IP")).thenReturn("  203.0.113.100  ");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.100", ip);
    }

    @Test
    void shouldHandleMultipleHeadersRanking() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown, unknown");
        when(req.getHeader("X-Real-IP")).thenReturn("10.99.88.77");
        when(req.getHeader("X-Client-IP")).thenReturn("10.66.55.44");
        when(req.getRemoteAddr()).thenReturn("127.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("10.99.88.77", ip);
    }

    @Test
    void shouldHandleOnlyForwardedHeaderAmongCandidates() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Forwarded")).thenReturn("for=8.8.8.8;proto=https;host=example.com");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("8.8.8.8", ip);
    }

    @Test
    void shouldSkipUnknownForwardedEntriesAndUseNextValidForValue() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Forwarded")).thenReturn("for=unknown;proto=https, for=203.0.113.41;proto=https");
        when(req.getRemoteAddr()).thenReturn("10.0.0.1");

        String ip = IpUtils.resolveIp(req);
        assertEquals("203.0.113.41", ip);
    }

    @Test
    void shouldRejectCidrAsSingleIp() {
        assertFalse(IpUtils.isValidSingleIp("203.0.113.0/24"));
        assertFalse(IpUtils.isValidSingleIp("::1/128"));
    }

    @Test
    void shouldRejectLocalhostAsSingleIp() {
        assertFalse(IpUtils.isValidSingleIp("localhost"));
    }

    @Test
    void shouldAcceptValidIpv4AndIpv6() {
        assertTrue(IpUtils.isValidSingleIp("203.0.113.10"));
        assertTrue(IpUtils.isValidSingleIp("2001:db8::1"));
    }

    @Test
    void shouldRejectInvalidIp() {
        assertFalse(IpUtils.isValidSingleIp("999.999.999.999"));
        assertFalse(IpUtils.isValidSingleIp("not-an-ip"));
        assertFalse(IpUtils.isValidSingleIp(""));
        assertFalse(IpUtils.isValidSingleIp(null));
    }

    @Test
    void shouldDetectProtectedAddresses() {
        assertTrue(IpUtils.isPrivateOrProtected("127.0.0.1"));
        assertTrue(IpUtils.isPrivateOrProtected("::1"));
        assertTrue(IpUtils.isPrivateOrProtected("0.0.0.0"));
        assertTrue(IpUtils.isPrivateOrProtected("::"));
        assertTrue(IpUtils.isPrivateOrProtected("10.0.0.1"));
        assertTrue(IpUtils.isPrivateOrProtected("172.16.0.1"));
        assertTrue(IpUtils.isPrivateOrProtected("192.168.1.1"));
        assertTrue(IpUtils.isPrivateOrProtected("169.254.1.1"));
        assertTrue(IpUtils.isPrivateOrProtected("fc00::1"));
        assertTrue(IpUtils.isPrivateOrProtected("fe80::1"));
        assertTrue(IpUtils.isPrivateOrProtected(null));
        assertTrue(IpUtils.isPrivateOrProtected(""));
    }

    @Test
    void shouldNotFlagPublicIpAsProtected() {
        assertFalse(IpUtils.isPrivateOrProtected("203.0.113.10"));
        assertFalse(IpUtils.isPrivateOrProtected("2001:db8::1"));
        assertFalse(IpUtils.isPrivateOrProtected("8.8.8.8"));
    }

    @Test
    void shouldParseFirstForwardedIp() {
        assertEquals("203.0.113.10", IpUtils.firstForwardedIp("203.0.113.10, 172.18.0.1"));
        assertEquals("203.0.113.10", IpUtils.firstForwardedIp(" 203.0.113.10 , unknown "));
        assertNull(IpUtils.firstForwardedIp("unknown, unknown"));
        assertNull(IpUtils.firstForwardedIp(null));
    }
}
