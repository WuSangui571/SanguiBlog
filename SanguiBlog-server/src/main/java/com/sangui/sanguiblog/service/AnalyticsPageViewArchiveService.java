package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.repository.AnalyticsPageViewDailyStatRepository;
import com.sangui.sanguiblog.model.repository.AnalyticsPageViewRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 访问日志归档（防爆表）：
 * - 将旧的 analytics_page_views 按日聚合写入 analytics_page_view_daily_stats
 * - 可选：清理归档窗口之外的明细（滚动窗口）
 *
 * 默认不启用清理（避免线上突然丢明细），可通过配置打开。
 */
@Service
@RequiredArgsConstructor
public class AnalyticsPageViewArchiveService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsPageViewArchiveService.class);

    private final AnalyticsPageViewRepository analyticsPageViewRepository;
    private final AnalyticsPageViewDailyStatRepository dailyStatRepository;

    @Value("${analytics.page-views.archive.enabled:false}")
    private boolean archiveEnabled;

    @Value("${analytics.page-views.cleanup.enabled:false}")
    private boolean cleanupEnabled;

    @Value("${analytics.page-views.cleanup.retention-days:180}")
    private int retentionDays;

    @Value("${analytics.page-views.cleanup.delete-batch-size:5000}")
    private int deleteBatchSize;

    @Value("${analytics.page-views.cleanup.backfill-all:true}")
    private boolean backfillAllBeforeDelete;

    /**
     * 每天凌晨 03:20 归档一次（北京时间由 JVM 时区决定，默认 Asia/Shanghai）。
     */
    @Scheduled(cron = "${analytics.page-views.archive.cron:0 20 3 * * *}")
    public void scheduledArchive() {
        if (!archiveEnabled && !cleanupEnabled) {
            return;
        }
        if (cleanupEnabled && !archiveEnabled) {
            log.warn("访问日志清理已开启但归档未开启，已跳过清理以避免丢失历史聚合数据。");
            return;
        }
        try {
            doArchiveAndMaybeCleanup();
        } catch (Exception ex) {
            log.warn("访问日志归档任务执行失败（已忽略，不影响主流程）", ex);
        }
    }

    @Transactional
    public void doArchiveAndMaybeCleanup() {
        int safeRetention = Math.max(7, Math.min(retentionDays, 3650));
        int safeBatch = Math.max(500, Math.min(deleteBatchSize, 50000));

        LocalDate today = LocalDate.now();
        LocalDate cutoffDate = today.minusDays(safeRetention);
        LocalDateTime cutoffStart = cutoffDate.atStartOfDay();

        int upserted = 0;
        if (!cleanupEnabled) {
            // 未启用清理：仅归档“昨天”的整日数据，避免每天全表扫描
            LocalDate yesterday = today.minusDays(1);
            LocalDateTime start = yesterday.atStartOfDay();
            LocalDateTime endExclusive = today.atStartOfDay();
            List<AnalyticsPageViewRepository.DailyViewAggregation> rows =
                    analyticsPageViewRepository.aggregateDailyViewsBetween(start, endExclusive);
            for (AnalyticsPageViewRepository.DailyViewAggregation row : rows) {
                if (row == null || row.getStatDate() == null) continue;
                long views = row.getViews() != null ? row.getViews() : 0L;
                long visitors = row.getVisitors() != null ? row.getVisitors() : 0L;
                dailyStatRepository.upsertDailyStat(row.getStatDate().toLocalDate(), views, visitors);
                upserted += 1;
            }
            log.info("访问日志归档完成：归档到日聚合 {} 天（昨日），未启用清理（retentionDays={}）", upserted, safeRetention);
            return;
        }

        // 启用清理：在删除前确保历史日聚合存在（可选全量回填）
        if (backfillAllBeforeDelete) {
            List<AnalyticsPageViewRepository.DailyViewAggregation> rows =
                    analyticsPageViewRepository.aggregateDailyViewsBefore(cutoffStart);
            for (AnalyticsPageViewRepository.DailyViewAggregation row : rows) {
                if (row == null || row.getStatDate() == null) continue;
                long views = row.getViews() != null ? row.getViews() : 0L;
                long visitors = row.getVisitors() != null ? row.getVisitors() : 0L;
                dailyStatRepository.upsertDailyStat(row.getStatDate().toLocalDate(), views, visitors);
                upserted += 1;
            }
        } else {
            LocalDate lastToDelete = cutoffDate.minusDays(1);
            if (lastToDelete.isBefore(LocalDate.of(1970, 1, 1))) {
                log.warn("访问日志清理跳过：计算得到的 lastToDelete 非法，cutoffDate={}", cutoffDate);
            } else {
                LocalDateTime start = lastToDelete.atStartOfDay();
                LocalDateTime endExclusive = cutoffDate.atStartOfDay();
                List<AnalyticsPageViewRepository.DailyViewAggregation> rows =
                        analyticsPageViewRepository.aggregateDailyViewsBetween(start, endExclusive);
                for (AnalyticsPageViewRepository.DailyViewAggregation row : rows) {
                    if (row == null || row.getStatDate() == null) continue;
                    long views = row.getViews() != null ? row.getViews() : 0L;
                    long visitors = row.getVisitors() != null ? row.getVisitors() : 0L;
                    dailyStatRepository.upsertDailyStat(row.getStatDate().toLocalDate(), views, visitors);
                    upserted += 1;
                }
            }
        }

        int totalDeleted = 0;
        while (true) {
            int deleted = analyticsPageViewRepository.deleteBefore(cutoffStart, safeBatch);
            if (deleted <= 0) break;
            totalDeleted += deleted;
            if (deleted < safeBatch) break;
        }

        log.info("访问日志归档完成：归档到日聚合 {} 天，清理明细 {} 条（retentionDays={}）",
                upserted, totalDeleted, safeRetention);
    }
}
