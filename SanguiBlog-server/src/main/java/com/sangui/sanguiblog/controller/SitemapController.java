package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.service.SitemapService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class SitemapController {

    private final SitemapService sitemapService;

    @GetMapping(value = "/sitemap.xml", produces = "application/xml; charset=UTF-8")
    public ResponseEntity<byte[]> sitemap(HttpServletRequest request) {
        byte[] body = sitemapService.getSitemapXml(request);
        return ResponseEntity.ok()
                .contentType(new MediaType("application", "xml", StandardCharsets.UTF_8))
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .header(HttpHeaders.VARY, "Host")
                .body(body);
    }

    @GetMapping(value = "/robots.txt", produces = "text/plain; charset=UTF-8")
    public ResponseEntity<byte[]> robots(HttpServletRequest request) {
        byte[] body = sitemapService.getRobotsTxt(request);
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .header(HttpHeaders.VARY, "Host")
                .body(body);
    }
}

