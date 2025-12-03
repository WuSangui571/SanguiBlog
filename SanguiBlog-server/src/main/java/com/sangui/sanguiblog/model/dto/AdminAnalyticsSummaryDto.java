package com.sangui.sanguiblog.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
public class AdminAnalyticsSummaryDto {

    private Overview overview;
    private List<TrafficSource> trafficSources;
    private List<TrendPoint> dailyTrends;
    private List<TopPost> topPosts;
    private List<RecentVisit> recentVisits;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private long totalViews;
        private long periodViews;
        private long uniqueVisitors;
        private long loggedInViews;
        private double avgViewsPerDay;
        private long postCount;
        private long commentCount;
        private int rangeDays;
        private String rangeLabel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrafficSource {
        private String label;
        private double value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String date;
        private long views;
        private long visitors;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopPost {
        private Long postId;
        private String title;
        private String slug;
        private long views;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentVisit {
        private Long id;
        private String title;
        private Long postId;
        private String slug;
        private String ip;
        private String time;
        private String referrer;
        private String geo;
        private boolean loggedIn;
        private Long userId;
        private String username;
        private String userName;
        private String userRole;
        private String userAgent;
        private String avatarUrl;
    }
}
