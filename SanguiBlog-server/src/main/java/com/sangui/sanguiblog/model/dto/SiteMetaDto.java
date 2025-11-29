package com.sangui.sanguiblog.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SiteMetaDto {
    private SiteStats stats;
    private BroadcastDto broadcast;
    private UserProfileDto author;
    private List<TrafficSourceDto> trafficSources;
    private List<RecentActivityDto> recentActivity;
    private FooterInfo footer;

    @Data
    @Builder
    public static class SiteStats {
        private long posts;
        private long comments;
        private long categories;
        private long tags;
        private long views;
        private String lastUpdated;
        private String lastUpdatedFull;
    }

    @Data
    @Builder
    public static class BroadcastDto {
        private boolean active;
        private String content;
        private String style;
    }

    @Data
    @Builder
    public static class TrafficSourceDto {
        private String label;
        private double value;
    }

    @Data
    @Builder
    public static class RecentActivityDto {
        private String title;
        private String ip;
        private String time;
        private String referrer;
        private String geo;
    }

    @Data
    @Builder
    public static class FooterInfo {
        private Integer year;
        private String brand;
        private String icpNumber;
        private String icpLink;
        private String poweredBy;
        private String copyrightText;
    }
}
