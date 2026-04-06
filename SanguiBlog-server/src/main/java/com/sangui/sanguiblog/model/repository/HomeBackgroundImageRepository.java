package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.HomeBackgroundImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HomeBackgroundImageRepository extends JpaRepository<HomeBackgroundImage, Long> {

    List<HomeBackgroundImage> findAllByOrderByIsCurrentDescUpdatedAtDesc();

    Optional<HomeBackgroundImage> findFirstByIsCurrentTrueOrderByUpdatedAtDesc();
}
