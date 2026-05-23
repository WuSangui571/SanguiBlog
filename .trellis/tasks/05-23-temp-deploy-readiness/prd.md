# 临时上线评估与部署手册

## Goal

为备用服务器/临时上线准备一份可执行的 Docker Compose 部署评估与验证手册，并明确 DeepSeek 后续可改动的文档/infra范围、验收标准和必跑测试。Codex 本轮只准备 PRD、Trellis context、代码研究和测试计划，不修改业务实现文件。

## Task Classification

Complex Task。

理由：任务跨 Docker Compose、宿主机端口/防火墙、`.env` 密钥、MySQL/PgVector 初始化、backend 健康检查、Nginx 路由、HTTP 验证、上传持久化和 MySQL schema drift 风险。它不是业务模型重构，但属于部署链路和时序问题，必须先固定合同、验证矩阵和边界。

## Scope

### In Scope

- 评估临时上线前的服务器基础条件：Docker、Docker Compose、HTTP 端口、防火墙/安全组。
- 梳理 `.env` 必填密钥和上线域名/同源配置。
- 给出 fresh volume 冷启动验证流程：`docker compose down -v`、`docker compose up -d --build`、`docker compose ps`、日志观察。
- 给出 HTTP 验证清单：`/`、`/api/site/meta`、`/sitemap.xml`、`/robots.txt`、管理端登录、上传写入。
- 给出持久化验证清单：普通 `docker compose down` + `docker compose up -d`，确认数据不丢。
- 给出风险观察：MySQL init 中 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 是否报错，是否阻断后续 SQL 或导致 AI 表不完整。
- 补充或整理现有部署文档中的临时上线手册内容。

### Out of Scope

- 不做业务 API、DTO、实体、Repository、Service、Controller、React UI 逻辑改造，除非后续明确发现文档与当前实现不一致且用户确认扩大范围。
- 不引入新的数据库迁移框架。
- 不直接修复 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 兼容性；若验证证明它实际阻断初始化或导致 AI 表缺失，另开 SQL 初始化兼容性任务。
- 不把 `AI_RAG_ENABLED` 默认改为 `true`；备用环境可保持 `false` 以降低外部依赖。
- 不提交真实密钥、真实域名账号、服务器 IP 或 token。
- 不执行生产服务器破坏性命令；`docker compose down -v` 只用于明确的空卷/测试数据冷启动验证。

## Deliverables

- 一份临时上线部署手册，优先落在现有 Docker 部署文档中，建议文件：
  - `docs/docker-deploy.md`
  - `README.md`
  - `README.zh-CN.md`
- 若新增独立文档更清晰，可新增 `docs/temp-deploy-readiness.md`，但必须从现有部署文档链接过去，避免孤立文档。
- Trellis context 注入给 implement/check，用于 DeepSeek 执行和 Codex 后续 check/finish-work。

## Acceptance Criteria

- [ ] 手册明确服务器基础环境检查命令：Docker 版本、Docker Compose 版本、端口 80 或 `.env WEB_PORT`、防火墙/安全组 HTTP 放行。
- [ ] 手册明确 `.env` 必填项：`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD`、`JWT_SECRET`。
- [ ] 手册明确站点访问配置：`SITE_BASE_URL`、`SITE_ALLOWED_HOSTS`、`SECURITY_CORS_ALLOWED_ORIGINS`，并说明同源 Docker 部署下 `SITE_ASSET_BASE_URL` 留空。
- [ ] 手册明确备用环境可保持 `AI_RAG_ENABLED=false`，避免 DashScope/PgVector/RAG 外部依赖阻断核心博客上线。
- [ ] 手册明确冷启动流程和观察点：`docker compose down -v` 仅用于清空测试数据；`up -d --build` 后 MySQL 必须等 `roles` 表可查再让 backend 启动；backend 日志不能出现核心表 `Table ... doesn't exist`。
- [ ] 手册明确 HTTP 验证端点及预期：`/` 返回前端、`/api/site/meta` 返回 JSON、`/sitemap.xml` 返回 XML、`/robots.txt` 返回 text/plain，不能落到 SPA HTML。
- [ ] 手册明确管理端登录和上传目录写入验证，包含 `/data/uploads` 权限修复提示。
- [ ] 手册明确持久化验证：普通 `docker compose down && docker compose up -d` 后数据应保留；上线后不要再执行 `down -v`，除非明确要清空测试数据。
- [ ] 手册明确 MySQL init 风险观察：`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 如果仅出现在日志但不影响核心验证，记录风险；如果阻断后续 SQL 或 AI 表不完整，拆分 SQL 初始化兼容性任务。
- [ ] 文档不包含真实密钥或用户私密信息。
- [ ] 文档不与 `.trellis/spec/guides/cross-layer-thinking-guide.md` 中 Docker Compose Deployment 合同冲突。

## Cross-Layer / Infra Contract

### 1. Scope / Trigger

本任务是 infra/cross-layer 文档和验证合同。它不改变业务接口，但部署手册必须覆盖命令、环境变量、数据库初始化、反向代理路由、静态上传资源、后端公开 HTTP 端点和日志验证。

### 2. Commands / Signatures

- Compose commands:
  - `docker compose version`
  - `docker compose config`
  - `docker compose down -v`
  - `docker compose up -d --build`
  - `docker compose ps`
  - `docker compose logs -f mysql`
  - `docker compose logs -f backend`
  - `docker compose down`
  - `docker compose up -d`
- MySQL checks:
  - `docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1 FROM roles LIMIT 1;"'`
  - `docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '\''ai_%'\'';"'`
  - `docker compose logs backend | grep "doesn't exist"` on Linux, or equivalent PowerShell `Select-String`.
- HTTP checks:
  - `curl -i http://localhost/`
  - `curl -i http://localhost/api/site/meta`
  - `curl -i http://localhost/sitemap.xml`
  - `curl -i http://localhost/robots.txt`
  - If `WEB_PORT` is set, replace `localhost` base with `http://localhost:<WEB_PORT>`.
- Upload write probe:
  - `docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test'`
  - Repeat for `covers` and `avatar` if those directories are tested.

### 3. Env / Config Fields

Required secrets:

| Key | Required | Notes |
| --- | --- | --- |
| `MYSQL_PASSWORD` | Yes | MySQL application user password; `SPRING_DATASOURCE_PASSWORD` may default to it. |
| `MYSQL_ROOT_PASSWORD` | Yes | MySQL root password. |
| `POSTGRES_PASSWORD` | Yes | PgVector/PostgreSQL password, even when RAG is disabled because service still starts. |
| `JWT_SECRET` | Yes | Recommended 32+ random chars; must never be committed with real value. |

Site/network config:

| Key | Required | Notes |
| --- | --- | --- |
| `WEB_PORT` | Optional | Defaults to `80`; set when host port 80 is occupied. |
| `SITE_BASE_URL` | Recommended | Production/temporary domain URL, e.g. `http://example.com` before HTTPS. |
| `SITE_ALLOWED_HOSTS` | Recommended | Must include the host users visit. |
| `SECURITY_CORS_ALLOWED_ORIGINS` | Recommended | Same-origin Docker deployment usually matches `SITE_BASE_URL`. |
| `SITE_ASSET_BASE_URL` | Optional | Same-origin Docker deployments should leave it empty. |
| `AI_RAG_ENABLED` | Optional | Temporary/backup environment may keep `false`. |

### 4. API / HTTP Payload Fields

- `GET /api/site/meta`
  - Expected JSON follows `ApiResponse<SiteMetaDto>`:
    - `success: true`
    - `message: "ok"`
    - `data` object containing site metadata.
  - Same-origin Docker deployment should not require cross-origin CORS for normal browser use.
- `GET /sitemap.xml`
  - Expected `Content-Type` contains `application/xml`.
  - Response body must not be frontend `index.html`.
- `GET /robots.txt`
  - Expected `Content-Type` contains `text/plain`.
  - Response body must not be frontend `index.html`.
- `/uploads/...`
  - Static files served from Docker `uploads_data` mounted at `/data/uploads`.

### 5. Validation / Error Matrix

| Case | Validation Point | Expected Result | Follow-up |
| --- | --- | --- | --- |
| Missing required `.env` secret | `docker compose config` or `docker compose up` | Fails fast with missing key name; no container starts with fake secret | Fill `.env`; do not commit values |
| Host port 80 occupied | `docker compose up` / OS port check | web fails to bind or startup fails | Set `WEB_PORT` to free port and update verification base URL |
| HTTP blocked by firewall/security group | Browser/curl from outside server | Local container may work but remote access fails | Open inbound HTTP for selected port |
| Fresh volume cold start | `down -v` then `up -d --build` | MySQL initializes schema; healthcheck waits for `roles`; backend starts after DB ready | Inspect `mysql`/`backend` logs if unhealthy |
| Backend log has `Table ... doesn't exist` for core tables | `docker compose logs backend` | Invalid cold start or stale volume | Check `sanguiblog_db.sql` import and MySQL volume state |
| Backend log has AI table missing with reused volume | `SHOW TABLES LIKE 'ai_%'` | Existing volume schema drift | Apply targeted AI table SQL or keep AI disabled; consider separate task |
| MySQL init logs show `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` syntax issue | `docker compose logs mysql` | Risk depends whether later SQL continued and required tables exist | If it blocks AI table creation, open SQL compatibility task |
| `/sitemap.xml` or `/robots.txt` returns HTML | `curl -i` content-type/body | Nginx route order/config wrong | Inspect `docker/nginx/default.conf` |
| Upload write probe fails | `touch` in `/data/uploads/...` | Uploads will fail at runtime | Run documented `chown -R sangui:sangui /data/uploads` fix |
| Ordinary restart loses data | create/login/upload then `down` + `up -d` | Data should remain because volumes persist | Confirm not using `down -v` and volumes are intact |

### 6. Good / Base / Bad Cases

Good:

- A fresh temporary server with Docker and a filled `.env` starts `web`, `backend`, `mysql`, and `pgvector`; `/`, `/api/site/meta`, `/sitemap.xml`, `/robots.txt`, admin login, and upload write checks pass.

Base:

- `AI_RAG_ENABLED=false`, no DashScope key, and same-origin `SITE_ASSET_BASE_URL=` still allow core blog, admin login, sitemap/robots, and uploads to work.

Bad:

- MySQL is marked healthy before `sanguiblog_db.sql` completes, backend logs `Table ... doesn't exist`, sitemap/robots fall through to SPA HTML, upload directories are not writable by backend, `.env` contains committed secrets, or `docker compose down -v` is used after real test/production data is created.

### 7. Required Tests and Assertion Points

Static/config checks:

```bash
git diff --check
docker compose config
```

Backend:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
```

Frontend:

```bash
cd SanguiBlog-front
node src/utils/asset.test.js
npm run build
```

Docker runtime verification when Docker is available:

```bash
docker compose down -v
docker compose up -d --build
docker compose ps
docker compose logs backend
curl -i http://localhost/
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
docker compose down
docker compose up -d
docker compose ps
```

Assertion points:

- `docker compose config` passes and does not print real secrets into docs.
- `mysql` healthcheck waits until `roles` query succeeds.
- `backend` logs contain no `Table ... doesn't exist` for core startup paths.
- `/sitemap.xml` and `/robots.txt` content types are XML/text, not HTML.
- A non-`down -v` restart preserves MySQL and uploads data.

## Focused Research Summary

### Relevant Specs

- `.trellis/spec/backend/directory-structure.md`: Docker profile maps storage to `/data/uploads`; sitemap/robots and uploads have established backend ownership.
- `.trellis/spec/backend/quality-guidelines.md`: Docker/Nginx CSP and sitemap/robots contracts; risk-based verification rules.
- `.trellis/spec/backend/database-guidelines.md`: `sanguiblog_db.sql` is canonical; Docker init only runs for empty `mysql_data`; schema drift diagnosis commands already defined.
- `.trellis/spec/backend/error-handling.md`: upload and API error behavior; Nginx `client_max_body_size` must align with Spring multipart max.
- `.trellis/spec/backend/logging-guidelines.md`: logs must not expose secrets; operational fallbacks should be readable.
- `.trellis/spec/frontend/directory-structure.md`: frontend build/API/static asset contract; `buildAssetUrl` should own uploaded asset URLs.
- `.trellis/spec/frontend/quality-guidelines.md`: build/static test expectations for frontend deployment-impacting changes.
- `.trellis/spec/frontend/type-safety.md`: `SiteMetaDto`/asset URL contract and `buildAssetUrl` safety.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: retrieve-first report requirement; avoid duplicate deployment docs if existing docs can be extended.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: Docker Compose Deployment contract, MySQL readiness, Nginx routes, BotGuard/public read, data restore contracts.

### Code / Document Patterns Found

- `docker-compose.yml`: required secret fail-fast expressions, `WEB_PORT`, `AI_RAG_ENABLED=false`, MySQL healthcheck querying `roles` over TCP.
- `.env.example`: central environment variable template with sensitive values blank.
- `docs/docker-deploy.md`: existing Docker deployment guide already contains quick start, commands, verification endpoints, persistence, AI table diagnosis, and troubleshooting.
- `README.md` / `README.zh-CN.md`: top-level Docker quick start and validation sections already cover many first-time deployment steps.
- `docker/nginx/default.conf`: `/sitemap.xml` and `/robots.txt` proxy before SPA fallback; `/api/ai/chat/stream` disables buffering; `/uploads/` and `/avatar/` static aliases.
- `SanguiBlog-server/src/main/resources/application-docker.yaml`: Docker profile uses `mysql`, `/data/uploads`, `SITE_BASE_URL`, allowed hosts, CORS, PgVector env keys.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/SiteController.java`: `GET /api/site/meta` is the public JSON meta endpoint.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/SitemapController.java`: `/sitemap.xml` and `/robots.txt` are backend XML/text endpoints, not `ApiResponse`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`: startup ensures upload dirs and fails fast with Docker `chown` hint when not writable.
- `SanguiBlog-front/src/utils/asset.test.js`: verifies same-origin and CDN/path-prefix asset URL behavior.

### Likely Files To Modify

- `docs/docker-deploy.md`: primary place to add/clarify the temporary deployment readiness runbook.
- `README.md`: concise English pointer/checklist if the runbook needs top-level visibility.
- `README.zh-CN.md`: concise Chinese pointer/checklist if the runbook needs top-level visibility.
- Optional `docs/temp-deploy-readiness.md`: only if the handoff decides an independent temporary runbook is clearer than expanding `docs/docker-deploy.md`.
- Optional `.trellis/spec/guides/cross-layer-thinking-guide.md`: only if DeepSeek discovers a reusable deployment contract not already captured.

### Risk / Boundary Notes

- Do not edit business implementation unless research proves current code contradicts the deployment contract and user confirms scope expansion.
- `docker compose down -v` is destructive and should be documented only for empty-volume cold-start tests, never routine restart.
- Existing `sanguiblog_db.sql` contains `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; MySQL compatibility must be observed during cold start. If it breaks initialization, create a separate SQL compatibility task.
- Keep `AI_RAG_ENABLED=false` acceptable for temporary environments.
- Keep `SITE_ASSET_BASE_URL` empty for same-origin Docker deployments to avoid duplicated `/uploads`.
- Do not duplicate existing Docker docs unnecessarily; prefer a focused section or linked runbook.

## Planning Self-Check

- 明确验收标准：Yes，见 Acceptance Criteria。
- 明确禁止修改范围：Yes，见 Out of Scope 和 Risk / Boundary Notes。
- 列出预计修改文件：Yes，见 Likely Files To Modify。
- 列出必跑测试：Yes，见 Required Tests and Assertion Points。
- 已读取具体 guideline：Yes，已读取 backend/frontend/guides index 以及 checklist 指向的具体文件。
- 是否存在需求不清需要用户确认：No。默认目标是补充部署手册和验证计划；若 DeepSeek 发现必须改业务实现，应先回到用户确认。
- API / DB / frontend types / DTO 是否未对齐：No planned field/schema/API change。HTTP 验证端点和 env/config 合同已列明。

## DeepSeek Execution Notes

DeepSeek 应先阅读本 PRD 和注入的 implement context，再修改文档。优先更新现有文档，保持变更窄而可审查。不要执行真实服务器部署，也不要写入真实密钥。编码结束后交回 Codex 做 `$check` / `$finish-work`。
