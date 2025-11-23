package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByNameIgnoreCase(String name);

    Optional<Tag> findBySlugIgnoreCase(String slug);

    Page<Tag> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(String nameKeyword, String slugKeyword, Pageable pageable);
}
