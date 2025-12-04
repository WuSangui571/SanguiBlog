package com.sangui.sanguiblog.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;

/**
 * 简单的客户端 IP 解析工具。
 * 优先读取代理头，回落到 remoteAddr，并处理常见的 IPv6/本地回环场景。
 */
public final class IpUtils {

    private static final List<String> HEADER_CANDIDATES = List.of(
            "X-Forwarded-For",
            "X-Real-IP",
            "X-Client-IP",
            "CF-Connecting-IP",
            "Forwarded"
    );

    private IpUtils() {
    }

    public static String resolveIp(HttpServletRequest request) {
        if (request == null) {
            return "0.0.0.0";
        }
        for (String header : HEADER_CANDIDATES) {
            String value = request.getHeader(header);
            if (StringUtils.hasText(value) && !"unknown".equalsIgnoreCase(value)) {
                // X-Forwarded-For 可能是逗号分隔的列表，取第一个非空值
                String ip = Arrays.stream(value.split(","))
                        .map(String::trim)
                        .filter(StringUtils::hasText)
                        .findFirst()
                        .orElse(null);
                if (StringUtils.hasText(ip)) {
                    return normalizeIp(ip);
                }
            }
        }
        return normalizeIp(request.getRemoteAddr());
    }

    public static String normalizeIp(String ip) {
        if (!StringUtils.hasText(ip)) {
            return "0.0.0.0";
        }
        String trimmed = ip.trim();
        // 兼容 IPv4-mapped IPv6 地址形如 ::ffff:192.168.0.1
        if (trimmed.startsWith("::ffff:") && trimmed.length() > 7) {
            trimmed = trimmed.substring(7);
        }
        if ("0:0:0:0:0:0:0:1".equals(trimmed) || "::1".equals(trimmed)) {
            return "127.0.0.1";
        }
        if ("localhost".equalsIgnoreCase(trimmed)) {
            return "127.0.0.1";
        }
        return trimmed.length() > 45 ? trimmed.substring(0, 45) : trimmed;
    }

    public static boolean isLoopback(String ip) {
        if (!StringUtils.hasText(ip)) {
            return true;
        }
        String normalized = normalizeIp(ip);
        return "127.0.0.1".equals(normalized) || "::1".equals(normalized) || "0:0:0:0:0:0:0:1".equals(normalized);
    }
}
