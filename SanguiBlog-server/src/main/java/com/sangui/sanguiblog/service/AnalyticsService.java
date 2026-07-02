package com.sangui.sanguiblog.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sangui.sanguiblog.exception.NotFoundException;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsPageViewDetailDto;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsPageViewDetailFieldsDto;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto;
import com.sangui.sanguiblog.model.dto.AnalyticsClientEnvironment;
import com.sangui.sanguiblog.model.dto.AnalyticsRequestDetailContext;
import com.sangui.sanguiblog.model.dto.ArticleVisitEndRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitHeartbeatRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitStartRequest;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.PageViewRequest;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.AnalyticsTrafficSource;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.util.IpUtils;
import com.sangui.sanguiblog.util.ReferrerUtils;
import com.sangui.sanguiblog.util.UserAgentDetailUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // 第一阶段：单次 visit 浏览时长上限（秒）。超过按此截断，负值归零。
    static final int MAX_VISIT_DURATION_SECONDS = 7200;
    static final String VISIT_STATUS_OPEN = "OPEN";
    static final String VISIT_STATUS_CLOSED = "CLOSED";
    private static final int TRANSIENT_VISIT_MERGE_WINDOW_SECONDS = 5;

    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final AnalyticsTrafficSourceRepository analyticsTrafficSourceRepository;
    private final GeoIpService geoIpService;
    private final com.sangui.sanguiblog.service.IpBanService ipBanService;

    private String decodePercentEncodedValue(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        // 兜底：前端可能对来源字段做了 URL-encode（encodeURIComponent）以规避浏览器 header 的字符集限制。
        // 这里 decode 后再参与“来源展示/来源统计”，避免后台日志出现 %E6%... 乱码。
        if (!value.contains("%")) {
            return value;
        }
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            return value;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPageView(PageViewRequest request, String ip, String userAgent, Long userId) {
        recordPageView(request, ip, userAgent, userId, null, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPageView(PageViewRequest request, String ip, String userAgent, Long userId, String visitId) {
        recordPageView(request, ip, userAgent, userId, visitId, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPageView(PageViewRequest request, String ip, String userAgent, Long userId, String visitId, AnalyticsRequestDetailContext detailContext) {
        recordPageView(request, ip, userAgent, userId, visitId, detailContext, extractClientEnvFromPageView(request));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPageView(PageViewRequest request, String ip, String userAgent, Long userId, String visitId, AnalyticsRequestDetailContext detailContext, AnalyticsClientEnvironment clientEnv) {
        if (request == null) {
            request = new PageViewRequest();
        }
        String normalizedVisitId = normalizeVisitId(visitId);
        String normalizedIp = normalizeViewerIp(ip);
        LocalDateTime now = LocalDateTime.now();
        request.setReferrer(decodePercentEncodedValue(request.getReferrer()));
        request.setSourceLabel(decodePercentEncodedValue(request.getSourceLabel()));

        User viewer = null;
        if (userId != null) {
            viewer = userRepository.findById(userId).orElse(null);
            if (viewer != null && viewer.getRole() != null
                    && "SUPER_ADMIN".equalsIgnoreCase(viewer.getRole().getCode())
                    && shouldSkipForSuperAdmin(request)) {
                return;
            }
        }

        // 文章详情 GET 带 visitId 时，保证"一次 visit = 一行"：若 start 已先创建该 visit 行，则幂等补齐，不重复插入。
        if (StringUtils.hasText(normalizedVisitId)) {
            AnalyticsPageView existing = analyticsPageViewRepository.findByVisitId(normalizedVisitId).orElse(null);
            if (existing != null) {
                fillMissingVisitRowFields(existing, request, viewer);
                if (existing.getEnterTime() == null) {
                    existing.setEnterTime(now);
                }
                if (!StringUtils.hasText(existing.getVisitStatus())) {
                    existing.setVisitStatus(VISIT_STATUS_OPEN);
                }
                setDetailJsonIfMissing(existing, normalizedIp, userAgent, normalizedVisitId, detailContext, clientEnv);
                analyticsPageViewRepository.save(existing);
                return;
            }
            if (request.getPostId() != null) {
                AnalyticsPageView transientOpenRow = analyticsPageViewRepository
                        .findFirstByPost_IdAndViewerIpAndVisitStatusAndViewedAtAfterOrderByViewedAtDesc(
                                request.getPostId(),
                                normalizedIp,
                                VISIT_STATUS_OPEN,
                                now.minusSeconds(TRANSIENT_VISIT_MERGE_WINDOW_SECONDS)
                        )
                        .filter(this::isTransientOpenVisitRow)
                        .orElse(null);
                if (transientOpenRow != null) {
                    transientOpenRow.setVisitId(normalizedVisitId);
                    fillMissingVisitRowFields(transientOpenRow, request, viewer);
                    if (transientOpenRow.getEnterTime() == null) {
                        transientOpenRow.setEnterTime(now);
                    }
                    if (transientOpenRow.getViewedAt() == null) {
                        transientOpenRow.setViewedAt(now);
                    }
                    if (!StringUtils.hasText(transientOpenRow.getVisitStatus())) {
                        transientOpenRow.setVisitStatus(VISIT_STATUS_OPEN);
                    }
                    setDetailJsonIfMissing(transientOpenRow, normalizedIp, userAgent, normalizedVisitId, detailContext, clientEnv);
                    analyticsPageViewRepository.save(transientOpenRow);
                    return;
                }
            }
        }

        AnalyticsPageView pv = new AnalyticsPageView();
        if (StringUtils.hasText(normalizedVisitId)) {
            pv.setVisitId(normalizedVisitId);
            pv.setEnterTime(now);
            pv.setVisitStatus(VISIT_STATUS_OPEN);
        }
        if (request.getPostId() != null) {
            Post post = postRepository.findById(request.getPostId()).orElse(null);
            pv.setPost(post);
            if (post != null && (request.getPageTitle() == null || request.getPageTitle().isBlank())) {
                request.setPageTitle(post.getTitle());
            }
        }

        pv.setUser(viewer);
        pv.setPageTitle(normalizePageTitle(request.getPageTitle()));
        pv.setViewerIp(normalizedIp);
        pv.setReferrerUrl(resolveReferrerDisplayLabel(request));
        pv.setGeoLocation(resolveGeoLocation(normalizedIp, request.getGeo()));
        pv.setUserAgent(trimToLength(userAgent, 512));
        pv.setViewedAt(now);
        pv.setHeartbeatCount(0);
        pv.setDetailJson(buildDetailJson(normalizedIp, userAgent, normalizedVisitId, detailContext, clientEnv));
        analyticsPageViewRepository.save(pv);

        try {
            updateTrafficSourceStat(request, pv.getViewedAt());
        } catch (DataIntegrityViolationException ex) {
            log.warn("流量来源统计写入冲突，已忽略本次来源，上报维度 date={}, label={}",
                    pv.getViewedAt() != null ? pv.getViewedAt().toLocalDate() : LocalDate.now(),

                    determineTrafficSourceLabel(request));
        } catch (Exception ex) {
            log.warn("流量来源统计写入失败，已忽略本次来源记录", ex);
        }
    }

    private boolean isTransientOpenVisitRow(AnalyticsPageView row) {
        if (row == null || !VISIT_STATUS_OPEN.equals(row.getVisitStatus())) {
            return false;
        }
        boolean hasHeartbeat = row.getHeartbeatCount() != null && row.getHeartbeatCount() > 0;
        return !hasHeartbeat
                && row.getLeaveTime() == null
                && row.getTotalDurationSeconds() == null
                && row.getActiveDurationSeconds() == null;
    }

    void setDetailJsonIfMissing(AnalyticsPageView row, String ip, String userAgent, String visitId, AnalyticsRequestDetailContext detailContext, AnalyticsClientEnvironment clientEnv) {
        if (row == null) {
            return;
        }
        if (StringUtils.hasText(row.getDetailJson())) {
            mergeClientEnvironmentIntoDetailJson(row, clientEnv);
            return;
        }
        row.setDetailJson(buildDetailJson(ip, userAgent, visitId, detailContext, clientEnv));
    }

    String buildDetailJson(String ip, String userAgent, String visitId, AnalyticsRequestDetailContext detailContext, AnalyticsClientEnvironment clientEnv) {
        Map<String, Object> detail = new LinkedHashMap<>();
        String normalizedIp = StringUtils.hasText(ip) ? IpUtils.normalizeIp(ip) : "0.0.0.0";

        detail.put("userAgent", trimToLength(userAgent, 512));
        detail.put("refererRaw", safeUrlLikeDetailValue(detailContext != null ? detailContext.refererRaw() : null, 512));
        detail.put("method", trimToLength(detailContext != null ? detailContext.method() : null, 16));
        detail.put("requestUri", safeUrlLikeDetailValue(detailContext != null ? detailContext.requestUri() : null, 512));
        detail.put("status", valueOrNull(200));
        detail.put("durationMs", null);
        detail.put("ip", normalizedIp);
        detail.put("xForwardedFor", trimToLength(detailContext != null ? detailContext.xForwardedFor() : null, 512));
        detail.put("xRealIp", trimToLength(detailContext != null ? detailContext.xRealIp() : null, 128));
        detail.put("acceptLanguage", trimToLength(detailContext != null ? detailContext.acceptLanguage() : null, 255));
        detail.put("visitorId", trimToLength(detailContext != null ? detailContext.visitorId() : null, 128));
        detail.put("sessionId", trimToLength(visitId != null ? visitId : (detailContext != null ? detailContext.sessionId() : null), 128));
        detail.put("entryPage", safeUrlLikeDetailValue(detailContext != null ? detailContext.entryPage() : null, 512));
        detail.put("fromPage", safeUrlLikeDetailValue(detailContext != null ? detailContext.fromPage() : null, 512));
        detail.put("isFirstVisit", null);

        detail.put("timezone", sanitizeTimezone(clientEnv != null ? clientEnv.timezone() : null));
        detail.put("screenSize", trimToLength(clientEnv != null ? clientEnv.screenSize() : null, 64));
        detail.put("viewportSize", trimToLength(clientEnv != null ? clientEnv.viewportSize() : null, 64));
        detail.put("devicePixelRatio", sanitizeDevicePixelRatio(clientEnv != null ? clientEnv.devicePixelRatio() : null));
        detail.put("webdriver", clientEnv != null ? clientEnv.webdriver() : null);
        detail.put("visibilityState", sanitizeVisibilityState(clientEnv != null ? clientEnv.visibilityState() : null));
        detail.put("referrerClient", safeUrlLikeDetailValue(clientEnv != null ? clientEnv.referrerClient() : null, 512));

        boolean botDetected = UserAgentDetailUtils.isLikelyBot(userAgent);
        detail.put("botDetected", botDetected);
        detail.put("botName", botDetected ? UserAgentDetailUtils.resolveBotName(userAgent) : null);
        detail.put("deviceType", resolveDetailValue(UserAgentDetailUtils.resolveDeviceType(userAgent)));
        detail.put("browser", resolveDetailValue(UserAgentDetailUtils.resolveBrowser(userAgent)));
        detail.put("os", resolveDetailValue(UserAgentDetailUtils.resolveOs(userAgent)));
        detail.put("asn", null);
        detail.put("isp", null);
        detail.put("ipType", UserAgentDetailUtils.classifyIpType(normalizedIp));

        try {
            return OBJECT_MAPPER.writeValueAsString(detail);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize detail_json, returning null", e);
            return null;
        }
    }

    private static final Set<String> ALLOWED_VISIBILITY_STATES = Set.of("visible", "hidden", "prerender", "unloaded");

    private static String sanitizeTimezone(String timezone) {
        if (!StringUtils.hasText(timezone)) {
            return null;
        }
        String trimmed = timezone.trim();
        if ("UTC".equalsIgnoreCase(trimmed) || trimmed.startsWith("Etc/")) {
            return null;
        }
        try {
            if (java.time.ZoneId.getAvailableZoneIds().contains(trimmed)) {
                return trimToLength(trimmed, 64);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static Double sanitizeDevicePixelRatio(Double dpr) {
        if (dpr == null || dpr.isNaN() || dpr.isInfinite()) {
            return null;
        }
        if (dpr <= 0 || dpr > 10) {
            return null;
        }
        double rounded = Math.round(dpr * 100.0) / 100.0;
        return rounded;
    }

    private static String sanitizeVisibilityState(String state) {
        if (!StringUtils.hasText(state)) {
            return null;
        }
        String lower = state.trim().toLowerCase(Locale.ROOT);
        return ALLOWED_VISIBILITY_STATES.contains(lower) ? lower : null;
    }

    private void mergeClientEnvironmentIntoDetailJson(AnalyticsPageView row, AnalyticsClientEnvironment clientEnv) {
        if (row == null || clientEnv == null || !StringUtils.hasText(row.getDetailJson())) {
            return;
        }
        try {
            Map<String, Object> detail = OBJECT_MAPPER.readValue(row.getDetailJson(), new TypeReference<LinkedHashMap<String, Object>>() {});
            boolean changed = false;
            changed |= putIfMissing(detail, "timezone", sanitizeTimezone(clientEnv.timezone()));
            changed |= putIfMissing(detail, "screenSize", trimToLength(clientEnv.screenSize(), 64));
            changed |= putIfMissing(detail, "viewportSize", trimToLength(clientEnv.viewportSize(), 64));
            changed |= putIfMissing(detail, "devicePixelRatio", sanitizeDevicePixelRatio(clientEnv.devicePixelRatio()));
            changed |= putIfMissing(detail, "webdriver", clientEnv.webdriver());
            changed |= putIfMissing(detail, "visibilityState", sanitizeVisibilityState(clientEnv.visibilityState()));
            changed |= putIfMissing(detail, "referrerClient", safeUrlLikeDetailValue(clientEnv.referrerClient(), 512));
            if (changed) {
                row.setDetailJson(OBJECT_MAPPER.writeValueAsString(detail));
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to merge client environment into detail_json: {}", e.getOriginalMessage());
        }
    }

    private static boolean putIfMissing(Map<String, Object> detail, String key, Object value) {
        if (detail == null || value == null) {
            return false;
        }
        Object existing = detail.get(key);
        if (existing != null) {
            return false;
        }
        detail.put(key, value);
        return true;
    }

    private static Integer valueOrNull(Integer value) {
        return value;
    }

    private static String resolveDetailValue(String value) {
        return StringUtils.hasText(value) ? value : null;
    }

    private String safeUrlLikeDetailValue(String value, int maxLen) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        int queryIdx = trimmed.indexOf('?');
        int fragmentIdx = trimmed.indexOf('#');
        int cutIdx = -1;
        if (queryIdx >= 0) {
            cutIdx = queryIdx;
        }
        if (fragmentIdx >= 0 && (cutIdx < 0 || fragmentIdx < cutIdx)) {
            cutIdx = fragmentIdx;
        }
        String safe = cutIdx >= 0 ? trimmed.substring(0, cutIdx) : trimmed;
        return trimToLength(safe, maxLen);
    }

    private void fillMissingVisitRowFields(AnalyticsPageView row, PageViewRequest request, User viewer) {
        if (row.getPost() == null && request != null && request.getPostId() != null) {
            Post post = postRepository.findById(request.getPostId()).orElse(null);
            if (post != null) {
                row.setPost(post);
            }
        }
        if (!StringUtils.hasText(row.getPageTitle())) {
            String title = request != null ? request.getPageTitle() : null;
            if (!StringUtils.hasText(title) && row.getPost() != null) {
                title = row.getPost().getTitle();
            }
            row.setPageTitle(normalizePageTitle(title));
        }
        if (row.getUser() == null && viewer != null) {
            row.setUser(viewer);
        }
        if (!StringUtils.hasText(row.getReferrerUrl())) {
            row.setReferrerUrl(resolveReferrerDisplayLabel(request));
        }
        if (!StringUtils.hasText(row.getGeoLocation())) {
            row.setGeoLocation(resolveGeoLocation(row.getViewerIp(), request != null ? request.getGeo() : null));
        }
        if (!StringUtils.hasText(row.getUserAgent()) && request != null) {
            // 文章详情 GET 通常带 User-Agent 头；request 本身不携带 UA，由 controller 透传，这里仅做兜底占位。
        }
    }


    @Transactional(readOnly = true)
    public AdminAnalyticsSummaryDto loadAdminSummary(int days, int topLimit, int recentLimit) {
        Integer safeRangeDays = days <= 0 ? null : Math.max(1, Math.min(days, 60));
        int safeTop = Math.max(1, Math.min(topLimit, 20));
        int safeRecent = Math.max(1, Math.min(recentLimit, 100));

        LocalDate today = LocalDate.now();
        final int trendDays = 14;
        LocalDate trendStartDate = today.minusDays(trendDays - 1L);
        LocalDateTime overviewStart = safeRangeDays != null ? today.minusDays(safeRangeDays - 1L).atStartOfDay() : null;

        Long aggregatedViews = postRepository.sumViewsByStatus("PUBLISHED");
        Long aggregatedComments = postRepository.sumCommentsByStatus("PUBLISHED");
        long totalViews = aggregatedViews != null ? aggregatedViews : 0L;
        long commentCount = aggregatedComments != null ? aggregatedComments : 0L;
        long commentEntries = commentRepository.count();
        long postCount = postRepository.countByStatus("PUBLISHED");

        LocalDateTime topPostStart = overviewStart != null
                ? overviewStart
                : LocalDate.of(1970, 1, 1).atStartOfDay();

        long periodViews = analyticsPageViewRepository.countViewsSince(overviewStart);
        long uniqueVisitors = analyticsPageViewRepository.countDistinctVisitorsSince(overviewStart);
        long loggedInViews = analyticsPageViewRepository.countLoggedInViewsSince(overviewStart);
        double avgViewsPerDay = safeRangeDays != null && safeRangeDays > 0
                ? (double) periodViews / safeRangeDays
                : 0d;

        List<AdminAnalyticsSummaryDto.TrendPoint> dailyTrends = buildTrendPoints(trendStartDate, trendDays);
        List<AdminAnalyticsSummaryDto.TopPost> topPosts = analyticsPageViewRepository
                .findTopPostsSince(topPostStart, PageRequest.of(0, safeTop))
                .stream()
                .map(tp -> AdminAnalyticsSummaryDto.TopPost.builder()
                        .postId(tp.getPostId())
                        .title(tp.getTitle() != null ? tp.getTitle() : "\u672a\u77e5\u6587\u7ae0")
                        .slug(tp.getSlug())
                        .views(tp.getViews() != null ? tp.getViews() : 0L)
                        .build())
                .toList();

        List<AdminAnalyticsSummaryDto.TrafficSource> trafficSources = loadTrafficSources()
                .stream()
                .map(ts -> AdminAnalyticsSummaryDto.TrafficSource.builder()
                        .label(ts.getSourceLabel())
                        .value(ts.getPercentage() != null ? ts.getPercentage().doubleValue() : ts.getVisits())
                        .build())
                .toList();

        List<AdminAnalyticsSummaryDto.RecentVisit> recentVisits = analyticsPageViewRepository
                .findAllByOrderByViewedAtDesc(PageRequest.of(0, safeRecent))
                .getContent()
                .stream()
                .map(this::toRecentVisit)
                .filter(Objects::nonNull)
                .toList();
        recentVisits = applyBanState(recentVisits);

        String rangeLabel = safeRangeDays != null
                ? (safeRangeDays == 1 ? "\u6700\u8fd11\u5929" : "\u6700\u8fd1" + safeRangeDays + "\u5929")
                : "\u5168\u90e8\u5386\u53f2";
        int rangeDaysValue = safeRangeDays != null ? safeRangeDays : 0;
        double normalizedAvgViews = Math.round(avgViewsPerDay * 10d) / 10d;

        AdminAnalyticsVisitorSourceInsightsDto visitorSourceInsights =
                buildVisitorSourceInsights(safeRangeDays, overviewStart, rangeDaysValue, rangeLabel, periodViews);

        return AdminAnalyticsSummaryDto.builder()
                .overview(AdminAnalyticsSummaryDto.Overview.builder()
                        .totalViews(totalViews)
                        .periodViews(periodViews)
                        .uniqueVisitors(uniqueVisitors)
                        .loggedInViews(loggedInViews)
                        .avgViewsPerDay(normalizedAvgViews)
                        .postCount(postCount)
                        .commentCount(commentCount)
                        .commentEntries(commentEntries)
                        .rangeDays(rangeDaysValue)
                        .rangeLabel(rangeLabel)
                        .build())
                .trafficSources(trafficSources)
                .dailyTrends(dailyTrends)
                .topPosts(topPosts)
                .recentVisits(recentVisits)
                .visitorSourceInsights(visitorSourceInsights)
                .build();
    }

    private AdminAnalyticsVisitorSourceInsightsDto buildVisitorSourceInsights(Integer safeRangeDays,
                                                                               LocalDateTime overviewStart,
                                                                               int rangeDaysValue, String rangeLabel, long periodViews) {
        return AnalyticsInsightsHelper.buildInsights(safeRangeDays, overviewStart, rangeDaysValue, rangeLabel,
                analyticsPageViewRepository, this::parseDetailJson, this::insightRowToView);
    }

    private AnalyticsPageView insightRowToView(AnalyticsPageViewRepository.InsightRow row) {
        AnalyticsPageView view = new AnalyticsPageView();
        if (row != null) {
            view.setId(row.getId());
            view.setVisitId(row.getVisitId());
            view.setPostId(row.getPostId());
            view.setViewerIp(row.getViewerIp());
            view.setUserAgent(row.getUserAgent());
            view.setGeoLocation(row.getGeoLocation());
            view.setPageTitle(row.getPageTitle());
            view.setHeartbeatCount(row.getHeartbeatCount());
            view.setTotalDurationSeconds(row.getTotalDurationSeconds());
            view.setActiveDurationSeconds(row.getActiveDurationSeconds());
            view.setVisitStatus(row.getVisitStatus());
            view.setDetailJson(row.getDetailJson());
        }
        return view;
    }

    @Transactional
    public long deletePageViewsByUser(Long userId) {
        if (userId == null) {
            return 0L;
        }
        List<String> knownIps = analyticsPageViewRepository.findDistinctViewerIpByUserId(userId);
        List<String> sanitizedIps = knownIps == null ? Collections.emptyList() : knownIps.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        long deleted = analyticsPageViewRepository.deleteByUser_Id(userId);
        if (!sanitizedIps.isEmpty()) {
            deleted += analyticsPageViewRepository.deleteByUserIsNullAndViewerIpIn(sanitizedIps);
        }
        // 部分环境/代理下，匿名访问可能被写入为 127.0.0.1（回环地址），不一定能被上面的“关联 IP”命中。
        // 这里额外清理 viewer_ip=127.0.0.1 的匿名记录，避免“清理我的访问日志”后仍残留本地回环日志。
        deleted += analyticsPageViewRepository.deleteByUserIsNullAndViewerIp("127.0.0.1");
        return deleted;
    }

    @Transactional
    public long deletePageViewById(Long id) {
        if (id == null || id <= 0) {
            return 0L;
        }
        boolean exists = analyticsPageViewRepository.existsById(id);
        if (!exists) {
            return 0L;
        }
        analyticsPageViewRepository.deleteById(id);
        return 1L;
    }

    @Transactional
    public long deletePageViews(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0L;
        }
        List<Long> normalizedIds = ids.stream()
                .filter(Objects::nonNull)
                .map(Math::abs)
                .filter(value -> value > 0)
                .distinct()
                .toList();
        if (normalizedIds.isEmpty()) {
            return 0L;
        }
        long affected = analyticsPageViewRepository.countByIdIn(normalizedIds);
        if (affected > 0) {
            analyticsPageViewRepository.deleteAllByIdInBatch(normalizedIds);
        }
        return affected;
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsPageViewDetailDto loadPageViewDetail(Long id) {
        AnalyticsPageView view = analyticsPageViewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("访问日志记录不存在"));
        return toDetailDto(view);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminAnalyticsSummaryDto.RecentVisit> loadPageViews(int page, int size) {
        return loadPageViews(page, size, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminAnalyticsSummaryDto.RecentVisit> loadPageViews(int page, int size, AdminPageViewQuery query) {
        int p = Math.max(page, 1) - 1;
        int s = Math.min(Math.max(size, 1), 200);
        Specification<AnalyticsPageView> spec = buildAdminPageViewSpec(query);
        Sort sort = Sort.by(Sort.Direction.DESC, "viewedAt");
        if (hasComputedFilters(query)) {
            List<AnalyticsPageView> filtered = analyticsPageViewRepository.findAll(spec, sort)
                    .stream()
                    .filter(view -> matchesComputedFilters(query, view))
                    .toList();
            int from = Math.min(p * s, filtered.size());
            int to = Math.min(from + s, filtered.size());
            List<AdminAnalyticsSummaryDto.RecentVisit> records = filtered.subList(from, to).stream()
                    .map(this::toRecentVisit)
                    .filter(Objects::nonNull)
                    .toList();
            records = applyBanState(records);
            return new PageResponse<>(records, filtered.size(), p + 1, s);
        }
        Page<AnalyticsPageView> result = analyticsPageViewRepository.findAll(spec,
                PageRequest.of(p, s, sort));
        List<AdminAnalyticsSummaryDto.RecentVisit> records = result.getContent().stream()
                .map(this::toRecentVisit)
                .filter(Objects::nonNull)
                .toList();
        records = applyBanState(records);
        return new PageResponse<>(records, result.getTotalElements(), result.getNumber() + 1, result.getSize());
    }

    private boolean hasComputedFilters(AdminPageViewQuery query) {
        if (query == null) return false;
        return StringUtils.hasText(query.visitQuality())
                || StringUtils.hasText(query.riskReason())
                || StringUtils.hasText(query.sourceType())
                || StringUtils.hasText(query.referrerDomain())
                || StringUtils.hasText(query.entryType())
                || StringUtils.hasText(query.asn())
                || StringUtils.hasText(query.isp());
    }

    private boolean matchesComputedFilters(AdminPageViewQuery query, AnalyticsPageView view) {
        if (query == null || view == null) return true;
        AdminAnalyticsPageViewDetailFieldsDto detail = parseDetailJson(view.getDetailJson());
        AnalyticsVisitQualityClassifier.ClassificationResult classification =
                AnalyticsVisitQualityClassifier.classify(view, detail);

        if (StringUtils.hasText(query.visitQuality())
                && !query.visitQuality().trim().equalsIgnoreCase(classification.visitQuality().name())) {
            return false;
        }
        if (StringUtils.hasText(query.riskReason())
                && classification.riskReasonStrings().stream()
                .noneMatch(reason -> query.riskReason().trim().equalsIgnoreCase(reason))) {
            return false;
        }
        if (StringUtils.hasText(query.sourceType())) {
            ReferrerUtils.SourceType sourceType = resolvePageViewSourceType(view, detail);
            if (!query.sourceType().trim().equalsIgnoreCase(sourceType.name())) {
                return false;
            }
        }
        if (StringUtils.hasText(query.referrerDomain())) {
            String domain = resolvePageViewReferrerDomain(view, detail);
            if (!StringUtils.hasText(domain)
                    || !domain.toLowerCase(Locale.ROOT).contains(query.referrerDomain().trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (StringUtils.hasText(query.entryType())) {
            String entryType = resolvePageViewEntryType(view, detail);
            if (!StringUtils.hasText(entryType) || !query.entryType().trim().equalsIgnoreCase(entryType)) {
                return false;
            }
        }
        if (StringUtils.hasText(query.asn())
                && !containsIgnoreCase(detail.getAsn(), query.asn())) {
            return false;
        }
        if (StringUtils.hasText(query.isp())
                && !containsIgnoreCase(detail.getIsp(), query.isp())) {
            return false;
        }
        return true;
    }

    private ReferrerUtils.SourceType resolvePageViewSourceType(AnalyticsPageView view, AdminAnalyticsPageViewDetailFieldsDto detail) {
        ReferrerUtils.SourceType labelType = AnalyticsInsightsHelper.classifyDisplayReferrer(view.getReferrerUrl());
        if (labelType == ReferrerUtils.SourceType.INTERNAL
                || labelType == ReferrerUtils.SourceType.REDIRECT
                || labelType == ReferrerUtils.SourceType.DIRECT) {
            return labelType;
        }
        return ReferrerUtils.classifySourceType(AnalyticsInsightsHelper.firstText(
                detail.getRefererRaw(),
                detail.getReferrerClient(),
                view.getReferrerUrl()
        ), null);
    }

    private String resolvePageViewReferrerDomain(AnalyticsPageView view, AdminAnalyticsPageViewDetailFieldsDto detail) {
        return ReferrerUtils.extractReferrerDomain(AnalyticsInsightsHelper.firstText(
                detail.getRefererRaw(),
                detail.getReferrerClient(),
                view.getReferrerUrl()
        ));
    }

    private String resolvePageViewEntryType(AnalyticsPageView view, AdminAnalyticsPageViewDetailFieldsDto detail) {
        if (view.getPost() != null || view.getPostId() != null) {
            return "ARTICLE";
        }
        return AnalyticsInsightsHelper.classifyEntryType(AnalyticsInsightsHelper.firstText(
                detail.getEntryPage(),
                detail.getRequestUri(),
                view.getPageTitle()
        ));
    }

    private static boolean containsIgnoreCase(String value, String expected) {
        if (!StringUtils.hasText(expected)) {
            return true;
        }
        if (!StringUtils.hasText(value)) {
            return false;
        }
        return value.toLowerCase(Locale.ROOT).contains(expected.trim().toLowerCase(Locale.ROOT));
    }

    private Specification<AnalyticsPageView> buildAdminPageViewSpec(AdminPageViewQuery query) {
        if (query == null) {
            return null;
        }
        return (root, cq, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            jakarta.persistence.criteria.Join<Object, Object> postJoin = null;

            // 访问日志“文章”列的真实展示值：优先 post.title，否则使用 page_title。
            // 为避免不同数据库/方言对 TRIM 的兼容差异导致误筛选，这里使用更稳妥的“分别对 post.title/page_title 做等值判断”的方式。
            postJoin = root.join("post", jakarta.persistence.criteria.JoinType.LEFT);
            jakarta.persistence.criteria.Expression<String> postTitleLower =
                    cb.lower(cb.coalesce(postJoin.get("title"), ""));
            jakarta.persistence.criteria.Expression<String> pageTitleLower =
                    cb.lower(cb.coalesce(root.get("pageTitle"), ""));
            jakarta.persistence.criteria.Predicate isRobotTitle = cb.or(
                    postTitleLower.in("sitemap.xml", "robots.txt"),
                    pageTitleLower.in("sitemap.xml", "robots.txt")
            );
            // 文章访问：正常情况下以 analytics_page_views.post_id 是否为空为准。
            // 兼容性兜底：部分环境可能出现“只 join 能判定 post 存在，但 postId 判定异常”的情况；
            // 这里用 (postId != null) OR (join 后 post.id != null) 双口径，避免“文章访问筛选取反”。
            jakarta.persistence.criteria.Predicate isArticle = cb.or(
                    cb.isNotNull(root.get("postId")),
                    cb.isNotNull(postJoin.get("id"))
            );
            jakarta.persistence.criteria.Predicate isRobotPage = isRobotTitle;
            jakarta.persistence.criteria.Predicate isNormalPage = cb.and(cb.not(isArticle), cb.not(isRobotTitle));

            String ip = StringUtils.hasText(query.viewerIp()) ? query.viewerIp().trim() : null;
            if (StringUtils.hasText(ip)) {
                predicates.add(cb.equal(root.get("viewerIp"), ip));
            }

            if (query.postId() != null && query.postId() > 0) {
                predicates.add(cb.equal(root.get("postId"), query.postId()));
            }

            if (query.loggedIn() != null) {
                predicates.add(Boolean.TRUE.equals(query.loggedIn())
                        ? cb.isNotNull(root.get("user"))
                        : cb.isNull(root.get("user")));
            }

            if (query.startAt() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("viewedAt"), query.startAt()));
            }
            if (query.endAtExclusive() != null) {
                predicates.add(cb.lessThan(root.get("viewedAt"), query.endAtExclusive()));
            }

            String pageType = StringUtils.hasText(query.pageType()) ? query.pageType().trim().toUpperCase(Locale.ROOT) : null;
            if (StringUtils.hasText(pageType)) {
                switch (pageType) {
                    case "ARTICLE" -> predicates.add(isArticle);
                    case "SYSTEM", "BOT", "ROBOT" -> predicates.add(isRobotPage);
                    case "PAGE" -> predicates.add(isNormalPage);
                    default -> {
                    }
                }
            }

            if (Boolean.TRUE.equals(query.excludeSystemPages())) {
                predicates.add(cb.not(isRobotTitle));
            }

            addScalarLikePredicate(predicates, cb, root, "userAgent", query.userAgentKeyword());
            addScalarLikePredicate(predicates, cb, root, "geoLocation", query.geo());
            String keyword = StringUtils.hasText(query.keyword()) ? query.keyword().trim().toLowerCase(Locale.ROOT) : null;
            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword + "%";
                if (postJoin == null) {
                    postJoin = root.join("post", jakarta.persistence.criteria.JoinType.LEFT);
                }

                jakarta.persistence.criteria.Expression<String> pageTitle = cb.lower(cb.coalesce(root.get("pageTitle"), ""));
                jakarta.persistence.criteria.Expression<String> referrerUrl = cb.lower(cb.coalesce(root.get("referrerUrl"), ""));
                jakarta.persistence.criteria.Expression<String> geo = cb.lower(cb.coalesce(root.get("geoLocation"), ""));
                jakarta.persistence.criteria.Expression<String> postTitle = cb.lower(cb.coalesce(postJoin.get("title"), ""));
                jakarta.persistence.criteria.Expression<String> postSlug = cb.lower(cb.coalesce(postJoin.get("slug"), ""));

                predicates.add(cb.or(
                        cb.like(pageTitle, like),
                        cb.like(referrerUrl, like),
                        cb.like(geo, like),
                        cb.like(postTitle, like),
                        cb.like(postSlug, like)
                ));
            }

            return predicates.isEmpty()
                    ? cb.conjunction()
                    : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    public record AdminPageViewQuery(
            String viewerIp,
            String keyword,
            Boolean loggedIn,
            Long postId,
            LocalDateTime startAt,
            LocalDateTime endAtExclusive,
            Boolean excludeSystemPages,
            String pageType,
            String visitQuality,
            String riskReason,
            String sourceType,
            String referrerDomain,
            String entryType,
            String userAgentKeyword,
            String geo,
            String asn,
            String isp
    ) {
    }

    private static void addScalarLikePredicate(List<jakarta.persistence.criteria.Predicate> predicates,
                                                jakarta.persistence.criteria.CriteriaBuilder cb,
                                                jakarta.persistence.criteria.Root<AnalyticsPageView> root,
                                                String column, String value) {
        if (StringUtils.hasText(value)) {
            predicates.add(cb.like(cb.lower(root.get(column)), "%" + value.trim().toLowerCase(Locale.ROOT) + "%"));
        }
    }

    // ===== 文章浏览时长 visit lifecycle =====

    @Transactional
    public void recordArticleVisitStart(ArticleVisitStartRequest request, String ip, String userAgent, Long userId) {
        recordArticleVisitStart(request, ip, userAgent, userId, null, null);
    }

    @Transactional
    public void recordArticleVisitStart(ArticleVisitStartRequest request, String ip, String userAgent, Long userId, AnalyticsRequestDetailContext detailContext) {
        recordArticleVisitStart(request, ip, userAgent, userId, detailContext, extractClientEnvFromVisitStart(request));
    }

    @Transactional
    public void recordArticleVisitStart(ArticleVisitStartRequest request, String ip, String userAgent, Long userId, AnalyticsRequestDetailContext detailContext, AnalyticsClientEnvironment clientEnv) {
        if (request == null || !StringUtils.hasText(request.getVisitId())) {
            return;
        }
        Long articleId = request.getArticleId();
        if (articleId == null || articleId <= 0) {
            return;
        }
        String visitId = normalizeVisitId(request.getVisitId());
        if (!StringUtils.hasText(visitId)) {
            return;
        }
        String normalizedIp = normalizeViewerIp(ip);

        AnalyticsPageView existing = analyticsPageViewRepository.findByVisitId(visitId).orElse(null);
        if (existing != null) {
            // 幂等补齐：不新增第二行，也不覆盖已有有效字段。
            if (existing.getPost() == null) {
                Post post = postRepository.findById(articleId).orElse(null);
                if (post != null) {
                    existing.setPost(post);
                }
            }
            if (!StringUtils.hasText(existing.getPageTitle())) {
                existing.setPageTitle(normalizePageTitle(resolveStartTitle(request, existing.getPost())));
            }
            if (existing.getUser() == null && userId != null) {
                userRepository.findById(userId).ifPresent(existing::setUser);
            }
            if (!StringUtils.hasText(existing.getReferrerUrl())) {
                existing.setReferrerUrl(trimToLength(decodePercentEncodedValue(request.getReferrer()), 512));
            }
            if (existing.getEnterTime() == null) {
                existing.setEnterTime(LocalDateTime.now());
            }
            if (!StringUtils.hasText(existing.getVisitStatus())) {
                existing.setVisitStatus(VISIT_STATUS_OPEN);
            }
            setDetailJsonIfMissing(existing, normalizedIp, userAgent, visitId, detailContext, clientEnv);
            analyticsPageViewRepository.save(existing);
            return;
        }

        User viewer = null;
        if (userId != null) {
            viewer = userRepository.findById(userId).orElse(null);
        }
        Post post = postRepository.findById(articleId).orElse(null);

        AnalyticsPageView pv = new AnalyticsPageView();
        pv.setVisitId(visitId);
        pv.setPost(post);
        pv.setPageTitle(normalizePageTitle(resolveStartTitle(request, post)));
        pv.setViewerIp(normalizedIp);
        pv.setUser(viewer);
        pv.setReferrerUrl(trimToLength(decodePercentEncodedValue(request.getReferrer()), 512));
        pv.setGeoLocation(resolveGeoLocation(normalizedIp, null));
        pv.setUserAgent(trimToLength(userAgent, 512));
        LocalDateTime now = LocalDateTime.now();
        pv.setViewedAt(now);
        pv.setEnterTime(now);
        pv.setVisitStatus(VISIT_STATUS_OPEN);
        pv.setHeartbeatCount(0);
        pv.setDetailJson(buildDetailJson(normalizedIp, userAgent, visitId, detailContext, clientEnv));
        analyticsPageViewRepository.save(pv);
    }

    @Transactional
    public void recordArticleVisitHeartbeat(ArticleVisitHeartbeatRequest request) {
        if (request == null || !StringUtils.hasText(request.getVisitId())) {
            return;
        }
        String visitId = normalizeVisitId(request.getVisitId());
        if (!StringUtils.hasText(visitId)) {
            return;
        }
        AnalyticsPageView row = analyticsPageViewRepository.findByVisitId(visitId).orElse(null);
        if (row == null) {
            return;
        }
        int sanitized = sanitizeDurationSeconds(request.getActiveDurationSeconds());
        Integer currentActive = row.getActiveDurationSeconds();
        if (currentActive == null || sanitized > currentActive) {
            row.setActiveDurationSeconds(sanitized);
        }
        row.setLastActiveTime(LocalDateTime.now());
        int nextCount = (row.getHeartbeatCount() == null ? 0 : row.getHeartbeatCount()) + 1;
        row.setHeartbeatCount(nextCount);
        analyticsPageViewRepository.save(row);
    }

    @Transactional
    public void recordArticleVisitEnd(ArticleVisitEndRequest request) {
        if (request == null || !StringUtils.hasText(request.getVisitId())) {
            return;
        }
        String visitId = normalizeVisitId(request.getVisitId());
        if (!StringUtils.hasText(visitId)) {
            return;
        }
        AnalyticsPageView row = analyticsPageViewRepository.findByVisitId(visitId).orElse(null);
        if (row == null) {
            return;
        }
        int sanitizedTotal = sanitizeDurationSeconds(request.getTotalDurationSeconds());
        int sanitizedActive = sanitizeDurationSeconds(request.getActiveDurationSeconds());
        // active 不得超过 total
        if (sanitizedActive > sanitizedTotal) {
            sanitizedActive = sanitizedTotal;
        }
        Integer currentTotal = row.getTotalDurationSeconds();
        if (currentTotal == null || sanitizedTotal > currentTotal) {
            row.setTotalDurationSeconds(sanitizedTotal);
        }
        Integer currentActive = row.getActiveDurationSeconds();
        // 重复 end 不叠加：取较大合法绝对值
        int activeCandidate = Math.min(sanitizedActive, row.getTotalDurationSeconds() == null
                ? sanitizedActive : row.getTotalDurationSeconds());
        if (currentActive == null || activeCandidate > currentActive) {
            row.setActiveDurationSeconds(activeCandidate);
        }
        if (row.getLeaveTime() == null) {
            row.setLeaveTime(LocalDateTime.now());
        }
        row.setVisitStatus(VISIT_STATUS_CLOSED);
        analyticsPageViewRepository.save(row);
    }

    private AnalyticsClientEnvironment extractClientEnvFromPageView(PageViewRequest request) {
        if (request == null) return null;
        return new AnalyticsClientEnvironment(
                request.getTimezone(), request.getScreenSize(), request.getViewportSize(),
                request.getDevicePixelRatio(), request.getWebdriver(), request.getVisibilityState(),
                request.getReferrerClient()
        );
    }

    private AnalyticsClientEnvironment extractClientEnvFromVisitStart(ArticleVisitStartRequest request) {
        if (request == null) return null;
        return new AnalyticsClientEnvironment(
                request.getTimezone(), request.getScreenSize(), request.getViewportSize(),
                request.getDevicePixelRatio(), request.getWebdriver(), request.getVisibilityState(),
                request.getReferrerClient()
        );
    }

    int sanitizeDurationSeconds(Integer seconds) {
        if (seconds == null) {
            return 0;
        }
        int value = seconds;
        if (value < 0) {
            return 0;
        }
        return Math.min(value, MAX_VISIT_DURATION_SECONDS);
    }

    Integer resolveDisplayDurationSeconds(AnalyticsPageView view) {
        if (view == null) {
            return null;
        }
        Integer active = view.getActiveDurationSeconds();
        if (active != null && active >= 0) {
            return active;
        }
        Integer total = view.getTotalDurationSeconds();
        if (total != null && total >= 0) {
            return total;
        }
        if (view.getLastActiveTime() != null && view.getEnterTime() != null) {
            long seconds = java.time.Duration.between(view.getEnterTime(), view.getLastActiveTime()).getSeconds();
            if (seconds < 0) {
                return 0;
            }
            if (seconds > MAX_VISIT_DURATION_SECONDS) {
                return MAX_VISIT_DURATION_SECONDS;
            }
            return (int) seconds;
        }
        return null;
    }

    private String resolveStartTitle(ArticleVisitStartRequest request, Post post) {
        if (request != null && StringUtils.hasText(request.getTitle())) {
            return request.getTitle();
        }
        if (post != null) {
            return post.getTitle();
        }
        return "页面";
    }

    private List<AdminAnalyticsSummaryDto.RecentVisit> applyBanState(List<AdminAnalyticsSummaryDto.RecentVisit> visits) {
        if (visits == null || visits.isEmpty()) {
            return visits;
        }
        List<String> ips = visits.stream()
                .map(AdminAnalyticsSummaryDto.RecentVisit::getIp)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        if (ips.isEmpty()) {
            return visits;
        }
        Map<String, Long> banIds;
        try {
            banIds = ipBanService.resolveEnabledBanIds(ips);
        } catch (RuntimeException ex) {
            log.warn("analytics ban state batch resolve failed, fallback to not-banned: count={}", ips.size(), ex);
            return visits;
        }
        if (banIds == null || banIds.isEmpty()) {
            return visits;
        }
        for (AdminAnalyticsSummaryDto.RecentVisit visit : visits) {
            String ip = visit.getIp();
            Long banId = StringUtils.hasText(ip) ? banIds.get(IpUtils.normalizeIp(ip)) : null;
            visit.setIpBanned(banId != null);
            visit.setIpBanId(banId);
        }
        return visits;
    }

    private AdminAnalyticsSummaryDto.RecentVisit toRecentVisit(AnalyticsPageView view) {
        if (view == null) {
            return null;
        }
        Integer total = view.getTotalDurationSeconds();
        Integer active = view.getActiveDurationSeconds();
        Integer display = resolveDisplayDurationSeconds(view);
        return AdminAnalyticsSummaryDto.RecentVisit.builder()
                .id(view.getId())
                .title(view.getPost() != null ? view.getPost().getTitle() : view.getPageTitle())
                .postId(view.getPost() != null ? view.getPost().getId() : null)
                .slug(view.getPost() != null ? view.getPost().getSlug() : null)
                .ip(view.getViewerIp())
                .time(view.getViewedAt() != null ? DATE_TIME_FMT.format(view.getViewedAt()) : "")
                .referrer(view.getReferrerUrl())
                .geo(view.getGeoLocation())
                .loggedIn(view.getUser() != null)
                .userId(view.getUser() != null ? view.getUser().getId() : null)
                .username(view.getUser() != null ? view.getUser().getUsername() : null)
                .userName(view.getUser() != null ? view.getUser().getDisplayName() : null)
                .displayName(view.getUser() != null ? view.getUser().getDisplayName() : null)
                .userRole(view.getUser() != null && view.getUser().getRole() != null
                        ? view.getUser().getRole().getCode()
                        : null)
                .userAgent(view.getUserAgent())
                .avatarUrl(view.getUser() != null ? view.getUser().getAvatarUrl() : null)
                .visitId(view.getVisitId())
                .enterTime(view.getEnterTime() != null ? DATE_TIME_FMT.format(view.getEnterTime()) : null)
                .leaveTime(view.getLeaveTime() != null ? DATE_TIME_FMT.format(view.getLeaveTime()) : null)
                .lastActiveTime(view.getLastActiveTime() != null ? DATE_TIME_FMT.format(view.getLastActiveTime()) : null)
                .totalDurationSeconds(total)
                .activeDurationSeconds(active)
                .durationSeconds(display)
                .heartbeatCount(view.getHeartbeatCount())
                .visitStatus(view.getVisitStatus())
                .build();
    }

    private AdminAnalyticsPageViewDetailDto toDetailDto(AnalyticsPageView view) {
        if (view == null) {
            return null;
        }
        Integer display = resolveDisplayDurationSeconds(view);
        AdminAnalyticsPageViewDetailFieldsDto detailFields = parseDetailJson(view.getDetailJson());

        AnalyticsVisitQualityClassifier.ClassificationResult classification =
                AnalyticsVisitQualityClassifier.classify(view, detailFields);

        return AdminAnalyticsPageViewDetailDto.builder()
                .id(view.getId())
                .title(view.getPost() != null ? view.getPost().getTitle() : view.getPageTitle())
                .postId(view.getPost() != null ? view.getPost().getId() : null)
                .slug(view.getPost() != null ? view.getPost().getSlug() : null)
                .time(view.getViewedAt() != null ? DATE_TIME_FMT.format(view.getViewedAt()) : "")
                .referrer(view.getReferrerUrl())
                .geo(view.getGeoLocation())
                .loggedIn(view.getUser() != null)
                .userId(view.getUser() != null ? view.getUser().getId() : null)
                .username(view.getUser() != null ? view.getUser().getUsername() : null)
                .displayName(view.getUser() != null ? view.getUser().getDisplayName() : null)
                .userAgent(view.getUserAgent())
                .avatarUrl(view.getUser() != null ? view.getUser().getAvatarUrl() : null)
                .visitId(view.getVisitId())
                .enterTime(view.getEnterTime() != null ? DATE_TIME_FMT.format(view.getEnterTime()) : null)
                .leaveTime(view.getLeaveTime() != null ? DATE_TIME_FMT.format(view.getLeaveTime()) : null)
                .lastActiveTime(view.getLastActiveTime() != null ? DATE_TIME_FMT.format(view.getLastActiveTime()) : null)
                .totalDurationSeconds(view.getTotalDurationSeconds())
                .activeDurationSeconds(view.getActiveDurationSeconds())
                .durationSeconds(display)
                .heartbeatCount(view.getHeartbeatCount())
                .visitStatus(view.getVisitStatus())
                .visitQuality(classification.visitQuality().name())
                .riskLevel(classification.riskLevel().name())
                .riskReasons(classification.riskReasonStrings())
                .proxySuspected(classification.proxySuspected())
                .botSuspected(classification.botSuspected())
                .referrerSpoofingSuspected(classification.referrerSpoofingSuspected())
                .riskExplanation(classification.riskExplanation())
                .detail(detailFields)
                .build();
    }

    AdminAnalyticsPageViewDetailFieldsDto parseDetailJson(String detailJson) {
        if (!StringUtils.hasText(detailJson)) {
            return AdminAnalyticsPageViewDetailFieldsDto.builder().build();
        }
        try {
            Map<String, Object> raw = OBJECT_MAPPER.readValue(detailJson, new TypeReference<Map<String, Object>>() {});
            return AdminAnalyticsPageViewDetailFieldsDto.builder()
                    .userAgent(stringOrNull(raw, "userAgent"))
                    .refererRaw(stringOrNull(raw, "refererRaw"))
                    .method(stringOrNull(raw, "method"))
                    .requestUri(stringOrNull(raw, "requestUri"))
                    .status(intOrNull(raw, "status"))
                    .durationMs(longOrNull(raw, "durationMs"))
                    .ip(stringOrNull(raw, "ip"))
                    .xForwardedFor(stringOrNull(raw, "xForwardedFor"))
                    .xRealIp(stringOrNull(raw, "xRealIp"))
                    .acceptLanguage(stringOrNull(raw, "acceptLanguage"))
                    .visitorId(stringOrNull(raw, "visitorId"))
                    .sessionId(stringOrNull(raw, "sessionId"))
                    .entryPage(stringOrNull(raw, "entryPage"))
                    .fromPage(stringOrNull(raw, "fromPage"))
                    .isFirstVisit(boolOrNull(raw, "isFirstVisit"))
                    .botDetected(boolOrNull(raw, "botDetected"))
                    .botName(stringOrNull(raw, "botName"))
                    .deviceType(stringOrNull(raw, "deviceType"))
                    .browser(stringOrNull(raw, "browser"))
                    .os(stringOrNull(raw, "os"))
                    .asn(stringOrNull(raw, "asn"))
                    .isp(stringOrNull(raw, "isp"))
                    .ipType(stringOrNull(raw, "ipType"))
                    .timezone(stringOrNull(raw, "timezone"))
                    .screenSize(stringOrNull(raw, "screenSize"))
                    .viewportSize(stringOrNull(raw, "viewportSize"))
                    .devicePixelRatio(doubleOrNull(raw, "devicePixelRatio"))
                    .webdriver(boolOrNull(raw, "webdriver"))
                    .visibilityState(stringOrNull(raw, "visibilityState"))
                    .referrerClient(stringOrNull(raw, "referrerClient"))
                    .build();
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse detail_json, returning empty detail: {}", e.getOriginalMessage());
            return AdminAnalyticsPageViewDetailFieldsDto.builder().build();
        }
    }

    private String stringOrNull(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    private Integer intOrNull(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number n) return n.intValue();
        return null;
    }

    private Long longOrNull(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number n) return n.longValue();
        return null;
    }

    private Boolean boolOrNull(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Boolean b) return b;
        return null;
    }

    private Double doubleOrNull(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number n) return n.doubleValue();
        return null;
    }

    private List<AdminAnalyticsSummaryDto.TrendPoint> buildTrendPoints(LocalDate startDate, int safeDays) {
        List<AnalyticsPageViewRepository.DailyViewAggregation> aggregations =
                analyticsPageViewRepository.aggregateDailyViews(startDate.atStartOfDay());
        Map<LocalDate, AnalyticsPageViewRepository.DailyViewAggregation> dailyMap = new HashMap<>();
        for (AnalyticsPageViewRepository.DailyViewAggregation aggregation : aggregations) {
            if (aggregation.getStatDate() != null) {
                dailyMap.put(aggregation.getStatDate().toLocalDate(), aggregation);
            }
        }
        List<AdminAnalyticsSummaryDto.TrendPoint> result = new ArrayList<>();
        for (int i = 0; i < safeDays; i++) {
            LocalDate day = startDate.plusDays(i);
            AnalyticsPageViewRepository.DailyViewAggregation row = dailyMap.get(day);
            long views = row != null && row.getViews() != null ? row.getViews() : 0L;
            long visitors = row != null && row.getVisitors() != null ? row.getVisitors() : 0L;
            result.add(AdminAnalyticsSummaryDto.TrendPoint.builder()
                    .date(day.toString())
                    .views(views)
                    .visitors(visitors)
                    .build());
        }
        return result;
    }

    private List<AnalyticsTrafficSource> loadTrafficSources() {
        List<AnalyticsTrafficSource> todaySources =
                analyticsTrafficSourceRepository.findByStatDateOrderByVisitsDesc(LocalDate.now());
        if (!todaySources.isEmpty()) {
            return todaySources;
        }
        List<AnalyticsTrafficSource> allSources = analyticsTrafficSourceRepository
                .findAll(Sort.by(Sort.Direction.DESC, "statDate", "visits"));
        if (allSources.isEmpty()) {
            return List.of();
        }
        LocalDate latestDate = allSources.stream()
                .map(AnalyticsTrafficSource::getStatDate)
                .filter(d -> d != null)
                .findFirst()
                .orElse(null);
        if (latestDate == null) {
            return List.of();
        }
        return allSources.stream()
                .filter(ts -> latestDate.equals(ts.getStatDate()))
                .collect(Collectors.toList());
    }

    private void updateTrafficSourceStat(PageViewRequest request, LocalDateTime viewedAt) {
        LocalDate statDate = viewedAt != null ? viewedAt.toLocalDate() : LocalDate.now();
        String label = determineTrafficSourceLabel(request);
        try {
            analyticsTrafficSourceRepository.upsertSourceVisit(statDate, label);
            recalculateTrafficSourcePercentages(statDate);
        } catch (DataIntegrityViolationException ex) {
            log.warn("流量来源统计写入失败（已忽略本次来源记录）date={}, label={}", statDate, label, ex);
        }
    }

    private void recalculateTrafficSourcePercentages(LocalDate statDate) {
        List<AnalyticsTrafficSource> sources =
                analyticsTrafficSourceRepository.findByStatDateOrderByVisitsDesc(statDate);
        long totalVisits = sources.stream()
                .mapToLong(ts -> ts.getVisits() == null ? 0L : ts.getVisits())
                .sum();
        if (totalVisits <= 0) {
            sources.forEach(ts -> ts.setPercentage(BigDecimal.ZERO));
        } else {
            sources.forEach(ts -> {
                long visits = ts.getVisits() == null ? 0L : ts.getVisits();
                BigDecimal percent = BigDecimal.valueOf(visits * 100.0 / totalVisits)
                        .setScale(2, RoundingMode.HALF_UP);
                ts.setPercentage(percent);
            });
        }
        analyticsTrafficSourceRepository.saveAll(sources);
    }

    private String determineTrafficSourceLabel(PageViewRequest request) {
        String preferredLabel = request != null ? request.getSourceLabel() : null;
        String referrer = request != null ? request.getReferrer() : null;

        // 搜索引擎统一聚合到引擎名（避免“谷歌：关键词”导致统计维度爆炸）
        ReferrerUtils.ParsedReferrer parsed = ReferrerUtils.parse(referrer);
        if (parsed.engine() != null) {
            return trimToLength(parsed.engine().zhName(), 255);
        }

        if (StringUtils.hasText(preferredLabel)) {
            return trimToLength(preferredLabel, 255);
        }
        return trimToLength(ReferrerUtils.buildTrafficSourceKey(referrer), 255);
    }

    private String resolveReferrerDisplayLabel(PageViewRequest request) {
        String preferredLabel = request != null ? request.getSourceLabel() : null;
        String referrer = request != null ? request.getReferrer() : null;

        // 若 referrer 是搜索引擎且带关键词，优先展示“谷歌：xxx”
        ReferrerUtils.ParsedReferrer parsed = ReferrerUtils.parse(referrer);
        if (parsed.engine() != null && StringUtils.hasText(parsed.keyword())) {
            return trimToLength(parsed.engine().zhName() + "：" + parsed.keyword(), 512);
        }

        // 站内跳转来源（SPA）优先使用前端上报的中文描述
        if (StringUtils.hasText(preferredLabel)) {
            return trimToLength(preferredLabel, 512);
        }

        return trimToLength(ReferrerUtils.buildDisplayLabel(referrer), 512);
    }

    private String resolveGeoLocation(String normalizedIp, String requestGeo) {
        String geo = null;
        try {
            geo = geoIpService.lookup(normalizedIp);
        } catch (Exception ex) {
            log.debug("Geo lookup failed for ip {}", normalizedIp, ex);
        }
        if (!StringUtils.hasText(geo) && StringUtils.hasText(requestGeo) && !isTimezoneString(requestGeo)) {
            geo = trimToLength(requestGeo, 128);
        }
        if (!StringUtils.hasText(geo)) {
            geo = "未知";
        }
        return trimToLength(geo, 128);
    }

    private boolean isTimezoneString(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String trimmed = value.trim();
        if ("UTC".equalsIgnoreCase(trimmed)) {
            return true;
        }
        if (trimmed.startsWith("Etc/")) {
            return true;
        }
        return trimmed.contains("/") && java.time.ZoneId.getAvailableZoneIds().contains(trimmed);
    }

    private String normalizePageTitle(String title) {
        if (title == null || title.isBlank()) {
            return "页面";
        }
        return title.length() > 255 ? title.substring(0, 255) : title;
    }

    private String normalizeViewerIp(String rawIp) {
        if (!StringUtils.hasText(rawIp)) {
            return "0.0.0.0";
        }
        String ip = rawIp.trim();
        return ip.length() > 45 ? ip.substring(0, 45) : ip;
    }

    private String normalizeVisitId(String rawVisitId) {
        if (!StringUtils.hasText(rawVisitId)) {
            return null;
        }
        String value = rawVisitId.trim();
        return value.length() > 64 ? value.substring(0, 64) : value;
    }

    private static String trimToLength(String value, int maxLen) {
        if (value == null) return null;
        if (value.length() <= maxLen) return value;
        return value.substring(0, maxLen);
    }

    private boolean shouldSkipForSuperAdmin(PageViewRequest request) {
        if (request == null) {
            return false;
        }
        String title = request.getPageTitle();
        String referrer = request.getReferrer();
        boolean adminTitle = title != null && title.toLowerCase(Locale.ROOT).contains("admin");
        boolean adminReferrer = referrer != null && referrer.toLowerCase(Locale.ROOT).contains("/admin");
        return adminTitle || adminReferrer;
    }
}
