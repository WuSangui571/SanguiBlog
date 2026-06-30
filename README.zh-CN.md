[English](./README.md)

# SanguiBlog

前后端分离的个人博客系统：后端基于 Spring Boot 3 + MySQL，前端基于 React 19 + Vite（SPA），通过 Docker Compose + GHCR 镜像部署。

> 当前版本：**V2.3.5**

## 快速开始（Docker 生产部署）

### 前置条件

- Docker 与 Docker Compose（v2+）
- Git

### 1. 克隆并配置

```bash
git clone https://github.com/WuSangui571/SanguiBlog.git
cd SanguiBlog
cp .env.example .env
vim .env
```

在 `.env` 中填写必需密钥（至少需配置 `JWT_SECRET`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD`）。所有敏感字段默认为空 — 如有缺失，Compose 会在启动时报错。

### 2. 拉取镜像并启动

```bash
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
```

> 如果当前用户已加入 `docker` 组，可省略 `sudo`。

### 3. 验证

```bash
sudo docker compose -f docker-compose.prod.yml ps
curl -i http://localhost:8090/
curl -i http://localhost:8090/api/site/meta
curl -i http://localhost:8090/sitemap.xml
curl -i http://localhost:8090/robots.txt
```

### 4. 停止

```bash
sudo docker compose -f docker-compose.prod.yml down
```

> `down` 仅停止容器，不会删除数据卷。数据库与上传文件保留在 `mysql_data`、`pgvector_data`、`uploads_data` 中。

## 版本更新 / 重新部署

```bash
git pull origin main
vim .env                    # 检查配置，必要时更新 SANGUI_IMAGE_TAG
sudo docker compose -f docker-compose.prod.yml pull
# 现有生产库如需补 schema，请在重启前按需执行 release SQL。
# V2.3.5：docs/sql/2026-06-30-add-analytics-detail-json.sql
# V2.3.4：无需数据库迁移。
# V2.3.3: docs/sql/2026-06-27-add-analytics-visit-duration.sql
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml ps
curl -i http://localhost:8090/api/site/meta
```

## 查看日志

```bash
sudo docker compose -f docker-compose.prod.yml logs -f backend
```

## 可选：AI 助理

核心博客功能（文章、分类、标签、评论、后台管理）无需任何 AI 配置即可运行。AI 助理需要：

- `.env` 中配置 `AI_OPENAI_API_KEY`
- `AI_OPENAI_BASE_URL`（留空时默认使用 `https://api.openai.com`；末尾可带 `/v1`，后端会自动归一化）
- `AI_OPENAI_CHAT_MODEL`（AI 对话使用的聊天模型）
- 博客 RAG 需要 PostgreSQL + PgVector（已在 Compose 栈中包含）— 设置 `AI_RAG_ENABLED=true`
- `AI_OPENAI_EMBEDDING_MODEL`（RAG 嵌入模型；若 provider 不支持 embeddings，请保持 `AI_RAG_ENABLED=false`）
- 可选 `AI_OPENAI_EMBEDDING_API_KEY` / `AI_OPENAI_EMBEDDING_BASE_URL`（当 embedding 需要使用不同于聊天的 provider 或 endpoint 时配置；embedding base URL 末尾也可带 `/v1`）

AI 功能可在后台设置面板中统一开启/关闭。

> **迁移说明**：`AI_DASHSCOPE_API_KEY` 已废弃。请改用 `AI_OPENAI_API_KEY` + `AI_OPENAI_BASE_URL`。如仍需使用 DashScope，请将 `AI_OPENAI_BASE_URL` 设置为 DashScope OpenAI-compatible endpoint。

## 延伸阅读

- [Docker 部署指南](./docs/docker-deploy.md) — 详细的生产/开发 Docker 操作手册，含镜像标签、GHCR、健康检查、回滚、数据持久化
- [Docker 数据同步/恢复](./docs/docker-data-sync.md) — 生产到本地的数据恢复流程
- [后端](./SanguiBlog-server/) — Spring Boot 源码
- [前端](./SanguiBlog-front/) — React SPA 源码
- [脚本](./scripts/) — 工具脚本，含 `bump-version.ps1`

## 项目结构

```
|-- SanguiBlog-server/          # Spring Boot 后端（REST API、鉴权、站点地图等）
|-- SanguiBlog-front/           # React SPA（访客端 + 管理后台）
|-- docker/nginx/               # Docker Nginx 反向代理配置
|-- docker/postgres/init/       # PgVector 扩展初始化脚本
|-- docs/                       # 部署与数据同步指南
|-- scripts/                    # 工具脚本
|-- sanguiblog_db.sql           # 数据库初始化脚本（仅在首次挂载时运行）
|-- docker-compose.yml          # 开发/本地 Compose（本地构建镜像）
|-- docker-compose.prod.yml     # 生产 Compose（从 GHCR 拉取镜像）
`-- .env.example                # 环境变量模板
```

## 常见问题

| 现象 | 可能原因 | 解决方案 |
| --- | --- | --- |
| 后端启动失败 | `.env` 缺少必需密钥 | 检查 `JWT_SECRET`、`MYSQL_PASSWORD` 等是否已配置 |
| `/sitemap.xml` 返回 SPA 首页 | 缺少 Nginx 路由规则 | 确认 `docker/nginx/default.conf` 已将 sitemap/robots 转发至后端 |
| AI 聊天不可用 | OpenAI API Key 未配置 | 检查 `.env` 中的 `AI_OPENAI_API_KEY` 和 `AI_OPENAI_BASE_URL` |
| 图片资源加载失败 | `asset-base-url` 配置错误 | 同源 Docker 部署请保持 `SITE_ASSET_BASE_URL` 为空 |
