package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AnalyticsPageViewRepository extends JpaRepository<AnalyticsPageView, Long> {

    interface DailyViewAggregation {
        java.sql.Date getStatDate();

        Long getViews();

        Long getVisitors();
    }

    interface TopPostAggregation {
        Long getPostId();

        String getTitle();

        String getSlug();

        Long getViews();
    }

    List<AnalyticsPageView> findTop20ByOrderByViewedAtDesc();

    boolean existsByPostIdAndViewerIpAndViewedAtAfter(Long postId, String viewerIp, LocalDateTime viewedAt);

    long countByViewedAtAfter(LocalDateTime start);

    long countByUserIsNotNullAndViewedAtAfter(LocalDateTime start);

    @Query("SELECT COUNT(DISTINCT apv.viewerIp) FROM AnalyticsPageView apv WHERE apv.viewedAt >= :start")
    long countDistinctViewerIpSince(@Param("start") LocalDateTime start);

    @Query(value = """
            SELECT DATE(viewed_at) AS stat_date,
                   COUNT(*)        AS views,
                   COUNT(DISTINCT viewer_ip) AS visitors
            FROM analytics_page_views
            WHERE viewed_at >= :start
            GROUP BY DATE(viewed_at)
            ORDER BY stat_date
            """, nativeQuery = true)
    List<DailyViewAggregation> aggregateDailyViews(@Param("start") LocalDateTime start);

    @Query("SELECT apv.post.id AS postId, apv.post.title AS title, apv.post.slug AS slug, COUNT(apv) AS views "
            + "FROM AnalyticsPageView apv "
            + "WHERE apv.post IS NOT NULL AND apv.viewedAt >= :start "
            + "GROUP BY apv.post.id, apv.post.title, apv.post.slug "
            + "ORDER BY COUNT(apv) DESC")
    List<TopPostAggregation> findTopPostsSince(@Param("start") LocalDateTime start, Pageable pageable);

    List<AnalyticsPageView> findAllByOrderByViewedAtDesc(Pageable pageable);
}
