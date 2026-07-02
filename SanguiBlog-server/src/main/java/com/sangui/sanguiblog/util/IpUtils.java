package com.sangui.sanguiblog.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

import java.net.InetAddress;
import java.net.UnknownHostException;
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

    /**
     * 判断 IP 是否为受保护/不可封禁地址：回环、未指定、私有、链路本地、ULA、组播等。
     * 用于管理员封禁请求的服务端强校验，避免误封本地/内网/代理出口导致自锁。
     */
    public static boolean isPrivateOrProtected(String ip) {
        if (!StringUtils.hasText(ip)) {
            return true;
        }
        String normalized = normalizeIp(ip);
        if (isLoopback(normalized)) {
            return true;
        }
        if ("0.0.0.0".equals(normalized) || "::".equals(normalized)) {
            return true;
        }
        InetAddress addr = parseInetAddress(normalized);
        if (addr == null) {
            // 无法解析的地址视为不安全，拒绝封禁
            return true;
        }
        if (addr.isSiteLocalAddress()
                || addr.isLinkLocalAddress()
                || addr.isAnyLocalAddress()
                || addr.isLoopbackAddress()
                || addr.isMulticastAddress()) {
            return true;
        }
        // Java InetAddress 不把 IPv6 ULA fc00::/7 视为 site-local，按 PRD 显式拒绝。
        byte[] bytes = addr.getAddress();
        if (bytes.length == 16 && (bytes[0] & 0xFE) == 0xFC) {
            return true;
        }
        return false;
    }

    /**
     * 判断是否为合法的单个 IPv4/IPv6 地址（不含 CIDR 前缀/掩码）。
     */
    public static boolean isValidSingleIp(String ip) {
        if (!StringUtils.hasText(ip)) {
            return false;
        }
        String trimmed = ip.trim();
        if (trimmed.contains("/")) {
            return false;
        }
        if ("localhost".equalsIgnoreCase(trimmed)) {
            return false;
        }
        return parseInetAddress(normalizeIp(trimmed)) != null;
    }

    /**
     * 从 X-Forwarded-For 头中取第一个有效、非 unknown 的 IP（不做受信代理判断，仅做解析）。
     */
    public static String firstForwardedIp(String headerValue) {
        if (!StringUtils.hasText(headerValue)) {
            return null;
        }
        return Arrays.stream(headerValue.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .filter(token -> !"unknown".equalsIgnoreCase(token))
                .findFirst()
                .orElse(null);
    }

    /**
     * 从 Forwarded 头中取第一个有效 for= 值。
     */
    public static String firstForwardedHeaderIp(String forwarded) {
        return parseForwardedHeader(forwarded);
    }

    private static InetAddress parseInetAddress(String ip) {
        try {
            return InetAddress.getByName(ip);
        } catch (UnknownHostException | RuntimeException ex) {
            return null;
        }
    }
}
