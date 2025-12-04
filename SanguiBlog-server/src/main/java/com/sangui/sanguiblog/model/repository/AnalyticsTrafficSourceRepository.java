package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsTrafficSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AnalyticsTrafficSourceRepository extends JpaRepository<AnalyticsTrafficSource, Long> {
    List<AnalyticsTrafficSource> findByStatDateOrderByVisitsDesc(LocalDate statDate);

    Optional<AnalyticsTrafficSource> findByStatDateAndSourceLabel(LocalDate statDate, String sourceLabel);

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO analytics_traffic_sources (stat_date, source_label, visits, percentage, created_at, updated_at)
            VALUES (:statDate, :label, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE visits = visits + 1, updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    void upsertSourceVisit(@Param("statDate") LocalDate statDate, @Param("label") String label);
}
