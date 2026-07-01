package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AdminAnalyticsSummaryDto;
import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AnalyticsServicePageViewFilterTest {

    private AnalyticsService analyticsService;
    private AnalyticsPageViewRepository pageViewRepo;

    @BeforeEach
    void setUp() {
        pageViewRepo = mock(AnalyticsPageViewRepository.class);
        PostRepository postRepo = mock(PostRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        CommentRepository commentRepo = mock(CommentRepository.class);
        AnalyticsTrafficSourceRepository trafficRepo = mock(AnalyticsTrafficSourceRepository.class);
        GeoIpService geoIpService = mock(GeoIpService.class);
        analyticsService = new AnalyticsService(pageViewRepo, postRepo, userRepo, commentRepo, trafficRepo, geoIpService);
    }

    @Test
    void computedVisitQualityFilterKeepsMatchingRows() {
        AnalyticsPageView bot = row(1L, "visit-1", "curl/8.0", "/api/probe", "", 0, 1);
        AnalyticsPageView human = row(2L, "visit-2", "Mozilla/5.0 Chrome", "/article/1", "", 2, 30);
        when(pageViewRepo.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(bot, human));

        PageResponse<AdminAnalyticsSummaryDto.RecentVisit> response = analyticsService.loadPageViews(1, 20,
                query("BOT_LIKE", null, null, null));

        assertEquals(1, response.getTotal());
        assertEquals(1, response.getRecords().size());
        assertEquals(1L, response.getRecords().getFirst().getId());
    }

    @Test
    void sourceTypeFilterUsesRawDetailReferrerBeforeDisplayLabel() {
        AnalyticsPageView search = row(1L, "visit-1", "Mozilla/5.0 Chrome", "谷歌：sangui",
                "{\"refererRaw\":\"https://www.google.com/search?q=sangui\"}", 2, 30);
        AnalyticsPageView direct = row(2L, "visit-2", "Mozilla/5.0 Chrome", "直接访问",
                "{\"refererRaw\":\"\"}", 2, 30);
        when(pageViewRepo.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(search, direct));

        PageResponse<AdminAnalyticsSummaryDto.RecentVisit> response = analyticsService.loadPageViews(1, 20,
                query(null, "SEARCH", null, null));

        assertEquals(1, response.getTotal());
        assertEquals(1L, response.getRecords().getFirst().getId());
    }

    @Test
    void entryTypeAndReferrerDomainFiltersUseComputedDetailFields() {
        AnalyticsPageView externalArticle = row(1L, "visit-1", "Mozilla/5.0 Chrome", "外部链接：english.sjzu.edu.cn",
                "{\"refererRaw\":\"https://english.sjzu.edu.cn/news?id=1\"}", 2, 30);
        AnalyticsPageView api = row(2L, "visit-2", "Mozilla/5.0 Chrome", "直接访问",
                "{\"refererRaw\":\"\"}", 2, 30);
        api.setPageTitle("/api/site/meta");
        when(pageViewRepo.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(externalArticle, api));

        PageResponse<AdminAnalyticsSummaryDto.RecentVisit> response = analyticsService.loadPageViews(1, 20,
                query(null, null, "ARTICLE", "english.sjzu.edu.cn"));

        assertEquals(1, response.getTotal());
        assertEquals(1L, response.getRecords().getFirst().getId());
    }

    private static AnalyticsService.AdminPageViewQuery query(String visitQuality, String sourceType,
                                                              String entryType, String referrerDomain) {
        return new AnalyticsService.AdminPageViewQuery(
                null, null, null, null, null, null, null, null,
                visitQuality, null, sourceType, referrerDomain, entryType, null, null, null, null
        );
    }

    private static AnalyticsPageView row(Long id, String visitId, String userAgent, String referrerUrl,
                                         String detailJson, Integer heartbeatCount, Integer durationSeconds) {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setId(id);
        view.setVisitId(visitId);
        view.setViewerIp("203.0.113." + id);
        view.setUserAgent(userAgent);
        view.setReferrerUrl(referrerUrl);
        view.setPageTitle("/article/" + id);
        view.setViewedAt(LocalDateTime.now());
        view.setHeartbeatCount(heartbeatCount);
        view.setTotalDurationSeconds(durationSeconds);
        view.setActiveDurationSeconds(durationSeconds);
        view.setDetailJson(detailJson);
        return view;
    }
}
