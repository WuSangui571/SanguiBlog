package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.GamePage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface GamePageRepository extends JpaRepository<GamePage, Long> {
    boolean existsBySlug(String slug);

    Optional<GamePage> findBySlug(String slug);

    List<GamePage> findAllByStatusOrderBySortOrderDescUpdatedAtDesc(GamePage.Status status);

    Page<GamePage> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title,
                                                                                    String description,
                                                                                    Pageable pageable);

    interface SitemapGamePageRow {
        Long getId();

        Instant getUpdatedAt();

        GamePage.Status getStatus();
    }

    @Query("select g.id as id, g.updatedAt as updatedAt, g.status as status from GamePage g "
            + "where g.status = com.sangui.sanguiblog.model.entity.GamePage$Status.ACTIVE "
            + "order by g.updatedAt desc")
    List<SitemapGamePageRow> findActiveForSitemap();
}
