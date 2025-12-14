package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {
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
}
