package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.AnalyticsPageViewDailyStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

public interface AnalyticsPageViewDailyStatRepository extends JpaRepository<AnalyticsPageViewDailyStat, LocalDate> {

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO analytics_page_view_daily_stats (stat_date, views, visitors, created_at, updated_at)
            VALUES (:statDate, :views, :visitors, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                views = VALUES(views),
                visitors = VALUES(visitors),
                updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    void upsertDailyStat(
            @Param("statDate") LocalDate statDate,
            @Param("views") long views,
            @Param("visitors") long visitors
    );
}

