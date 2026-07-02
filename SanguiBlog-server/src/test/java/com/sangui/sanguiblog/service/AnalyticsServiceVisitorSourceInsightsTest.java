package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.AdminAnalyticsVisitorSourceInsightsDto;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AnalyticsServiceVisitorSourceInsightsTest {

    private AnalyticsService analyticsService;
    private AnalyticsPageViewRepository pageViewRepo;
    private PostRepository postRepo;
    private CommentRepository commentRepo;
    private AnalyticsTrafficSourceRepository trafficRepo;

    @BeforeEach
    void setUp() {
        pageViewRepo = mock(AnalyticsPageViewRepository.class);
        postRepo = mock(PostRepository.class);
        commentRepo = mock(CommentRepository.class);
        trafficRepo = mock(AnalyticsTrafficSourceRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        GeoIpService geoIpService = mock(GeoIpService.class);
        IpBanService ipBanService = mock(IpBanService.class);
        analyticsService = new AnalyticsService(pageViewRepo, postRepo, userRepo, commentRepo, trafficRepo, geoIpService, ipBanService);

        when(postRepo.sumViewsByStatus(anyString())).thenReturn(0L);
        when(postRepo.sumCommentsByStatus(anyString())).thenReturn(0L);
        when(postRepo.countByStatus(anyString())).thenReturn(0L);
        when(commentRepo.count()).thenReturn(0L);
        when(pageViewRepo.countViewsSince(any())).thenReturn(3L);
        when(pageViewRepo.countViewsSince(isNull())).thenReturn(3L);
        when(pageViewRepo.countDistinctVisitorsSince(any())).thenReturn(3L);
        when(pageViewRepo.countDistinctVisitorsSince(isNull())).thenReturn(3L);
        when(pageViewRepo.countLoggedInViewsSince(any())).thenReturn(0L);
        when(pageViewRepo.countLoggedInViewsSince(isNull())).thenReturn(0L);
        when(pageViewRepo.findTopPostsSince(any(LocalDateTime.class), any(PageRequest.class))).thenReturn(List.of());
        when(pageViewRepo.findAllByOrderByViewedAtDesc(any(PageRequest.class))).thenReturn(new PageImpl<>(List.of()));
        when(pageViewRepo.aggregateDailyViews(any(LocalDateTime.class))).thenReturn(List.of());
        when(trafficRepo.findByStatDateOrderByVisitsDesc(any())).thenReturn(List.of());
    }

    @Test
    void allRangeBuildsVisitorSourceInsightsInsteadOfReturningEmpty() {
        when(pageViewRepo.findInsightRows(isNull(), isNull())).thenReturn(List.of(
                row(1L, "visit-1", "Mozilla/5.0 Chrome", "https://www.google.com/search?q=sangui",
                        "{\"refererRaw\":\"https://www.google.com/search?q=sangui\"}", 2, 30, "/article/1"),
                row(2L, "visit-2", "curl/8.0", "",
                        "{\"refererRaw\":\"\"}", 0, 1, "/api/probe"),
                row(3L, "visit-3", "Mozilla/5.0 Chrome", "",
                        "{\"refererRaw\":\"\"}", 0, null, "/article/2")
        ));

        AdminAnalyticsSummaryDto summary = analyticsService.loadAdminSummary(-1, 5, 5);
        AdminAnalyticsVisitorSourceInsightsDto insights = summary.getVisitorSourceInsights();

        assertNotNull(insights);
        assertEquals("全部历史", insights.getRangeLabel());
        assertEquals(3, insights.getTotalVisits());
        assertEquals(1, findSourceCount(insights, "SEARCH"));
        assertEquals(1, findQualityCount(insights, "BOT_LIKE"));
        assertEquals(1, findQualityCount(insights, "LOW_ACTIVITY"));
        assertTrue(insights.getVisitQualityShares().stream()
                .anyMatch(item -> "BOT_LIKE".equals(item.getQuality())
                        && "visitQuality=BOT_LIKE".equals(item.getLogsQuery())));
        assertTrue(insights.getAnomalyTops().getUserAgents().stream()
                .anyMatch(item -> item.getLogsQuery().startsWith("userAgentKeyword=")));
    }

    private static long findSourceCount(AdminAnalyticsVisitorSourceInsightsDto insights, String type) {
        return insights.getSourceTypeShares().stream()
                .filter(item -> type.equals(item.getType()))
                .findFirst()
                .map(AdminAnalyticsVisitorSourceInsightsDto.SourceTypeShare::getCount)
                .orElse(-1L);
    }

    private static long findQualityCount(AdminAnalyticsVisitorSourceInsightsDto insights, String quality) {
        return insights.getVisitQualityShares().stream()
                .filter(item -> quality.equals(item.getQuality()))
                .findFirst()
                .map(AdminAnalyticsVisitorSourceInsightsDto.VisitQualityShare::getCount)
                .orElse(-1L);
    }

    private static AnalyticsPageViewRepository.InsightRow row(Long id, String visitId, String ua, String referrerUrl,
                                                               String detailJson, Integer heartbeatCount,
                                                               Integer durationSeconds, String pageTitle) {
        return new AnalyticsPageViewRepository.InsightRow() {
            @Override public Long getId() { return id; }
            @Override public LocalDateTime getViewedAt() { return LocalDateTime.now(); }
            @Override public String getViewerIp() { return "203.0.113." + id; }
            @Override public String getReferrerUrl() { return referrerUrl; }
            @Override public String getGeoLocation() { return "未知"; }
            @Override public String getUserAgent() { return ua; }
            @Override public String getPageTitle() { return pageTitle; }
            @Override public Long getPostId() { return null; }
            @Override public Integer getHeartbeatCount() { return heartbeatCount; }
            @Override public Integer getTotalDurationSeconds() { return durationSeconds; }
            @Override public Integer getActiveDurationSeconds() { return durationSeconds; }
            @Override public String getVisitStatus() { return "OPEN"; }
            @Override public String getDetailJson() { return detailJson; }
            @Override public Long getUserId() { return null; }
            public String getVisitId() { return visitId; }
        };
    }
}
