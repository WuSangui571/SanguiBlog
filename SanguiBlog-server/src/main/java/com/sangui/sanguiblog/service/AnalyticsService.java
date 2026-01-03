package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
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
import com.sangui.sanguiblog.util.ReferrerUtils;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final AnalyticsTrafficSourceRepository analyticsTrafficSourceRepository;
    private final GeoIpService geoIpService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPageView(PageViewRequest request, String ip, String userAgent, Long userId) {
        User viewer = null;
        if (userId != null) {
            viewer = userRepository.findById(userId).orElse(null);
            if (viewer != null && viewer.getRole() != null
                    && "SUPER_ADMIN".equalsIgnoreCase(viewer.getRole().getCode())
                    && shouldSkipForSuperAdmin(request)) {
                return;
            }
        }

        AnalyticsPageView pv = new AnalyticsPageView();
        if (request.getPostId() != null) {
            Post post = postRepository.findById(request.getPostId()).orElse(null);
            pv.setPost(post);
            if (post != null && (request.getPageTitle() == null || request.getPageTitle().isBlank())) {
                request.setPageTitle(post.getTitle());
            }
        }

        pv.setUser(viewer);
        pv.setPageTitle(normalizePageTitle(request.getPageTitle()));
        String normalizedIp = normalizeViewerIp(ip);
        pv.setViewerIp(normalizedIp);
        pv.setReferrerUrl(resolveReferrerDisplayLabel(request));
        pv.setGeoLocation(resolveGeoLocation(normalizedIp, request.getGeo()));
        pv.setUserAgent(trimToLength(userAgent, 512));
        pv.setViewedAt(LocalDateTime.now());
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

        String rangeLabel = safeRangeDays != null
                ? (safeRangeDays == 1 ? "\u6700\u8fd11\u5929" : "\u6700\u8fd1" + safeRangeDays + "\u5929")
                : "\u5168\u90e8\u5386\u53f2";
        int rangeDaysValue = safeRangeDays != null ? safeRangeDays : 0;
        double normalizedAvgViews = Math.round(avgViewsPerDay * 10d) / 10d;

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
                .build();
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
    public PageResponse<AdminAnalyticsSummaryDto.RecentVisit> loadPageViews(int page, int size) {
        return loadPageViews(page, size, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminAnalyticsSummaryDto.RecentVisit> loadPageViews(int page, int size, AdminPageViewQuery query) {
        int p = Math.max(page, 1) - 1;
        int s = Math.min(Math.max(size, 1), 200);
        Specification<AnalyticsPageView> spec = buildAdminPageViewSpec(query);
        Page<AnalyticsPageView> result = analyticsPageViewRepository.findAll(spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "viewedAt")));
        List<AdminAnalyticsSummaryDto.RecentVisit> records = result.getContent().stream()
                .map(this::toRecentVisit)
                .filter(Objects::nonNull)
                .toList();
        return new PageResponse<>(records, result.getTotalElements(), result.getNumber() + 1, result.getSize());
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
            jakarta.persistence.criteria.Predicate isArticle = cb.isNotNull(root.get("post"));
            jakarta.persistence.criteria.Predicate isRobotPage = isRobotTitle;
            jakarta.persistence.criteria.Predicate isNormalPage = cb.and(cb.not(isArticle), cb.not(isRobotTitle));

            String ip = StringUtils.hasText(query.viewerIp()) ? query.viewerIp().trim() : null;
            if (StringUtils.hasText(ip)) {
                predicates.add(cb.equal(root.get("viewerIp"), ip));
            }

            if (query.postId() != null && query.postId() > 0) {
                predicates.add(cb.equal(postJoin.get("id"), query.postId()));
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
            Boolean excludeSystemPages
            ,
            String pageType
    ) {
    }

    private AdminAnalyticsSummaryDto.RecentVisit toRecentVisit(AnalyticsPageView view) {
        if (view == null) {
            return null;
        }
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
                .build();
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
        if (!StringUtils.hasText(geo) && StringUtils.hasText(requestGeo)) {
            geo = trimToLength(requestGeo, 128);
        }
        if (!StringUtils.hasText(geo)) {
            geo = "未知";
        }
        return trimToLength(geo, 128);
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

    private String trimToLength(String value, int maxLen) {
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
