package com.sangui.sanguiblog.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangui.sanguiblog.model.dto.AnalyticsRequestDetailContext;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.model.dto.ArticleVisitEndRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitHeartbeatRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitStartRequest;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.security.UserPrincipal;
import com.sangui.sanguiblog.service.AnalyticsService;
import com.sangui.sanguiblog.util.IpUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsController.class);
    private static final String VISIT_ID_HEADER = "X-SG-Visit-Id";

    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    @PostMapping("/page-view")
    public ApiResponse<Void> record(@RequestBody PageViewRequest request,
                                    HttpServletRequest httpServletRequest,
                                    @AuthenticationPrincipal UserPrincipal principal) {
        String ip = IpUtils.resolveIp(httpServletRequest);
        if (request != null && StringUtils.hasText(request.getClientIp())) {
            String candidate = IpUtils.normalizeIp(request.getClientIp());
            if (StringUtils.hasText(candidate)
                    && !IpUtils.isLoopback(candidate)
                    && IpUtils.isLoopback(ip)) {
                ip = candidate;
            }
        }
        String userAgent = httpServletRequest.getHeader("User-Agent");
        Long userId = principal != null ? principal.getId() : null;
        String visitId = httpServletRequest.getHeader(VISIT_ID_HEADER);
        AnalyticsRequestDetailContext detailContext = buildRequestDetailContext(httpServletRequest, null, null);
        analyticsService.recordPageView(request, ip, userAgent, userId, visitId, detailContext);
        return ApiResponse.ok();
    }

    @GetMapping("/client-ip")
    public ApiResponse<Map<String, String>> clientIp(HttpServletRequest httpServletRequest) {
        String ip = IpUtils.normalizeIp(IpUtils.resolveIp(httpServletRequest));
        return ApiResponse.ok(Map.of("ip", ip));
    }

    @PostMapping(value = "/visit/start", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE})
    public ApiResponse<Void> visitStart(@RequestBody(required = false) String rawBody,
                                        HttpServletRequest httpServletRequest,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        ArticleVisitStartRequest request = parseJson(rawBody, ArticleVisitStartRequest.class);
        if (request == null) {
            return ApiResponse.ok();
        }
        try {
            String ip = IpUtils.resolveIp(httpServletRequest);
            String userAgent = httpServletRequest.getHeader("User-Agent");
            Long userId = principal != null ? principal.getId() : null;
            AnalyticsRequestDetailContext detailContext = buildRequestDetailContext(httpServletRequest, null, null);
            analyticsService.recordArticleVisitStart(request, ip, userAgent, userId, detailContext);
        } catch (Exception ex) {
            // 埋点接口失败必须静默，不得 500 或影响文章浏览
            log.debug("visit/start 处理异常，已静默忽略", ex);
        }
        return ApiResponse.ok();
    }

    @PostMapping(value = "/visit/heartbeat", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE})
    public ApiResponse<Void> visitHeartbeat(@RequestBody(required = false) String rawBody) {
        ArticleVisitHeartbeatRequest request = parseJson(rawBody, ArticleVisitHeartbeatRequest.class);
        if (request == null) {
            return ApiResponse.ok();
        }
        try {
            analyticsService.recordArticleVisitHeartbeat(request);
        } catch (Exception ex) {
            log.debug("visit/heartbeat 处理异常，已静默忽略", ex);
        }
        return ApiResponse.ok();
    }

    @PostMapping(value = "/visit/end", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE})
    public ApiResponse<Void> visitEnd(@RequestBody(required = false) String rawBody) {
        ArticleVisitEndRequest request = parseJson(rawBody, ArticleVisitEndRequest.class);
        if (request == null) {
            return ApiResponse.ok();
        }
        try {
            analyticsService.recordArticleVisitEnd(request);
        } catch (Exception ex) {
            log.debug("visit/end 处理异常，已静默忽略", ex);
        }
        return ApiResponse.ok();
    }

    private <T> T parseJson(String rawBody, Class<T> type) {
        if (!StringUtils.hasText(rawBody)) {
            return null;
        }
        try {
            return objectMapper.readValue(rawBody, type);
        } catch (Exception ex) {
            // 解析失败（含 sendBeacon text/plain 非法 JSON）按 no-op 处理，不抛 500
            log.debug("visit 请求 JSON 解析失败，已忽略 type={}", type.getSimpleName(), ex);
            return null;
        }
    }

    public static AnalyticsRequestDetailContext buildRequestDetailContext(jakarta.servlet.http.HttpServletRequest request, String entryPage, String fromPage) {
        if (request == null) {
            return new AnalyticsRequestDetailContext(null, null, null, null, null, null, null, null, null, null);
        }
        return new AnalyticsRequestDetailContext(
                request.getMethod(),
                safeRequestUri(request.getRequestURI()),
                request.getHeader("Referer"),
                trimHeader(request, "X-Forwarded-For", 512),
                trimHeader(request, "X-Real-IP", 128),
                trimHeader(request, "Accept-Language", 255),
                entryPage,
                fromPage,
                null,
                request.getHeader(VISIT_ID_HEADER)
        );
    }

    private static String safeRequestUri(String uri) {
        if (!StringUtils.hasText(uri)) {
            return null;
        }
        int queryIdx = uri.indexOf('?');
        String path = queryIdx >= 0 ? uri.substring(0, queryIdx) : uri;
        return path.length() > 512 ? path.substring(0, 512) : path;
    }

    private static String trimHeader(jakarta.servlet.http.HttpServletRequest request, String name, int maxLen) {
        String value = request.getHeader(name);
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.length() > maxLen ? value.substring(0, maxLen) : value;
    }
}
