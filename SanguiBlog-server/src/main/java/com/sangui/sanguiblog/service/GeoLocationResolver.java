package com.sangui.sanguiblog.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Set;

@Component
@Slf4j
public class GeoLocationResolver {

    private static final Set<Integer> CN_PREFIXES = Set.of(
            1, 14, 27, 36, 39, 42, 43, 49, 58, 59, 60, 61,
            101, 103, 106, 110, 111, 112, 113, 114, 115, 116,
            117, 118, 119, 120, 121, 122, 123, 124, 125, 139,
            140, 144, 171, 175, 180, 181, 182, 183, 202, 203,
            210, 211, 218, 219, 220, 221, 222, 223
    );

    public String resolve(String ip, String fallback) {
        if (!StringUtils.hasText(ip)) {
            return formatFallback(fallback);
        }
        String normalized = ip.trim();
        try {
            if (isLoopback(normalized)) {
                return "本机访问";
            }
            if (isPrivateIpv4(normalized)) {
                return "内网/局域网";
            }
            if (normalized.contains(":")) {
                return "IPv6 访客";
            }
            String[] parts = normalized.split("\\.");
            if (parts.length >= 1) {
                int firstOctet = Integer.parseInt(parts[0]);
                String region = CN_PREFIXES.contains(firstOctet) ? "中国访客" : "海外访客";
                if (StringUtils.hasText(fallback)) {
                    return region + " · " + fallback;
                }
                return region;
            }
        } catch (Exception ex) {
            log.debug("Geo resolve failed for ip {}", ip, ex);
        }
        return formatFallback(fallback);
    }

    private boolean isLoopback(String ip) {
        return ip.equals("127.0.0.1") || ip.equalsIgnoreCase("::1");
    }

    private boolean isPrivateIpv4(String ip) {
        if (!ip.contains(".")) {
            return false;
        }
        String[] parts = ip.split("\\.");
        if (parts.length != 4) {
            return false;
        }
        int first = Integer.parseInt(parts[0]);
        int second = Integer.parseInt(parts[1]);
        if (first == 10) return true;
        if (first == 172 && second >= 16 && second <= 31) return true;
        if (first == 192 && second == 168) return true;
        if (first == 169 && second == 254) return true;
        return false;
    }

    private String formatFallback(String fallback) {
        return StringUtils.hasText(fallback) ? fallback : "未知地域";
    }
}
