package com.sangui.sanguiblog.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.lionsoul.ip2region.xdb.Searcher;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeoIpServiceTest {

    private GeoIpService geoIpService;
    private Searcher mockSearcher;

    @BeforeEach
    void setUp() throws Exception {
        geoIpService = new GeoIpService();
        mockSearcher = mock(Searcher.class);
        Field searcherField = GeoIpService.class.getDeclaredField("searcher");
        searcherField.setAccessible(true);
        searcherField.set(geoIpService, mockSearcher);
    }

    @Test
    void shouldReturnNullForNullIp() {
        assertNull(geoIpService.lookup(null));
    }

    @Test
    void shouldReturnNullForEmptyIp() {
        assertNull(geoIpService.lookup(""));
        assertNull(geoIpService.lookup("   "));
    }

    @Test
    void shouldReturnLocalForLoopback() {
        String result = geoIpService.lookup("127.0.0.1");
        assertEquals("本机/内网", result);
    }

    @Test
    void shouldReturnLocalForIpv6Loopback() {
        String result = geoIpService.lookup("::1");
        assertEquals("本机/内网", result);
    }

    @Test
    void shouldReturnInternalForSiteLocalIp() {
        assertEquals("内网", geoIpService.lookup("192.168.1.100"));
        assertEquals("内网", geoIpService.lookup("10.0.0.1"));
        assertEquals("内网", geoIpService.lookup("172.16.0.1"));
    }

    @Test
    void shouldReturnInternalForLinkLocalIp() {
        assertEquals("内网", geoIpService.lookup("169.254.10.20"));
    }

    @Test
    void shouldQuerySearcherForPublicIp() throws Exception {
        when(mockSearcher.search("8.8.8.8")).thenReturn("美国|0|加利福尼亚|洛杉矶|谷歌");
        String result = geoIpService.lookup("8.8.8.8");
        assertNotNull(result);
        assertTrue(result.contains("美国"));
        assertFalse(result.contains("|"));
        assertFalse(result.contains("0"));
    }

    @Test
    void shouldParseRegionWithoutZeros() throws Exception {
        when(mockSearcher.search("1.1.1.1")).thenReturn("澳大利亚|0|昆士兰|布里斯班|Cloudflare");
        String result = geoIpService.lookup("1.1.1.1");
        assertNotNull(result);
        assertTrue(result.contains("澳大利亚"));
        assertTrue(result.contains("布里斯班"));
    }

    @Test
    void shouldReturnNullWhenSearcherReturnsAllZeros() throws Exception {
        when(mockSearcher.search("198.51.100.1")).thenReturn("0|0|0|0|0");
        String result = geoIpService.lookup("198.51.100.1");
        assertNull(result);
    }

    @Test
    void shouldReturnNullWhenSearcherThrows() throws Exception {
        when(mockSearcher.search("invalid")).thenThrow(new IllegalArgumentException("bad ip"));
        String result = geoIpService.lookup("invalid");
        assertNull(result);
    }

    @Test
    void shouldCacheResults() throws Exception {
        when(mockSearcher.search("8.8.4.4")).thenReturn("美国|0|0|0|谷歌");
        geoIpService.lookup("8.8.4.4");
        geoIpService.lookup("8.8.4.4");
        verify(mockSearcher, times(1)).search("8.8.4.4");
    }

    @Test
    void shouldReturnNullWhenSearcherIsNull() throws Exception {
        Field searcherField = GeoIpService.class.getDeclaredField("searcher");
        searcherField.setAccessible(true);
        searcherField.set(geoIpService, null);
        assertNull(geoIpService.lookup("8.8.8.8"));
    }

    @Test
    void shouldLoadClasspathXdbWhenPathIsBlank() throws Exception {
        GeoIpService service = new GeoIpService();
        Field xdbPathField = GeoIpService.class.getDeclaredField("xdbPath");
        xdbPathField.setAccessible(true);
        xdbPathField.set(service, "");

        service.init();

        Field searcherField = GeoIpService.class.getDeclaredField("searcher");
        searcherField.setAccessible(true);
        assertNotNull(searcherField.get(service));
    }

    @Test
    void shouldReturnLocalForDockerBridgeIp() {
        String result = geoIpService.lookup("172.29.0.1");
        assertEquals("内网", result);
    }
}
