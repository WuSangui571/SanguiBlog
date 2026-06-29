-- 文章浏览时长 / 活跃浏览时长统计（第一阶段）
-- 为现有 analytics_page_views 扩展 visit 相关字段与索引。
--
-- 说明：
-- - 本仓库没有自动 migration runner，生产/已有 Docker 数据卷需要手动执行本文件。
-- - 旧历史行 visit_id / enter_time 等可为空，后台展示兜底为 '-'，不强制回填。
-- - MySQL 8 支持一次性 ALTER 多列；如需重复执行，请先 `SHOW COLUMNS FROM analytics_page_views` 确认列是否已存在。
-- - visit_id 为唯一索引，旧历史行 visit_id 为 NULL，MySQL 允许多个 NULL 共存，不会破坏唯一约束。

ALTER TABLE analytics_page_views
  ADD COLUMN visit_id VARCHAR(64) NULL AFTER id,
  ADD COLUMN enter_time DATETIME NULL AFTER viewed_at,
  ADD COLUMN leave_time DATETIME NULL AFTER enter_time,
  ADD COLUMN last_active_time DATETIME NULL AFTER leave_time,
  ADD COLUMN total_duration_seconds INT UNSIGNED NULL AFTER last_active_time,
  ADD COLUMN active_duration_seconds INT UNSIGNED NULL AFTER total_duration_seconds,
  ADD COLUMN heartbeat_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER active_duration_seconds,
  ADD COLUMN visit_status VARCHAR(32) NULL AFTER heartbeat_count,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER visit_status,
  ADD UNIQUE KEY uk_apv_visit_id (visit_id),
  ADD KEY idx_apv_visit_status_time (visit_status, updated_at),
  ADD KEY idx_apv_enter_time (enter_time);
