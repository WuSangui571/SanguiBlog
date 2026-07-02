package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.config.ClientIpProperties;
import com.sangui.sanguiblog.util.IpUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/**
 * 受信代理边界下的真实客户端 IP 解析器。
 * <p>
 * 顺序：CF-Connecting-IP -> X-Real-IP -> X-Forwarded-For -> remoteAddr。
 * 仅当 immediate remoteAddr 命中 {@link ClientIpProperties#getTrustedProxies()} 时才信任转发头；
 * 未配置受信代理时直接使用 remoteAddr，避免被可伪造头欺骗。
 */
@Service
@RequiredArgsConstructor
public class ClientIpResolver {

    private final ClientIpProperties props;

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "0.0.0.0";
        }
        String remoteAddr = IpUtils.normalizeIp(request.getRemoteAddr());
        if (!isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }
        String cf = request.getHeader("CF-Connecting-IP");
        if (StringUtils.hasText(cf) && !"unknown".equalsIgnoreCase(cf)) {
            String ip = IpUtils.normalizeIp(cf.trim());
            if (StringUtils.hasText(ip) && !"0.0.0.0".equals(ip)) {
                return ip;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp) && !"unknown".equalsIgnoreCase(realIp)) {
            String ip = IpUtils.normalizeIp(realIp.trim());
            if (StringUtils.hasText(ip) && !"0.0.0.0".equals(ip)) {
                return ip;
            }
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff) && !"unknown".equalsIgnoreCase(xff)) {
            String first = IpUtils.firstForwardedIp(xff);
            if (StringUtils.hasText(first)) {
                String ip = IpUtils.normalizeIp(first);
                if (StringUtils.hasText(ip) && !"0.0.0.0".equals(ip)) {
                    return ip;
                }
            }
        }
        return remoteAddr;
    }

    private boolean isTrustedProxy(String remoteAddr) {
        List<String> trusted = props.getTrustedProxies();
        if (trusted == null || trusted.isEmpty()) {
            return false;
        }
        for (String entry : trusted) {
            if (!StringUtils.hasText(entry)) {
                continue;
            }
            String trimmed = entry.trim();
            if (matchesProxy(remoteAddr, trimmed)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesProxy(String remoteAddr, String proxySpec) {
        if (proxySpec.equals(remoteAddr)) {
            return true;
        }
        int slash = proxySpec.indexOf('/');
        if (slash <= 0) {
            return false;
        }
        String cidr = proxySpec.substring(0, slash);
        int prefix;
        try {
            prefix = Integer.parseInt(proxySpec.substring(slash + 1).trim());
        } catch (NumberFormatException ex) {
            return false;
        }
        try {
            InetAddress addr = InetAddress.getByName(remoteAddr);
            InetAddress base = InetAddress.getByName(cidr);
            byte[] a = addr.getAddress();
            byte[] b = base.getAddress();
            if (a.length != b.length) {
                return false;
            }
            int full = prefix / 8;
            int rem = prefix % 8;
            for (int i = 0; i < full && i < a.length; i++) {
                if (a[i] != b[i]) {
                    return false;
                }
            }
            if (rem != 0 && full < a.length) {
                int mask = 0xFF << (8 - rem);
                if ((a[full] & mask) != (b[full] & mask)) {
                    return false;
                }
            }
            return true;
        } catch (UnknownHostException | RuntimeException ex) {
            return false;
        }
    }
}
