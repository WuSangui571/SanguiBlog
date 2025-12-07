package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
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

    @EntityGraph(attributePaths = {"post"})
    List<AnalyticsPageView> findTop20ByOrderByViewedAtDesc();

    boolean existsByPostIdAndViewerIpAndViewedAtAfter(Long postId, String viewerIp, LocalDateTime viewedAt);

    @Query("SELECT COUNT(apv) FROM AnalyticsPageView apv WHERE (:start IS NULL OR apv.viewedAt >= :start)")
    long countViewsSince(@Param("start") LocalDateTime start);

    @Query("SELECT COUNT(apv) FROM AnalyticsPageView apv WHERE apv.user IS NOT NULL AND (:start IS NULL OR apv.viewedAt >= :start)")
    long countLoggedInViewsSince(@Param("start") LocalDateTime start);

    @Query(value = """
            SELECT COUNT(DISTINCT CASE
                       WHEN user_id IS NOT NULL THEN CONCAT('U#', user_id)
                       ELSE CONCAT('G#', viewer_ip)
                   END)
            FROM analytics_page_views
            WHERE (:start IS NULL OR viewed_at >= :start)
            """, nativeQuery = true)
    long countDistinctVisitorsSince(@Param("start") LocalDateTime start);

    @Query(value = """
            SELECT DATE(viewed_at) AS stat_date,
                   COUNT(*)        AS views,
                   COUNT(DISTINCT CASE
                       WHEN user_id IS NOT NULL THEN CONCAT('U#', user_id)
                       ELSE CONCAT('G#', viewer_ip)
                   END)            AS visitors
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

    @EntityGraph(attributePaths = {"post", "user", "user.role"})
    Page<AnalyticsPageView> findAllByOrderByViewedAtDesc(Pageable pageable);

    long deleteByUser_Id(Long userId);

    @Query("select distinct apv.viewerIp from AnalyticsPageView apv where apv.user.id = :userId and apv.viewerIp is not null")
    List<String> findDistinctViewerIpByUserId(@Param("userId") Long userId);

    long deleteByUserIsNullAndViewerIpIn(Collection<String> viewerIps);

    long countByIdIn(Collection<Long> ids);
}
