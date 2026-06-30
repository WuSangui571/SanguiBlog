package com.sangui.sanguiblog.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangui.sanguiblog.model.dto.AnalyticsRequestDetailContext;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.persistence.Column;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsServiceDetailJsonTest {

    private AnalyticsService analyticsService;
    private AnalyticsPageViewRepository pageViewRepo;
    private PostRepository postRepo;
    private UserRepository userRepo;
    private GeoIpService geoIpService;

    @BeforeEach
    void setUp() {
        pageViewRepo = mock(AnalyticsPageViewRepository.class);
        postRepo = mock(PostRepository.class);
        userRepo = mock(UserRepository.class);
        var commentRepo = mock(CommentRepository.class);
        var trafficRepo = mock(AnalyticsTrafficSourceRepository.class);
        geoIpService = mock(GeoIpService.class);
        analyticsService = new AnalyticsService(pageViewRepo, postRepo, userRepo, commentRepo, trafficRepo, geoIpService);
    }

    @Test
    void entityHasDetailJsonMapping() throws NoSuchFieldException {
        Column column = AnalyticsPageView.class.getDeclaredField("detailJson").getAnnotation(Column.class);
        assertNotNull(column);
        assertEquals("detail_json", column.name(), "detailJson field must map to detail_json column");
    }

    @Test
    void buildDetailJsonContainsAllRequiredKeys() throws Exception {
        AnalyticsRequestDetailContext ctx = new AnalyticsRequestDetailContext(
                "GET", "/article/123", "https://example.com/ref",
                "1.2.3.4, 10.0.0.1", "1.2.3.4", "zh-CN,zh;q=0.9",
                "/article/123", "/", null, "session-1"
        );

        String json = analyticsService.buildDetailJson("1.2.3.4", "Mozilla/5.0 Chrome", "session-1", ctx);
        assertNotNull(json);

        ObjectMapper mapper = new ObjectMapper();
        java.util.Map<String, Object> map = mapper.readValue(json, java.util.Map.class);

        Set<String> requiredKeys = Set.of(
                "userAgent", "refererRaw", "method", "requestUri", "status",
                "durationMs", "ip", "xForwardedFor", "xRealIp", "acceptLanguage",
                "visitorId", "sessionId", "entryPage", "fromPage", "isFirstVisit",
                "botDetected", "botName", "deviceType", "browser", "os",
                "asn", "isp", "ipType"
        );
        for (String key : requiredKeys) {
            assertTrue(map.containsKey(key), "detail_json must contain key: " + key);
        }
    }

    @Test
    void buildDetailJsonTrimsLongStrings() {
        String longUa = "A".repeat(600);
        String longXff = "C".repeat(600);

        AnalyticsRequestDetailContext ctx = new AnalyticsRequestDetailContext(
                null, null, null, longXff, null, null,
                null, null, null, null
        );

        String json = analyticsService.buildDetailJson("1.2.3.4", longUa, null, ctx);
        assertNotNull(json);

        String trimmedUa = "A".repeat(512);
        assertTrue(json.contains(trimmedUa), "UA should be trimmed to 512 in output");
        assertFalse(json.contains(longUa), "Untrimmed complete UA should not be present");

        String trimmedXff = "C".repeat(512);
        assertTrue(json.contains(trimmedXff), "XFF should be trimmed to 512 in output");
        assertFalse(json.contains(longXff), "Untrimmed complete XFF should not be present");
    }

    @Test
    void buildDetailJsonResolvesBotInfo() {
        AnalyticsRequestDetailContext ctx = new AnalyticsRequestDetailContext(
                null, null, null, null, null, null, null, null, null, null
        );

        String botJson = analyticsService.buildDetailJson("1.2.3.4",
                "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", null, ctx);
        assertNotNull(botJson);
        assertTrue(botJson.contains("\"botDetected\":true"), "Bot UA should be detected as bot");
        assertTrue(botJson.contains("\"botName\":\"Googlebot\""), "Bot name should be Googlebot");

        String blexJson = analyticsService.buildDetailJson("1.2.3.4", "BLEXBot/1.0", null, ctx);
        assertTrue(blexJson.contains("\"botDetected\":true"), "Bot matching should be case-insensitive");

        String humanJson = analyticsService.buildDetailJson("1.2.3.4",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120", null, ctx);
        assertTrue(humanJson.contains("\"botDetected\":false"), "Normal browser should not be detected as bot");
    }

    @Test
    void buildDetailJsonDefaultsWhenContextNull() {
        String json = analyticsService.buildDetailJson("1.2.3.4", "Test UA", null, null);
        assertNotNull(json);
        assertTrue(json.contains("\"ip\":\"1.2.3.4\""), "IP should be present");
        assertTrue(json.contains("\"userAgent\":\"Test UA\""), "UA should be present");
    }

    @Test
    void setDetailJsonIfMissingDoesNotOverwrite() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setDetailJson("{\"existing\":true}");

        analyticsService.setDetailJsonIfMissing(row, "1.2.3.4", "UA", "visit-1", null);
        assertEquals("{\"existing\":true}", row.getDetailJson(), "Existing detailJson should not be overwritten");
    }

    @Test
    void setDetailJsonIfMissingSetsWhenNull() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setDetailJson(null);

        analyticsService.setDetailJsonIfMissing(row, "1.2.3.4", "UA", "visit-1", null);
        assertNotNull(row.getDetailJson(), "Null detailJson should be set");
    }

    @Test
    void ipTypeClassifiesCorrectly() {
        assertEquals("loopback", com.sangui.sanguiblog.util.UserAgentDetailUtils.classifyIpType("127.0.0.1"));
        assertEquals("public", com.sangui.sanguiblog.util.UserAgentDetailUtils.classifyIpType("1.2.3.4"));
        assertEquals("private", com.sangui.sanguiblog.util.UserAgentDetailUtils.classifyIpType("10.1.2.3"));
        assertEquals("private", com.sangui.sanguiblog.util.UserAgentDetailUtils.classifyIpType("192.168.1.1"));
        assertEquals("private", com.sangui.sanguiblog.util.UserAgentDetailUtils.classifyIpType("FC00::1"));
        assertEquals("link-local", com.sangui.sanguiblog.util.UserAgentDetailUtils.classifyIpType("fe80::1"));
    }

    @Test
    void detailJsonExcludesSensitiveHeaders() {
        AnalyticsRequestDetailContext ctx = new AnalyticsRequestDetailContext(
                "GET", "/test", "https://safe.com", null, null, null, null, null, null, null
        );
        String json = analyticsService.buildDetailJson("1.2.3.4", "Safe UA", null, ctx);

        assertNotNull(json);
        assertFalse(json.contains("Cookie"), "Cookie must not be in detail_json");
        assertFalse(json.contains("Authorization"), "Authorization must not be in detail_json");
        assertFalse(json.contains("Bearer"), "Bearer tokens must not be in detail_json");
        assertFalse(json.contains("sg_token"), "sg_token must not be in detail_json");
    }

    @Test
    void detailJsonDropsQueryAndFragmentFromUrlLikeFields() throws Exception {
        AnalyticsRequestDetailContext ctx = new AnalyticsRequestDetailContext(
                "GET",
                "/api/posts/1?token=secret-value#section",
                "https://example.com/path?password=secret-value",
                null,
                null,
                null,
                "/article/1?apiKey=secret-value",
                "/admin?secret=secret-value#panel",
                null,
                null
        );

        String json = analyticsService.buildDetailJson("1.2.3.4", "Safe UA", null, ctx);
        assertNotNull(json);
        assertFalse(json.contains("secret-value"), "Sensitive query values must not be persisted");
        assertFalse(json.contains("token="), "Query parameter names must not be persisted");
        assertFalse(json.contains("password="), "Query parameter names must not be persisted");

        Map<String, Object> map = new ObjectMapper().readValue(json, Map.class);
        assertEquals("/api/posts/1", map.get("requestUri"));
        assertEquals("https://example.com/path", map.get("refererRaw"));
        assertEquals("/article/1", map.get("entryPage"));
        assertEquals("/admin", map.get("fromPage"));
    }

    @Test
    void parseDetailJsonReturnsEmptyWhenNull() {
        var result = analyticsService.parseDetailJson(null);
        assertNotNull(result);
        assertNull(result.getIp());
        assertNull(result.getUserAgent());
    }

    @Test
    void parseDetailJsonReturnsEmptyWhenMalformed() {
        var result = analyticsService.parseDetailJson("not valid json {{{");
        assertNotNull(result);
        assertNull(result.getIp());
    }

    @Test
    void parseDetailJsonParsesValidJson() {
        String valid = """
                {"ip":"1.2.3.4","userAgent":"Test UA","botDetected":false,"ipType":"public"}""";
        var result = analyticsService.parseDetailJson(valid);
        assertEquals("1.2.3.4", result.getIp());
        assertEquals("Test UA", result.getUserAgent());
        assertFalse(result.getBotDetected());
        assertEquals("public", result.getIpType());
    }
}
