package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByNameIgnoreCase(String name);

    Optional<Tag> findBySlugIgnoreCase(String slug);

    Page<Tag> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(String nameKeyword, String slugKeyword, Pageable pageable);

    @Query(value = """
            SELECT COUNT(DISTINCT pt.tag_id)
            FROM post_tags pt
            JOIN posts p ON p.id = pt.post_id
            WHERE p.status = :status
            """, nativeQuery = true)
    long countDistinctTagsByPostStatus(@Param("status") String status);
}
