# SanguiBlog V2.3.0

SanguiBlog 是一个前后端分离的个人博客系统：后端基于 Spring Boot + MySQL，前端基于 React + Vite（SPA）。本文面向首次部署用户，推荐通过 Docker Compose 一键启动，同时保留精简的手工本地开发路径。

> 当前站点版本号：**V2.3.0**（统一由后端 `site.version` 提供，在首页导航栏展示）。

## V2.3.0 更新说明

- **Docker 部署支持**：一条 `docker compose up -d --build` 即可启动完整技术栈（Nginx、Spring Boot、MySQL、PgVector）。
- **Docker 公共页 BotGuard 误触发修复**：Docker 反向代理头条件下，首屏公共 API 读取不再触发不必要的验证码/封锁。
- **部署体验优化**：精简环境变量模板，缺失必填密钥时快速失败提示，并链接到详细 Docker 文档。

## 目录索引

| 路径 | 说明 |
|------|------|
| `release/` | 历史发布说明 |
| `sanguiblog_db.sql` | 数据库初始化脚本（表结构 + 基础数据） |
| `.env.example` | Docker Compose 环境变量模板 |
| `docker-compose.yml` | Docker Compose 服务定义 |
| `docker/nginx/default.conf` | Docker Nginx 配置 |
| `docs/docker-deploy.md` | Docker 部署详细指南 |
| `docs/docker-data-sync.md` | 数据导出、迁移与恢复指南 |

## 项目结构

```
├─ SanguiBlog-server/      # Spring Boot 后端（REST API、鉴权、站点地图等）
├─ SanguiBlog-front/       # React 单页应用（访客端 + 管理端 UI）
├─ docker/                 # Docker Nginx 配置与 Postgres 初始化脚本
├─ scripts/                # 辅助脚本（数据同步恢复等）
├─ docs/                   # 扩展部署与数据同步文档
├─ release/                # 历史发布说明
├─ sanguiblog_db.sql       # 数据库初始化脚本
├─ docker-compose.yml      # Docker Compose 服务定义
├─ .env.example            # 环境变量模板
└─ README.md               # 本文档
```

## 环境要求

### Docker 部署（推荐）

- Docker >= 24.0
- Docker Compose >= 2.17
- 可用磁盘空间 >= 2 GB

### 手工本地开发

| 组件 | 版本 | 说明 |
|------|------|------|
| JDK | 21 | 后端 `pom.xml` 指定 `java.version=21` |
| Maven | 3.9.x | 构建/打包后端 |
| Node.js | >= 18（建议 20） | 构建前端 |
| MySQL | >= 8.0 | 主业务数据库，建议 UTF8MB4 |
| PostgreSQL | 13+（可选） | 仅在启用 AI RAG 时需要，需安装 PgVector 扩展 |
| Git | 任意近期版本 | 拉取代码 |

## Docker 快速部署

```bash
# 1. 克隆仓库并进入目录
git clone <仓库地址>
cd SanguiBlog

# 2. 复制环境变量模板
cp .env.example .env

# 3. 编辑 .env，填入必填密钥
#    必填项：JWT_SECRET、MYSQL_PASSWORD、MYSQL_ROOT_PASSWORD、POSTGRES_PASSWORD
#    SPRING_DATASOURCE_PASSWORD 默认与 MYSQL_PASSWORD 一致，仅在需要覆盖时单独设置

# 4. 验证 Compose 配置
docker compose config

# 5. 启动全部服务（首次需构建镜像，约 3-5 分钟）
docker compose up -d --build

# 6. 查看服务状态
docker compose ps

# 7. 访问站点
#    默认地址：http://localhost  （WEB_PORT 默认为 80）
#    若在 .env 中设置了 WEB_PORT=8088：http://localhost:8088
```

## 环境变量说明

### 必填密钥

以下变量**必须**在 `.env` 中填入真实值，缺失或留空时 Compose 会直接失败。

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（建议 32+ 字符随机串） |
| `MYSQL_PASSWORD` | MySQL 业务用户密码 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 |
| `POSTGRES_PASSWORD` | PgVector 用户密码 |

`SPRING_DATASOURCE_PASSWORD` 默认取 `MYSQL_PASSWORD` 的值，仅在需要使用不同凭据时才单独设置。

### 常用默认值（通常无需修改）

以下变量有合理的默认值，大多数场景无需改动：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MYSQL_DATABASE` | `sanguiblog_db` | |
| `MYSQL_USER` | `sanguiblog_user` | |
| `POSTGRES_DB` | `sanguiblog_ai` | |
| `POSTGRES_USER` | `sanguiblog_pg_user` | |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://mysql:3306/sanguiblog_db?...` | Compose 网络内保持默认即可 |
| `SPRING_DATASOURCE_USERNAME` | `sanguiblog_user` | |
| `STORAGE_BASE_PATH` | `/data/uploads` | 容器内路径，请勿修改 |
| `SITE_BASE_URL` | `http://localhost` | 生产环境改为真实域名 |
| `SITE_ALLOWED_HOSTS` | `localhost` | |
| `SITE_ASSET_BASE_URL` | （空） | 同源部署留空；使用 CDN 时填写完整 URL |
| `SECURITY_CORS_ALLOWED_ORIGINS` | `http://localhost` | |
| `WEB_PORT` | `80` | 若 80 端口被占用，改为其他端口 |

### 可选 AI 变量

不填 AI 变量时核心博客正常运行。如需启用 AI 聊天/RAG，请填写：

| 变量 | 说明 |
|------|------|
| `AI_DASHSCOPE_API_KEY` | DashScope API 密钥 |
| `AI_RAG_ENABLED` | 启用博客 RAG（默认 `false`） |
| `AI_RAG_PGVECTOR_URL` | PgVector JDBC 地址（默认指向 `pgvector` 服务） |
| `AI_RAG_PGVECTOR_USERNAME` | PgVector 用户名 |
| `AI_RAG_PGVECTOR_PASSWORD` | PgVector 密码 |
| `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA` | 首次建 `vector_store` 表时设为 `true`，建表成功后改回 `false` |

> `.env.example` 列出了所有变量名但敏感值留空。真实密钥仅存放在你本地的 `.env` 文件中，切勿将 `.env` 提交到仓库。

## Docker 常用命令

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f mysql

# 停止服务
docker compose down

# 停止并清理全部数据卷（⚠ 会删除所有数据库和上传数据）
# 注意：再次启动时 MySQL 需重新导入 sanguiblog_db.sql（~731 行），首次冷启动会比平时慢
# 约 1-2 分钟内全部服务应进入 healthy/running 状态，无需手动重启
docker compose down -v

# 重启单个服务
docker compose restart backend

# 进入 MySQL 命令行
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'

# 进入 PostgreSQL 命令行
docker compose exec pgvector sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## 验证部署

```bash
# 首页
curl -i http://localhost/

# 站点元数据 API
curl -i http://localhost/api/site/meta

# 站点地图（应返回 XML，非 HTML）
curl -i http://localhost/sitemap.xml

# robots.txt（应返回 text/plain，非 HTML）
curl -i http://localhost/robots.txt
```

## 数据持久化

以下 Docker 数据卷在 `docker compose down` 后仍然保留：

| 卷名 | 内容 |
|------|------|
| `mysql_data` | MySQL 数据库文件 |
| `pgvector_data` | PgVector 数据库文件 |
| `uploads_data` | 上传文件（头像、文章图片、封面、工具页面等） |

如需备份、迁移或从生产服务器恢复数据，请参考 [docs/docker-data-sync.md](./docs/docker-data-sync.md)。

## 手工本地开发

如果你希望在宿主机上直接运行服务：

### 数据库初始化

```sql
CREATE DATABASE sanguiblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

```bash
mysql -u root -p sanguiblog_db < sanguiblog_db.sql
```

### 后端（SanguiBlog-server）

在 `SanguiBlog-server/src/main/resources/` 下创建 `application-local.yaml`（已被 gitignore），填写本地数据库、JWT 和存储路径等配置。

```bash
cd SanguiBlog-server
mvn spring-boot:run
# 或构建后运行：mvn -DskipTests package && java -jar target/SanguiBlog-server-*.jar
```

### 前端（SanguiBlog-front）

```bash
cd SanguiBlog-front
npm install
npm run dev          # 开发服务器 http://localhost:5173
npm run build        # 生产构建，输出在 dist/
```

> 生产环境宿主机 Nginx 部署可参考 `docker/nginx/default.conf` 了解当前路由约定（sitemap/robots 代理、SPA 回退、SSE 流式、uploads 别名）。

## 功能概览

- 公共博客：文章列表、归档、搜索、分类/标签筛选
- 文章详情：Markdown 渲染、评论、访问来源统计
- 管理后台：文章管理、文件上传、站点设置、系统监控
- AI 助理：多轮对话、博客 RAG 检索增强、当前页面上下文、访客访问控制
- BotGuard：验证码/封锁风控引擎，Docker 公共读取评分优化
- 站点地图（XML 索引分页）与 robots.txt
- 上传管理：文章封面、文章资源、头像、可上传 HTML 工具页面
- 暗色模式切换与彩蛋背景动画
- 移动端适配，玻璃质感 UI 设计系统

## 常见问题排查

| 现象 | 可能原因 | 解决方法 |
|------|----------|----------|
| 后端启动失败 | `.env` 中必填密钥缺失 | 运行 `docker compose config`；确保 `JWT_SECRET`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD` 均已填写 |
| MySQL 连接失败 | 后端连接了宿主机数据库而非 `mysql` 容器 | 保持 `SPRING_DATASOURCE_URL` 默认值（使用 `mysql` 主机名） |
| `/sitemap.xml` 返回 HTML | SPA 回退先于 sitemap 代理生效 | 确认 Nginx `location = /sitemap.xml` 在 `try_files` 之前代理到后端 |
| AI 聊天不可用 | DashScope 密钥未配或 AI 助理已关闭 | 检查 `.env` 中的 `AI_DASHSCOPE_API_KEY` 及 `/admin/settings -> AI助理` |
| AI RAG 不生效 | `AI_RAG_ENABLED=false` 或 PgVector 未初始化 | 检查 `AI_RAG_ENABLED`、PostgreSQL 状态及 `vector_store` 表 |
| 上传失败 | 上传目录权限不足 | 后端写入 `/data/uploads`；若子目录属主为 root，运行 `docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"` |
| 端口冲突 | 宿主机 80 端口被占用 | 在 `.env` 中设置 `WEB_PORT=8080`（或其他空闲端口） |
| 重启后数据丢失 | 未使用 Docker 数据卷 | 确认 `docker-compose.yml` 中定义并使用了 `mysql_data`、`pgvector_data`、`uploads_data` 卷 |
| `down -v` 后首次启动全部服务 unhealthy | MySQL 健康检查未等待 schema 初始化完成 | 已修复：MySQL 健康检查现通过 TCP 验证核心表可查询后才标记 healthy。冷启动约需 1-2 分钟 |

详细部署帮助请参见 [docs/docker-deploy.md](./docs/docker-deploy.md)。数据迁移与恢复请参见 [docs/docker-data-sync.md](./docs/docker-data-sync.md)。如需深入了解实现细节，可参考仓库内 `release/` 目录下的历史发布说明与源码注释。
