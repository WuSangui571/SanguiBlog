-- SanguiBlog 权限初始化脚本
SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO permissions (code, name, description) VALUES
  ('POST_VIEW', '浏览文章', '访问后台文章列表与详情'),
  ('POST_CREATE', '新建文章', '创建并发布新文章'),
  ('POST_EDIT', '编辑文章', '修改文章内容与元数据'),
  ('POST_DELETE', '删除文章', '删除或下线文章'),
  ('POST_PUBLISH', '发布/归档文章', '切换文章状态为发布或归档'),
  ('COMMENT_VIEW', '查看评论', '浏览后台评论列表'),
  ('COMMENT_CREATE', '发表评论', '在后台代替官方账号进行回复'),
  ('COMMENT_REPLY', '回复评论', '以后台身份回复访客评论'),
  ('COMMENT_REVIEW', '审核评论', '审核、通过或隐藏评论内容'),
  ('COMMENT_DELETE', '删除评论', '删除任意评论内容'),
  ('CATEGORY_MANAGE', '管理分类', '创建/编辑/删除分类'),
  ('TAG_MANAGE', '管理标签', '创建/编辑/删除标签'),
  ('ANALYTICS_VIEW', '查看分析页', '访问仪表盘与分析页面'),
  ('USER_MANAGE', '管理用户', '创建/编辑/禁用后台账号'),
  ('PERMISSION_MANAGE', '管理权限', '调整管理员/用户的模块权限'),
  ('PROFILE_UPDATE', '修改个人资料', '修改自己的账号资料')
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

COMMIT;
