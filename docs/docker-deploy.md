# SanguiBlog Docker 部署指南

## 1. 概述

SanguiBlog 容器化部署基于 Docker Compose，提供两种部署模式：

### 开发/本地模式

使用 `docker-compose.yml`，在服务器上执行 `build:` 构建镜像，适合本地开发和调试。

### 生产模式（镜像拉取部署，推荐）

使用 `docker-compose.prod.yml`，`web` 和 `backend` 服务从 GitHub Container Registry (GHCR) 拉取预构建的镜像，不在服务器上执行 `build:`。镜像由 GitHub Actions 在 push 到 `main` 分支后自动构建并推送。

服务组成：

- **web** (Nginx)：前端 SPA + 反向代理
- **backend** (Spring Boot 3 / Java 21)：REST API
- **mysql** (MySQL 8.0)：主业务数据库
- **pgvector** (PostgreSQL 16 + PgVector)：AI RAG 向量库

## 2. 环境要求

- Docker >= 24.0
- Docker Compose >= 2.17
- 可用磁盘空间 >= 2 GB（镜像 + 数据卷）

## 3. 快速开始

### 3.1 开发/本地部署（服务器 build 镜像）

```bash
cp .env.example .env
# 编辑 .env 填入必填项

docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

### 3.2 生产部署（从 GHCR 拉取镜像，推荐）

```bash
cp .env.example .env
# 编辑 .env，填入必填项和镜像 tag
# 生产建议: SANGUI_IMAGE_TAG=sha-<short_sha>

# 首次使用前登录 GHCR（如 package 为 private）
docker login ghcr.io -u <github-username> --password-stdin

# 拉取并启动
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

启动成功后访问 `http://localhost` 即可看到博客首页。

## 4. 环境变量说明

完整变量列表见 `.env.example`。

### 必填项

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（建议 32+ 字符随机串）|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 |
| `MYSQL_PASSWORD` | MySQL 业务用户密码 |
| `SPRING_DATASOURCE_PASSWORD` | 与 `MYSQL_PASSWORD` 相同 |
| `POSTGRES_PASSWORD` | PgVector 用户密码 |

### 生产镜像配置（推荐设置）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SANGUI_IMAGE_REGISTRY` | `ghcr.io/wusangui571/sanguiblog` | 镜像仓库前缀，不要填写 token |
| `SANGUI_IMAGE_TAG` | `main` | 镜像 tag。生产建议固定为 `sha-<short_sha>` 以实现可回滚部署 |

可选 AI 相关变量（不填则 AI 聊天不可用）：

| 变量 | 说明 |
|------|------|
| `AI_DASHSCOPE_API_KEY` | DashScope API Key |
| `AI_RAG_ENABLED` | 启用博客 RAG（需先填 DashScope key）|
| `AI_RAG_PGVECTOR_URL` | PgVector 连接地址（Compose 默认指向 `pgvector` 服务）|

`.env.example` 中的敏感变量默认留空。`docker compose config` 或 `docker compose up` 会在 `JWT_SECRET`、数据库密码等必填值缺失时直接失败，避免容器使用仓库内的假密钥启动。

## 5. 常用命令

```bash
# 启动
docker compose up -d --build

# 停止
docker compose down

# 停止并清理数据卷（⚠ 会删除所有数据库数据）
# 注意：再次启动时 MySQL 需重新导入 sanguiblog_db.sql（~731 行），首次冷启动会比平时慢
# 约 1-2 分钟内全部服务应进入 healthy/running 状态，无需手动重启
docker compose down -v

# 查看日志
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f web

# 进入 MySQL 命令行（在容器内读取 Compose 注入的数据库变量）
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'

# 进入 PostgreSQL 命令行
docker compose exec pgvector psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# 验证 PgVector 扩展已启用
docker compose exec pgvector psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension WHERE extname='vector';"

# 重启单个服务
docker compose restart backend
```

## 6. 验证部署

```bash
# 前端首页
curl -i http://localhost/

# 后端 API
curl -i http://localhost/api/site/meta

# 站点地图（应返回 XML，不是 HTML）
curl -i http://localhost/sitemap.xml

# robots.txt（应返回 text/plain，不是 HTML）
curl -i http://localhost/robots.txt

# 上传资源
curl -i http://localhost/uploads/
```

## 7. 镜像 Tag 策略与生产部署

### 7.1 Tag 规则

CI/CD 在 push 到 `main` 分支时自动构建并推送以下 tag：

| Tag | 说明 | 用途 |
|-----|------|------|
| `sha-<short_sha>` | Git commit 前 8 位 | **生产推荐**：不可变，可回溯，可精确回滚 |
| `main` | 当前 `main` 分支最新构建 | 临时/备用环境默认沿用 |
| `latest` | 与 `main` 等同 | 不推荐生产使用（移动 tag） |
| `vX.Y.Z` | Git tag `v*` 触发时生成 | 版本化发布（可选） |

镜像完整路径（示例）：

```
ghcr.io/wusangui571/sanguiblog/sanguiblog-web:sha-abc12340
ghcr.io/wusangui571/sanguiblog/sanguiblog-backend:sha-abc12340
```

### 7.2 首次 GHCR 登录

如果镜像仓库为 private，服务器需要登录 GHCR：

```bash
# 创建具有 read:packages 权限的 GitHub Personal Access Token (classic)
# 然后登录（凭据保存在 Docker credential store，无需写入 .env）
echo "你的PAT" | docker login ghcr.io -u <github-username> --password-stdin
```

> 服务器 `.env` 中不要保存 registry token 或 PAT。

### 7.3 生产部署完整流程

```bash
# 1. 拉取最新代码（compose 文件和配置文件）
git pull origin main

# 2. 编辑服务器 .env，指定要部署的镜像 tag
#    SANGUI_IMAGE_TAG=sha-abc12340

# 3. 拉取新镜像
docker compose -f docker-compose.prod.yml pull

# 4. 滚动更新服务
docker compose -f docker-compose.prod.yml up -d

# 5. 确认服务状态
docker compose -f docker-compose.prod.yml ps

# 6. 健康验证
curl -i http://localhost/
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
```

### 7.4 回滚流程

当新版本出现问题时，回滚到上一个已知可用的 `sha-*` tag：

```bash
# 1. 编辑服务器 .env，切换到上一个已知可用的 tag
#    SANGUI_IMAGE_TAG=sha-previous

# 2. 拉取旧镜像
docker compose -f docker-compose.prod.yml pull

# 3. 重启服务
docker compose -f docker-compose.prod.yml up -d

# 4. 确认状态
docker compose -f docker-compose.prod.yml ps

# 5. 验证核心端点
curl -i http://localhost/api/site/meta
curl -i http://localhost/
```

> 回滚的前提是生产使用固定 `sha-*` tag。如果使用 `main` 或 `latest`（移动 tag），回滚需要找到历史镜像的完整 sha256 digest，操作更复杂。

### 7.5 关于 Watchtower

Watchtower 等自动拉取最新镜像并重启容器的方案**不作为首版默认方案**，原因：

- `latest`/`main` 是移动 tag，自动更新后可能引入未验证的变更
- 自动回滚需要额外的 tag 追踪和健康检测逻辑
- 手动控制部署节奏和回滚 tag 更安全

如后续考虑自动化，可将其作为可选方案另行配置，但仍需记录每次部署的 `sha-*` tag 以便快速回滚。

### 7.6 生产注意事项

- `.env` 文件始终保留在服务器上，不进入 Git 仓库
- 不要在 CI 日志或文档中打印完整的 `.env` 展开值
- 不要在生产环境执行 `docker compose down -v`（会清空所有数据卷）
- 每次部署时记录当前的 `SANGUI_IMAGE_TAG` 值以便回滚

## 8. 数据同步与恢复

如果要将服务器生产数据导出、下载并恢复到本地 Docker 环境（或迁移到新服务器），参考 [docker-data-sync.md](./docker-data-sync.md)，其中包含：

- 服务器端 MySQL / PgVector / uploads 导出流程
- 本地 Windows Docker 恢复流程（含自动化 PowerShell 脚本）
- 恢复后验证清单
- 回滚与排障流程
- 敏感信息处理规则

---

## 9. 数据持久化

以下数据存储在 Docker volumes 中，`docker compose down` 不会删除：

| Volume | 内容 |
|--------|------|
| `mysql_data` | MySQL 数据库文件 |
| `pgvector_data` | PgVector 数据库文件 |
| `uploads_data` | 上传文件（头像、文章图片、封面等）|

备份建议：

```bash
# MySQL 备份
docker compose exec mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > backup.sql

# uploads 备份
docker compose cp web:/data/uploads ./uploads-backup/
```

清理数据卷（谨慎操作）：

```bash
docker compose down -v
```

## 10. AI RAG 启用步骤

1. 在 `.env` 中设置：
   ```
   # 填入 DashScope API Key
   AI_DASHSCOPE_API_KEY=
   AI_RAG_ENABLED=true
   AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=true
   ```

2. 重启服务：
   ```bash
   docker compose up -d --build
   ```

3. 待 PgVector 初始化 `vector_store` 表后，建议将 `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA` 改回 `false`

## 11. HTTPS 配置

默认 Compose 提供 HTTP 访问。生产环境 HTTPS 可通过以下方式：

### 方案一：外部反向代理（推荐）

在宿主机上运行 Nginx/Caddy 做 TLS 终止，反代到 Compose 的 web 容器端口。

### 方案二：挂载证书到 Nginx 容器

1. 将证书文件放入 `docker/nginx/ssl/`
2. 修改 `docker/nginx/default.conf`，添加 SSL 配置
3. 在 `docker-compose.yml` 中挂载证书目录并暴露 443 端口

## 12. Nginx 配置说明

Docker 部署的 Nginx 配置位于 `docker/nginx/default.conf`，关键路由：

| 路径 | 处理方式 | 说明 |
|------|----------|------|
| `/` | SPA fallback | `try_files $uri /index.html` |
| `/sitemap.xml` | 代理到 backend | 优先于 SPA fallback |
| `/robots.txt` | 代理到 backend | 优先于 SPA fallback |
| `/api/` | 代理到 backend | JSON API |
| `/api/ai/chat/stream` | 代理到 backend | SSE 流式，禁用缓冲 |
| `/uploads/` | Nginx alias | 静态文件服务 |
| `/uploads/games/` | Nginx alias + CSP | 允许同源 iframe |
| `/avatar/` | Nginx alias | 兼容已有头像 URL |

> 注意：`fake-nginx-config/nginx.conf` 是旧宿主机部署的 Nginx 配置参考。Docker 部署以 `docker/nginx/default.conf` 为准。

## 13. 与旧部署方式的区别

| 项目 | 旧宿主机部署 | Docker 部署 |
|------|-------------|-------------|
| 前端 | 手动构建 dist，Nginx 直接服务 | 容器内多阶段构建 |
| 后端 | `java -jar` 宿主机运行 | 容器内运行 |
| 数据库 | 宿主机 MySQL/PostgreSQL | Compose 内 MySQL/PgVector |
| uploads | 宿主机目录 `/home/sangui/uploads` | Docker volume `uploads_data` |
| 配置 | `application-local.yaml` + `switch-env.ps1` | `.env` + `application-docker.yaml` |
| 环境切换 | `./scripts/switch-env.ps1 dev/prod` | 编辑 `.env` 重启 |

`./scripts/switch-env.ps1` 不适用于 Docker 部署，请使用 `.env` 文件管理 Docker 环境变量。

## 14. 常见问题

| 现象 | 可能原因 | 解决方案 |
|------|----------|----------|
| backend 启动失败 | JWT_SECRET 未设置 | 在 `.env` 中设置 `JWT_SECRET` |
| MySQL 连接失败 | backend 连接宿主机数据库 | 检查 `SPRING_DATASOURCE_URL` 中的 host 是否为 `mysql` |
| `/sitemap.xml` 返回 HTML | SPA fallback 捕获 | 检查 Nginx `location = /sitemap.xml` 是否存在 |
| AI 聊天无响应 | DashScope key 未配 | 设置 `AI_DASHSCOPE_API_KEY` 后重启 |
| RAG 不生效 | PgVector 未初始化 | 检查 `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=true` |
| uploads 上传失败 | 路径权限问题 | 检查 `storage.base-path` 是否为 `/data/uploads`；若子目录为 root 所有（`ls -ld /data/uploads/*` 显示 `root:root`），执行 `docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"` |
| 容器重启后数据丢失 | 未使用 Docker volume | 确认 `docker-compose.yml` 中定义并使用了 volumes |
| 端口冲突 | 宿主机 80 端口被占用 | 设置 `WEB_PORT=8080` 在 `.env` 中 |
| AI 聊天报错"服务器内部错误"，日志提示 `Table 'sanguiblog_db.ai_chat_messages' doesn't exist` | MySQL 数据卷复用（AI 表 DDL 更新后未重新执行 init 脚本）| 手动导入缺失的 AI 表，见下方 [AI 表诊断与修复](#16-ai-表诊断与修复) |
| `down -v` 后首次启动，backend/web 状态为 unhealthy 或反复重启 | MySQL 健康检查仅验证端口连通，未等待 `sanguiblog_db.sql` 初始化完成就通知 backend 启动 | 已修复：MySQL 健康检查现在通过 TCP 验证 `roles` 表可查询后才标记 healthy，避免命中初始化阶段的本地 socket。若仍需更长时间，可增大 `docker-compose.yml` 中 MySQL `start_period` 或 `retries` 值 |

## 15. 临时上线 / 备用服务器部署验证清单

本章节面向在备用服务器或临时环境中首次部署 SanguiBlog 的场景。按以下步骤逐项验证，确保所有核心路径可用后再对外开放访问。

### 15.1 服务器基础环境检查

```bash
# 检查 Docker 版本（要求 >= 24.0）
docker --version

# 检查 Docker Compose 版本（要求 >= 2.17）
docker compose version

# 检查目标端口是否空闲（默认为 80）
# Windows
netstat -ano | findstr ":80 "
# Linux
ss -tlnp | grep ':80 '
# 若端口被占用，在 .env 中设置 WEB_PORT 为其他空闲端口

# 检查防火墙 / 安全组是否放行目标端口（从服务器外部用浏览器或 curl 测试前确认）
# 云服务器需在控制台安全组中放行入方向 TCP <WEB_PORT 或 80>
```

### 15.2 必填环境变量清单

复制 `.env.example` 为 `.env` 后，以下变量**必须**填入真实值，否则 `docker compose up` 将直接失败：

| 变量 | 说明 | 示例（切勿使用示例值） |
|------|------|------------------------|
| `MYSQL_PASSWORD` | MySQL 业务用户密码 | 随机强密码 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | 随机强密码 |
| `POSTGRES_PASSWORD` | PgVector 用户密码 | 随机强密码 |
| `JWT_SECRET` | JWT 签名密钥 | 32+ 字符随机串 |

站点访问配置（推荐填写，同源 Docker 部署可保留大多数默认值）：

| 变量 | 建议值 | 说明 |
|------|--------|------|
| `SITE_BASE_URL` | `http://你的域名或IP` | 生产/临时域名；必须包含协议 |
| `SITE_ALLOWED_HOSTS` | `你的域名或IP` | 与用户访问的 host 一致 |
| `SECURITY_CORS_ALLOWED_ORIGINS` | `http://你的域名或IP` | 同源部署通常匹配 `SITE_BASE_URL` |
| `SITE_ASSET_BASE_URL` | （留空） | 同源 Docker 部署必须留空，切勿填入 `/uploads` 等路径前缀 |

验证 `.env` 配置语法：

```bash
docker compose config
```

> `docker compose config` 会展开 `.env` 中的真实变量值，可能包含数据库密码或 JWT 密钥。只在本机/服务器终端检查是否无报错，不要截图、粘贴或提交完整输出。

### 15.3 备用环境 AI 配置建议

备用/临时服务器建议**关闭 AI 功能**，避免引入 DashScope 外部依赖和 PgVector/RAG 初始化风险。核心博客、管理端、上传、sitemap/robots 均不依赖 AI。

在 `.env` 中确保以下设置：

```env
AI_RAG_ENABLED=false
# AI_DASHSCOPE_API_KEY 留空
# AI_RAG_PGVECTOR_INITIALIZE_SCHEMA 保持默认 false
```

> 后续如需启用 AI，参考第 10 节"AI RAG 启用步骤"。

### 15.4 冷启动验证流程

> ⚠ **仅在没有真实数据的测试/备用环境中执行**。`docker compose down -v` 会清空所有数据库和上传数据。

```bash
# 1. 清理旧数据卷（首次部署或清空测试数据）
docker compose down -v

# 2. 构建镜像并启动全部服务
docker compose up -d --build
# 预期：首次构建约 3-5 分钟；冷启动约 1-2 分钟内全部服务进入 healthy/running

# 3. 观察 MySQL 初始化日志
docker compose logs -f mysql
# 关键观察点：
#   - 看到 "ready for connections. Version: '8.0.x'" 表示 MySQL 进程就绪
#   - MySQL 健康检查会等待 roles 表可查后才标记 healthy
#   - 注意是否有 ERROR/报错行，尤其是 ALTER TABLE 相关输出（详见 15.8 节）

# 4. 等待 backend 启动后检查日志
docker compose logs backend
# 关键观察点：
#   - 不应出现 "Table ... doesn't exist"（核心业务表）
#   - 看到 "Started SanguiBlogServerApplication" 表示启动完成

# 5. 确认全部服务状态
docker compose ps
# 预期：全部服务 STATUS 为 "Up" 且 web/backend 为 "(healthy)"
```

### 15.5 HTTP 端点验证

> 以下命令默认使用 `http://localhost`。若设置了 `WEB_PORT`，替换为 `http://localhost:<WEB_PORT>`。

```bash
# 1. 前端首页（应返回 200，Content-Type 包含 text/html）
curl -i http://localhost/

# 2. 站点元数据 API（应返回 JSON，包含 "success":true）
curl -i http://localhost/api/site/meta

# 3. 站点地图（应返回 200，Content-Type 包含 application/xml，不能是 HTML）
curl -i http://localhost/sitemap.xml

# 4. robots.txt（应返回 200，Content-Type 包含 text/plain，不能是 HTML）
curl -i http://localhost/robots.txt
```

验证要点：

| 端点 | 预期 Content-Type | 禁止出现 |
|------|-------------------|----------|
| `/` | `text/html` | — |
| `/api/site/meta` | `application/json` | `success: false` |
| `/sitemap.xml` | `application/xml` | SPA 首页 HTML |
| `/robots.txt` | `text/plain` | SPA 首页 HTML |

### 15.6 管理端登录与上传写入验证

**管理端登录：**

1. 浏览器访问 `http://localhost`，点击导航栏或直接访问 `/admin/login`
2. 使用安装时创建的超级管理员账号登录
3. 确认能进入管理后台面板

**上传目录写入探针：**

```bash
# 验证 posts 子目录可写
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test && echo "writable" || echo "FAIL"'

# 验证 covers 子目录可写
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo "writable" || echo "FAIL"'

# 验证 avatar 子目录可写
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test && echo "writable" || echo "FAIL"'
```

若任一路径写入失败（输出 `FAIL` 或 `Permission denied`），执行权限修复：

```bash
docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"
```

修复后重新执行写入探针确认。

### 15.7 持久化验证

验证普通 `docker compose down` 不会丢失数据：

```bash
# 1. 在管理端创建一条测试文章，或上传一张测试图片
#    （记录操作内容，用于重启后比对）

# 2. 常规停止（不使用 -v）
docker compose down

# 3. 重新启动
docker compose up -d

# 4. 等待服务健康后确认
docker compose ps

# 5. 检查之前创建的内容是否仍然存在
#    通过浏览器或 curl 验证文章/图片仍然可访问
```

> ⚠ **上线后切勿再执行 `docker compose down -v`**，除非明确要清空所有生产数据。日常重启只需 `docker compose down && docker compose up -d`。

### 15.8 MySQL Init 风险观察

`sanguiblog_db.sql` 中包含 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 语句。MySQL 8.0 原生**不支持** `IF NOT EXISTS` 语法修饰 `ADD COLUMN`，该语句可能在初始化日志中产生 ERROR/报错，需要观察是否影响后续 SQL 执行。

**检查方法：**

```bash
# 查看 MySQL 初始化日志中的 ERROR/ALTER TABLE 相关输出
docker compose logs mysql 2>&1 | grep -Ei "ERROR|ALTER"

# 检查 AI 相关表是否完整创建
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '\''ai_%'\'';"'
# 预期输出 6 张表：
# ai_blog_knowledge_chunks
# ai_blog_knowledge_documents
# ai_chat_messages
# ai_chat_sessions
# ai_custom_knowledge_chunks
# ai_custom_knowledge_documents

# 确认核心业务表无缺失
docker compose logs backend 2>&1 | grep "doesn't exist"
# 如果此命令无输出，表示 backend 未发现核心表缺失
```

**风险判断：**

- 若 `SHOW TABLES LIKE 'ai_%'` 返回 6 张表且 backend 日志无 `doesn't exist`：通过，即使 MySQL 日志中有 ALTER TABLE 相关报错记录也**不影响**备用环境运行（AI 已设为 false）。
- 若 AI 表不完整但核心业务表正常且 `AI_RAG_ENABLED=false`：可接受，AI 功能本已关闭，不影响博客上线。后续如需启用 AI，参考第 16 节"AI 表诊断与修复"。
- 若核心业务表缺失（如 `posts`、`users`、`roles` 等）：初始化失败，检查 `docker compose logs mysql` 确定 `sanguiblog_db.sql` 导入是否在 ERROR 处中断。

### 15.9 验证结果汇总表

| 检查项 | 通过标准 | 状态 |
|--------|----------|------|
| Docker 版本 >= 24.0 | `docker --version` 输出版本号 | ☐ |
| Docker Compose >= 2.17 | `docker compose version` 输出版本号 | ☐ |
| 目标端口可用 | `netstat` / `ss` 无占用，或已设置 `WEB_PORT` | ☐ |
| 防火墙放行 | 外部可访问目标端口 | ☐ |
| `.env` 必填密钥完整 | `docker compose config` 无报错 | ☐ |
| `AI_RAG_ENABLED=false` | `.env` 中确认 | ☐ |
| 冷启动全部 healthy | `docker compose ps` 全部 `Up` | ☐ |
| Backend 无核心表缺失 | `docker compose logs backend \| grep "doesn't exist"` 无输出 | ☐ |
| `/` 返回前端页面 | `curl -i http://localhost/` → 200 + text/html | ☐ |
| `/api/site/meta` 返回 JSON | `curl -i http://localhost/api/site/meta` → `"success":true` | ☐ |
| `/sitemap.xml` 返回 XML | `curl -i http://localhost/sitemap.xml` → Content-Type: application/xml | ☐ |
| `/robots.txt` 返回 text/plain | `curl -i http://localhost/robots.txt` → Content-Type: text/plain | ☐ |
| 管理端可登录 | 浏览器成功登录管理后台 | ☐ |
| 上传目录可写 | 三项目录写入探针全部输出 `writable` | ☐ |
| 持久化验证通过 | `down` + `up -d` 后数据保留 | ☐ |
| AI 表完整 / 可接受缺失 | `SHOW TABLES LIKE 'ai_%'` 返回 6 行，或 AI 已关闭 | ☐ |

---

## 16. AI 表诊断与修复

### 背景

MySQL 的 `docker-entrypoint-initdb.d/` 初始化脚本仅在数据目录为空时执行。如果 `mysql_data` 卷中已有旧数据（例如之前运行过 `docker compose up`），后续 `sanguiblog_db.sql` 中新增的表不会被自动创建。

### 诊断命令

```bash
# 检查 AI 相关表是否存在（在容器内读取 Compose 注入的数据库变量）
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '\''ai_%'\'';"'

# 预期的 6 张表：
# ai_blog_knowledge_chunks
# ai_blog_knowledge_documents
# ai_chat_messages
# ai_chat_sessions
# ai_custom_knowledge_chunks
# ai_custom_knowledge_documents

# 查看后端日志中的 AI 表错误
docker compose logs backend | grep "doesn't exist"

# 如果 ai_chat_sessions 来自更旧版本，检查会话表列是否完整
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW COLUMNS FROM ai_chat_sessions;"'
```

### 修复方法

如果缺失任一张 AI 表，以下任一方式修复：

**方案一：清理数据卷重新初始化（会丢失所有数据）**
```bash
docker compose down -v
docker compose up -d --build
```

**方案二：手动导入缺失的表（保留现有数据）**

从 `sanguiblog_db.sql` 中找到 `ai_chat_messages`、`ai_blog_knowledge_documents`、`ai_blog_knowledge_chunks`、`ai_custom_knowledge_documents`、`ai_custom_knowledge_chunks` 的 `CREATE TABLE IF NOT EXISTS` 语句。如果 `ai_chat_sessions` 列不完整，同时包含该表后面的 `ALTER TABLE ai_chat_sessions ... ADD COLUMN IF NOT EXISTS ...` 语句。保存为 `missing-ai-tables.sql` 后执行：

```bash
docker compose exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < missing-ai-tables.sql
```

### 验证 AI 聊天可用性

```bash
# 1. 确认 Spring AI DashScope 密钥已注入（不要打印完整密钥）
docker compose exec backend sh -c 'test -n "$SPRING_AI_DASHSCOPE_API_KEY" && echo "SPRING_AI_DASHSCOPE_API_KEY is set" || echo "SPRING_AI_DASHSCOPE_API_KEY is empty"'

# 2. 确认 AI 助手已启用
curl -s http://localhost/api/site/meta | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['aiAssistant'])"

# 3. 测试基础 AI 聊天（RAG 关闭时）
curl -N -X POST http://localhost/api/ai/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，请用一句话介绍你自己"}'
```
