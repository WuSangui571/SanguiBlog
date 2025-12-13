SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
-- =============================
-- 0. 选择数据库（你已经先手动 CREATE+USE 也可以）
-- =============================
-- CREATE DATABASE IF NOT EXISTS sanguiblog_db
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_general_ci;
-- USE sanguiblog_db;

-- 为了方便多次执行，先删表（有顺序，先删外键依赖）
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS analytics_page_views;
DROP TABLE IF EXISTS analytics_traffic_sources;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS game_pages;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS system_broadcasts;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================
-- 1. 角色与用户
-- =============================

CREATE TABLE roles (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code         VARCHAR(32) NOT NULL COMMENT '角色编码，如 SUPER_ADMIN, ADMIN, USER',
    name         VARCHAR(64) NOT NULL COMMENT '角色名称（中文显示）',
    description  VARCHAR(255) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username        VARCHAR(64) NOT NULL COMMENT '登录用户名，唯一',
    display_name    VARCHAR(128) NOT NULL COMMENT '展示昵称',
    email           VARCHAR(128) NULL,
    password_hash   VARCHAR(255) NULL COMMENT '密码哈希（预留）',
    title           VARCHAR(128) NULL COMMENT '头衔/职位',
    bio             VARCHAR(512) NULL COMMENT '个人简介',
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

CREATE TABLE permissions (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code        VARCHAR(64) NOT NULL COMMENT '权限编码，如 MANAGE_USERS',
    name        VARCHAR(128) NOT NULL COMMENT '权限名称',
    description VARCHAR(255) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE role_permissions (
    role_id       BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================
-- 3. 分类 / 标签 / 文章
-- =============================

CREATE TABLE categories (
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

CREATE TABLE posts (
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
CREATE TABLE game_pages (
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

CREATE TABLE tags (
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

CREATE TABLE post_tags (
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

CREATE TABLE comments (
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
-- 5. 统计分析
-- =============================

CREATE TABLE analytics_page_views (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id       BIGINT UNSIGNED NULL,
    page_title    VARCHAR(255) NULL,
    viewer_ip     VARCHAR(45) NOT NULL,
    user_id       BIGINT UNSIGNED NULL,
    referrer_url  VARCHAR(512) NULL,
    geo_location  VARCHAR(128) NULL,
    user_agent    VARCHAR(512) NULL,
    viewed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_apv_post_time (post_id, viewed_at),
    KEY idx_apv_ip_time (viewer_ip, viewed_at),
    CONSTRAINT fk_apv_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    CONSTRAINT fk_apv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE analytics_traffic_sources (
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

-- =============================
-- 6. 系统广播 & 设置
-- =============================

CREATE TABLE system_broadcasts (
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

CREATE TABLE site_settings (
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
INSERT INTO roles (id, code, name, description) VALUES
  (1, 'SUPER_ADMIN', '超级管理员', '拥有系统全部权限'),
  (2, 'ADMIN',       '管理员',     '管理内容与用户'),
  (3, 'USER',        '用户',       '普通注册用户');

-- 用户（包含前端 MOCK_USER）
INSERT INTO users
(id, username, display_name, email, password_hash, title, bio, avatar_url,
 github_url, wechat_qr_url, role_id, last_login_at, status)
VALUES
(1,
 'sangui',
 '三桂 SanGui',
 'sangui@example.com',
 NULL,
 'Fullstack Developer',
 '用代码构建现实，用逻辑解构虚无。',
 'sangui.jpg',
 'https://github.com/Wusangui571',
 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SanGuiBlogWeChat',
 1,
 '2025-11-21 10:00:00',
 'ACTIVE');

INSERT INTO users (username, display_name, email, role_id, status) VALUES
('admin_user1',  'AdminUser1',  'admin1@example.com',  2, 'ACTIVE'),
('editor_user2', 'EditorUser2', 'editor2@example.com', 3, 'ACTIVE');

-- 分类（顶级）
INSERT INTO categories (id, name, slug, parent_id, description, sort_order) VALUES
(1, '硬核编程', 'programming', NULL, '硬核编程相关内容', 1),
(2, '架构视角', 'architecture', NULL, '系统与架构设计', 2),
(3, '数字生活', 'life',        NULL, '数字生活与思考', 3);

-- 子分类
INSERT INTO categories (id, name, slug, parent_id, description, sort_order) VALUES
(4, 'Java Core',       'java-core',       1, 'Java 核心技术',     1),
(5, 'Modern Web',      'modern-web',      1, '现代 Web 前端技术', 2),
(6, 'Algorithms',      'algorithms',      1, '算法与数据结构',   3),
(7, 'Cloud Native',    'cloud-native',    2, '云原生相关',       1),
(8, 'Distributed Sys', 'distributed-sys', 2, '分布式系统',       2),
(9, '装备党',           'gear',            3, '数码装备 & 工具',  1),
(10,'碎碎念',           'think',           3, '生活随笔',         2);

-- 标签
INSERT INTO tags (id, name, slug, description) VALUES
(1, 'Java',          'java',          '与 Java 语言相关的文章'),
(2, 'AOT',           'aot',           'Ahead-of-Time 编译相关'),
(3, 'Vue3',          'vue3',          'Vue 3 框架相关'),
(4, 'Refactor',      'refactor',      '重构、代码优化'),
(5, 'Microservices', 'microservices', '微服务架构'),
(6, 'System Design', 'system-design', '系统设计相关');

-- 文章（与你前端 MOCK_POSTS 和 Analytics 示例对齐）
INSERT INTO posts
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
INSERT INTO post_tags (post_id, tag_id) VALUES
(101, 1),
(101, 2),
(102, 3),
(102, 4),
(103, 5),
(103, 6);

-- 评论（对应前端 mock）
INSERT INTO comments
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
INSERT INTO analytics_page_views
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
INSERT INTO analytics_traffic_sources
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

DELETE rp FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.code IN ('SUPER_ADMIN','ADMIN','USER');

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

-- ????
INSERT INTO system_broadcasts
(content, style, is_active, created_by, active_from)
VALUES
('系统将于今晚 00:00 停机维护', 'ALERT', 1, 1, '2025-11-21 00:00:00');

-- About ��ҳ
CREATE TABLE IF NOT EXISTS about_page (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_md MEDIUMTEXT,
    content_html MEDIUMTEXT,
    updated_by BIGINT UNSIGNED,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_about_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- ��ʼ��һ���ռ�¼�����ں����ύ�༭
INSERT INTO about_page (id, content_md, content_html, updated_by, created_at, updated_at)
SELECT 1, NULL, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM about_page WHERE id = 1);
