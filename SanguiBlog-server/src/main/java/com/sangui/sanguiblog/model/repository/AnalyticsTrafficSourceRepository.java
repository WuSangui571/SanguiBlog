package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsTrafficSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AnalyticsTrafficSourceRepository extends JpaRepository<AnalyticsTrafficSource, Long> {
    List<AnalyticsTrafficSource> findByStatDateOrderByVisitsDesc(LocalDate statDate);
}
