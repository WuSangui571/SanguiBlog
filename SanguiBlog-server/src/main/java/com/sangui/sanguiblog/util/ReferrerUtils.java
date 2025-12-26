package com.sangui.sanguiblog.util;

import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 访问来源解析工具：
 * - 识别常见搜索引擎并提取关键词（若 referrer 中包含 query 参数）。
 * - 生成“展示用”来源文案（可包含关键词）与“统计用”来源标签（聚合维度，避免关键词导致维度爆炸）。
 */
public final class ReferrerUtils {

    private ReferrerUtils() {
    }

    public record ParsedReferrer(
            boolean present,
            String raw,
            String host,
            String hostLower,
            SearchEngine engine,
            String keyword,
            boolean socialPlatform
    ) {
    }

    public enum SearchEngine {
        GOOGLE("谷歌", List.of("q", "oq", "as_q")),
        BING("必应", List.of("q")),
        BAIDU("百度", List.of("wd", "word")),
        SOGOU("搜狗", List.of("query", "keyword")),
        SO360("360 搜索", List.of("q", "kw")),
        YAHOO("雅虎", List.of("p")),
        DUCKDUCKGO("DuckDuckGo", List.of("q")),
        YANDEX("Yandex", List.of("text"));

        private final String zhName;
        private final List<String> keywordParams;

        SearchEngine(String zhName, List<String> keywordParams) {
            this.zhName = zhName;
            this.keywordParams = keywordParams;
        }

        public String zhName() {
            return zhName;
        }

        public List<String> keywordParams() {
            return keywordParams;
        }
    }

    public static ParsedReferrer parse(String referrer) {
        if (!StringUtils.hasText(referrer)) {
            return new ParsedReferrer(false, "", "", "", null, null, false);
        }
        String raw = referrer.trim();
        URI uri = tryParseUri(raw);
        String host = "";
        String hostLower = "";
        String rawQuery = null;
        if (uri != null) {
            host = uri.getHost() != null ? uri.getHost() : "";
            hostLower = host.toLowerCase(Locale.ROOT);
            rawQuery = uri.getRawQuery();
        } else {
            host = raw;
            hostLower = raw.toLowerCase(Locale.ROOT);
        }

        SearchEngine engine = detectSearchEngine(hostLower);
        boolean social = detectSocialPlatform(hostLower);
        String keyword = null;
        if (engine != null && rawQuery != null) {
            Map<String, List<String>> params = parseQuery(rawQuery);
            keyword = firstNonBlank(params, engine.keywordParams());
        }
        if (StringUtils.hasText(keyword)) {
            keyword = keyword.trim();
        }
        return new ParsedReferrer(true, raw, host, hostLower, engine, keyword, social);
    }

    public static String buildDisplayLabel(String referrer) {
        ParsedReferrer parsed = parse(referrer);
        if (!parsed.present()) {
            return "直接访问";
        }
        if (parsed.engine() != null) {
            if (StringUtils.hasText(parsed.keyword())) {
                return parsed.engine().zhName() + "：" + parsed.keyword();
            }
            return "来自搜索引擎：" + parsed.engine().zhName();
        }
        if (parsed.socialPlatform()) {
            return "来自社交平台：" + safeHost(parsed.host(), referrer);
        }
        return "外部链接：" + safeHost(parsed.host(), referrer);
    }

    /**
     * 用于流量来源统计（analytics_traffic_sources）：
     * - 搜索引擎：仅保留引擎名（如“谷歌”），避免关键词导致维度爆炸。
     * - 社交/外链：维持原有 host 粒度。
     * - 无 referrer：直接访问
     */
    public static String buildTrafficSourceKey(String referrer) {
        ParsedReferrer parsed = parse(referrer);
        if (!parsed.present()) {
            return "直接访问";
        }
        if (parsed.engine() != null) {
            return parsed.engine().zhName();
        }
        if (parsed.socialPlatform()) {
            return "来自社交平台：" + safeHost(parsed.host(), referrer);
        }
        return "外部链接：" + safeHost(parsed.host(), referrer);
    }

    private static String safeHost(String host, String fallback) {
        if (StringUtils.hasText(host)) {
            return host;
        }
        return StringUtils.hasText(fallback) ? fallback : "";
    }

    private static URI tryParseUri(String raw) {
        try {
            URI uri = new URI(raw);
            if (uri.getScheme() != null && uri.getHost() != null) {
                return uri;
            }
        } catch (Exception ignored) {
        }
        try {
            URI uri = new URI("https://" + raw);
            if (uri.getHost() != null) {
                return uri;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static SearchEngine detectSearchEngine(String hostLower) {
        if (!StringUtils.hasText(hostLower)) {
            return null;
        }
        if (hostLower.contains("google.")) return SearchEngine.GOOGLE;
        if (hostLower.contains("bing.com")) return SearchEngine.BING;
        if (hostLower.contains("baidu.com")) return SearchEngine.BAIDU;
        if (hostLower.contains("sogou.com")) return SearchEngine.SOGOU;
        if (hostLower.contains("so.com")) return SearchEngine.SO360;
        if (hostLower.contains("search.yahoo.") || hostLower.contains("yahoo.")) return SearchEngine.YAHOO;
        if (hostLower.contains("duckduckgo.com")) return SearchEngine.DUCKDUCKGO;
        if (hostLower.contains("yandex.")) return SearchEngine.YANDEX;
        return null;
    }

    private static boolean detectSocialPlatform(String hostLower) {
        if (!StringUtils.hasText(hostLower)) {
            return false;
        }
        return hostLower.contains("twitter")
                || hostLower.contains("x.com")
                || hostLower.contains("weibo")
                || hostLower.contains("wechat")
                || hostLower.contains("facebook")
                || hostLower.contains("douyin")
                || hostLower.contains("instagram");
    }

    private static Map<String, List<String>> parseQuery(String rawQuery) {
        Map<String, List<String>> map = new HashMap<>();
        if (!StringUtils.hasText(rawQuery)) {
            return map;
        }
        String[] pairs = rawQuery.split("&");
        for (String pair : pairs) {
            if (pair == null || pair.isBlank()) {
                continue;
            }
            int idx = pair.indexOf('=');
            String k = idx >= 0 ? pair.substring(0, idx) : pair;
            String v = idx >= 0 ? pair.substring(idx + 1) : "";
            String key = urlDecode(k);
            String val = urlDecode(v);
            if (!StringUtils.hasText(key)) {
                continue;
            }
            map.computeIfAbsent(key, ignored -> new ArrayList<>()).add(val);
        }
        return map;
    }

    private static String firstNonBlank(Map<String, List<String>> params, List<String> keys) {
        if (params == null || params.isEmpty() || keys == null || keys.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            List<String> values = params.get(key);
            if (values == null || values.isEmpty()) {
                continue;
            }
            for (String v : values) {
                if (StringUtils.hasText(v)) {
                    return v;
                }
            }
        }
        return null;
    }

    private static String urlDecode(String value) {
        if (value == null) return "";
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return value;
        }
    }
}

