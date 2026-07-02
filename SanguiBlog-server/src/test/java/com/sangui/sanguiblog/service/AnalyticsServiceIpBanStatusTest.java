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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalyticsServiceIpBanStatusTest {

    private AnalyticsService analyticsService;
    private AnalyticsPageViewRepository pageViewRepo;
    private IpBanService ipBanService;

    @BeforeEach
    void setUp() {
        pageViewRepo = mock(AnalyticsPageViewRepository.class);
        PostRepository postRepo = mock(PostRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        CommentRepository commentRepo = mock(CommentRepository.class);
        AnalyticsTrafficSourceRepository trafficRepo = mock(AnalyticsTrafficSourceRepository.class);
        GeoIpService geoIpService = mock(GeoIpService.class);
        ipBanService = mock(IpBanService.class);
        analyticsService = new AnalyticsService(pageViewRepo, postRepo, userRepo, commentRepo, trafficRepo, geoIpService, ipBanService);
    }

    @Test
    void shouldBatchMarkBannedRowsWithoutPerRowLookup() {
        AnalyticsPageView row1 = row(1L, "203.0.113.1");
        AnalyticsPageView row2 = row(2L, "203.0.113.2");
        Pageable pageable = PageRequest.of(0, 20);
        when(pageViewRepo.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(row1, row2), pageable, 2));
        when(ipBanService.resolveEnabledBanIds(anyCollection())).thenReturn(Map.of("203.0.113.1", 99L));

        PageResponse<AdminAnalyticsSummaryDto.RecentVisit> response =
                analyticsService.loadPageViews(1, 20, emptyQuery());

        assertEquals(2, response.getRecords().size());
        AdminAnalyticsSummaryDto.RecentVisit first = response.getRecords().get(0);
        AdminAnalyticsSummaryDto.RecentVisit second = response.getRecords().get(1);
        assertTrue(first.isIpBanned());
        assertEquals(99L, first.getIpBanId());
        assertFalse(second.isIpBanned());
        assertNull(second.getIpBanId());
        verify(ipBanService, times(1)).resolveEnabledBanIds(anyCollection());
    }

    @Test
    void shouldRenderEmptyBanStateWhenNoBans() {
        AnalyticsPageView row1 = row(1L, "203.0.113.1");
        when(pageViewRepo.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(row1), PageRequest.of(0, 20), 1));
        when(ipBanService.resolveEnabledBanIds(anyCollection())).thenReturn(Map.of());

        PageResponse<AdminAnalyticsSummaryDto.RecentVisit> response =
                analyticsService.loadPageViews(1, 20, emptyQuery());

        assertFalse(response.getRecords().get(0).isIpBanned());
        assertNull(response.getRecords().get(0).getIpBanId());
    }

    private static AnalyticsService.AdminPageViewQuery emptyQuery() {
        return new AnalyticsService.AdminPageViewQuery(
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null
        );
    }

    private static AnalyticsPageView row(Long id, String ip) {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setId(id);
        view.setViewerIp(ip);
        view.setPageTitle("/article/" + id);
        view.setViewedAt(LocalDateTime.now());
        view.setHeartbeatCount(0);
        return view;
    }
}
