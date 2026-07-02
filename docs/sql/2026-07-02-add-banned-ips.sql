-- IP 封禁黑名单功能表
-- 新增 banned_ips 与 ip_ban_audit_logs 两张表。
--
-- 说明：
-- - 本仓库没有自动 migration runner，生产/已有 Docker 数据卷需要手动执行本文件。
-- - 如需重复执行，请先 `SHOW TABLES LIKE 'banned_ips';` / `SHOW TABLES LIKE 'ip_ban_audit_logs';` 确认是否已存在。
-- - 使用 CREATE TABLE IF NOT EXISTS，可安全重复执行。

-- IP 封禁黑名单（仅 SUPER_ADMIN 可管理；ip 全局唯一，重新封禁复用同一行）
CREATE TABLE IF NOT EXISTS banned_ips (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip            VARCHAR(45) NOT NULL,
    reason        VARCHAR(512) NULL,
    enabled       TINYINT(1) NOT NULL DEFAULT 1,
    hit_count     BIGINT UNSIGNED NOT NULL DEFAULT 0,
    last_hit_time DATETIME(6) NULL,
    created_at    DATETIME(6) NOT NULL,
    created_by    BIGINT UNSIGNED NULL,
    updated_at    DATETIME(6) NOT NULL,
    updated_by    BIGINT UNSIGNED NULL,
    unbanned_at   DATETIME(6) NULL,
    unbanned_by   BIGINT UNSIGNED NULL,
    unban_reason  VARCHAR(512) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_banned_ips_ip (ip),
    KEY idx_banned_ips_enabled_ip (enabled, ip),
    KEY idx_banned_ips_last_hit_time (last_hit_time),
    CONSTRAINT fk_banned_ips_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_banned_ips_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_banned_ips_unbanned_by FOREIGN KEY (unbanned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- IP 封禁操作审计（feature-scoped；不记录 Cookie/Token/请求体等敏感数据）
CREATE TABLE IF NOT EXISTS ip_ban_audit_logs (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    banned_ip_id         BIGINT UNSIGNED NULL,
    action               VARCHAR(32) NOT NULL,
    ip                   VARCHAR(45) NOT NULL,
    reason               VARCHAR(512) NULL,
    actor_id             BIGINT UNSIGNED NULL,
    actor_username       VARCHAR(128) NULL,
    source_page_view_id  BIGINT UNSIGNED NULL,
    created_at           DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ip_ban_audit_ip_time (ip, created_at),
    KEY idx_ip_ban_audit_actor_time (actor_id, created_at),
    CONSTRAINT fk_ip_ban_audit_banned_ip FOREIGN KEY (banned_ip_id) REFERENCES banned_ips(id) ON DELETE SET NULL,
    CONSTRAINT fk_ip_ban_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ip_ban_audit_page_view FOREIGN KEY (source_page_view_id) REFERENCES analytics_page_views(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
