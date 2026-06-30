-- 访问日志详细日志（第二阶段）
-- 为 analytics_page_views 新增 detail_json 字段，用于存储请求详情。
--
-- 说明：
-- - 本仓库没有自动 migration runner，生产/已有 Docker 数据卷需要手动执行本文件。
-- - 如需重复执行，请先 `SHOW COLUMNS FROM analytics_page_views LIKE 'detail_json';` 确认列是否已存在。
-- - detail_json 允许为 NULL，旧历史行无需回填。

ALTER TABLE analytics_page_views
  ADD COLUMN detail_json JSON NULL AFTER visit_status;
