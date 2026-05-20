# SanguiBlog Docker 部署指南

## 1. 概述

SanguiBlog 容器化部署基于 Docker Compose，一条命令即可启动博客运行所需的全部服务：

- **web** (Nginx)：前端 SPA + 反向代理
- **backend** (Spring Boot 3 / Java 21)：REST API
- **mysql** (MySQL 8.0)：主业务数据库
- **pgvector** (PostgreSQL 16 + PgVector)：AI RAG 向量库

## 2. 环境要求

- Docker >= 24.0
- Docker Compose >= 2.17
- 可用磁盘空间 >= 2 GB（镜像 + 数据卷）

## 3. 快速开始

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env，填入必填项（JWT_SECRET、数据库密码等）
#    Windows: notepad .env
#    Linux:   vim .env
#    注意：.env.example 默认不写入任何敏感值，空值必须在首次运行前补齐。

# 3. 启动所有服务（首次需构建镜像，约 3-5 分钟）
docker compose up -d --build

# 4. 查看服务状态
docker compose ps

# 5. 查看后端日志
docker compose logs -f backend
```

启动成功后访问 `http://localhost` 即可看到博客首页。

## 4. 环境变量说明

完整变量列表见 `.env.example`。必填项：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（建议 32+ 字符随机串）|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 |
| `MYSQL_PASSWORD` | MySQL 业务用户密码 |
| `SPRING_DATASOURCE_PASSWORD` | 与 `MYSQL_PASSWORD` 相同 |
| `POSTGRES_PASSWORD` | PgVector 用户密码 |

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
docker compose down -v

# 查看日志
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f web

# 进入 MySQL 命令行
docker compose exec mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"

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

## 7. 数据持久化

以下数据存储在 Docker volumes 中，`docker compose down` 不会删除：

| Volume | 内容 |
|--------|------|
| `mysql_data` | MySQL 数据库文件 |
| `pgvector_data` | PgVector 数据库文件 |
| `uploads_data` | 上传文件（头像、文章图片、封面等）|

备份建议：

```bash
# MySQL 备份
docker compose exec mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > backup.sql

# uploads 备份
docker compose cp web:/data/uploads ./uploads-backup/
```

清理数据卷（谨慎操作）：

```bash
docker compose down -v
```

## 8. AI RAG 启用步骤

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

## 9. HTTPS 配置

默认 Compose 提供 HTTP 访问。生产环境 HTTPS 可通过以下方式：

### 方案一：外部反向代理（推荐）

在宿主机上运行 Nginx/Caddy 做 TLS 终止，反代到 Compose 的 web 容器端口。

### 方案二：挂载证书到 Nginx 容器

1. 将证书文件放入 `docker/nginx/ssl/`
2. 修改 `docker/nginx/default.conf`，添加 SSL 配置
3. 在 `docker-compose.yml` 中挂载证书目录并暴露 443 端口

## 10. Nginx 配置说明

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

> 注意：`fake-nginx-config/nginx.conf` 是旧宿主机部署的 Nginx 配置参考。Docker 部署以 `docker/nginx/default.conf` 为准。

## 11. 与旧部署方式的区别

| 项目 | 旧宿主机部署 | Docker 部署 |
|------|-------------|-------------|
| 前端 | 手动构建 dist，Nginx 直接服务 | 容器内多阶段构建 |
| 后端 | `java -jar` 宿主机运行 | 容器内运行 |
| 数据库 | 宿主机 MySQL/PostgreSQL | Compose 内 MySQL/PgVector |
| uploads | 宿主机目录 `/home/sangui/uploads` | Docker volume `uploads_data` |
| 配置 | `application-local.yaml` + `switch-env.ps1` | `.env` + `application-docker.yaml` |
| 环境切换 | `./scripts/switch-env.ps1 dev/prod` | 编辑 `.env` 重启 |

`./scripts/switch-env.ps1` 不适用于 Docker 部署，请使用 `.env` 文件管理 Docker 环境变量。

## 12. 常见问题

| 现象 | 可能原因 | 解决方案 |
|------|----------|----------|
| backend 启动失败 | JWT_SECRET 未设置 | 在 `.env` 中设置 `JWT_SECRET` |
| MySQL 连接失败 | backend 连接宿主机数据库 | 检查 `SPRING_DATASOURCE_URL` 中的 host 是否为 `mysql` |
| `/sitemap.xml` 返回 HTML | SPA fallback 捕获 | 检查 Nginx `location = /sitemap.xml` 是否存在 |
| AI 聊天无响应 | DashScope key 未配 | 设置 `AI_DASHSCOPE_API_KEY` 后重启 |
| RAG 不生效 | PgVector 未初始化 | 检查 `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=true` |
| uploads 上传失败 | 路径权限问题 | 检查 `storage.base-path` 是否为 `/data/uploads` |
| 容器重启后数据丢失 | 未使用 Docker volume | 确认 `docker-compose.yml` 中定义并使用了 volumes |
| 端口冲突 | 宿主机 80 端口被占用 | 设置 `WEB_PORT=8080` 在 `.env` 中 |
