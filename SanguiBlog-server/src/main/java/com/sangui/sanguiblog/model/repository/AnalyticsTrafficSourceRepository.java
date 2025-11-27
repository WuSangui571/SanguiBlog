package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsTrafficSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AnalyticsTrafficSourceRepository extends JpaRepository<AnalyticsTrafficSource, Long> {
    List<AnalyticsTrafficSource> findByStatDateOrderByVisitsDesc(LocalDate statDate);

    Optional<AnalyticsTrafficSource> findByStatDateAndSourceLabel(LocalDate statDate, String sourceLabel);
}
