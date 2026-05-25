package com.sangui.sanguiblog.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

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
                String ip;
                if ("Forwarded".equalsIgnoreCase(header)) {
                    ip = parseForwardedHeader(value);
                } else {
                    ip = Arrays.stream(value.split(","))
                            .map(String::trim)
                            .filter(StringUtils::hasText)
                            .filter(token -> !"unknown".equalsIgnoreCase(token))
                            .findFirst()
                            .orElse(null);
                }
                if (StringUtils.hasText(ip)) {
                    return normalizeIp(ip);
                }
            }
        }
        return normalizeIp(request.getRemoteAddr());
    }

    private static String parseForwardedHeader(String forwarded) {
        if (!StringUtils.hasText(forwarded)) {
            return null;
        }
        for (String entry : forwarded.split(",")) {
            String ip = parseForwardedEntry(entry);
            if (StringUtils.hasText(ip)) {
                return ip;
            }
        }
        return null;
    }

    private static String parseForwardedEntry(String entry) {
        if (!StringUtils.hasText(entry)) {
            return null;
        }
        String[] params = entry.trim().split(";");
        for (String param : params) {
            String trimmed = param.trim();
            if (!trimmed.toLowerCase(Locale.ROOT).startsWith("for=")) {
                continue;
            }
            String ipValue = trimmed.substring(4).trim();
            if (ipValue.startsWith("\"") && ipValue.endsWith("\"")) {
                ipValue = ipValue.substring(1, ipValue.length() - 1);
            }
            if (ipValue.startsWith("[") && ipValue.contains("]")) {
                int endBracket = ipValue.indexOf(']');
                ipValue = ipValue.substring(1, endBracket);
            } else {
                int colonIdx = ipValue.lastIndexOf(':');
                if (colonIdx > 0) {
                    String beforeColon = ipValue.substring(0, colonIdx);
                    if (!beforeColon.contains(":")) {
                        ipValue = beforeColon;
                    }
                }
            }
            if (!StringUtils.hasText(ipValue) || "unknown".equalsIgnoreCase(ipValue)) {
                return null;
            }
            return ipValue;
        }
        return null;
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
