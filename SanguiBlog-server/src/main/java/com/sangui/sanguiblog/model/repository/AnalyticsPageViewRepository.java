package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsPageView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnalyticsPageViewRepository extends JpaRepository<AnalyticsPageView, Long> {
    List<AnalyticsPageView> findTop20ByOrderByViewedAtDesc();
}
