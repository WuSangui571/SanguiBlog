package com.sangui.sanguiblog.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 轻量级 GeoIP 查询：优先缓存与局域网判断，失败时调用 ipapi.co。
 */
@Service
@Slf4j
public class GeoIpService {

    private final RestTemplate restTemplate;
    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();

    public GeoIpService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(800);
        factory.setReadTimeout(1200);
        this.restTemplate = new RestTemplate(factory);
    }

    public String lookup(String ip) {
        if (!StringUtils.hasText(ip)) {
            return null;
        }
        String normalized = ip.trim();
        String cached = cache.get(normalized);
        if (cached != null) {
            return cached;
        }
        String geo = inferLocal(normalized);
        if (geo == null) {
            geo = queryRemote(normalized);
        }
        if (geo != null) {
            cache.put(normalized, geo);
        }
        return geo;
    }

    private String inferLocal(String ip) {
        try {
            InetAddress address = InetAddress.getByName(ip);
            if (address.isAnyLocalAddress() || address.isLoopbackAddress()) {
                return "本机/内网";
            }
            if (address.isSiteLocalAddress()) {
                return "内网";
            }
        } catch (Exception ignored) {
            // ignore parsing errors and try remote lookup
        }
        return null;
    }

    private String queryRemote(String ip) {
        try {
            String url = "https://ipapi.co/" + URLEncoder.encode(ip, StandardCharsets.UTF_8) + "/json/";
            Map<?, ?> body = restTemplate.getForObject(new URI(url), Map.class);
            if (body == null || Boolean.TRUE.equals(body.get("error"))) {
                return null;
            }
            String country = toText(body.get("country_name"));
            String region = toText(body.get("region"));
            String city = toText(body.get("city"));

            StringBuilder sb = new StringBuilder();
            if (StringUtils.hasText(country)) {
                sb.append(country);
            }
            if (StringUtils.hasText(region) && !region.equals(country)) {
                if (sb.length() > 0) {
                    sb.append(" ");
                }
                sb.append(region);
            }
            if (StringUtils.hasText(city)) {
                if (sb.length() > 0) {
                    sb.append(" · ");
                }
                sb.append(city);
            }
            String result = sb.toString().trim();
            return result.isEmpty() ? null : result;
        } catch (Exception ex) {
            log.debug("Geo lookup failed for ip {}", ip, ex);
            return null;
        }
    }

    private String toText(Object value) {
        if (value == null) {
            return null;
        }
        String str = value.toString().trim();
        return str.isEmpty() ? null : str;
    }
}
