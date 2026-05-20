# 三桂博客容器化

## 1. 背景与目标

当前三桂博客以“前端 dist + 后端 jar + 外部 MySQL/PostgreSQL/PgVector/Nginx/uploads 目录”的方式部署。目标是在 `feat/docker` 分支完成容器化方案，使项目可以通过 Docker Compose 一次性启动博客运行所需的项目内服务，降低服务器手工部署和环境切换成本。

本任务当前阶段只做规划、Trellis task/context 准备和代码研究；Codex 端不得写业务实现代码。后续由 DeepSeek 端执行编码，Codex 端再做 check / finish-work。

## 2. 任务范围判断

类型：Complex Task。

原因：
- 涉及前端构建产物、后端运行时、反向代理、数据库、PgVector、上传持久化、环境变量、初始化 SQL 和部署文档。
- 涉及 infra/env/storage/AI/RAG 跨层契约，但原则上不应改变业务 API、DTO、实体或前端页面行为。
- 需要兼容当前生产约束：`/api` 代理、`/uploads` 静态资源、`/sitemap.xml` 和 `/robots.txt` 必须优先走后端、AI SSE 代理必须禁用缓冲。

## 3. 明确目标

实现一个可本地和服务器复用的容器化部署方案：

- 一条命令启动项目运行所需容器服务。
- 前端 React/Vite 使用容器内构建产物并由 Nginx 服务。
- 后端 Spring Boot 以 Java 21 runtime 容器启动。
- MySQL 在 Compose 内部署并自动导入 `sanguiblog_db.sql`。
- PostgreSQL + PgVector 在 Compose 内部署，用于 `AI_RAG_ENABLED=true` 时的向量库。
- uploads 使用 Docker volume 或宿主机挂载持久化，并同时供后端写入、Nginx/后端读取。
- DashScope 仍为外部 SaaS API，容器化只负责通过环境变量注入 API key，不能把它“内置”为容器内服务。
- 提供 `.env` 模板和部署文档，避免提交真实密钥。

## 4. 非目标 / 禁止越界

- 不改业务功能、业务 API、DTO 字段、数据库业务表结构或前端交互逻辑，除非容器运行必须的配置读取存在硬阻塞。
- 不把 `application-local.yaml` 或 `SanguiBlog-front/.env.local` 纳入提交；这些是本地私有配置。
- 不提交真实数据库密码、JWT secret、DashScope key、SSL 私钥或证书。
- 不引入 Redis/RabbitMQ/Elastic/Mongo 等项目未使用的新服务。
- 不迁移历史业务数据；只提供初始化新库或挂载已有数据卷的方案。
- 不把 `fake-nginx-config` 中的 `/sanguidaily/` 作为本任务必需服务。它看起来是同域名下另一个后端，不属于 SanguiBlog 项目本体；若要一起容器化，需要用户另行确认。
- 不默认更新 `site.version`，除非用户明确要求发版。

## 5. 方案概览

建议新增 `docker-compose.yml`，包含以下服务：

| Service | 作用 | 关键点 |
| --- | --- | --- |
| `web` / `nginx` | 服务前端 dist、反代后端 API/SSE/sitemap/robots/uploads | 基于 Nginx；前端多阶段构建；`/api/`、`/api/ai/chat/stream`、`/sitemap.xml`、`/robots.txt`、`/uploads/` 路由明确 |
| `backend` | Spring Boot API | Java 21；读取 Docker env；依赖 MySQL；RAG 开启时依赖 PgVector；挂载 uploads |
| `mysql` | 主业务数据库 | MySQL 8；utf8mb4；初始化导入 `sanguiblog_db.sql`；数据卷持久化 |
| `pgvector` | AI RAG 向量库 | 使用带 pgvector 扩展的 PostgreSQL 镜像；初始化 `CREATE EXTENSION vector`；数据卷持久化 |

可选增强：
- `profiles`：允许默认启动 MySQL/backend/web，RAG profile 再启动 `pgvector`。但用户要求“不用额外部署服务，直接容器内部署”，PRD 推荐默认包含 `pgvector` 服务，是否启用 RAG 由 `AI_RAG_ENABLED` 控制。
- `healthcheck`：MySQL、PgVector、backend、web 都应有基础健康检查。

## 6. Cross-Layer / Infra Contract

### 6.1 Command Signatures

必须支持：

```bash
docker compose up -d --build
docker compose down
docker compose logs -f backend
docker compose ps
```

建议支持：

```bash
docker compose down -v
docker compose exec mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
docker compose exec pgvector psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### 6.2 Runtime URLs

默认容器部署：

| Endpoint | Expected |
| --- | --- |
| `http://localhost/` | 前端 SPA |
| `http://localhost/api/site/meta` | 后端 JSON API |
| `http://localhost/uploads/...` | 上传资源静态访问 |
| `http://localhost/sitemap.xml` | 后端 sitemap，不应落到 SPA |
| `http://localhost/robots.txt` | 后端 robots，不应落到 SPA |
| `http://localhost/api/ai/chat/stream` | SSE 代理，不缓冲 |

### 6.3 Env / Payload Fields

新增或文档化 Docker 环境变量模板，不提交真实值：

| Env Key | Required | Consumer | Notes |
| --- | --- | --- | --- |
| `MYSQL_DATABASE` | yes | mysql/backend | 默认 `sanguiblog_db` |
| `MYSQL_USER` | yes | mysql/backend | 不建议 root 作为业务用户 |
| `MYSQL_PASSWORD` | yes | mysql/backend | secret，仅 `.env` 本地保存 |
| `MYSQL_ROOT_PASSWORD` | yes | mysql | secret，仅 `.env` 本地保存 |
| `SPRING_DATASOURCE_URL` | yes | backend | `jdbc:mysql://mysql:3306/${MYSQL_DATABASE}?...` |
| `SPRING_DATASOURCE_USERNAME` | yes | backend | 与 `MYSQL_USER` 对齐 |
| `SPRING_DATASOURCE_PASSWORD` | yes | backend | 与 `MYSQL_PASSWORD` 对齐 |
| `JWT_SECRET` or `SPRING_JWT_SECRET` | yes | backend | 必填；长度应足够 JWT HMAC |
| `STORAGE_BASE_PATH` | yes | backend | 建议 `/data/uploads` |
| `SECURITY_CORS_ALLOWED_ORIGINS` | base | backend | 同源 Nginx 部署时可最小化 |
| `SITE_BASE_URL` | yes/prod | backend | sitemap/robots canonical URL |
| `SITE_ALLOWED_HOSTS` | yes/prod | backend | sitemap host allowlist |
| `SITE_ASSET_BASE_URL` | yes/prod | backend/frontend meta | 建议同源 `/uploads` 或完整域名 |
| `SPRING_AI_DASHSCOPE_API_KEY` / `AI_DASHSCOPE_API_KEY` | optional | backend | AI 聊天需要；不可提交 |
| `AI_RAG_ENABLED` | optional | backend | 默认 `false` 可启动；`true` 需要 PgVector 和 embedding key |
| `AI_RAG_PGVECTOR_URL` | optional | backend | `jdbc:postgresql://pgvector:5432/${POSTGRES_DB}` |
| `AI_RAG_PGVECTOR_USERNAME` | optional | backend | 与 `POSTGRES_USER` 对齐 |
| `AI_RAG_PGVECTOR_PASSWORD` | optional | backend | 与 `POSTGRES_PASSWORD` 对齐 |
| `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA` | optional | backend | 首次可 `true`，稳定后可 `false` |
| `POSTGRES_DB` | yes | pgvector/backend | 默认建议 `sanguiblog_ai` |
| `POSTGRES_USER` | yes | pgvector/backend | PgVector 用户 |
| `POSTGRES_PASSWORD` | yes | pgvector/backend | secret |

如果新增 `application-docker.yaml`，建议只放可提交的容器默认值，密钥仍通过 env 注入。

### 6.4 API Contract

本任务不应新增或修改业务 API。

必须保持：
- JSON API 仍返回 `ApiResponse<T>`。
- `/api/**` 由 Nginx 转发到 backend。
- `/sitemap.xml` 和 `/robots.txt` 由 backend 提供。
- `/uploads/**` 可由 Nginx alias 或 backend resource handler 提供，但路径语义保持不变。
- `/uploads/games/**` iframe/CSP 特例不能被 Nginx header 覆盖破坏。
- AI SSE `complete` 终态语义不变；Nginx 必须关闭 buffering/cache。

### 6.5 DB Contract

- MySQL schema source 仍为根目录 `sanguiblog_db.sql`。
- Hibernate `ddl-auto` 仍为 `none`。
- Compose 初始化只用于空数据卷首次启动；已有数据卷不应重复覆盖。
- PgVector 只存 embeddings；MySQL 仍存 AI/RAG 文档、chunk metadata、会话与审计表。

### 6.6 Storage Contract

- 后端 `storage.base-path` 指向容器内 uploads 路径，如 `/data/uploads`。
- Docker volume / bind mount 持久化 uploads。
- `avatar`、`posts`、`covers` 目录仍由 `StoragePathResolver` 初始化。
- 前端和数据库中的 `/uploads/...` URL 不改。

## 7. Validation / Error Matrix

| Case | Validation Point | Expected Result |
| --- | --- | --- |
| 缺少 `.env` 必填密钥 | Compose/env template + backend startup | backend 不应使用仓库内硬编码私密配置；缺 JWT secret 时启动失败并在日志中清晰提示 |
| MySQL 未 ready | Compose `depends_on` healthcheck / backend retry | backend 等待或重启，不应连接宿主机旧数据库 |
| `sanguiblog_db.sql` 初始化失败 | mysql init logs | MySQL health 不应误判业务 schema 完整；文档提供排查命令 |
| PgVector 未 ready 且 `AI_RAG_ENABLED=true` | backend startup / RAG vector bean | RAG 启动失败应定位到 PgVector 配置；`AI_RAG_ENABLED=false` 时 backend 可正常启动 |
| DashScope key 缺失但 AI/RAG disabled | backend startup | 基础博客可启动；AI 调用不可用但不影响非 AI 页面 |
| DashScope key 缺失但启用 AI 聊天/RAG | AI endpoint / startup | AI 调用失败或 RAG 初始化失败有清晰日志；不得泄露 key |
| uploads volume 无写权限 | backend upload path init / upload API | 启动或上传失败应指向 storage path；不改上传 API 响应契约 |
| `/sitemap.xml` 被 SPA fallback 捕获 | Nginx config test + curl | 必须返回 XML 或 304，不返回 `index.html` |
| `/robots.txt` 被 SPA fallback 捕获 | Nginx config test + curl | 必须返回 text/plain，不返回 `index.html` |
| AI SSE 被 Nginx 缓冲 | curl/manual stream | chunk 可流式返回；Nginx config 包含 `proxy_buffering off` 和 `X-Accel-Buffering no` |
| 前端 API base 错误 | browser/curl | 生产容器默认同源 `/api`，不依赖 `.env.local` |
| 证书未配置 | deployment docs | 默认 Compose 可先跑 HTTP；HTTPS 通过可选 cert mount 或外部 LB 另行配置 |

## 8. Good / Base / Bad Cases

Good:
- 新服务器只安装 Docker/Compose，配置 `.env` 后执行 `docker compose up -d --build`，访问首页、后台登录、文章详情、uploads 图片、sitemap、robots、AI SSE 均符合现有行为。

Base:
- 不配置 DashScope key，`AI_RAG_ENABLED=false`，博客基础页面、后台、上传、MySQL 数据读写可正常运行。

Bad:
- Compose 启动后 backend 仍连接 `application-local.yaml` 里的宿主机/远程数据库，或者前端请求 `localhost:8080` 而不是同源 `/api`。
- Nginx 把 `/sitemap.xml`、`/robots.txt`、`/api/ai/chat/stream` 当普通 SPA/API 路由处理，导致 SEO 或 SSE 回归。
- 容器镜像或 `.env.example` 泄露真实密钥。

## 9. 预计修改文件

允许修改 / 新增：

- `docker-compose.yml` 或 `compose.yaml`
- `.env.example` 或 `.env.docker.example`
- `.dockerignore`
- `SanguiBlog-server/Dockerfile`
- `SanguiBlog-front/Dockerfile` 或 `docker/frontend/Dockerfile`
- `docker/nginx/default.conf` / `docker/nginx/nginx.conf`
- `docker/mysql/` 下初始化说明或脚本；优先复用根目录 `sanguiblog_db.sql`
- `docker/postgres/init/01-enable-pgvector.sql`
- `README.md`、`README.zh-CN.md` 或新增 `docs/docker-deploy.md`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`（如需要容器 profile）
- `SanguiBlog-server/src/main/resources/application.yaml`（仅限让现有配置支持 env override 或 docker profile，不改业务配置语义）

谨慎修改：

- `SanguiBlog-front/src/api.js`：原则上不需要改；只有发现生产容器无法同源 `/api` 时才允许最小调整。
- `fake-nginx-config/nginx.conf`：可作为参考，不建议直接改成 Docker 产物，避免破坏现有服务器记录。
- `scripts/switch-env.ps1`：本任务不优先改，除非要在文档中标记它不适用于 Docker 部署。

禁止修改：

- 业务 controller/service/repository/entity/DTO 逻辑。
- AI chat/RAG 业务流程。
- 前端页面/组件视觉和交互逻辑。
- `application-local.yaml`、`SanguiBlog-front/.env.local`、任何真实 secret 文件。

## 10. Focused Retrieval Report

Keywords searched:
- `Docker`, `compose`, `.env`, `nginx`, `mysql`, `postgres`, `pgvector`, `spring.datasource`, `uploads`, `asset-base-url`, `storage`, `DashScope`, `AI_RAG`, `VITE_API_BASE`, `sitemap`, `robots`, `SSE`

Candidate implementations / patterns:
- `fake-nginx-config/nginx.conf`: 现有生产 Nginx 反代规则，包含 `/api/`、`/api/ai/chat/stream`、`/sitemap.xml`、`/robots.txt`、`/uploads/`。
- `SanguiBlog-server/src/main/resources/application.yaml`: 后端通用配置，已包含 AI/RAG env placeholders、multipart、sitemap、site version。
- `SanguiBlog-server/src/main/resources/application-local.yaml`: 本地私有配置样例，证明当前部署依赖私有 DB/JWT/storage/site 配置；不得提交真实值。
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`: uploads 根目录和默认子目录初始化契约。
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/WebConfig.java`: 后端 `/uploads/**` 和 `/avatar/**` 静态资源映射。
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfig.java`: RAG 开启时独立 PgVector datasource。
- `SanguiBlog-front/src/api.js`: 前端 API 默认 `/api`，生产容器应复用同源路径。
- `sanguiblog_db.sql`: MySQL 主 schema 和初始数据源。
- `README.zh-CN.md` / `ChangeEnv.md`: 现有手工部署和环境切换说明，需新增 Docker 部署分支说明。

Decision:
- `modify existing config docs + create infra files`。不创建第二套业务入口，不改业务 API。

Duplicate risk:
- Docker Nginx 配置必须从 `fake-nginx-config/nginx.conf` 提取容器所需规则，但不要让 `fake-nginx-config` 和 `docker/nginx` 两套规则长期漂移。DeepSeek 需要在 Docker 文档中说明 `fake-nginx-config` 是旧/宿主机部署参考，Docker 以 `docker/nginx/*` 为准。

## 11. Required Tests / Assertion Points

静态与构建：

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile

cd ../SanguiBlog-front
npm run build
```

Docker 配置：

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker compose logs backend
docker compose logs mysql
docker compose logs pgvector
```

HTTP 验证：

```bash
curl -i http://localhost/
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
curl -i http://localhost/uploads/
```

DB 验证：

```bash
docker compose exec mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES;"
docker compose exec pgvector psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension WHERE extname='vector';"
```

Optional AI/RAG verification when keys are available:

```bash
docker compose exec backend printenv | grep -E "AI_RAG|DASHSCOPE|PGVECTOR"
curl -N http://localhost/api/ai/chat/stream
```

Assertion points:
- `docker compose config` 不包含真实 secret 明文来自仓库文件。
- backend datasource host 是 `mysql`，PgVector host 是 `pgvector`。
- 前端生产构建使用同源 `/api`，不依赖 ignored `.env.local`。
- `/sitemap.xml` 和 `/robots.txt` 不返回 SPA HTML。
- SSE location 明确关闭 buffering。
- uploads 数据在容器重启后仍存在。

## 12. 风险与边界说明

- 现有 `application-local.yaml` 是 gitignored 私有文件，且当前本地内容包含真实环境倾向配置；Docker 方案必须避开它，优先通过 `SPRING_PROFILES_ACTIVE=docker` + env 或完全 env override。
- README 中提到 `DB_URL/DB_USERNAME/DB_PASSWORD` 兼容变量，但当前代码主要依赖 Spring 标准 `SPRING_DATASOURCE_*`。实施时应以 Spring 标准变量为准，若要支持短别名，需要在 `application-docker.yaml` 显式映射。
- MySQL 初始化脚本只在数据卷首次创建时执行；已有数据卷升级不等于迁移方案。本任务不引入迁移工具。
- PgVector 镜像选择需要支持目标 CPU/OS；推荐使用官方/可信 pgvector 镜像并固定大版本。
- HTTPS 证书处理需求未完全明确。默认 PRD 建议 Compose 先提供 HTTP，生产 HTTPS 可通过挂载证书到 Nginx 或外部反代/LB 完成；如果用户要求“容器内部直接 HTTPS”，需要补充 cert mount 约定。

## 13. 验收标准

- [ ] 仓库新增完整 Docker/Compose 部署入口和 `.env` 模板。
- [ ] `docker compose up -d --build` 能启动 web/backend/mysql/pgvector。
- [ ] MySQL 容器能初始化 `sanguiblog_db.sql`。
- [ ] PgVector 容器有 `vector` extension；RAG env 可指向该容器。
- [ ] backend 不依赖宿主机 MySQL/PostgreSQL 路径或当前 ignored local 配置。
- [ ] 前端生产容器访问同源 `/api`。
- [ ] Nginx 容器正确处理 SPA fallback、API、SSE、sitemap、robots、uploads。
- [ ] uploads 持久化且路径仍兼容 `/uploads/...`。
- [ ] 构建和静态验证命令通过，或清楚记录未运行原因。
- [ ] 文档说明首次部署、升级、停止、查看日志、数据卷备份/清理、RAG 开关、HTTPS 选择。

