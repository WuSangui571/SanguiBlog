SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
-- =============================
-- 0. 选择数据库（你已经先手动 CREATE+USE 也可以）
-- =============================
-- CREATE DATABASE IF NOT EXISTS sanguiblog_db
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_general_ci;
-- USE sanguiblog_db;

-- =============================================
-- 幂等性说明：本脚本设计为可重复执行且保护已有数据。
-- - 所有建表语句使用 CREATE TABLE IF NOT EXISTS。
-- - 种子数据使用 INSERT IGNORE 或 WHERE NOT EXISTS，重复执行不会报错或重复插入。
-- - 旧版 DROP TABLE IF EXISTS 块已移除。
--   如需完全重置数据库，请在执行本脚本前手动备份后 DROP 相关表。
-- =============================================

-- =============================
-- 1. 角色与用户
-- =============================

CREATE TABLE IF NOT EXISTS roles (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code         VARCHAR(32) NOT NULL COMMENT '角色编码，如 SUPER_ADMIN, ADMIN, USER',
    name         VARCHAR(64) NOT NULL COMMENT '角色名称（中文显示）',
    description  VARCHAR(255) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username        VARCHAR(64) NOT NULL COMMENT '登录用户名，唯一',
    display_name    VARCHAR(128) NOT NULL COMMENT '展示昵称',
    email           VARCHAR(128) NULL,
    password_hash   VARCHAR(255) NULL COMMENT '密码哈希（预留）',
    title           VARCHAR(128) NULL COMMENT '头衔/职位',
    bio             TEXT NULL COMMENT '个人简介',
    avatar_url      VARCHAR(512) NULL,
    github_url      VARCHAR(512) NULL,
    wechat_qr_url   VARCHAR(512) NULL,
    role_id         BIGINT UNSIGNED NOT NULL COMMENT '角色 ID',
    last_login_at   DATETIME NULL,
    status          ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email),
    CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 2. 权限 & 角色-权限
-- =============================

CREATE TABLE IF NOT EXISTS permissions (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code        VARCHAR(64) NOT NULL COMMENT '权限编码，如 MANAGE_USERS',
    name        VARCHAR(128) NOT NULL COMMENT '权限名称',
    description VARCHAR(255) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 3. 分类 / 标签 / 文章
-- =============================

CREATE TABLE IF NOT EXISTS categories (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(128) NOT NULL COMMENT '分类名称，如 Java Core',
    slug         VARCHAR(128) NOT NULL COMMENT 'URL 唯一标识，如 java-core',
    parent_id    BIGINT UNSIGNED NULL COMMENT '父分类 ID，顶级为 NULL',
    description  VARCHAR(255) NULL,
    sort_order   INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_slug (slug),
    KEY idx_categories_parent (parent_id),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS posts (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    author_id        BIGINT UNSIGNED NOT NULL,
    category_id      BIGINT UNSIGNED NULL COMMENT '子分类 ID',
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NOT NULL COMMENT '文章永久链接 slug',
    excerpt          VARCHAR(512) NULL COMMENT '摘要',
    content_md       MEDIUMTEXT NULL COMMENT 'Markdown 原文',
    content_html     MEDIUMTEXT NULL COMMENT '预渲染 HTML，可选',
    theme_color      VARCHAR(64) NULL COMMENT '前端使用的颜色 class，如 bg-[#6366F1]',
    cover_image      VARCHAR(512) NULL COMMENT '文章封面图片路径（/uploads/...）',
    status           ENUM('DRAFT','PUBLISHED','SCHEDULED','HIDDEN') NOT NULL DEFAULT 'DRAFT',
    likes_count      INT UNSIGNED NOT NULL DEFAULT 0,
    comments_count   INT UNSIGNED NOT NULL DEFAULT 0,
    views_count      BIGINT UNSIGNED NOT NULL DEFAULT 0,
    published_at     DATETIME NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_posts_slug (slug),
    KEY idx_posts_author (author_id),
    KEY idx_posts_category (category_id),
    KEY idx_posts_status_published_at (status, published_at),
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id),
    CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- å°æ¸¸æˆ·/è‡ªå®šä¹‰ HTML é¡µé¢
CREATE TABLE IF NOT EXISTS game_pages (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title        VARCHAR(128) NOT NULL,
    description  VARCHAR(512) NULL,
    slug         VARCHAR(128) NOT NULL,
    file_path    VARCHAR(512) NOT NULL,
    status       ENUM('ACTIVE','DISABLED','DRAFT') NOT NULL DEFAULT 'ACTIVE',
    sort_order   INT NOT NULL DEFAULT 0,
    created_by   BIGINT UNSIGNED NULL,
    updated_by   BIGINT UNSIGNED NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_game_pages_slug (slug),
    KEY idx_game_pages_status (status),
    CONSTRAINT fk_game_pages_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_game_pages_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS home_background_images (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    original_filename VARCHAR(255) NOT NULL,
    file_path       VARCHAR(512) NOT NULL,
    content_type    VARCHAR(100) NULL,
    file_size       BIGINT NOT NULL,
    is_current      TINYINT(1) NOT NULL DEFAULT 0,
    uploaded_by     BIGINT UNSIGNED NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_home_background_images_current (is_current, updated_at),
    KEY idx_home_background_images_uploaded_by (uploaded_by),
    CONSTRAINT fk_home_background_images_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS tags (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(64) NOT NULL,
    slug         VARCHAR(64) NOT NULL,
    description  VARCHAR(255) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tags_slug (slug),
    UNIQUE KEY uk_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS post_tags (
    post_id   BIGINT UNSIGNED NOT NULL,
    tag_id    BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    KEY idx_post_tags_tag (tag_id),
    CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 4. 评论
-- =============================

CREATE TABLE IF NOT EXISTS comments (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id           BIGINT UNSIGNED NOT NULL,
    user_id           BIGINT UNSIGNED NULL,
    parent_comment_id BIGINT UNSIGNED NULL,
    author_name       VARCHAR(128) NOT NULL,
    author_avatar_url VARCHAR(512) NULL,
    author_ip         VARCHAR(45) NULL,
    content           TEXT NOT NULL,
    like_count        INT UNSIGNED NOT NULL DEFAULT 0,
    status            ENUM('PENDING','APPROVED','REJECTED','SPAM') NOT NULL DEFAULT 'APPROVED',
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comments_post (post_id),
    KEY idx_comments_user (user_id),
    KEY idx_comments_parent (parent_comment_id),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 4.1 评论通知（用于给作者/被回复者发送未读提醒）
-- =============================

CREATE TABLE IF NOT EXISTS comment_notifications (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    recipient_id         BIGINT UNSIGNED NOT NULL COMMENT '接收通知的用户',
    comment_id           BIGINT UNSIGNED NOT NULL COMMENT '触发通知的评论',
    post_id              BIGINT UNSIGNED NOT NULL COMMENT '所属文章，便于快速跳转',
    comment_author_name  VARCHAR(128) NOT NULL COMMENT '评论人昵称快照',
    comment_excerpt      VARCHAR(255) NOT NULL COMMENT '评论内容截断',
    comment_author_avatar VARCHAR(512) NULL COMMENT '评论人头像快照',
    is_read              TINYINT(1) NOT NULL DEFAULT 0,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at              TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cn_recipient_comment (recipient_id, comment_id),
    KEY idx_cn_recipient (recipient_id, is_read, created_at),
    KEY idx_cn_post (post_id),
    CONSTRAINT fk_cn_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cn_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_cn_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 5. 统计分析
-- =============================

CREATE TABLE IF NOT EXISTS analytics_page_views (
    id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    visit_id                 VARCHAR(64) NULL,
    post_id                  BIGINT UNSIGNED NULL,
    page_title               VARCHAR(255) NULL,
    viewer_ip                VARCHAR(45) NOT NULL,
    user_id                  BIGINT UNSIGNED NULL,
    referrer_url             VARCHAR(512) NULL,
    geo_location             VARCHAR(128) NULL,
    user_agent               VARCHAR(512) NULL,
    viewed_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enter_time               DATETIME NULL,
    leave_time               DATETIME NULL,
    last_active_time         DATETIME NULL,
    total_duration_seconds   INT UNSIGNED NULL,
    active_duration_seconds  INT UNSIGNED NULL,
    heartbeat_count          INT UNSIGNED NOT NULL DEFAULT 0,
    visit_status             VARCHAR(32) NULL,
    detail_json              JSON NULL,
    updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_apv_visit_id (visit_id),
    KEY idx_apv_post_time (post_id, viewed_at),
    KEY idx_apv_ip_time (viewer_ip, viewed_at),
    KEY idx_apv_visit_status_time (visit_status, updated_at),
    KEY idx_apv_enter_time (enter_time),
    CONSTRAINT fk_apv_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    CONSTRAINT fk_apv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS analytics_traffic_sources (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    stat_date      DATE NOT NULL,
    source_label   VARCHAR(64) NOT NULL,
    visits         INT UNSIGNED NOT NULL DEFAULT 0,
    percentage     DECIMAL(5,2) NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ats_date_source (stat_date, source_label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 访问日志按日归档（防爆表）：用于保存历史 PV/UV 的日聚合结果
CREATE TABLE IF NOT EXISTS analytics_page_view_daily_stats (
    stat_date   DATE NOT NULL,
    views       BIGINT UNSIGNED NOT NULL DEFAULT 0,
    visitors    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS system_monitor_snapshots (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sampled_at             DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    os_family              VARCHAR(128) NULL,
    os_version             VARCHAR(255) NULL,
    uptime_seconds         BIGINT UNSIGNED NULL,
    cpu_load_percent       DECIMAL(5,2) NULL,
    memory_total_bytes     BIGINT UNSIGNED NULL,
    memory_used_bytes      BIGINT UNSIGNED NULL,
    disk_total_bytes       BIGINT UNSIGNED NULL,
    disk_used_bytes        BIGINT UNSIGNED NULL,
    network_bytes_received BIGINT UNSIGNED NULL,
    network_bytes_sent     BIGINT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_system_monitor_sampled_at (sampled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 6. 系统广播 & 设置
-- =============================

CREATE TABLE IF NOT EXISTS system_broadcasts (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    content     VARCHAR(512) NOT NULL,
    style       VARCHAR(32) NOT NULL DEFAULT 'ALERT',
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_by  BIGINT UNSIGNED NULL,
    active_from DATETIME NULL,
    active_to   DATETIME NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_system_broadcasts_active (is_active, active_from),
    CONSTRAINT fk_system_broadcasts_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS site_settings (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key   VARCHAR(128) NOT NULL,
    setting_value TEXT NULL,
    description   VARCHAR(255) NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_site_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 7. 初始化数据（角色 -> 用户 -> 分类 -> 标签 -> 文章等）
-- =========================================================

-- 角色
INSERT IGNORE INTO roles (id, code, name, description) VALUES
  (1, 'SUPER_ADMIN', '超级管理员', '拥有系统全部权限'),
  (2, 'ADMIN',       '管理员',     '管理内容与用户'),
  (3, 'USER',        '用户',       '普通注册用户');

-- 用户（包含前端 MOCK_USER）
-- 默认初始密码：Sangui@123（请登录后立即修改）
INSERT IGNORE INTO users
(id, username, display_name, email, password_hash, title, bio, avatar_url,
 github_url, wechat_qr_url, role_id, last_login_at, status)
VALUES
(1,
 'sangui',
 '三桂 SanGui',
 'sangui@example.com',
 '$2a$10$QdizlT8ZvrYACG8Fd1coVuGcN6O6XPRSuoYn2acfj8rS9whGFv0J.',
 'Fullstack Developer',
 '用代码构建现实，用逻辑解构虚无。',
 'sangui.jpg',
 'https://github.com/Wusangui571',
 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SanGuiBlogWeChat',
 1,
 '2025-11-21 10:00:00',
 'ACTIVE');

INSERT IGNORE INTO users (username, display_name, email, password_hash, role_id, status) VALUES
('admin_user1',  'AdminUser1',  'admin1@example.com',  '$2a$10$QdizlT8ZvrYACG8Fd1coVuGcN6O6XPRSuoYn2acfj8rS9whGFv0J.', 2, 'ACTIVE'),
('editor_user2', 'EditorUser2', 'editor2@example.com', '$2a$10$QdizlT8ZvrYACG8Fd1coVuGcN6O6XPRSuoYn2acfj8rS9whGFv0J.', 3, 'ACTIVE');

-- 分类（顶级）
INSERT IGNORE INTO categories (id, name, slug, parent_id, description, sort_order) VALUES
(1, '硬核编程', 'programming', NULL, '硬核编程相关内容', 1),
(2, '架构视角', 'architecture', NULL, '系统与架构设计', 2),
(3, '数字生活', 'life',        NULL, '数字生活与思考', 3);

-- 子分类
INSERT IGNORE INTO categories (id, name, slug, parent_id, description, sort_order) VALUES
(4, 'Java Core',       'java-core',       1, 'Java 核心技术',     1),
(5, 'Modern Web',      'modern-web',      1, '现代 Web 前端技术', 2),
(6, 'Algorithms',      'algorithms',      1, '算法与数据结构',   3),
(7, 'Cloud Native',    'cloud-native',    2, '云原生相关',       1),
(8, 'Distributed Sys', 'distributed-sys', 2, '分布式系统',       2),
(9, '装备党',           'gear',            3, '数码装备 & 工具',  1),
(10,'碎碎念',           'think',           3, '生活随笔',         2);

-- 标签
INSERT IGNORE INTO tags (id, name, slug, description) VALUES
(1, 'Java',          'java',          '与 Java 语言相关的文章'),
(2, 'AOT',           'aot',           'Ahead-of-Time 编译相关'),
(3, 'Vue3',          'vue3',          'Vue 3 框架相关'),
(4, 'Refactor',      'refactor',      '重构、代码优化'),
(5, 'Microservices', 'microservices', '微服务架构'),
(6, 'System Design', 'system-design', '系统设计相关');

-- 文章（与你前端 MOCK_POSTS 和 Analytics 示例对齐）
INSERT IGNORE INTO posts
(id, author_id, category_id, title, slug, excerpt, content_md, theme_color,
 status, likes_count, comments_count, views_count, published_at)
VALUES
(101, 1, 4,
 'SpringBoot 3.0: 原生编译的终极奥义',
 'springboot-3-native-aot',
 'GraalVM AOT.',
 '## SpringBoot 3.0: 原生编译的终极奥义\n\n这里是示例正文内容，可以替换为真实 Markdown。',
 'bg-[#6366F1]',
 'PUBLISHED', 128, 45, 532, '2023-11-24 10:00:00'
),
(102, 1, 5,
 'Vue3 Composition API: 逻辑复用的艺术',
 'vue3-composition-api-art-of-reuse',
 '告别 Options API 的面条代码。',
 '## Vue3 Composition API: 逻辑复用的艺术\n\n这里是示例正文内容，可以替换为真实 Markdown。',
 'bg-[#FF0080]',
 'PUBLISHED', 89, 12, 321, '2023-11-20 10:00:00'
),
(103, 1, 8,
 '微服务的一致性困局：Saga 还是 TCC？',
 'saga-vs-tcc-consistency',
 '分布式事务没有银弹。',
 '## 微服务的一致性困局：Saga 还是 TCC？\n\n这里是示例正文内容，可以替换为真实 Markdown。',
 'bg-[#00E096]',
 'PUBLISHED', 256, 67, 890, '2023-11-15 10:00:00'
),
(104, 1, 5,
 'The Future of AI in Web Development',
 'future-of-ai-in-web-development',
 'Exploring how AI will change the way we build for the web.',
 '## The Future of AI in Web Development\n\nDemo content.',
 'bg-[#6366F1]',
 'PUBLISHED', 42, 5, 150, '2025-11-01 09:00:00'
),
(105, 1, 5,
 'A Guide to Modern CSS Layouts',
 'guide-to-modern-css-layouts',
 'From Flexbox to Grid and beyond.',
 '## A Guide to Modern CSS Layouts\n\nDemo content.',
 'bg-[#FF0080]',
 'PUBLISHED', 30, 4, 120, '2025-11-05 09:00:00'
),
(106, 1, 10,
 'My Favorite Productivity Apps',
 'my-favorite-productivity-apps',
 'Tools that keep me in flow every day.',
 '## My Favorite Productivity Apps\n\nDemo content.',
 'bg-[#00E096]',
 'PUBLISHED', 15, 2, 80, '2025-11-10 09:00:00'
);

-- 文章-标签关联
INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES
(101, 1),
(101, 2),
(102, 3),
(102, 4),
(103, 5),
(103, 6);

-- 评论（对应前端 mock）
INSERT IGNORE INTO comments
(id, post_id, user_id, parent_comment_id, author_name, author_avatar_url,
 author_ip, content, like_count, status, created_at)
VALUES
(1, 101, NULL, NULL,
 'GeekOne', NULL,
 '192.168.0.10',
 'AOT 编译确实是未来，但是反射的问题还是比较难搞。',
 3, 'APPROVED', '2025-11-20 21:00:00'
),
(2, 101, NULL, NULL,
 'JavaFan', NULL,
 '192.168.0.11',
 '博主写得太透彻了！特别是字节码分析那一段。',
 5, 'APPROVED', '2025-11-20 22:15:00'
);

-- PV 日志（对应 MOCK_ANALYTICS.recentActivity）
INSERT IGNORE INTO analytics_page_views
(post_id, page_title, viewer_ip, user_id, referrer_url, geo_location, viewed_at)
VALUES
(104,
 'The Future of AI in Web Development',
 '192.168.1.1',
 NULL,
 'https://google.com',
 'San Francisco, US',
 '2025-11-21 15:30:12'
),
(105,
 'A Guide to Modern CSS Layouts',
 '10.0.0.5',
 NULL,
 'https://x.com/techfeed',
 'Shanghai, CN',
 '2025-11-21 15:28:45'
),
(106,
 'My Favorite Productivity Apps',
 '203.0.113.20',
 NULL,
 '(Direct)',
 'London, UK',
 '2025-11-21 15:25:01'
),
(101,
 'SpringBoot 3.0: 原生编译的终极奥义',
 '203.0.113.20',
 NULL,
 '(Direct)',
 'London, UK',
 '2025-11-21 15:25:01'
);

-- 流量来源统计
INSERT IGNORE INTO analytics_traffic_sources
(stat_date, source_label, visits, percentage)
VALUES
('2025-11-21', 'Search Engine', 712, 45.00),
('2025-11-21', 'Direct',        475, 30.00),
('2025-11-21', 'Social Media',  237, 15.00),
('2025-11-21', 'Referrals',     158, 10.00);

-- 权限
-- ????? permissions_seed.sql ???
INSERT INTO permissions (code, name, description) VALUES
  ('POST_VIEW',       '????',         '???????????'),
  ('POST_CREATE',     '????',         '????????'),
  ('POST_EDIT',       '????',         '??????????'),
  ('POST_DELETE',     '????',         '???????'),
  ('POST_PUBLISH',    '??/????',   '????????????'),
  ('COMMENT_VIEW',    '????',         '????????'),
  ('COMMENT_CREATE',  '????',         '?????????????'),
  ('COMMENT_REPLY',   '????',         '???????????'),
  ('COMMENT_REVIEW',  '????',         '????????????'),
  ('COMMENT_DELETE',  '????',         '????????'),
  ('CATEGORY_MANAGE', '????',         '??/??/????'),
  ('TAG_MANAGE',      '????',         '??/??/????'),
  ('ANALYTICS_VIEW',  '?????',      '??????????'),
  ('GAME_MANAGE',     '小游戏管理',    '上传/替换/删除自定义 HTML 页面'),
  ('USER_MANAGE',     '????',         '??/??/??????'),
  ('PERMISSION_MANAGE','????',        '????????????'),
  ('PROFILE_UPDATE',  '??????',   '?????????')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 1=1
WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'POST_VIEW','POST_CREATE','POST_EDIT','POST_DELETE','POST_PUBLISH',
    'COMMENT_VIEW','COMMENT_CREATE','COMMENT_REPLY','COMMENT_REVIEW',
    'CATEGORY_MANAGE','TAG_MANAGE','ANALYTICS_VIEW','PROFILE_UPDATE'
)
WHERE r.code = 'ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('POST_VIEW','COMMENT_CREATE','PROFILE_UPDATE')
WHERE r.code = 'USER'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 系统广播
INSERT INTO system_broadcasts
(content, style, is_active, created_by, active_from)
SELECT '系统将于今晚 00:00 停机维护', 'ALERT', 1, 1, '2025-11-21 00:00:00'
WHERE NOT EXISTS (
    SELECT 1 FROM system_broadcasts
    WHERE content = '系统将于今晚 00:00 停机维护'
      AND style = 'ALERT'
      AND active_from = '2025-11-21 00:00:00'
);

-- About 页面
CREATE TABLE IF NOT EXISTS about_page (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_md MEDIUMTEXT,
    content_html MEDIUMTEXT,
    updated_by BIGINT UNSIGNED,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_about_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- 初始化一条占位记录，便于后台提交编辑
INSERT INTO about_page (id, content_md, content_html, updated_by, created_at, updated_at)
SELECT 1, NULL, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM about_page WHERE id = 1);

-- AI 聊天会话
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    guest_visitor_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    last_message_preview VARCHAR(500),
    session_start_ip VARCHAR(64),
    latest_ip VARCHAR(64),
    ip_changed TINYINT(1) NOT NULL DEFAULT 0,
    ip_changed_at DATETIME(6),
    user_visible TINYINT(1) NOT NULL DEFAULT 1,
    user_hidden_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ai_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ai_chat_sessions_user_updated (user_id, updated_at, id),
    INDEX idx_ai_chat_sessions_guest_visitor (guest_visitor_id)
);

-- ai_chat_sessions 兼容性列迁移（已创建则跳过）
-- 原语句 ALTER TABLE ... ADD COLUMN IF NOT EXISTS 仅 MariaDB 原生支持。
-- 改用 INFORMATION_SCHEMA 检查，兼容 MySQL 8.0 与 MariaDB。
-- 如需手动添加列，参考 docs/docker-deploy.md 第 16 节"AI 表诊断与修复"。
ALTER TABLE ai_chat_sessions
    MODIFY COLUMN user_id BIGINT UNSIGNED NULL;

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

DELIMITER $$

CREATE PROCEDURE add_column_if_not_exists(
    IN tbl_name VARCHAR(128),
    IN col_name VARCHAR(128),
    IN col_def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl_name
          AND COLUMN_NAME = col_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE ', tbl_name, ' ADD COLUMN ', col_name, ' ', col_def);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

CALL add_column_if_not_exists('ai_chat_sessions', 'guest_visitor_id', 'VARCHAR(64) NULL AFTER user_id');
CALL add_column_if_not_exists('ai_chat_sessions', 'session_start_ip', 'VARCHAR(64) NULL AFTER last_message_preview');
CALL add_column_if_not_exists('ai_chat_sessions', 'latest_ip', 'VARCHAR(64) NULL AFTER session_start_ip');
CALL add_column_if_not_exists('ai_chat_sessions', 'ip_changed', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER latest_ip');
CALL add_column_if_not_exists('ai_chat_sessions', 'ip_changed_at', 'DATETIME(6) NULL AFTER ip_changed');
CALL add_column_if_not_exists('ai_chat_sessions', 'user_visible', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER last_message_preview');
CALL add_column_if_not_exists('ai_chat_sessions', 'user_hidden_at', 'DATETIME(6) NULL AFTER user_visible');

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- AI 聊天消息
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content LONGTEXT NOT NULL,
    model_name VARCHAR(64),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ai_chat_messages_session FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_ai_chat_messages_session_created (session_id, created_at, id)
);

-- AI 博客文章知识同步主表（MySQL 仅存同步状态与向量映射，不存向量本体）
CREATE TABLE IF NOT EXISTS ai_blog_knowledge_documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content_hash CHAR(64) NOT NULL,
    sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    last_error VARCHAR(1000),
    last_synced_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_ai_blog_knowledge_post (post_id),
    KEY idx_ai_blog_knowledge_sync_status (sync_status)
);

-- AI 博客文章分片与 PgVector 文档 ID 映射表
CREATE TABLE IF NOT EXISTS ai_blog_knowledge_chunks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    document_id BIGINT NOT NULL,
    chunk_no INT NOT NULL,
    vector_document_id VARCHAR(128) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ai_blog_knowledge_chunks_document FOREIGN KEY (document_id) REFERENCES ai_blog_knowledge_documents(id) ON DELETE CASCADE,
    UNIQUE KEY uk_ai_blog_chunk_vector_document (vector_document_id),
    UNIQUE KEY uk_ai_blog_chunk_order (document_id, chunk_no),
    KEY idx_ai_blog_knowledge_document (document_id)
);

-- AI 超级管理员导入知识库主表（文本型文件导入后存正文与同步状态）
CREATE TABLE IF NOT EXISTS ai_custom_knowledge_documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_text LONGTEXT NOT NULL,
    content_hash CHAR(64) NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    last_error VARCHAR(1000),
    last_synced_at DATETIME(6),
    uploaded_by BIGINT UNSIGNED,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    KEY idx_ai_custom_knowledge_sync_status (sync_status),
    KEY idx_ai_custom_knowledge_enabled (enabled),
    CONSTRAINT fk_ai_custom_knowledge_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- AI 超级管理员导入知识库分片与 PgVector 文档 ID 映射表
CREATE TABLE IF NOT EXISTS ai_custom_knowledge_chunks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    document_id BIGINT NOT NULL,
    chunk_no INT NOT NULL,
    vector_document_id VARCHAR(128) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ai_custom_knowledge_chunks_document FOREIGN KEY (document_id) REFERENCES ai_custom_knowledge_documents(id) ON DELETE CASCADE,
    UNIQUE KEY uk_ai_custom_chunk_vector_document (vector_document_id),
    UNIQUE KEY uk_ai_custom_chunk_order (document_id, chunk_no),
    KEY idx_ai_custom_knowledge_document (document_id)
);

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

-- 注册邀请码（仅 SUPER_ADMIN 可生成；一次性使用并带过期时间）
CREATE TABLE IF NOT EXISTS registration_invites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invite_code VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    consumed_by BIGINT UNSIGNED NULL,
    consumed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_registration_invites_code (invite_code),
    KEY idx_registration_invites_expires_at (expires_at),
    KEY idx_registration_invites_consumed_at (consumed_at),
    CONSTRAINT fk_registration_invites_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_registration_invites_consumed_by FOREIGN KEY (consumed_by) REFERENCES users(id) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;
