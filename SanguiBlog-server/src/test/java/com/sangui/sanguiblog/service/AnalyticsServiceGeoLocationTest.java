package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsServiceGeoLocationTest {

    private AnalyticsService analyticsService;
    private GeoIpService geoIpService;
    private Method resolveGeoLocationMethod;

    @BeforeEach
    void setUp() throws Exception {
        AnalyticsPageViewRepository pageViewRepo = mock(AnalyticsPageViewRepository.class);
        PostRepository postRepo = mock(PostRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        CommentRepository commentRepo = mock(CommentRepository.class);
        AnalyticsTrafficSourceRepository trafficRepo = mock(AnalyticsTrafficSourceRepository.class);
        geoIpService = mock(GeoIpService.class);

        analyticsService = new AnalyticsService(pageViewRepo, postRepo, userRepo, commentRepo, trafficRepo, geoIpService);

        resolveGeoLocationMethod = AnalyticsService.class.getDeclaredMethod("resolveGeoLocation", String.class, String.class);
        resolveGeoLocationMethod.setAccessible(true);
    }

    private String invokeResolveGeoLocation(String ip, String requestGeo) throws Exception {
        return (String) resolveGeoLocationMethod.invoke(analyticsService, ip, requestGeo);
    }

    @Test
    void shouldPreferBackendGeoResult() throws Exception {
        when(geoIpService.lookup("8.8.8.8")).thenReturn("美国 · 加利福尼亚 · 洛杉矶");
        String result = invokeResolveGeoLocation("8.8.8.8", "Asia/Shanghai");
        assertEquals("美国 · 加利福尼亚 · 洛杉矶", result);
    }

    @Test
    void shouldRejectTimezoneFallback_AsiaShanghai() throws Exception {
        when(geoIpService.lookup("8.8.8.8")).thenReturn(null);
        String result = invokeResolveGeoLocation("8.8.8.8", "Asia/Shanghai");
        assertEquals("未知", result);
    }

    @Test
    void shouldRejectTimezoneFallback_UTC() throws Exception {
        when(geoIpService.lookup("8.8.8.8")).thenReturn(null);
        String result = invokeResolveGeoLocation("8.8.8.8", "UTC");
        assertEquals("未知", result);
    }

    @Test
    void shouldRejectTimezoneFallback_EtcUTC() throws Exception {
        when(geoIpService.lookup("8.8.8.8")).thenReturn(null);
        String result = invokeResolveGeoLocation("8.8.8.8", "Etc/UTC");
        assertEquals("未知", result);
    }

    @Test
    void shouldRejectTimezoneFallback_EtcGMT() throws Exception {
        when(geoIpService.lookup("8.8.8.8")).thenReturn(null);
        String result = invokeResolveGeoLocation("8.8.8.8", "Etc/GMT+8");
        assertEquals("未知", result);
    }

    @Test
    void shouldRejectTimezoneFallback_AmericaNewYork() throws Exception {
        when(geoIpService.lookup("1.2.3.4")).thenReturn(null);
        String result = invokeResolveGeoLocation("1.2.3.4", "America/New_York");
        assertEquals("未知", result);
    }

    @Test
    void shouldAcceptNonTimezoneFallback() throws Exception {
        when(geoIpService.lookup("1.2.3.4")).thenReturn(null);
        String result = invokeResolveGeoLocation("1.2.3.4", "北京");
        assertEquals("北京", result);
    }

    @Test
    void shouldReturnUnknownWhenBothBlank() throws Exception {
        when(geoIpService.lookup("1.2.3.4")).thenReturn(null);
        String result = invokeResolveGeoLocation("1.2.3.4", null);
        assertEquals("未知", result);
    }

    @Test
    void shouldReturnUnknownWhenRequestGeoEmpty() throws Exception {
        when(geoIpService.lookup("1.2.3.4")).thenReturn(null);
        String result = invokeResolveGeoLocation("1.2.3.4", "");
        assertEquals("未知", result);
    }

    @Test
    void shouldHandleGeoServiceException() throws Exception {
        when(geoIpService.lookup("1.2.3.4")).thenThrow(new RuntimeException("test"));
        String result = invokeResolveGeoLocation("1.2.3.4", "Asia/Shanghai");
        assertEquals("未知", result);
    }

    @Test
    void shouldTruncateLongGeoResult() throws Exception {
        String longGeo = "A".repeat(200);
        when(geoIpService.lookup("1.2.3.4")).thenReturn(longGeo);
        String result = invokeResolveGeoLocation("1.2.3.4", null);
        assertTrue(result.length() <= 128);
    }

    @Test
    void shouldTruncateLongFallbackGeo() throws Exception {
        String longFallback = "B".repeat(200);
        when(geoIpService.lookup("1.2.3.4")).thenReturn(null);
        String result = invokeResolveGeoLocation("1.2.3.4", longFallback);
        assertTrue(result.length() <= 128);
    }

    @Test
    void shouldReturnInternalForLocalIp() throws Exception {
        when(geoIpService.lookup("127.0.0.1")).thenReturn("本机/内网");
        String result = invokeResolveGeoLocation("127.0.0.1", "Asia/Shanghai");
        assertEquals("本机/内网", result);
    }
}
