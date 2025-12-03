package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AboutPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AboutPageRepository extends JpaRepository<AboutPage, Long> {
    Optional<AboutPage> findTopByOrderByUpdatedAtDesc();
    Optional<AboutPage> findTopByOrderByIdAsc();
}
