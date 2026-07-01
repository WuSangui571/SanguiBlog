package com.sangui.sanguiblog.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsVisitorSourceInsightsDto {
    private int rangeDays;
    private String rangeLabel;
    private long totalVisits;

    private List<SourceTypeShare> sourceTypeShares;
    private List<VisitQualityShare> visitQualityShares;
    private AnomalyTops anomalyTops;
    private List<PopularEntry> popularEntries;
    private SuspiciousSummary suspiciousSummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceTypeShare {
        private String type;
        private String label;
        private long count;
        private double percentage;
        @JsonProperty("logsQuery")
        private String logsQuery;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VisitQualityShare {
        private String quality;
        private String label;
        private long count;
        private double percentage;
        @JsonProperty("logsQuery")
        private String logsQuery;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnomalyTops {
        private List<TopItem> ips;
        private List<TopItem> referrerDomains;
        private List<TopItem> userAgents;
        private List<TopItem> geos;
        private List<TopItem> asns;
        private List<TopItem> isps;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopItem {
        private String value;
        private long count;
        @JsonProperty("logsQuery")
        private String logsQuery;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PopularEntry {
        private String type;
        private String label;
        private String path;
        private long count;
        @JsonProperty("logsQuery")
        private String logsQuery;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuspiciousSummary {
        private long botLikeCount;
        private double botLikePercentage;
        private long proxyLikeCount;
        private double proxyLikePercentage;
        private long noHeartbeatCount;
        private double noHeartbeatPercentage;
        private long externalReferrerDomainCount;
    }
}
