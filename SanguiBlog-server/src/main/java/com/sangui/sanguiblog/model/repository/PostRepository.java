package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {
    interface ArchiveMonthAggregation {
        Integer getYear();

        Integer getMonth();

        Long getCount();

        LocalDateTime getLastDate();
    }
    Optional<Post> findBySlugAndStatus(String slug, String status);

    Optional<Post> findBySlug(String slug);

    Optional<Post> findFirstByStatusOrderByPublishedAtDesc(String status);

    long countByStatus(String status);

    @Query("select coalesce(sum(p.viewsCount),0) from Post p where (:status is null or p.status = :status)")
    Long sumViewsByStatus(@Param("status") String status);

    default Long sumViews() {
        return sumViewsByStatus(null);
    }

    @Query("select coalesce(sum(p.commentsCount),0) from Post p where (:status is null or p.status = :status)")
    Long sumCommentsByStatus(@Param("status") String status);

    @Query(value = """
            SELECT id
            FROM posts
            WHERE status = 'PUBLISHED'
              AND (published_at > :pub OR (published_at = :pub AND created_at > :created))
            ORDER BY published_at ASC, created_at ASC
            LIMIT 1
            """, nativeQuery = true)
    Long findPrevPublishedId(@Param("pub") LocalDateTime pub, @Param("created") Instant created);

    @Query(value = """
            SELECT id
            FROM posts
            WHERE status = 'PUBLISHED'
              AND (published_at < :pub OR (published_at = :pub AND created_at < :created))
            ORDER BY published_at DESC, created_at DESC
            LIMIT 1
            """, nativeQuery = true)
    Long findNextPublishedId(@Param("pub") LocalDateTime pub, @Param("created") Instant created);

    @Query(value = """
            SELECT YEAR(p.published_at) AS year,
                   MONTH(p.published_at) AS month,
                   COUNT(*) AS count,
                   MAX(p.published_at) AS lastDate
            FROM posts p
            WHERE p.status = 'PUBLISHED'
              AND p.published_at IS NOT NULL
            GROUP BY YEAR(p.published_at), MONTH(p.published_at)
            ORDER BY YEAR(p.published_at) DESC, MONTH(p.published_at) DESC
            """, nativeQuery = true)
    java.util.List<ArchiveMonthAggregation> aggregateArchiveMonths();

    @Query("select max(p.publishedAt) from Post p where p.status = 'PUBLISHED' and p.publishedAt is not null")
    LocalDateTime findLatestPublishedAt();

    @Query("select p from Post p where p.status = 'PUBLISHED' and p.publishedAt is not null "
            + "and function('year', p.publishedAt) = :year and function('month', p.publishedAt) = :month")
    Page<Post> findPublishedByYearMonth(@Param("year") int year, @Param("month") int month, Pageable pageable);
}
