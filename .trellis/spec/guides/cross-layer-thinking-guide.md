# Cross-Layer Thinking Guide

> Purpose: define executable contracts before changing data that crosses backend, database, frontend, browser storage, SSE, upload, or AI boundaries.

---

## When This Is Mandatory

Use this guide for any change involving:

- New or changed API path, method, request field, response field, or status.
- Database schema/entity/repository changes.
- Frontend `api.js` changes.
- Backend DTO consumed by frontend.
- Upload path/size/content-type behavior.
- Auth, permissions, BotGuard, guest AI access.
- SSE stream events or AI chat payloads.
- Site meta, sitemap, robots, analytics, system monitor.
- RAG/vector-store synchronization.

---

## Contract Template

Before implementation, write a short contract:

```markdown
## Cross-Layer Contract

### 1. Scope / Trigger
<what changes and why it crosses layers>

### 2. Signatures
- Backend: <HTTP method path or service method>
- Frontend: <api.js function and consumer>
- DB: <table/columns if changed>
- Env/config: <keys if changed>

### 3. Payloads
Request:
Response:
SSE event / upload form / storage key:

### 4. Validation & Error Matrix
| Case | Expected status/result |

### 5. Good / Base / Bad Cases

### 6. Tests Required
<backend tests, frontend node tests, build/compile>
```

---

## Data Flow Map

Map the complete path:

```text
UI state -> src/api.js -> Controller -> Service -> Repository/DB
        -> Service DTO mapping -> ApiResponse -> src/api.js parsing -> Component rendering
```

For AI chat:

```text
AiAssistantWidget -> api.js streamAiChatReliable
-> AiChatController -> AiChatService
-> access/session/context/RAG/capability services
-> ChatModel/SSE -> api.js consumeSseStream -> UI messages
```

For uploads:

```text
Form state -> upload function in api.js -> UploadController multipart validation
-> StoragePathResolver/PostAssetService/AvatarStorageService
-> returned URL/path -> component save/publish payload
```

---

## Project API Contracts

### JSON APIs

Standard response:

```json
{ "success": true, "message": "ok", "data": {} }
```

Frontend parsing:

```js
const data = res.data || res;
```

Errors must put user-facing text in `message`.

### Pagination

Backend response is 1-based:

```json
{ "records": [], "total": 0, "page": 1, "size": 10 }
```

Frontend clamps page/size before request and normalizes response.

### SSE AI Chat

Events:

- `chunk`: `{ "text": "..." }`
- `complete`: `{ "reply", "sessionId", "model", "mode", "references" }`
- `error`: `{ "message": "..." }`

`complete` is terminal success. Frontend must not replace a completed message with a later network error.

### Uploads

Multipart endpoints do not use JSON request body. They still return JSON `ApiResponse`.

Current limits:

- cover: 10 MB
- article asset single: 20 MB
- article asset total: 50 MB
- article asset count: 10
- Spring multipart: 60 MB

### Custom Headers

Chinese analytics labels are URL-encoded in frontend headers and decoded in `PostController`.

Do not put raw non-ISO-8859-1 strings into `fetch` headers.

### Docker Compose Deployment

Containerized deployment is an infra/cross-layer contract, not a business API change. Keep the executable contract in these files:

| Concern | File / Command | Contract |
|---------|----------------|----------|
| Compose entry | `docker-compose.yml` | `docker compose up -d --build`, `docker compose down`, `docker compose ps`, and `docker compose logs -f backend` must work from the repo root. |
| Env template | `.env.example` | May list sensitive keys, but default sensitive values stay blank. Compose must fail fast when `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, or `POSTGRES_PASSWORD` is missing. |
| Backend profile | `SanguiBlog-server/src/main/resources/application-docker.yaml` | Uses `spring.profiles.active=docker`, container hosts (`mysql`, `pgvector`), and `/data/uploads`; it must not depend on ignored `application-local.yaml`. |
| MySQL JDBC URL | `.env.example`, `docker-compose.yml`, `application-docker.yaml` | Use `characterEncoding=utf8` or omit the parameter. Do not use `characterEncoding=utf8mb4`; MySQL Connector/J treats it as a Java charset and fails startup. Keep `utf8mb4` at MySQL server/table collation level. |
| Frontend image | `SanguiBlog-front/Dockerfile` | Builds Vite output in the image and serves it through Nginx. Production API calls stay same-origin under `/api`. |
| Nginx routes | `docker/nginx/default.conf` | `/sitemap.xml` and `/robots.txt` proxy to backend before SPA fallback; `/api/ai/chat/stream` disables buffering; `/uploads/games/` preserves same-origin iframe CSP; `/avatar/` maps to `/data/uploads/avatar/` and must not fall through to SPA HTML. |
| MySQL init | `sanguiblog_db.sql` mounted at `/docker-entrypoint-initdb.d/` | Initializes only empty Docker data volumes. It is not a migration path for existing data. |
| PgVector init | `docker/postgres/init/01-enable-pgvector.sql` | Creates `vector` extension for the RAG vector store. |
| Upload storage | `uploads_data` volume mounted at `/data/uploads` | URLs remain `/uploads/...`; `StoragePathResolver` still owns directory initialization. |

Good/Base/Bad cases:

| Case | Expected Result |
|------|-----------------|
| Good | Fresh server with Docker and a filled `.env` starts `web`, `backend`, `mysql`, and `pgvector`; `/`, `/api/site/meta`, `/sitemap.xml`, `/robots.txt`, and `/uploads/...` keep existing semantics. |
| Base | `AI_RAG_ENABLED=false` and no DashScope key still allow core blog pages, admin, uploads, and MySQL-backed features to run. |
| Bad | Backend connects to host/local database config, `.env.example` contains real or fake default secrets, sitemap/robots fall through to SPA HTML, or SSE is buffered by Nginx. |

Required verification for Docker/infra work:

```bash
docker compose config
cd SanguiBlog-server
mvn -q -DskipTests compile
cd ../SanguiBlog-front
npm run build
```

When Docker is available, also verify:

```bash
docker compose up -d --build
docker compose ps
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
```

### Docker Data Sync / Restore

Production-to-local Docker data restore is also an infra/cross-layer contract. Keep the executable workflow in:

| Concern | File / Command | Contract |
|---------|----------------|----------|
| Main guide | `docs/docker-data-sync.md` | Documents Linux server export, Windows local restore, rollback, sensitive data rules, troubleshooting, and verification. |
| Local entry | `scripts/docker-data-sync-local-restore.ps1` | Supports `-ServerHost`, `-ServerUser`, `-RemoteBackupDir`, `-LocalBackupDir`, `-SshPort`, `-ComposeProjectDir`, `-RestoreUploadsMode Replace|Merge`, `-SkipDownload`, `-SkipMysql`, `-SkipPgVector`, `-SkipUploads`, and `-DryRun`. |
| MySQL export | `mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4` | Produces `mysql.sql`; restore copies the file into the `mysql` container and imports with `mysql --default-character-set=utf8mb4`. |
| PgVector export | `pg_dump -Fc` | Produces binary `pgvector.dump`; restore must copy the dump into the `pgvector` container and run `pg_restore` from that file. Do not pipe this binary through PowerShell text streams. |
| uploads export | `tar -czf uploads.tar.gz -C <uploads-parent> <uploads-dir-name>` | Restore must reject absolute paths, `..` path traversal, and then copy safe files into `/data/uploads`. |
| Integrity files | `SHA256SUMS`, optional `manifest.json` | Checksum mismatch stops before DB import or volume writes. Manifest records file sizes, table/row counts, upload counts, and non-secret source labels. |

Validation/error matrix:

| Case | Expected Result |
|------|-----------------|
| Missing local `.env` key | Stop before restore and print only key names, not values. |
| Missing remote backup file or checksum mismatch | Stop before touching local Docker volumes. |
| Existing local volumes | Back up `mysql_data`, `pgvector_data`, and `uploads_data` before overwrite; never default to `docker compose down -v`. |
| PgVector extension missing | Run/check `CREATE EXTENSION IF NOT EXISTS vector`; stop if unavailable. |
| uploads archive contains unsafe path | Stop before extraction. |
| Static upload URL returns SPA HTML | Treat as restore failure; inspect `docker/nginx/default.conf` aliases and `/data/uploads` volume content. |

Good/Base/Bad cases:

| Case | Expected Result |
|------|-----------------|
| Good | MySQL, PgVector, and uploads restore; `/api/site/meta`, `/api/games`, uploaded assets, and RAG checks pass. |
| Base | AI/RAG intentionally disabled or DashScope key absent; core blog/admin/uploads pass and RAG is marked skipped. |
| Bad | Stale MySQL schema, missing vector rows when RAG is enabled, unsafe uploads archive, or SPA fallback for static uploads. |

Required verification for docs/script-only restore work:

```bash
git diff --check
docker compose config
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -ServerHost localhost -ServerUser test -RemoteBackupDir /tmp/test -DryRun
```

---

## Validation & Error Matrix Example

| Case | Backend | Frontend |
|------|---------|----------|
| Missing post | `NotFoundException` -> 404 | article state `not_found` |
| Invalid archive month | 400 | show load error/fallback |
| Stale token on public GET | 401 then retry without auth | user can still see public content |
| AI assistant disabled | access exception / unavailable | launcher hidden from site meta; backend still rejects calls |
| Guest AI throttled | 403/429 with structured data | captcha/notice flow |
| Upload too large | 400/413 depending layer | show readable message and prevent save while uploading |

---

## Good / Base / Bad Cases

Every cross-layer change should include:

- Good: normal successful path.
- Base: empty/null/default path.
- Bad: invalid input, unauthorized access, missing entity, provider failure, or stale schema.

Example for site meta field:

- Good: backend returns configured `homeBackgroundUrl`; frontend renders it.
- Base: field missing/null; frontend falls back to `/static/home/bg.jpg`.
- Bad: asset origin has path prefix; URL builder avoids duplicate segments.

---

## Tests Required

| Layer Changed | Test |
|---------------|------|
| Backend service only | targeted Maven service test |
| Controller/security | targeted controller/security test |
| Entity/schema/repository | repository/service test plus SQL review |
| Frontend helper | sibling `node *.test.js` |
| Frontend component | targeted static test plus build |
| Backend + frontend | backend targeted tests, frontend static tests/build, field alignment review |
| AI/SSE | AI service tests plus `aiStream`/AI widget tests where relevant |

If a test is skipped, say so and document residual risk.
