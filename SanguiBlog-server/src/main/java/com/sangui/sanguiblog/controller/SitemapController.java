package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.service.SitemapService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class SitemapController {

    private final SitemapService sitemapService;

    @GetMapping(value = "/sitemap.xml", produces = "application/xml; charset=UTF-8")
    public ResponseEntity<byte[]> sitemap(
            HttpServletRequest request,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestHeader(name = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch
    ) {
        SitemapService.SitemapResult result = sitemapService.getSitemapXml(request, page);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }

        sitemapService.recordSitemapAccess(request);

        if (etagMatches(ifNoneMatch, result.etag())) {
            ResponseEntity.BodyBuilder builder = ResponseEntity.status(304)
                    .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                    .header(HttpHeaders.VARY, "Host")
                    .eTag(result.etag());
            if (result.lastModifiedMs() > 0) {
                builder.lastModified(result.lastModifiedMs());
            }
            return builder.build();
        }

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(new MediaType("application", "xml", StandardCharsets.UTF_8))
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .header(HttpHeaders.VARY, "Host")
                .eTag(result.etag());
        if (result.lastModifiedMs() > 0) {
            builder.lastModified(result.lastModifiedMs());
        }
        return builder.body(result.body());
    }

    @GetMapping(value = "/robots.txt", produces = "text/plain; charset=UTF-8")
    public ResponseEntity<byte[]> robots(
            HttpServletRequest request,
            @RequestHeader(name = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch
    ) {
        SitemapService.RobotsResult result = sitemapService.getRobotsTxt(request);
        sitemapService.recordRobotsAccess(request);

        if (etagMatches(ifNoneMatch, result.etag())) {
            return ResponseEntity.status(304)
                    .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                    .header(HttpHeaders.VARY, "Host")
                    .eTag(result.etag())
                    .build();
        }

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .header(HttpHeaders.VARY, "Host")
                .eTag(result.etag())
                .body(result.body());
    }

    private static boolean etagMatches(String ifNoneMatch, String etag) {
        if (etag == null) {
            return false;
        }
        if (ifNoneMatch == null || ifNoneMatch.isBlank()) {
            return false;
        }
        String raw = ifNoneMatch.trim();
        if ("*".equals(raw)) {
            return true;
        }
        for (String token : raw.split(",")) {
            String t = token.trim();
            if (t.startsWith("W/")) {
                t = t.substring(2).trim();
            }
            if (etag.equals(t)) {
                return true;
            }
        }
        return false;
    }
}
