package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.SiteSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SiteSettingRepository extends JpaRepository<SiteSetting, Long> {
    Optional<SiteSetting> findBySettingKey(String key);
}
