package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.repository.GamePageRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SitemapService {

    private final PostRepository postRepository;
    private final GamePageRepository gamePageRepository;

    @Value("${site.base-url:https://www.sangui.top}")
    private String configuredBaseUrl;

    @Value("${site.allowed-hosts:sangui.top,www.sangui.top}")
    private String allowedHosts;

    @Value("${site.sitemap.cache-ttl-ms:600000}")
    private long cacheTtlMs;

    private final AtomicLong revision = new AtomicLong(1);
    private final ReentrantLock rebuildLock = new ReentrantLock();

    private final AtomicReference<SitemapSnapshot> snapshotRef = new AtomicReference<>();
    private final ConcurrentHashMap<String, CachedXml> xmlCacheByBaseUrl = new ConcurrentHashMap<>();

    public void markDirty() {
        revision.incrementAndGet();
    }

    public byte[] getSitemapXml(HttpServletRequest request) {
        String baseUrl = resolveBaseUrl(request);
        SitemapSnapshot snapshot = ensureSnapshotFresh();
        CachedXml cached = xmlCacheByBaseUrl.get(baseUrl);
        if (cached != null && cached.revision == snapshot.revision) {
            return cached.xmlBytes;
        }
        byte[] xml = buildXml(snapshot, baseUrl);
        xmlCacheByBaseUrl.put(baseUrl, new CachedXml(snapshot.revision, xml));
        return xml;
    }

    public byte[] getRobotsTxt(HttpServletRequest request) {
        String baseUrl = resolveBaseUrl(request);
        StringBuilder sb = new StringBuilder();
        sb.append("User-agent: *\n");
        sb.append("Disallow: /admin\n");
        sb.append("Allow: /\n");
        sb.append("Sitemap: ").append(baseUrl).append("/sitemap.xml\n");
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Scheduled(fixedDelayString = "${site.sitemap.refresh-delay-ms:600000}")
    public void scheduledRefresh() {
        ensureSnapshotFresh(true);
    }

    private SitemapSnapshot ensureSnapshotFresh() {
        return ensureSnapshotFresh(false);
    }

    private SitemapSnapshot ensureSnapshotFresh(boolean force) {
        long now = System.currentTimeMillis();
        long currentRevision = revision.get();
        SitemapSnapshot current = snapshotRef.get();
        boolean expired = current == null || (now - current.builtAtMs) > Math.max(1, cacheTtlMs);
        boolean changed = current == null || current.revision != currentRevision;
        if (!force && !expired && !changed) {
            return current;
        }

        rebuildLock.lock();
        try {
            long latestRevision = revision.get();
            SitemapSnapshot again = snapshotRef.get();
            boolean againExpired = again == null || (now - again.builtAtMs) > Math.max(1, cacheTtlMs);
            boolean againChanged = again == null || again.revision != latestRevision;
            if (!force && !againExpired && !againChanged) {
                return again;
            }
            SitemapSnapshot rebuilt = rebuildSnapshot(latestRevision);
            snapshotRef.set(rebuilt);
            xmlCacheByBaseUrl.clear();
            return rebuilt;
        } finally {
            rebuildLock.unlock();
        }
    }

    private SitemapSnapshot rebuildSnapshot(long newRevision) {
        List<SitemapItem> items = new ArrayList<>();

        List<PostRepository.SitemapPostRow> posts = postRepository.findPublishedForSitemap();
        List<GamePageRepository.SitemapGamePageRow> games = gamePageRepository.findActiveForSitemap();

        String latestPostMod = posts.stream()
                .map(p -> maxDate(p.getPublishedAt(), p.getUpdatedAt()))
                .filter(StringUtils::hasText)
                .max(String::compareTo)
                .orElse(today());

        String latestGameMod = games.stream()
                .map(GamePageRepository.SitemapGamePageRow::getUpdatedAt)
                .filter(v -> v != null)
                .map(this::toDate)
                .max(String::compareTo)
                .orElse(null);

        String globalLastMod = StringUtils.hasText(latestPostMod) ? latestPostMod : today();
        if (StringUtils.hasText(latestGameMod) && latestGameMod.compareTo(globalLastMod) > 0) {
            globalLastMod = latestGameMod;
        }

        items.add(new SitemapItem("/", globalLastMod, "daily", "1.0"));
        items.add(new SitemapItem("/archive", globalLastMod, "weekly", "0.7"));
        items.add(new SitemapItem("/about", globalLastMod, "monthly", "0.3"));
        items.add(new SitemapItem("/tools", globalLastMod, "weekly", "0.6"));

        for (GamePageRepository.SitemapGamePageRow g : games) {
            if (g == null || g.getId() == null) {
                continue;
            }
            String lastmod = g.getUpdatedAt() != null ? toDate(g.getUpdatedAt()) : globalLastMod;
            items.add(new SitemapItem("/tools/" + g.getId(), lastmod, "monthly", "0.5"));
        }

        for (PostRepository.SitemapPostRow p : posts) {
            if (p == null || p.getId() == null) {
                continue;
            }
            String lastmod = maxDate(p.getPublishedAt(), p.getUpdatedAt());
            if (!StringUtils.hasText(lastmod)) {
                lastmod = globalLastMod;
            }
            items.add(new SitemapItem("/article/" + p.getId(), lastmod, "monthly", "0.8"));
        }

        return new SitemapSnapshot(newRevision, System.currentTimeMillis(), globalLastMod, items);
    }

    private byte[] buildXml(SitemapSnapshot snapshot, String baseUrl) {
        String normalizedBase = normalizeBaseUrl(baseUrl);
        StringBuilder sb = new StringBuilder(32_768);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (SitemapItem item : snapshot.items) {
            if (item == null || !StringUtils.hasText(item.path)) {
                continue;
            }
            String loc = normalizedBase + (item.path.startsWith("/") ? item.path : ("/" + item.path));
            sb.append("  <url>\n");
            sb.append("    <loc>").append(escapeXml(loc)).append("</loc>\n");
            if (StringUtils.hasText(item.lastmod)) {
                sb.append("    <lastmod>").append(escapeXml(item.lastmod)).append("</lastmod>\n");
            }
            if (StringUtils.hasText(item.changefreq)) {
                sb.append("    <changefreq>").append(escapeXml(item.changefreq)).append("</changefreq>\n");
            }
            if (StringUtils.hasText(item.priority)) {
                sb.append("    <priority>").append(escapeXml(item.priority)).append("</priority>\n");
            }
            sb.append("  </url>\n");
        }
        sb.append("</urlset>\n");
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        String fallback = normalizeBaseUrl(configuredBaseUrl);
        Set<String> allowed = parseAllowedHosts(allowedHosts);

        if (request == null) {
            return fallback;
        }

        String host = null;
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (StringUtils.hasText(forwardedHost)) {
            host = forwardedHost.split(",")[0].trim();
        } else if (StringUtils.hasText(request.getServerName())) {
            host = request.getServerName().trim();
        }

        if (StringUtils.hasText(host)) {
            host = host.replaceAll(":\\d+$", "");
        }

        if (StringUtils.hasText(host) && (allowed.isEmpty() || allowed.contains(host))) {
            return "https://" + host;
        }
        return fallback;
    }

    private Set<String> parseAllowedHosts(String raw) {
        if (!StringUtils.hasText(raw)) {
            return Set.of();
        }
        return java.util.Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());
    }

    private String normalizeBaseUrl(String baseUrl) {
        if (!StringUtils.hasText(baseUrl)) {
            return "https://www.sangui.top";
        }
        String trimmed = baseUrl.trim();
        trimmed = trimmed.replaceAll("/+$", "");
        if (trimmed.startsWith("http://")) {
            trimmed = "https://" + trimmed.substring("http://".length());
        }
        return trimmed;
    }

    private String today() {
        return LocalDate.now().toString();
    }

    private String maxDate(LocalDateTime publishedAt, Instant updatedAt) {
        LocalDate d1 = null;
        if (publishedAt != null) {
            d1 = publishedAt.toLocalDate();
        }
        LocalDate d2 = null;
        if (updatedAt != null) {
            d2 = updatedAt.atZone(ZoneId.systemDefault()).toLocalDate();
        }
        if (d1 == null && d2 == null) {
            return null;
        }
        if (d1 == null) {
            return d2.toString();
        }
        if (d2 == null) {
            return d1.toString();
        }
        return (d1.isAfter(d2) ? d1 : d2).toString();
    }

    private String toDate(Instant instant) {
        if (instant == null) {
            return null;
        }
        return instant.atZone(ZoneId.systemDefault()).toLocalDate().toString();
    }

    private String escapeXml(String input) {
        if (input == null) {
            return "";
        }
        StringBuilder out = new StringBuilder(input.length() + 16);
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&apos;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }

    private record SitemapSnapshot(long revision, long builtAtMs, String globalLastMod, List<SitemapItem> items) {
    }

    private record SitemapItem(String path, String lastmod, String changefreq, String priority) {
    }

    private record CachedXml(long revision, byte[] xmlBytes) {
    }
}
