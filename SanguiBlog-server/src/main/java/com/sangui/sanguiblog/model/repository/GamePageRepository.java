package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.GamePage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GamePageRepository extends JpaRepository<GamePage, Long> {
    boolean existsBySlug(String slug);

    Optional<GamePage> findBySlug(String slug);

    List<GamePage> findAllByStatusOrderBySortOrderDescUpdatedAtDesc(GamePage.Status status);

    Page<GamePage> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title,
                                                                                    String description,
                                                                                    Pageable pageable);
}
