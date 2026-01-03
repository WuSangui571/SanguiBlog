-- 访问日志按日归档（防爆表）- 迁移脚本
-- 说明：项目当前 spring.jpa.hibernate.ddl-auto=none，需要手动建表。
-- 执行环境：MySQL 8.x（或兼容版本）

CREATE TABLE IF NOT EXISTS analytics_page_view_daily_stats (
    stat_date   DATE NOT NULL,
    views       BIGINT UNSIGNED NOT NULL DEFAULT 0,
    visitors    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

