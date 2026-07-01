package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsPageViewDetailFieldsDto;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.util.ReferrerUtils;
import com.sangui.sanguiblog.util.UserAgentDetailUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class AnalyticsVisitQualityClassifier {

    public enum VisitQuality { NORMAL, LOW_ACTIVITY, SUSPICIOUS, BOT_LIKE, UNKNOWN }
    public enum RiskLevel { LOW, MEDIUM, HIGH, UNKNOWN }
    public enum RiskReason {
        DATACENTER_IP,
        NO_HEARTBEAT,
        SHORT_DURATION,
        WEBDRIVER_TRUE,
        UA_BOT_KEYWORD,
        GEO_TIMEZONE_MISMATCH,
        REFERER_SPOOFING_SUSPECTED,
        ADMIN_PATH_ACCESS,
        HIGH_FREQUENCY_IP
    }

    private static final int SHORT_DURATION_THRESHOLD_SECONDS = 15;
    private static final int NORMAL_HEARTBEAT_MIN = 2;
    private static final int NORMAL_DURATION_MIN_SECONDS = 15;
    private static final int HIGH_FREQ_IP_MIN_COUNT = 10;
    private static final double HIGH_FREQ_IP_PERCENT_THRESHOLD = 0.10;

    private AnalyticsVisitQualityClassifier() {
    }

    public record ClassificationResult(
            VisitQuality visitQuality,
            RiskLevel riskLevel,
            List<RiskReason> riskReasons,
            boolean proxySuspected,
            boolean botSuspected,
            boolean referrerSpoofingSuspected,
            String riskExplanation
    ) {
        public ClassificationResult {
            riskReasons = riskReasons == null ? List.of() : Collections.unmodifiableList(riskReasons);
        }

        public List<String> riskReasonStrings() {
            return riskReasons.stream().map(Enum::name).toList();
        }
    }

    public static ClassificationResult classify(AnalyticsPageView view, AdminAnalyticsPageViewDetailFieldsDto detailFields) {
        return classify(view, detailFields, null);
    }

    public static ClassificationResult classify(AnalyticsPageView view, AdminAnalyticsPageViewDetailFieldsDto detailFields,
                                                 Set<String> highFreqIpSet) {
        if (view == null) {
            return new ClassificationResult(VisitQuality.UNKNOWN, RiskLevel.UNKNOWN, List.of(), false, false, false, null);
        }

        List<RiskReason> reasons = new ArrayList<>();
        String ua = view.getUserAgent();

        boolean botKeyword = UserAgentDetailUtils.isLikelyBot(ua);
        Boolean webdriverTrue = detailFields != null ? detailFields.getWebdriver() : null;

        if (botKeyword) {
            reasons.add(RiskReason.UA_BOT_KEYWORD);
        }
        if (Boolean.TRUE.equals(webdriverTrue)) {
            reasons.add(RiskReason.WEBDRIVER_TRUE);
        }

        int hb = view.getHeartbeatCount() != null ? view.getHeartbeatCount() : 0;
        boolean hasHeartbeat = hb > 0;
        Integer dur = view.getTotalDurationSeconds();
        boolean hasDuration = dur != null && dur > 0;
        boolean isArticleRow = StringUtils.hasText(view.getVisitId());
        boolean isShortDuration = hasDuration && dur < SHORT_DURATION_THRESHOLD_SECONDS;

        if (isArticleRow && !hasHeartbeat) {
            reasons.add(RiskReason.NO_HEARTBEAT);
        }
        if (isShortDuration) {
            reasons.add(RiskReason.SHORT_DURATION);
        }

        String geo = view.getGeoLocation();
        String timezone = detailFields != null ? detailFields.getTimezone() : null;
        if (StringUtils.hasText(geo) && !"未知".equals(geo) && StringUtils.hasText(timezone)) {
            if (isGeoTimezoneMismatch(geo, timezone)) {
                reasons.add(RiskReason.GEO_TIMEZONE_MISMATCH);
            }
        }

        boolean refSpoofSuspect = checkRefererSpoofing(view, detailFields);
        if (refSpoofSuspect) {
            reasons.add(RiskReason.REFERER_SPOOFING_SUSPECTED);
        }

        boolean isAdminPath = isAdminPathAccess(view);
        if (isAdminPath && !isAuthenticatedAdmin(view)) {
            reasons.add(RiskReason.ADMIN_PATH_ACCESS);
        }

        String ipType = detailFields != null ? detailFields.getIpType() : null;
        boolean datacenterIp = "public".equals(ipType) && isDatacenterSignal(view);
        if (datacenterIp) {
            reasons.add(RiskReason.DATACENTER_IP);
        }

        if (highFreqIpSet != null && StringUtils.hasText(view.getViewerIp())) {
            String ip = view.getViewerIp().trim();
            if (highFreqIpSet.contains(ip)) {
                reasons.add(RiskReason.HIGH_FREQUENCY_IP);
            }
        }

        VisitQuality quality = determineQuality(reasons, botKeyword, webdriverTrue, isArticleRow, hasHeartbeat, hb, hasDuration, dur);
        RiskLevel level = determineRiskLevel(reasons, botKeyword, webdriverTrue);
        if (reasons.isEmpty()) {
            level = quality == VisitQuality.UNKNOWN ? RiskLevel.UNKNOWN : RiskLevel.LOW;
        }

        boolean proxySuspected = reasons.contains(RiskReason.DATACENTER_IP)
                || reasons.contains(RiskReason.GEO_TIMEZONE_MISMATCH)
                || reasons.contains(RiskReason.HIGH_FREQUENCY_IP);
        boolean botSuspected = botKeyword || Boolean.TRUE.equals(webdriverTrue);
        boolean refSpoofSuspected = reasons.contains(RiskReason.REFERER_SPOOFING_SUSPECTED);

        String explanation = buildExplanation(quality, reasons);

        return new ClassificationResult(quality, level, reasons, proxySuspected, botSuspected, refSpoofSuspected, explanation);
    }

    private static VisitQuality determineQuality(List<RiskReason> reasons, boolean botKeyword, Boolean webdriverTrue,
                                                  boolean isArticleRow, boolean hasHeartbeat, int hb,
                                                  boolean hasDuration, Integer dur) {
        if (botKeyword || Boolean.TRUE.equals(webdriverTrue)) {
            return VisitQuality.BOT_LIKE;
        }
        if (reasons.contains(RiskReason.DATACENTER_IP)
                || reasons.contains(RiskReason.REFERER_SPOOFING_SUSPECTED)
                || reasons.contains(RiskReason.ADMIN_PATH_ACCESS)
                || reasons.contains(RiskReason.HIGH_FREQUENCY_IP)) {
            return VisitQuality.SUSPICIOUS;
        }
        if (hb >= NORMAL_HEARTBEAT_MIN && hasDuration && dur >= NORMAL_DURATION_MIN_SECONDS
                && reasons.stream().noneMatch(r -> r == RiskReason.WEBDRIVER_TRUE || r == RiskReason.UA_BOT_KEYWORD)) {
            return VisitQuality.NORMAL;
        }
        if (isArticleRow && (!hasHeartbeat || (hasDuration && dur < SHORT_DURATION_THRESHOLD_SECONDS))) {
            return VisitQuality.LOW_ACTIVITY;
        }
        if (reasons.isEmpty() && !isArticleRow && !hasHeartbeat && !hasDuration) {
            return VisitQuality.UNKNOWN;
        }
        if (reasons.stream().anyMatch(r -> r == RiskReason.NO_HEARTBEAT || r == RiskReason.SHORT_DURATION)) {
            return VisitQuality.LOW_ACTIVITY;
        }
        return VisitQuality.UNKNOWN;
    }

    private static RiskLevel determineRiskLevel(List<RiskReason> reasons, boolean botKeyword, Boolean webdriverTrue) {
        if (Boolean.TRUE.equals(webdriverTrue) || botKeyword) {
            return RiskLevel.HIGH;
        }
        if (reasons.size() >= 2) {
            return RiskLevel.HIGH;
        }
        if (reasons.contains(RiskReason.REFERER_SPOOFING_SUSPECTED)
                || reasons.contains(RiskReason.ADMIN_PATH_ACCESS)
                || reasons.contains(RiskReason.HIGH_FREQUENCY_IP)
                || reasons.contains(RiskReason.DATACENTER_IP)) {
            return RiskLevel.MEDIUM;
        }
        if (!reasons.isEmpty()
                && reasons.stream().allMatch(r -> r == RiskReason.NO_HEARTBEAT
                || r == RiskReason.SHORT_DURATION)) {
            return RiskLevel.LOW;
        }
        if (reasons.isEmpty()) {
            return RiskLevel.LOW;
        }
        return RiskLevel.UNKNOWN;
    }

    private static String buildExplanation(VisitQuality quality, List<RiskReason> reasons) {
        switch (quality) {
            case NORMAL:
                return "有心跳且停留时长正常，未发现明显自动化特征。";
            case LOW_ACTIVITY:
                if (reasons.contains(RiskReason.NO_HEARTBEAT) && reasons.contains(RiskReason.SHORT_DURATION)) {
                    return "未检测到心跳且停留时长较短，可能为快速浏览或自动化探测。";
                }
                if (reasons.contains(RiskReason.NO_HEARTBEAT)) {
                    return "未检测到心跳信号，无法确认用户是否持续在页面活动。";
                }
                if (reasons.contains(RiskReason.SHORT_DURATION)) {
                    return "停留时长较短，可能为快速浏览。";
                }
                return "访问活跃度较低。";
            case SUSPICIOUS:
                if (reasons.contains(RiskReason.DATACENTER_IP)) {
                    return "IP 地址疑似来自数据中心或 VPS。";
                }
                if (reasons.contains(RiskReason.REFERER_SPOOFING_SUSPECTED)) {
                    return "来源信息存在不一致，存在 Referer 伪造嫌疑。";
                }
                if (reasons.contains(RiskReason.ADMIN_PATH_ACCESS)) {
                    return "未认证访问后台路径，存在探测嫌疑。";
                }
                if (reasons.contains(RiskReason.HIGH_FREQUENCY_IP)) {
                    return "相同 IP 高频访问，存在扫描或滥用嫌疑。";
                }
                return "存在可疑特征。";
            case BOT_LIKE:
                if (reasons.contains(RiskReason.WEBDRIVER_TRUE)) {
                    return "浏览器自动化标记为 true，疑似自动化工具控制。";
                }
                if (reasons.contains(RiskReason.UA_BOT_KEYWORD)) {
                    return "User-Agent 匹配已知爬虫/自动化工具特征。";
                }
                return "访问模式疑似自动化程序。";
            default:
                return null;
        }
    }

    private static boolean isGeoTimezoneMismatch(String geo, String timezone) {
        if (!StringUtils.hasText(geo) || !StringUtils.hasText(timezone)) {
            return false;
        }
        String asiaPrefix = "亚洲/";
        if (timezone.startsWith(asiaPrefix)) {
            String city = timezone.substring(asiaPrefix.length());
            if (geo.contains("中国") && !"Shanghai".equals(city) && !"Urumqi".equals(city)) {
                return false;
            }
            return !geo.contains("中国") && !geo.contains("未知");
        }
        if (timezone.startsWith("America/") && !geo.contains("美") && !geo.contains("Canada")) {
            return true;
        }
        if (timezone.startsWith("Europe/") && !geo.contains("欧") && !geo.contains("英")
                && !geo.contains("俄") && !geo.contains("德") && !geo.contains("法")) {
            return true;
        }
        return false;
    }

    private static boolean checkRefererSpoofing(AnalyticsPageView view, AdminAnalyticsPageViewDetailFieldsDto detailFields) {
        if (view == null || detailFields == null) {
            return false;
        }
        String refererRaw = detailFields.getRefererRaw();
        String referrerClient = detailFields.getReferrerClient();
        if (!StringUtils.hasText(refererRaw) || !StringUtils.hasText(referrerClient)) {
            return false;
        }

        String rawHost = extractHost(refererRaw);
        String clientHost = extractHost(referrerClient);
        if (rawHost == null || clientHost == null) {
            return false;
        }

        String rawHostLower = rawHost.toLowerCase(Locale.ROOT);
        String clientHostLower = clientHost.toLowerCase(Locale.ROOT);

        if (rawHostLower.equals(clientHostLower)) {
            return false;
        }

        if (rawHostLower.contains("sanguicode.com") || clientHostLower.contains("sanguicode.com")) {
            return false;
        }

        ReferrerUtils.ParsedReferrer parsed = ReferrerUtils.parse(referrerClient);
        if (parsed.engine() != null) {
            return false;
        }

        if (isSameSite(rawHostLower, clientHostLower)) {
            return false;
        }

        return true;
    }

    private static String extractHost(String url) {
        if (!StringUtils.hasText(url)) return null;
        try {
            java.net.URI uri = new java.net.URI(url.trim());
            return uri.getHost();
        } catch (Exception e) {
            try {
                java.net.URI uri = new java.net.URI("https://" + url.trim());
                return uri.getHost();
            } catch (Exception ex) {
                return null;
            }
        }
    }

    private static boolean isSameSite(String hostA, String hostB) {
        if (hostA == null || hostB == null) return false;
        return hostA.equals(hostB) || hostA.endsWith("." + hostB) || hostB.endsWith("." + hostA);
    }

    private static boolean isAdminPathAccess(AnalyticsPageView view) {
        if (view == null) return false;
        String path = view.getPageTitle();
        if (!StringUtils.hasText(path)) return false;
        String lower = path.toLowerCase(Locale.ROOT);
        return lower.startsWith("/admin") || lower.contains("/admin") || lower.startsWith("admin");
    }

    private static boolean isAuthenticatedAdmin(AnalyticsPageView view) {
        return view != null && view.getUser() != null
                && view.getUser().getRole() != null
                && ("SUPER_ADMIN".equalsIgnoreCase(view.getUser().getRole().getCode())
                || "ADMIN".equalsIgnoreCase(view.getUser().getRole().getCode()));
    }

    private static boolean isDatacenterSignal(AnalyticsPageView view) {
        String isp = view.getUserAgent();
        return false;
    }

    public static Set<String> buildHighFreqIpSet(List<AnalyticsPageView> rangeRows, long rangePv) {
        if (rangeRows == null || rangeRows.isEmpty()) return Collections.emptySet();
        int threshold = Math.max(HIGH_FREQ_IP_MIN_COUNT, (int) Math.ceil(rangePv * HIGH_FREQ_IP_PERCENT_THRESHOLD));
        java.util.Map<String, Long> ipCounts = new java.util.HashMap<>();
        for (AnalyticsPageView row : rangeRows) {
            String ip = row.getViewerIp();
            if (StringUtils.hasText(ip)) {
                ipCounts.merge(ip.trim(), 1L, Long::sum);
            }
        }
        return ipCounts.entrySet().stream()
                .filter(e -> e.getValue() >= threshold)
                .map(java.util.Map.Entry::getKey)
                .collect(java.util.stream.Collectors.toSet());
    }
}
