package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsPageViewDetailFieldsDto;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto.AnomalyTops;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto.PopularEntry;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto.SourceTypeShare;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto.SuspiciousSummary;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto.TopItem;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto.VisitQualityShare;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository.InsightRow;
import com.sangui.sanguiblog.util.ReferrerUtils;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

class AnalyticsInsightsHelper {

    private static final int TOP_N = 5;
    private static final int MAX_UA_LENGTH = 30;

    private AnalyticsInsightsHelper() {
    }

    static AdminAnalyticsVisitorSourceInsightsDto buildInsights(
            Integer safeRangeDays,
            LocalDateTime overviewStart,
            int rangeDaysValue,
            String rangeLabel,
            AnalyticsPageViewRepository repository,
            Function<String, AdminAnalyticsPageViewDetailFieldsDto> detailParser,
            Function<InsightRow, AnalyticsPageView> rowToView) {

        LocalDateTime endExclusive = safeRangeDays != null && overviewStart != null
                ? overviewStart.plusDays(safeRangeDays)
                : null;
        List<InsightRow> rows = repository.findInsightRows(overviewStart, endExclusive);

        if (rows == null || rows.isEmpty()) {
            return buildEmpty(rangeDaysValue, rangeLabel);
        }

        long total = rows.size();

        List<SourceTypeShare> sourceTypeShares = computeSourceTypeShares(rows, total, detailParser);
        List<VisitQualityShare> visitQualityShares = computeVisitQualityShares(rows, total, detailParser, rowToView);
        AnomalyTops anomalyTops = computeAnomalyTops(rows, detailParser);
        List<PopularEntry> popularEntries = computePopularEntries(rows, total);
        SuspiciousSummary suspiciousSummary = computeSuspiciousSummary(rows, total, detailParser, rowToView);

        return AdminAnalyticsVisitorSourceInsightsDto.builder()
                .rangeDays(rangeDaysValue)
                .rangeLabel(rangeLabel)
                .totalVisits(total)
                .sourceTypeShares(sourceTypeShares)
                .visitQualityShares(visitQualityShares)
                .anomalyTops(anomalyTops)
                .popularEntries(popularEntries)
                .suspiciousSummary(suspiciousSummary)
                .build();
    }

    static AnomalyTops buildEmptyAnomalyTops() {
        return AnomalyTops.builder()
                .ips(List.of())
                .referrerDomains(List.of())
                .userAgents(List.of())
                .geos(List.of())
                .asns(List.of())
                .isps(List.of())
                .build();
    }

    static SuspiciousSummary buildEmptySuspiciousSummary() {
        return SuspiciousSummary.builder()
                .botLikeCount(0)
                .botLikePercentage(0.0)
                .proxyLikeCount(0)
                .proxyLikePercentage(0.0)
                .noHeartbeatCount(0)
                .noHeartbeatPercentage(0.0)
                .externalReferrerDomainCount(0)
                .build();
    }

    private static AdminAnalyticsVisitorSourceInsightsDto buildEmpty(int rangeDaysValue, String rangeLabel) {
        return AdminAnalyticsVisitorSourceInsightsDto.builder()
                .rangeDays(rangeDaysValue)
                .rangeLabel(rangeLabel)
                .totalVisits(0)
                .sourceTypeShares(List.of())
                .visitQualityShares(List.of())
                .anomalyTops(buildEmptyAnomalyTops())
                .popularEntries(List.of())
                .suspiciousSummary(buildEmptySuspiciousSummary())
                .build();
    }

    private static List<SourceTypeShare> computeSourceTypeShares(
            List<InsightRow> rows,
            long total,
            Function<String, AdminAnalyticsPageViewDetailFieldsDto> detailParser) {

        Map<ReferrerUtils.SourceType, Long> counts = new LinkedHashMap<>();
        Map<ReferrerUtils.SourceType, String> labels = Map.of(
                ReferrerUtils.SourceType.DIRECT, "直接访问",
                ReferrerUtils.SourceType.INTERNAL, "站内跳转",
                ReferrerUtils.SourceType.SEARCH, "搜索引擎",
                ReferrerUtils.SourceType.EXTERNAL, "外部链接",
                ReferrerUtils.SourceType.REDIRECT, "重定向来源",
                ReferrerUtils.SourceType.UNKNOWN, "未知来源"
        );

        for (InsightRow row : rows) {
            AdminAnalyticsPageViewDetailFieldsDto detail = detailParser.apply(row.getDetailJson());
            ReferrerUtils.SourceType type = resolveSourceType(row, detail);
            counts.merge(type, 1L, Long::sum);
        }

        ReferrerUtils.SourceType[] order = {
                ReferrerUtils.SourceType.DIRECT,
                ReferrerUtils.SourceType.INTERNAL,
                ReferrerUtils.SourceType.SEARCH,
                ReferrerUtils.SourceType.EXTERNAL,
                ReferrerUtils.SourceType.REDIRECT,
                ReferrerUtils.SourceType.UNKNOWN
        };

        List<SourceTypeShare> result = new ArrayList<>();
        for (ReferrerUtils.SourceType type : order) {
            long count = counts.getOrDefault(type, 0L);
            double pct = total > 0 ? (count * 100.0) / total : 0.0;
            result.add(SourceTypeShare.builder()
                    .type(type.name())
                    .label(labels.get(type))
                    .count(count)
                    .percentage(Math.round(pct * 100.0) / 100.0)
                    .logsQuery(buildLogsQuery("sourceType", type.name()))
                    .build());
        }
        return result;
    }

    private static List<VisitQualityShare> computeVisitQualityShares(
            List<InsightRow> rows,
            long total,
            Function<String, AdminAnalyticsPageViewDetailFieldsDto> detailParser,
            Function<InsightRow, AnalyticsPageView> rowToView) {

        Map<AnalyticsVisitQualityClassifier.VisitQuality, Long> counts = new LinkedHashMap<>();
        Map<AnalyticsVisitQualityClassifier.VisitQuality, String> labels = Map.of(
                AnalyticsVisitQualityClassifier.VisitQuality.NORMAL, "正常访问",
                AnalyticsVisitQualityClassifier.VisitQuality.LOW_ACTIVITY, "低活跃访问",
                AnalyticsVisitQualityClassifier.VisitQuality.SUSPICIOUS, "疑似代理/VPS",
                AnalyticsVisitQualityClassifier.VisitQuality.BOT_LIKE, "疑似机器人",
                AnalyticsVisitQualityClassifier.VisitQuality.UNKNOWN, "未知"
        );

        for (InsightRow row : rows) {
            AnalyticsPageView view = rowToView.apply(row);
            AdminAnalyticsPageViewDetailFieldsDto detail = detailParser.apply(row.getDetailJson());
            AnalyticsVisitQualityClassifier.ClassificationResult cr =
                    AnalyticsVisitQualityClassifier.classify(view, detail);
            counts.merge(cr.visitQuality(), 1L, Long::sum);
        }

        AnalyticsVisitQualityClassifier.VisitQuality[] order = {
                AnalyticsVisitQualityClassifier.VisitQuality.NORMAL,
                AnalyticsVisitQualityClassifier.VisitQuality.LOW_ACTIVITY,
                AnalyticsVisitQualityClassifier.VisitQuality.SUSPICIOUS,
                AnalyticsVisitQualityClassifier.VisitQuality.BOT_LIKE,
                AnalyticsVisitQualityClassifier.VisitQuality.UNKNOWN
        };

        List<VisitQualityShare> result = new ArrayList<>();
        for (AnalyticsVisitQualityClassifier.VisitQuality q : order) {
            long count = counts.getOrDefault(q, 0L);
            double pct = total > 0 ? (count * 100.0) / total : 0.0;
            result.add(VisitQualityShare.builder()
                    .quality(q.name())
                    .label(labels.get(q))
                    .count(count)
                    .percentage(Math.round(pct * 100.0) / 100.0)
                    .logsQuery(buildLogsQuery("visitQuality", q.name()))
                    .build());
        }
        return result;
    }

    private static AnomalyTops computeAnomalyTops(
            List<InsightRow> rows,
            Function<String, AdminAnalyticsPageViewDetailFieldsDto> detailParser) {

        Map<String, Long> ipCounts = new LinkedHashMap<>();
        Map<String, Long> domainCounts = new LinkedHashMap<>();
        Map<String, Long> uaCounts = new LinkedHashMap<>();
        Map<String, Long> geoCounts = new LinkedHashMap<>();
        Map<String, Long> asnCounts = new LinkedHashMap<>();
        Map<String, Long> ispCounts = new LinkedHashMap<>();

        for (InsightRow row : rows) {
            AdminAnalyticsPageViewDetailFieldsDto detail = detailParser.apply(row.getDetailJson());
            String ip = row.getViewerIp();
            if (StringUtils.hasText(ip)) {
                ipCounts.merge(ip.trim(), 1L, Long::sum);
            }

            String domain = resolveReferrerDomain(row, detail);
            if (StringUtils.hasText(domain)) {
                domainCounts.merge(domain, 1L, Long::sum);
            }

            String ua = row.getUserAgent();
            if (StringUtils.hasText(ua)) {
                String shortened = ua.length() > MAX_UA_LENGTH ? ua.substring(0, MAX_UA_LENGTH) : ua;
                uaCounts.merge(shortened, 1L, Long::sum);
            }

            String geo = row.getGeoLocation();
            if (StringUtils.hasText(geo)) {
                geoCounts.merge(geo.trim(), 1L, Long::sum);
            }

            String asn = detail != null ? detail.getAsn() : null;
            if (StringUtils.hasText(asn)) {
                asnCounts.merge(asn.trim(), 1L, Long::sum);
            }

            String isp = detail != null ? detail.getIsp() : null;
            if (StringUtils.hasText(isp)) {
                ispCounts.merge(isp.trim(), 1L, Long::sum);
            }
        }

        return AnomalyTops.builder()
                .ips(toTopItems(ipCounts, TOP_N, "ip"))
                .referrerDomains(toTopItems(domainCounts, TOP_N, "referrerDomain"))
                .userAgents(toTopItems(uaCounts, TOP_N, "userAgentKeyword"))
                .geos(toTopItems(geoCounts, TOP_N, "geo"))
                .asns(toTopItems(asnCounts, TOP_N, "asn"))
                .isps(toTopItems(ispCounts, TOP_N, "isp"))
                .build();
    }

    private static List<PopularEntry> computePopularEntries(
            List<InsightRow> rows,
            long total) {

        Map<String, String> typeLabels = Map.of(
                "HOME", "首页",
                "ARTICLE", "文章页",
                "LOGIN", "登录页",
                "API", "API 路径",
                "NOT_FOUND", "404 路径",
                "ADMIN", "后台页面"
        );

        Map<String, String> typePaths = Map.of(
                "HOME", "/",
                "ARTICLE", "/article/*",
                "LOGIN", "/login",
                "API", "/api/*",
                "NOT_FOUND", "404",
                "ADMIN", "/admin"
        );

        Map<String, Long> counts = new LinkedHashMap<>();
        for (InsightRow row : rows) {
            String type = classifyEntryType(row.getPageTitle());
            if (type != null) {
                counts.merge(type, 1L, Long::sum);
            }
        }

        List<PopularEntry> result = new ArrayList<>();
        for (String type : List.of("HOME", "ARTICLE", "LOGIN", "API", "NOT_FOUND", "ADMIN")) {
            long count = counts.getOrDefault(type, 0L);
            result.add(PopularEntry.builder()
                    .type(type)
                    .label(typeLabels.get(type))
                    .path(typePaths.get(type))
                    .count(count)
                    .logsQuery(buildLogsQuery("entryType", type))
                    .build());
        }
        return result;
    }

    private static SuspiciousSummary computeSuspiciousSummary(
            List<InsightRow> rows,
            long total,
            Function<String, AdminAnalyticsPageViewDetailFieldsDto> detailParser,
            Function<InsightRow, AnalyticsPageView> rowToView) {

        long botLikeCount = 0;
        long proxyLikeCount = 0;
        long noHeartbeatCount = 0;
        long externalReferrerDomainCount = 0;

        for (InsightRow row : rows) {
            AnalyticsPageView view = rowToView.apply(row);
            AdminAnalyticsPageViewDetailFieldsDto detail = detailParser.apply(row.getDetailJson());
            AnalyticsVisitQualityClassifier.ClassificationResult cr =
                    AnalyticsVisitQualityClassifier.classify(view, detail);

            if (cr.visitQuality() == AnalyticsVisitQualityClassifier.VisitQuality.BOT_LIKE) {
                botLikeCount++;
            }
            if (cr.proxySuspected()) {
                proxyLikeCount++;
            }
            if (cr.riskReasons().contains(AnalyticsVisitQualityClassifier.RiskReason.NO_HEARTBEAT)) {
                noHeartbeatCount++;
            }

            ReferrerUtils.SourceType st = resolveSourceType(row, detail);
            if (st == ReferrerUtils.SourceType.EXTERNAL) {
                externalReferrerDomainCount++;
            }
        }

        double botPct = total > 0 ? (botLikeCount * 100.0) / total : 0.0;
        double proxyPct = total > 0 ? (proxyLikeCount * 100.0) / total : 0.0;
        double hbPct = total > 0 ? (noHeartbeatCount * 100.0) / total : 0.0;

        return SuspiciousSummary.builder()
                .botLikeCount(botLikeCount)
                .botLikePercentage(Math.round(botPct * 100.0) / 100.0)
                .proxyLikeCount(proxyLikeCount)
                .proxyLikePercentage(Math.round(proxyPct * 100.0) / 100.0)
                .noHeartbeatCount(noHeartbeatCount)
                .noHeartbeatPercentage(Math.round(hbPct * 100.0) / 100.0)
                .externalReferrerDomainCount(externalReferrerDomainCount)
                .build();
    }

    private static List<TopItem> toTopItems(Map<String, Long> counts, int topN, String paramKey) {
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(topN)
                .map(e -> {
                    String encoded;
                    try {
                        encoded = URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8);
                    } catch (Exception ex) {
                        encoded = e.getKey();
                    }
                    return TopItem.builder()
                            .value(e.getKey())
                            .count(e.getValue())
                            .logsQuery(paramKey + "=" + encoded)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public static String classifyEntryType(String pageTitle) {
        if (!StringUtils.hasText(pageTitle)) {
            return null;
        }
        String lower = pageTitle.toLowerCase(Locale.ROOT).trim();
        if (lower.equals("/") || lower.isEmpty()) {
            return "HOME";
        }
        if (lower.startsWith("/article/") || lower.startsWith("article/")) {
            return "ARTICLE";
        }
        if (lower.equals("/login") || lower.startsWith("/login?")) {
            return "LOGIN";
        }
        if (lower.startsWith("/api/") || lower.startsWith("api/")) {
            return "API";
        }
        if (lower.equals("404") || lower.startsWith("/404") || lower.contains("404")) {
            return "NOT_FOUND";
        }
        if (lower.startsWith("/admin") || lower.startsWith("admin/") || lower.startsWith("admin")) {
            return "ADMIN";
        }
        return null;
    }

    static ReferrerUtils.SourceType resolveSourceType(InsightRow row, AdminAnalyticsPageViewDetailFieldsDto detail) {
        ReferrerUtils.SourceType labelType = classifyDisplayReferrer(row != null ? row.getReferrerUrl() : null);
        if (labelType == ReferrerUtils.SourceType.INTERNAL
                || labelType == ReferrerUtils.SourceType.REDIRECT
                || labelType == ReferrerUtils.SourceType.DIRECT) {
            return labelType;
        }
        String raw = firstText(
                detail != null ? detail.getRefererRaw() : null,
                detail != null ? detail.getReferrerClient() : null,
                row != null ? row.getReferrerUrl() : null
        );
        return ReferrerUtils.classifySourceType(raw, null);
    }

    static String resolveReferrerDomain(InsightRow row, AdminAnalyticsPageViewDetailFieldsDto detail) {
        return ReferrerUtils.extractReferrerDomain(firstText(
                detail != null ? detail.getRefererRaw() : null,
                detail != null ? detail.getReferrerClient() : null,
                row != null ? row.getReferrerUrl() : null
        ));
    }

    static ReferrerUtils.SourceType classifyDisplayReferrer(String value) {
        if (!StringUtils.hasText(value)) {
            return ReferrerUtils.SourceType.UNKNOWN;
        }
        String trimmed = value.trim();
        if ("直接访问".equals(trimmed)) {
            return ReferrerUtils.SourceType.DIRECT;
        }
        if (trimmed.startsWith("来自站内")
                || trimmed.startsWith("来自首页")
                || trimmed.startsWith("来自后台")
                || trimmed.startsWith("来自归档")
                || trimmed.startsWith("来自工具")
                || trimmed.startsWith("来自关于")
                || trimmed.startsWith("来自登录")) {
            return ReferrerUtils.SourceType.INTERNAL;
        }
        if (trimmed.startsWith("来自重定向")) {
            return ReferrerUtils.SourceType.REDIRECT;
        }
        return ReferrerUtils.SourceType.UNKNOWN;
    }

    static String firstText(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private static String buildLogsQuery(String key, String value) {
        try {
            return key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return key + "=" + value;
        }
    }
}
