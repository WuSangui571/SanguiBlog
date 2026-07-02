package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.ArticleVisitEndRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitHeartbeatRequest;
import com.sangui.sanguiblog.model.dto.ArticleVisitStartRequest;
import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import com.sangui.sanguiblog.model.entity.Post;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsTrafficSourceRepository;
import com.sangui.sanguiblog.model.repository.CommentRepository;
import com.sangui.sanguiblog.model.repository.PostRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import jakarta.persistence.Column;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AnalyticsServiceVisitDurationTest {

    private AnalyticsService analyticsService;
    private AnalyticsPageViewRepository pageViewRepo;
    private PostRepository postRepo;
    private UserRepository userRepo;
    private GeoIpService geoIpService;

    @BeforeEach
    void setUp() {
        pageViewRepo = mock(AnalyticsPageViewRepository.class);
        postRepo = mock(PostRepository.class);
        userRepo = mock(UserRepository.class);
        CommentRepository commentRepo = mock(CommentRepository.class);
        AnalyticsTrafficSourceRepository trafficRepo = mock(AnalyticsTrafficSourceRepository.class);
        geoIpService = mock(GeoIpService.class);
        IpBanService ipBanService = mock(IpBanService.class);

        analyticsService = new AnalyticsService(pageViewRepo, postRepo, userRepo, commentRepo, trafficRepo, geoIpService, ipBanService);
    }

    // ===== sanitizeDurationSeconds =====

    @Test
    void sanitizeNullReturnsZero() {
        assertEquals(0, analyticsService.sanitizeDurationSeconds(null));
    }

    @Test
    void sanitizeNegativeReturnsZero() {
        assertEquals(0, analyticsService.sanitizeDurationSeconds(-5));
        assertEquals(0, analyticsService.sanitizeDurationSeconds(-1));
    }

    @Test
    void sanitizeAboveMaxClampedTo7200() {
        assertEquals(AnalyticsService.MAX_VISIT_DURATION_SECONDS,
                analyticsService.sanitizeDurationSeconds(7201));
        assertEquals(AnalyticsService.MAX_VISIT_DURATION_SECONDS,
                analyticsService.sanitizeDurationSeconds(1_000_000));
    }

    @Test
    void sanitizeNormalValuePassesThrough() {
        assertEquals(30, analyticsService.sanitizeDurationSeconds(30));
        assertEquals(7200, analyticsService.sanitizeDurationSeconds(7200));
    }

    @Test
    void updatedAtIsDatabaseManagedToPreserveDefaultOnInsert() throws NoSuchFieldException {
        Column column = AnalyticsPageView.class.getDeclaredField("updatedAt").getAnnotation(Column.class);
        assertNotNull(column);
        assertFalse(column.insertable(), "updated_at has a DB default and must not be inserted as null by JPA");
        assertFalse(column.updatable(), "updated_at uses ON UPDATE CURRENT_TIMESTAMP and must remain DB-managed");
    }

    // ===== resolveDisplayDurationSeconds =====

    @Test
    void displayPrefersActiveDuration() {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setActiveDurationSeconds(40);
        view.setTotalDurationSeconds(60);
        assertEquals(40, analyticsService.resolveDisplayDurationSeconds(view));
    }

    @Test
    void displayFallsBackToTotalWhenActiveNull() {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setTotalDurationSeconds(60);
        assertEquals(60, analyticsService.resolveDisplayDurationSeconds(view));
    }

    @Test
    void displayFallsBackToLastActiveMinusEnter() {
        AnalyticsPageView view = new AnalyticsPageView();
        LocalDateTime enter = LocalDateTime.now().minusSeconds(70);
        view.setEnterTime(enter);
        view.setLastActiveTime(LocalDateTime.now());
        Integer result = analyticsService.resolveDisplayDurationSeconds(view);
        assertNotNull(result);
        assertTrue(result >= 69 && result <= 71);
    }

    @Test
    void displayReturnsNullWhenNoData() {
        AnalyticsPageView view = new AnalyticsPageView();
        assertNull(analyticsService.resolveDisplayDurationSeconds(view));
        assertNull(analyticsService.resolveDisplayDurationSeconds(null));
    }

    @Test
    void displayClampsComputedDurationToMax() {
        AnalyticsPageView view = new AnalyticsPageView();
        view.setEnterTime(LocalDateTime.now().minusSeconds(10_000));
        view.setLastActiveTime(LocalDateTime.now());
        assertEquals(AnalyticsService.MAX_VISIT_DURATION_SECONDS,
                analyticsService.resolveDisplayDurationSeconds(view));
    }

    // ===== heartbeat =====

    @Test
    void heartbeatMissingVisitIdIsNoOp() {
        ArticleVisitHeartbeatRequest req = new ArticleVisitHeartbeatRequest();
        req.setVisitId("");
        req.setActiveDurationSeconds(30);
        analyticsService.recordArticleVisitHeartbeat(req);
        verify(pageViewRepo, never()).findByVisitId(any());
        verify(pageViewRepo, never()).save(any());
    }

    @Test
    void heartbeatUnknownVisitIdIsNoOp() {
        when(pageViewRepo.findByVisitId("unknown")).thenReturn(Optional.empty());
        ArticleVisitHeartbeatRequest req = new ArticleVisitHeartbeatRequest();
        req.setVisitId("unknown");
        req.setActiveDurationSeconds(30);
        analyticsService.recordArticleVisitHeartbeat(req);
        verify(pageViewRepo, never()).save(any());
    }

    @Test
    void heartbeatUpdatesLastActiveAndCountAndTakesMaxActive() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        row.setActiveDurationSeconds(20);
        row.setHeartbeatCount(2);
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitHeartbeatRequest req = new ArticleVisitHeartbeatRequest();
        req.setVisitId("v1");
        req.setActiveDurationSeconds(45);
        analyticsService.recordArticleVisitHeartbeat(req);

        assertEquals(45, row.getActiveDurationSeconds());
        assertEquals(3, row.getHeartbeatCount());
        assertNotNull(row.getLastActiveTime());
        verify(pageViewRepo).save(row);
    }

    @Test
    void heartbeatDoesNotRegressActiveDurationOnSmallerIncoming() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        row.setActiveDurationSeconds(60);
        row.setHeartbeatCount(1);
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitHeartbeatRequest req = new ArticleVisitHeartbeatRequest();
        req.setVisitId("v1");
        req.setActiveDurationSeconds(10);
        analyticsService.recordArticleVisitHeartbeat(req);

        assertEquals(60, row.getActiveDurationSeconds());
    }

    @Test
    void heartbeatClampsNegativeAndOversize() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        row.setHeartbeatCount(0);
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitHeartbeatRequest req = new ArticleVisitHeartbeatRequest();
        req.setVisitId("v1");
        req.setActiveDurationSeconds(-10);
        analyticsService.recordArticleVisitHeartbeat(req);
        assertEquals(0, row.getActiveDurationSeconds());

        req.setActiveDurationSeconds(99_999);
        analyticsService.recordArticleVisitHeartbeat(req);
        assertEquals(AnalyticsService.MAX_VISIT_DURATION_SECONDS, row.getActiveDurationSeconds());
    }

    @Test
    void heartbeatNormalizesLongVisitIdToStoredColumnLength() {
        String longId = "v".repeat(80);
        String storedId = longId.substring(0, 64);
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId(storedId);
        row.setHeartbeatCount(0);
        when(pageViewRepo.findByVisitId(storedId)).thenReturn(Optional.of(row));

        ArticleVisitHeartbeatRequest req = new ArticleVisitHeartbeatRequest();
        req.setVisitId(longId);
        req.setActiveDurationSeconds(30);
        analyticsService.recordArticleVisitHeartbeat(req);

        verify(pageViewRepo).findByVisitId(storedId);
        assertEquals(30, row.getActiveDurationSeconds());
    }

    // ===== end =====

    @Test
    void endMissingVisitIdIsNoOp() {
        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId(null);
        analyticsService.recordArticleVisitEnd(req);
        verify(pageViewRepo, never()).save(any());
    }

    @Test
    void endUnknownVisitIdIsNoOp() {
        when(pageViewRepo.findByVisitId("unknown")).thenReturn(Optional.empty());
        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId("unknown");
        req.setTotalDurationSeconds(75);
        req.setActiveDurationSeconds(63);
        analyticsService.recordArticleVisitEnd(req);
        verify(pageViewRepo, never()).save(any());
    }

    @Test
    void endSetsClosedAndAbsoluteDurations() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId("v1");
        req.setTotalDurationSeconds(75);
        req.setActiveDurationSeconds(63);
        analyticsService.recordArticleVisitEnd(req);

        assertEquals(75, row.getTotalDurationSeconds());
        assertEquals(63, row.getActiveDurationSeconds());
        assertEquals(AnalyticsService.VISIT_STATUS_CLOSED, row.getVisitStatus());
        assertNotNull(row.getLeaveTime());
        verify(pageViewRepo).save(row);
    }

    @Test
    void endClampsActiveToTotal() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId("v1");
        req.setTotalDurationSeconds(30);
        req.setActiveDurationSeconds(90);
        analyticsService.recordArticleVisitEnd(req);

        assertEquals(30, row.getTotalDurationSeconds());
        assertEquals(30, row.getActiveDurationSeconds());
    }

    @Test
    void endRepeatDoesNotDoubleDuration() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        row.setTotalDurationSeconds(100);
        row.setActiveDurationSeconds(80);
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId("v1");
        req.setTotalDurationSeconds(50);
        req.setActiveDurationSeconds(40);
        analyticsService.recordArticleVisitEnd(req);

        // 重复 end 不能叠加/翻倍，保持更大合法绝对值
        assertEquals(100, row.getTotalDurationSeconds());
        assertEquals(80, row.getActiveDurationSeconds());
    }

    @Test
    void endClampsOversizeAndNegative() {
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId("v1");
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(row));

        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId("v1");
        req.setTotalDurationSeconds(-5);
        req.setActiveDurationSeconds(-10);
        analyticsService.recordArticleVisitEnd(req);

        assertEquals(0, row.getTotalDurationSeconds());
        assertEquals(0, row.getActiveDurationSeconds());

        req.setTotalDurationSeconds(99_999);
        req.setActiveDurationSeconds(99_999);
        analyticsService.recordArticleVisitEnd(req);
        assertEquals(AnalyticsService.MAX_VISIT_DURATION_SECONDS, row.getTotalDurationSeconds());
        assertEquals(AnalyticsService.MAX_VISIT_DURATION_SECONDS, row.getActiveDurationSeconds());
    }

    @Test
    void endNormalizesLongVisitIdToStoredColumnLength() {
        String longId = "v".repeat(80);
        String storedId = longId.substring(0, 64);
        AnalyticsPageView row = new AnalyticsPageView();
        row.setVisitId(storedId);
        when(pageViewRepo.findByVisitId(storedId)).thenReturn(Optional.of(row));

        ArticleVisitEndRequest req = new ArticleVisitEndRequest();
        req.setVisitId(longId);
        req.setTotalDurationSeconds(75);
        req.setActiveDurationSeconds(63);
        analyticsService.recordArticleVisitEnd(req);

        verify(pageViewRepo).findByVisitId(storedId);
        assertEquals(75, row.getTotalDurationSeconds());
        assertEquals(63, row.getActiveDurationSeconds());
    }

    // ===== start =====

    @Test
    void startMissingVisitIdIsNoOp() {
        ArticleVisitStartRequest req = new ArticleVisitStartRequest();
        req.setVisitId("");
        req.setArticleId(123L);
        analyticsService.recordArticleVisitStart(req, "1.2.3.4", "ua", null);
        verify(pageViewRepo, never()).save(any());
    }

    @Test
    void startInvalidArticleIdIsNoOp() {
        ArticleVisitStartRequest req = new ArticleVisitStartRequest();
        req.setVisitId("v1");
        req.setArticleId(null);
        analyticsService.recordArticleVisitStart(req, "1.2.3.4", "ua", null);
        verify(pageViewRepo, never()).save(any());

        req.setArticleId(0L);
        analyticsService.recordArticleVisitStart(req, "1.2.3.4", "ua", null);
        verify(pageViewRepo, never()).save(any());
    }

    @Test
    void startCreatesOpenRowWhenAbsent() {
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.empty());
        Post post = new Post();
        post.setId(123L);
        post.setTitle("Hello");
        when(postRepo.findById(123L)).thenReturn(Optional.of(post));
        when(geoIpService.lookup(any())).thenReturn("上海");

        ArticleVisitStartRequest req = new ArticleVisitStartRequest();
        req.setVisitId("v1");
        req.setArticleId(123L);
        req.setTitle("Hello");
        req.setReferrer("https://google.com");
        analyticsService.recordArticleVisitStart(req, "1.2.3.4", "ua", null);

        verify(pageViewRepo).save(argThat(row -> "v1".equals(row.getVisitId())
                && AnalyticsService.VISIT_STATUS_OPEN.equals(row.getVisitStatus())
                && row.getEnterTime() != null
                && row.getHeartbeatCount() == 0
                && row.getPost() != null));
    }

    @Test
    void startIsIdempotentWhenRowExists() {
        AnalyticsPageView existing = new AnalyticsPageView();
        existing.setVisitId("v1");
        existing.setEnterTime(LocalDateTime.now());
        existing.setVisitStatus(AnalyticsService.VISIT_STATUS_OPEN);
        when(pageViewRepo.findByVisitId("v1")).thenReturn(Optional.of(existing));

        ArticleVisitStartRequest req = new ArticleVisitStartRequest();
        req.setVisitId("v1");
        req.setArticleId(123L);
        req.setTitle("Hello");
        analyticsService.recordArticleVisitStart(req, "1.2.3.4", "ua", null);

        verify(pageViewRepo).save(existing);
        verify(postRepo, never()).save(any());
        // 不重复创建第二行
        verify(pageViewRepo, times(1)).save(any());
    }

    @Test
    void startTrimsLongVisitIdTo64() {
        when(pageViewRepo.findByVisitId(any())).thenReturn(Optional.empty());
        when(postRepo.findById(1L)).thenReturn(Optional.empty());
        when(geoIpService.lookup(any())).thenReturn("未知");

        String longId = "v".repeat(80);
        ArticleVisitStartRequest req = new ArticleVisitStartRequest();
        req.setVisitId(longId);
        req.setArticleId(1L);
        analyticsService.recordArticleVisitStart(req, "1.2.3.4", "ua", null);

        verify(pageViewRepo).save(argThat(row -> row.getVisitId() != null && row.getVisitId().length() == 64));
    }

    @Test
    void recordPageViewNormalizesLongVisitIdBeforeSaving() {
        String longId = "v".repeat(80);
        String storedId = longId.substring(0, 64);
        when(pageViewRepo.findByVisitId(storedId)).thenReturn(Optional.empty());
        when(geoIpService.lookup(any())).thenReturn("未知");

        analyticsService.recordPageView(null, "1.2.3.4", "ua", null, longId);

        verify(pageViewRepo).findByVisitId(storedId);
        verify(pageViewRepo).save(argThat(row -> storedId.equals(row.getVisitId())));
    }

    @Test
    void recordPageViewMergesRecentTransientOpenArticleVisitForSameViewer() {
        Post post = new Post();
        post.setId(237L);
        post.setTitle("Hello");

        AnalyticsPageView transientRow = new AnalyticsPageView();
        transientRow.setVisitId("old-route-visit");
        transientRow.setPost(post);
        transientRow.setViewerIp("1.2.3.4");
        transientRow.setViewedAt(LocalDateTime.now());
        transientRow.setEnterTime(LocalDateTime.now());
        transientRow.setVisitStatus(AnalyticsService.VISIT_STATUS_OPEN);
        transientRow.setHeartbeatCount(0);

        when(pageViewRepo.findByVisitId("new-route-visit")).thenReturn(Optional.empty());
        when(pageViewRepo.findFirstByPost_IdAndViewerIpAndVisitStatusAndViewedAtAfterOrderByViewedAtDesc(
                eq(237L),
                eq("1.2.3.4"),
                eq(AnalyticsService.VISIT_STATUS_OPEN),
                any(LocalDateTime.class)
        )).thenReturn(Optional.of(transientRow));

        com.sangui.sanguiblog.model.dto.PageViewRequest request = new com.sangui.sanguiblog.model.dto.PageViewRequest();
        request.setPostId(237L);
        request.setPageTitle("Hello");
        request.setReferrer("from-home");

        analyticsService.recordPageView(request, "1.2.3.4", "ua", null, "new-route-visit");

        assertEquals("new-route-visit", transientRow.getVisitId());
        assertEquals(AnalyticsService.VISIT_STATUS_OPEN, transientRow.getVisitStatus());
        verify(pageViewRepo).save(transientRow);
        verify(postRepo, never()).findById(237L);
    }
}
