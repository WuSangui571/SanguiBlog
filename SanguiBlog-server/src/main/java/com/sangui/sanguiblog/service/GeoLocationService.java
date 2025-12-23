package com.sangui.sanguiblog.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 轻量级 IP -> 地理位置解析，带本地/内网兜底与内存缓存。
 * 使用公开的 ipapi.co 接口，失败时返回“未知”，不会影响主流程。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeoLocationService {

    private final ObjectMapper objectMapper;
    private final Cache<String, String> cache = Caffeine.newBuilder()
            .maximumSize(10000)
            .expireAfterWrite(Duration.ofHours(12))
            .build();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(1000))
            .build();

    public String resolve(String ip) {
        if (!StringUtils.hasText(ip)) {
            return "未知";
        }
        String normalized = ip.trim();
        if (isPrivateOrLoopback(normalized)) {
            return "本地/内网";
        }
        return cache.get(normalized, this::lookupRemote);
    }

    private boolean isPrivateOrLoopback(String ip) {
        return "127.0.0.1".equals(ip)
                || ip.startsWith("10.")
                || ip.startsWith("192.168.")
                || ip.startsWith("172.16.")
                || ip.startsWith("172.17.")
                || ip.startsWith("172.18.")
                || ip.startsWith("172.19.")
                || ip.startsWith("172.20.")
                || ip.startsWith("172.21.")
                || ip.startsWith("172.22.")
                || ip.startsWith("172.23.")
                || ip.startsWith("172.24.")
                || ip.startsWith("172.25.")
                || ip.startsWith("172.26.")
                || ip.startsWith("172.27.")
                || ip.startsWith("172.28.")
                || ip.startsWith("172.29.")
                || ip.startsWith("172.30.")
                || ip.startsWith("172.31.");
    }

    private String lookupRemote(String ip) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://ipapi.co/" + ip + "/json/"))
                    .timeout(Duration.ofMillis(1500))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 200) {
                JsonNode node = objectMapper.readTree(response.body());
                String city = text(node, "city");
                String region = text(node, "region");
                String country = text(node, "country_name");
                String combined = Stream.of(city, region, country)
                        .filter(StringUtils::hasText)
                        .collect(Collectors.joining(" · "));
                if (StringUtils.hasText(combined)) {
                    return combined;
                }
            } else {
                log.debug("ipapi.co 返回非 200, status={}, ip={}", response.statusCode(), ip);
            }
        } catch (Exception ex) {
            log.debug("获取 IP 地理位置失败, ip={}, err={}", ip, ex.getMessage());
        }
        return "未知";
    }

    private String text(JsonNode node, String field) {
        if (node == null || !node.has(field)) {
            return null;
        }
        String value = node.get(field).asText(null);
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
