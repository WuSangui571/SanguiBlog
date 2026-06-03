package com.sangui.sanguiblog.service;

import org.lionsoul.ip2region.xdb.Searcher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.InetAddress;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeoIpService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GeoIpService.class);

    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();
    private volatile Searcher searcher;

    @Value("${analytics.geo.ip2region.xdb-path:classpath:ip2region/ip2region.xdb}")
    private String xdbPath;

    @PostConstruct
    void init() {
        try {
            if (StringUtils.hasText(xdbPath) && !xdbPath.startsWith("classpath:")) {
                searcher = Searcher.newWithFileOnly(xdbPath);
                log.info("ip2region loaded from external file: {}", xdbPath);
            } else {
                String resourcePath = xdbPath != null && xdbPath.startsWith("classpath:")
                        ? xdbPath.substring("classpath:".length())
                        : "ip2region/ip2region.xdb";
                try (InputStream is = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
                    if (is != null) {
                        byte[] dbBinStr = is.readAllBytes();
                        searcher = Searcher.newWithBuffer(dbBinStr);
                        log.info("ip2region loaded from classpath: {} ({} bytes)", resourcePath, dbBinStr.length);
                    } else {
                        log.warn("ip2region XDB not found at classpath:{}, geo lookup will return null until XDB is provided", resourcePath);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to initialize ip2region searcher, geo lookup will degrade gracefully", ex);
        }
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
        if (geo == null && searcher != null) {
            geo = queryLocal(normalized);
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
            if (address.isSiteLocalAddress() || address.isLinkLocalAddress()) {
                return "内网";
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String queryLocal(String ip) {
        try {
            String region;
            synchronized (searcher) {
                region = searcher.search(ip);
            }
            return parseRegion(region);
        } catch (Exception ex) {
            log.debug("ip2region lookup failed for ip={}", ip, ex);
            return null;
        }
    }

    private String parseRegion(String region) {
        if (!StringUtils.hasText(region)) {
            return null;
        }
        String[] parts = region.split("\\|");
        Set<String> display = new LinkedHashSet<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (StringUtils.hasText(trimmed) && !"0".equals(trimmed)) {
                display.add(trimmed);
            }
        }
        if (display.isEmpty()) {
            return null;
        }
        return String.join(" · ", display);
    }
}
