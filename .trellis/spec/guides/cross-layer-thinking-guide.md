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

A stream that receives no `chunk`, `complete`, or `error` must not leave the UI on pending text indefinitely. Backend provider streams need a bounded timeout that emits `error` when possible, and the frontend reliable stream reader needs its own bounded timeout/error path as a client-side fallback.

AI provider saturation is part of the cross-layer contract. Backend provider work is bounded by `AI_PROVIDER_MAX_CONCURRENCY` / `ai.provider.max-concurrency` through the established guard. When the guard is full, `POST /api/ai/chat` returns a readable HTTP `429` failure and `POST /api/ai/chat/stream` emits an SSE `error` event followed by completion.

### AI Assistant Admin Capability

The admin AI settings contract separates persisted admin switches from runtime capability and effective availability.

Data flow:

```text
Admin settings UI -> adminUpdateAiAssistantSettings(payload)
-> PUT /api/admin/ai-assistant-settings
-> AiAssistantSettingService -> site_settings
-> ApiResponse<AiAssistantAdminSettingsDto>
-> Admin settings UI state
```

Public site meta continues to control launcher visibility:

```text
GET /api/site/meta data.aiAssistant.enabled
-> resolveAiAssistantConfig()
-> public AI launcher visibility
```

Contracts:

| Concern | Contract |
|---------|----------|
| Chat admin switch | Persist in `site_settings` key `ai.chat.enabled`; default is enabled for backward compatibility. |
| RAG admin switch | Persist in `site_settings` key `ai.rag.admin_enabled`; default is disabled. Do not confuse this DB key with the Spring property `ai.rag.enabled`, which remains low-level RAG capability/config. |
| Admin update payload | Prefer nullable `aiChatAdminEnabled` and `aiRagAdminEnabled`; legacy nullable `enabled` still maps to chat admin state. If both `enabled` and `aiChatAdminEnabled` are present, `aiChatAdminEnabled` wins. |
| Admin response payload | Include admin booleans, capability booleans, effective booleans, safe disabled reasons, and legacy `enabled` as an alias for effective chat enabled. |
| Public site meta payload | `aiAssistant.enabled` means effective chat enabled; `capable` means chat capability; `ragEnabled` means effective RAG enabled; `ragCapable` means RAG capability. |
| Chat effective formula | `aiChatEffectiveEnabled = aiChatCapable && aiChatAdminEnabled`. |
| RAG effective formula | `aiRagEffectiveEnabled = aiChatEffectiveEnabled && aiRagCapable && aiRagAdminEnabled`. |
| Capability reasons | Reasons must be safe, stable, and must not include API keys, provider payloads, prompts, article content, or full exception text. |
| RAG retrieval | `AiBlogRagService.retrieve(...)` must return empty unless effective RAG is true. Runtime provider/vector errors may degrade to empty RAG context with safe logging. |

Validation/error matrix:

| Case | Expected Result |
|------|-----------------|
| Missing chat API key, base URL, or chat model and admin enables chat | `PUT /api/admin/ai-assistant-settings` returns a 400-style `ApiResponse` through `GlobalExceptionHandler`; chat enabled is not persisted. |
| Chat admin disabled | Public meta `aiAssistant.enabled=false`; chat endpoints reject through `assertEnabled`; RAG effective is false even if RAG admin is true. |
| Missing embedding API key, embedding model, PgVector config, `EmbeddingModel`, or `VectorStore` and admin enables RAG | 400-style failure; RAG enabled is not persisted; admin/site meta expose a safe RAG disabled reason. |
| Chat effective false and admin enables RAG | Reject enabling RAG with a clear message. |
| Older public/admin payload only has `enabled` | Frontend must not crash; old admin update `{ "enabled": true }` remains accepted for chat admin state. |

Required targeted verification for this contract:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogVectorStoreConfigTest,AiChatServiceTest" test
mvn -q -DskipTests compile

cd ../SanguiBlog-front
node src/appfull/AdminAiAssistantSettingsContract.test.js
node src/appfull/aiAssistantConfig.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

### Uploads

Multipart endpoints do not use JSON request body. They still return JSON `ApiResponse`.

Current limits:

- cover: 10 MB
- article asset single: 20 MB
- article asset total: 50 MB
- article asset count: 10
- Spring multipart: 60 MB

### Home Author WeChat QR

The public home author card uses the SUPER_ADMIN profile QR image as site-level author data.

Contract:

```text
/admin/profile QR controls
-> src/api.js adminUploadWechatQr(file) / adminDeleteWechatQr()
-> POST/DELETE /api/admin/site/wechat-qr
-> users.wechat_qr_url
-> GET /api/site/meta data.author.wechatQr
-> ArticleList author QR rendering
```

Signatures and payloads:

| Layer | Contract |
|-------|----------|
| Backend upload | `POST /api/admin/site/wechat-qr`, `multipart/form-data`, field `file`, `@PreAuthorize("hasRole('SUPER_ADMIN')")` |
| Backend delete | `DELETE /api/admin/site/wechat-qr`, `@PreAuthorize("hasRole('SUPER_ADMIN')")` |
| Response | `ApiResponse<SiteWechatQrDto>` with `data.url` as `/uploads/site/wechat/{uuid}.{ext}` on upload and `null` on delete |
| Existing profile hardening | `PUT /api/users/me` must reject non-`SUPER_ADMIN` attempts to mutate `wechatQrUrl` |
| Public read | `GET /api/site/meta` continues returning `data.author.wechatQr` from `UserProfileDto.wechatQr` |
| Frontend fallback | `author.wechatQr` through `buildAssetUrl`; if missing, try legacy `/contact/wechat.jpg`; if image load fails, show empty-state text and no broken image |
| Storage | Reuse `StoragePathResolver`; files live under the existing upload root as `site/wechat/{uuid}.{ext}` and are served as `/uploads/site/wechat/...` |
| DB | Reuse existing `users.wechat_qr_url`; no new table or schema field |

Validation/error matrix:

| Case | Expected Result |
|------|-----------------|
| SUPER_ADMIN uploads png/jpg/jpeg/webp/gif/avif within QR size limit | 200 `ApiResponse.ok({url})`; stored URL starts with `/uploads/site/wechat/` |
| SUPER_ADMIN replaces QR | new owned local file is saved, previous owned local `/uploads/site/wechat/...` file is deleted, external/legacy URLs are ignored |
| SUPER_ADMIN deletes QR | `users.wechat_qr_url` is cleared and owned local QR file is deleted if present |
| ADMIN/USER uploads/deletes QR | 403 via method security |
| ADMIN/USER sends `wechatQrUrl` to `PUT /api/users/me` | 403 or service-level `SecurityException` |
| Missing/empty/too-large/unsupported QR file | 400-style validation failure through `GlobalExceptionHandler` |
| `author.wechatQr` absent and `/contact/wechat.jpg` exists | home author card shows the legacy image |
| configured or legacy QR image fails to load | home author card hides the image and shows empty-state text |

Required tests:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=SiteWechatQrServiceTest,SiteWechatQrControllerAuthorizationTest,AuthServiceTest" test
mvn -q "-Dtest=UploadControllerAuthorizationTest,StoragePathResolverTest" test

cd SanguiBlog-front
node src/appfull/public/ArticleListWechatQr.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

### Custom Headers

Chinese analytics labels are URL-encoded in frontend headers and decoded in `PostController`.

Do not put raw non-ISO-8859-1 strings into `fetch` headers.

### Analytics GeoIP

Analytics IP geolocation is a backend-local contract:

| Concern | File / Command | Contract |
|---------|----------------|----------|
| Shared service path | `GeoIpService.lookup(String ip)` | `AnalyticsService` and `PostService` must use this single service path. Do not add a second active GeoIP provider for analytics. |
| Local database | `SanguiBlog-server/src/main/resources/ip2region/ip2region.xdb` | The application bundles the default IPv4 ip2region XDB for classpath lookup. It can be updated by replacing this file with `ip2region_v4.xdb` from the upstream project. |
| Optional Docker override | `ANALYTICS_GEO_IP2REGION_XDB_PATH` | If set, the backend loads an external XDB path such as `/data/ip2region/ip2region.xdb`; if unset or blank, it uses the classpath XDB. |
| Docker mount | `docker-compose.yml`, `docker-compose.prod.yml` | Keep `./docker/ip2region:/data/ip2region:ro` available for operator-provided XDB replacements, but do not require it for the default bundled path. |
| Browser fallback | `PageViewRequest.geo` | Treat browser-provided `geo` as a non-authoritative fallback only. IANA timezone values such as `Asia/Shanghai`, `UTC`, and `Etc/UTC` must not be stored as IP geolocation. |
| Historical data | `analytics_page_views.geo_location` | Do not backfill existing bad rows unless a separate task explicitly approves it. |

Good/Base/Bad cases:

| Case | Expected Result |
|------|-----------------|
| Good public IPv4 | Local ip2region lookup stores a displayable region string and does not call a remote provider by default. |
| Base private/loopback/link-local IP | Stores internal/local wording or falls back to unknown without throwing. |
| Bad missing XDB | Service logs a recoverable warning and analytics writes degrade to unknown rather than failing the page-view request. |
| Bad timezone fallback | Backend GeoIP lookup misses and frontend sends `Asia/Shanghai` or `UTC`; stored geo is unknown, not the timezone. |

Required verification:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=GeoIpServiceTest,AnalyticsServiceGeoLocationTest" test
mvn -q "-Dtest=IpUtilsTest" test
mvn -q -DskipTests compile
docker compose config
docker compose -f docker-compose.prod.yml config --quiet
```

### Article Visit Duration Analytics

Article detail visit duration tracking is a backend/frontend/database contract that reuses `analytics_page_views`.

Data flow:

```text
AppFull article route -> createVisitId()
-> loadArticle(id, { visitId }) -> fetchPostDetail() sends X-SG-Visit-Id
-> PostController -> PostService.incrementViews()
-> AnalyticsService.recordPageView(..., visitId) creates or fills one analytics_page_views row
-> ArticleDetail tracker start/heartbeat/end
-> POST /api/analytics/visit/{start,heartbeat,end}
-> AnalyticsService updates the same row by visit_id
-> AdminAnalyticsSummaryDto.RecentVisit
-> AdminPanel duration column
```

Contracts:

| Concern | Contract |
|---------|----------|
| DB table | Reuse `analytics_page_views`; do not add a second article visit table for this contract. |
| Columns | `visit_id`, `enter_time`, `leave_time`, `last_active_time`, `total_duration_seconds`, `active_duration_seconds`, `heartbeat_count`, `visit_status`, `updated_at`. |
| DB default | `updated_at` is database-managed; entity mapping must use `insertable=false, updatable=false`. |
| Visit identity | `visit_id` is nullable and unique. Normalize public visit ids to the stored 64-character column length before lookup or save. |
| Detail GET | `GET /api/posts/{id}` and `GET /api/posts/slug/{slug}` accept `X-SG-Visit-Id` and still increment `posts.views_count` once per visit. |
| Tracking endpoints | `POST /api/analytics/visit/start`, `/heartbeat`, and `/end` are permit-all, return `ApiResponse.ok()`, and must not surface tracking failures to the article reader. |
| sendBeacon | `/visit/end` must accept both `application/json` and `text/plain;charset=UTF-8` JSON strings. |
| Durations | Incoming durations are absolute seconds, not deltas. Clamp negatives to `0`, cap at `7200`, keep active duration <= total duration on end, and do not double repeated end calls. |
| Frontend lifecycle | The tracker starts only after real article summary data exists, syncs initial `document.visibilityState`, counts active time only while visible, sends heartbeat about every 15 seconds, and ends on route cleanup/pagehide/beforeunload. |
| Admin display | Backend returns camelCase duration fields; frontend prefers `durationSeconds`, then `activeDurationSeconds`, then `totalDurationSeconds`, otherwise `-`. |

Validation/error matrix:

| Case | Expected Result |
|------|-----------------|
| Detail GET writes visit row before start | start fills missing fields only and does not create a duplicate row. |
| start arrives before detail GET | detail GET fills the existing row and still increments `posts.views_count`. |
| heartbeat has lower active duration than stored | Stored active duration does not regress; heartbeat count increments. |
| end repeats or arrives out of order | Stored durations remain larger legal absolute values and are not accumulated. |
| visit id exceeds DB column length | All lifecycle lookups normalize to the stored 64-character value. |
| hidden tab during tracking | Hidden time is not counted as active duration. |
| bad JSON, missing visit id, unknown visit id, or service exception | Endpoint returns ok/no-op and does not produce a user-visible article error. |
| old analytics rows with null visit fields | Admin list still renders existing fields and duration displays `-`. |

Required verification for article visit duration work:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceVisitDurationTest,AnalyticsServiceGeoLocationTest,AnalyticsControllerVisitTrackingTest" test
mvn -q "-Dtest=IpUtilsTest,BotGuardEngineTest" test
mvn -q -DskipTests compile

cd ../SanguiBlog-front
node src/appfull/public/articleVisitTracker.test.js
node src/appfull/AdminAnalyticsVisitDuration.test.js
node src/utils/analyticsReferrer.test.js
node src/utils/analyticsReferrerIntegration.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build

cd ..
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-27-article-visit-duration-stats
```

### Docker Compose Deployment

Containerized deployment is an infra/cross-layer contract, not a business API change. Keep the executable contract in these files:

| Concern | File / Command | Contract |
|---------|----------------|----------|
| Compose entry | `docker-compose.yml` | `docker compose up -d --build`, `docker compose down`, `docker compose ps`, and `docker compose logs -f backend` must work from the repo root. |
| Env template | `.env.example` | May list sensitive keys, but default sensitive values stay blank. Compose must fail fast when `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, or `POSTGRES_PASSWORD` is missing. |
| Asset URL config | `.env.example`, `docker-compose.yml`, `SanguiBlog-server/src/main/resources/application-docker.yaml`, `SanguiBlog-front/src/utils/asset.js` | Same-origin Docker deployments must leave `SITE_ASSET_BASE_URL` / `site.asset-base-url` empty so `buildAssetUrl` resolves `/uploads/...`, `/avatar/...`, and `/uploads/games/...` against the browser origin. Cross-domain/CDN deployments must use a complete `http(s)://host[/path]` value; relative path prefixes such as `/uploads` are legacy-compatible only and must not duplicate path segments. |
| Backend profile | `SanguiBlog-server/src/main/resources/application-docker.yaml` | Uses `spring.profiles.active=docker`, container hosts (`mysql`, `pgvector`), and `/data/uploads`; it must not depend on ignored `application-local.yaml`. |
| Backend Docker build | `SanguiBlog-server/Dockerfile`, `SanguiBlog-server/.mvn/settings.xml`, `SanguiBlog-server/.mvn/maven.config` | Docker Maven builds must use the project Maven settings and the `aliyun-public` mirror instead of relying on host-local Maven settings. Build steps should not hide Maven package progress with `-q`, so dependency resolution failures are visible during `docker compose up -d --build`. |
| MySQL JDBC URL | `.env.example`, `docker-compose.yml`, `application-docker.yaml` | Use `characterEncoding=utf8` or omit the parameter. Do not use `characterEncoding=utf8mb4`; MySQL Connector/J treats it as a Java charset and fails startup. Keep `utf8mb4` at MySQL server/table collation level. |
| Frontend image | `SanguiBlog-front/Dockerfile` | Builds Vite output in the image and serves it through Nginx. Production API calls stay same-origin under `/api`. |
| Nginx routes | `docker/nginx/default.conf` | `/sitemap.xml` and `/robots.txt` proxy to backend before SPA fallback; `/api/ai/chat/stream` disables buffering; `/uploads/games/` preserves same-origin iframe CSP and allows uploaded tool scripts with `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`; `/avatar/` maps to `/data/uploads/avatar/` and must not fall through to SPA HTML. |
| MySQL init | `sanguiblog_db.sql` mounted at `/docker-entrypoint-initdb.d/` | Initializes only empty Docker data volumes. It is not a migration path for existing data. |
| MySQL readiness | `docker-compose.yml` `mysql.healthcheck.test` | Must authenticate to `$MYSQL_DATABASE` over TCP (`--protocol=TCP -h 127.0.0.1`) and query a stable core table such as `roles`. Do not use socket-only probes for schema readiness because the MySQL image can expose a local init socket before `/docker-entrypoint-initdb.d/` has fully completed. |
| PgVector init | `docker/postgres/init/01-enable-pgvector.sql` | Creates `vector` extension for the RAG vector store. |
| Upload storage | `uploads_data` volume mounted at `/data/uploads` | URLs remain `/uploads/...`; `StoragePathResolver` still owns directory initialization and must fail fast when the upload root or critical subdirectories are not writable by the backend process. |
| Upload volume permissions | `docker-compose.yml`, `docker-compose.prod.yml` `uploads-init` | Local and production Compose must run a one-shot root init service before `backend`; it creates `/data/uploads/posts`, `/data/uploads/covers`, `/data/uploads/avatar`, `/data/uploads/games`, and `/data/uploads/site/wechat`, then `chown`s the upload volume to backend uid/gid `100:101` and grants owner/group write traversal. The backend Java process must still run as non-root `sangui:sangui`. |
| Upload restart limitation | `docs/docker-deploy.md` | `docker compose restart backend` does not rerun the one-shot `uploads-init` service. If root-owned upload directories are introduced after startup, use a supported `docker compose up -d --build` / production `up -d` path or an explicit root repair command; do not imply Java can repair ownership as non-root. |

Good/Base/Bad cases:

| Case | Expected Result |
|------|-----------------|
| Good | Fresh server with Docker and a filled `.env` starts `uploads-init`, `web`, `backend`, `mysql`, and `pgvector`; `/data/uploads/posts`, `/data/uploads/covers`, and `/data/uploads/avatar` are writable by the backend non-root user; `/`, `/api/site/meta`, `/sitemap.xml`, `/robots.txt`, and `/uploads/...` keep existing semantics. `/api/site/meta.assetBaseUrl` is `""` for same-origin Docker and `buildAssetUrl('/uploads/foo.png')` resolves to the browser origin path without `/uploads/uploads`. |
| Base | `AI_RAG_ENABLED=false` and no OpenAI-compatible API key still allow core blog pages, admin, uploads, and MySQL-backed features to run. |
| Bad | MySQL reports healthy from a socket-only init probe before `sanguiblog_db.sql` is complete, backend connects to host/local database config, `.env.example` contains real or fake default secrets, sitemap/robots fall through to SPA HTML, SSE is buffered by Nginx, upload directories remain root-owned `755` without a fail-fast startup error, or asset URL config causes duplicated `/uploads/uploads/...` requests. |

Uploaded game CSP contract:

| Case | Expected Result |
|------|-----------------|
| `GET /uploads/games/{slug}/index.html` through Spring Boot static resources | Response CSP is `SecurityConfig.GAME_CSP`, allowing inline scripts, `https://cdn.jsdelivr.net`, and `frame-ancestors 'self'`; `X-Frame-Options` is `SAMEORIGIN`. |
| `GET /uploads/games/{slug}/index.html` through Docker Nginx | `docker/nginx/default.conf` `location /uploads/games/` uses the same CSP text as `SecurityConfig.GAME_CSP` and `X-Frame-Options SAMEORIGIN`. |
| Non-game uploaded assets or app/API routes | Do not receive uploaded-game script allowances; default Spring Security CSP remains `script-src 'self'` and `frame-ancestors 'none'`. |

Docker BotGuard/public-read contract:

| Concern | File / Command | Contract |
|---------|----------------|----------|
| Reverse proxy headers | `docker/nginx/default.conf` | Backend-proxied locations such as `/api/`, `/api/ai/chat/stream`, `/sitemap.xml`, and `/robots.txt` must forward `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`. |
| Docker forwarded headers | `SanguiBlog-server/src/main/resources/application-docker.yaml` | Docker profile must set `server.forward-headers-strategy: native` so Spring/Tomcat can consume trusted proxy headers from the Docker bridge/Nginx path. |
| IP risk key | `IpUtils.resolveIp(HttpServletRequest request)` | BotGuard, analytics, sitemap analytics, auth audit, and post detail view tracking reuse the same resolver. With `X-Forwarded-For: 203.0.113.10, 172.18.0.1`, the resolved IP is `203.0.113.10`; with no proxy headers, fallback is `request.getRemoteAddr()`. Do not add a second IP resolver for Docker. |
| Public read scoring | `BotGuardProperties.publicReadPathPrefixes`, `BotGuardEngine.decide(HttpServletRequest request)` | Only `GET` requests whose servlet path starts with a configured public read prefix skip `noCookie` and `emptyReferer` counter increments and receive `security.bot-guard.public-read-good-score`. `total`, `content`, user-agent, scanner path, stable interval, C-segment, captcha, and block logic remain active. |
| Default public read prefixes | `BotGuardProperties` | Defaults must cover first-screen public reads: `/api/site`, `/api/categories`, `/api/tags`, `/api/comments/recent`, `/api/about`, `/api/analytics/client-ip`, `/api/games`, and `/api/posts`. |
| Captcha/block compatibility | `BotGuardFilter` | Captcha remains HTTP `403` with `captchaRequired`, `captchaUrl`, `verifyUrl`, and `riskScore`; block remains HTTP `429` with `Retry-After`, `retryAfterSeconds`, and `riskScore`. Auth/admin/upload routes still rely on JWT/Spring Security boundaries. |

Docker BotGuard validation matrix:

| Case | Expected Result |
|------|-----------------|
| Normal unauthenticated Docker visitor opens `/`, `/archive`, or `/tools` once | First-screen public APIs complete without BotGuard `403`/`429`. |
| `GET /api/posts?page=1&size=10` after normal app boot | Treated as a public read for BotGuard scoring and does not require captcha solely due to prior app boot reads. |
| `POST /api/posts/{postId}/comments` or other non-GET request under a public prefix | Does not receive public-read scoring relief; authorization and normal BotGuard risk controls still apply. |
| High-frequency loop against public read endpoints from one IP | BotGuard still delays, challenges, or blocks according to accumulated `total`/`content`/stable-interval risk. |
| Scanner-like path or hostile user-agent | Risk score still increases; public-read prefixes must not hide scanner detection. |
| Docker request has no forwarded headers | Resolver falls back to `request.getRemoteAddr()` without crashing. |

Required verification for Docker BotGuard/public-read work:

```bash
docker compose config
cd SanguiBlog-server
mvn -q -DskipTests compile
mvn -q "-Dtest=BotGuardEngineTest,IpUtilsTest,SecurityConfigTest" test
```

When Docker is available, also verify:

```bash
docker compose up -d --build
curl -i http://localhost/api/analytics/client-ip
curl -i http://localhost/api/site/meta
curl -i "http://localhost/api/posts?page=1&size=10"
curl -i http://localhost/api/posts/archive/summary
curl -i http://localhost/api/games
```

Required verification for Docker/infra work:

```bash
docker compose config
cd SanguiBlog-server
mvn -q -DskipTests compile
cd ../SanguiBlog-front
node src/utils/asset.test.js
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

Production-to-local Docker data backup and restore is an infra/cross-layer contract. Keep the executable workflow in:

| Concern | File / Command | Contract |
|---------|----------------|----------|
| Main guide | `docs/docker-data-sync.md` | Two-part handbook: (1) Production Linux to local Windows backup, (2) Local backup to local Docker restore. Covers rollback, sensitive data rules, troubleshooting, and verification. |
| Local entry | `scripts/docker-data-sync-local-restore.ps1` | Supports `-Mode BackupOnly|RestoreOnly|BackupAndRestore` (default `RestoreOnly`), `-ServerHost`, `-ServerUser`, `-RemoteBackupDir` (auto-generated in backup modes), `-LocalBackupDir`, `-SshPort`, `-ComposeProjectDir`, `-RestoreUploadsMode Replace|Merge`, `-SkipDownload`, `-SkipMysql`, `-SkipPgVector`, `-SkipUploads`, `-DryRun`, `-VolumeArchiveImage`, plus backup-mode parameters: `-RemoteProjectDir`, `-RemoteComposeFile`, `-RemoteBackupRoot`, `-RemoteHostLabel`, `-KeepRemoteBackup`, `-CleanupRemoteBackup`, `-BackupTimestamp`. `RestoreOnly -SkipDownload` uses existing local backup files and must not require `-ServerHost`, `-ServerUser`, or `-RemoteBackupDir`; remote parameters are required only for SSH download/backup paths. |
| Remote backup | `-Mode BackupOnly\|BackupAndRestore` via SSH | Script SSHes to production server, requires the project `.env`, but does not shell-source the full file. Docker Compose reads `.env` and injects database variables into mysql/pgvector/web containers to produce `mysql.sql`, `pgvector.dump`, `uploads.tar.gz`, `SHA256SUMS`, and `manifest.json`. All secret env vars expand only inside remote containers. |
| MySQL export / restore | `mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces` | Produces `mysql.sql`; `--no-tablespaces` avoids requiring global `PROCESS` privilege when backup falls back to the normal MySQL app user. Restore copies the file into the `mysql` container and imports with `mysql --default-character-set=utf8mb4`. Before import, restore must wait for `mysqladmin ping` as root, not Compose `healthy`, because the Compose healthcheck queries the `roles` table and can stay non-healthy after the restore script has recreated an empty database but before dump import. |
| PgVector export / restore | `pg_dump -Fc` | Produces binary `pgvector.dump`; restore must copy the dump into the `pgvector` container and run `pg_restore` from that file. Do not pipe this binary through PowerShell text streams. PgVector restore SQL (`DROP DATABASE`, `CREATE DATABASE`, `CREATE EXTENSION`, verification queries) should execute from temporary SQL files copied into the container rather than nested `psql -c` shell strings. |
| uploads export | `tar -czf - -C /data uploads` from web/backend container | Restore must reject absolute paths, `..` path traversal, and then copy safe files into `/data/uploads`. After copy, restore must run root `chown -R sangui:sangui /data/uploads` through the `backend` container and verify backend non-root user can write to `avatar/`, `posts/`, and `covers/` directories. |
| Local volume safety backup | `docker run --rm --pull=never ... $VolumeArchiveImage tar ...` | Before overwriting local data, restore backs up existing `mysql_data`, `pgvector_data`, and `uploads_data` volumes with a helper image that contains `tar` (default `alpine:3.21`, matching local Compose `uploads-init`). Dry-run must warn if the image is missing locally; real restore may pull it before touching volumes and must stop if backup fails. |
| Integrity files | `SHA256SUMS`, optional `manifest.json` | Checksum mismatch stops before DB import or volume writes. Manifest records file sizes, table/row counts, upload counts, and non-secret source labels. |
| Local health check URL | `.env WEB_PORT` or Compose published web port | Restore health checks and manual verification must target the actual local web port. Do not assume port 80 when `.env` maps web to another port such as `8090`. |

Validation/error matrix:

| Case | Expected Result |
|------|-----------------|
| `-Mode BackupOnly` missing `-RemoteProjectDir` | Fail before any remote action, print required parameter. |
| Remote project directory not found or missing `.env` | Stop, do not print `.env` contents. |
| Remote `docker compose` unavailable | Stop, prompt production Compose requirement. |
| Remote MySQL/PgVector/web container unhealthy | Backup fails at that step; retain partial files in remote backup dir. |
| Missing hard-required local `.env` key (RestoreOnly/BackupAndRestore) | Stop before restore and print only key names, not values. Hard-required keys are `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `POSTGRES_PASSWORD`. |
| Missing defaultable local `.env` key (`MYSQL_DATABASE`, `MYSQL_USER`, `POSTGRES_DB`, `POSTGRES_USER`) | Do not block restore by itself; warn that Compose/script defaults such as `sanguiblog_db`, `sanguiblog_user`, `sanguiblog_ai`, and `sanguiblog_pg_user` will be used. |
| Backend Docker build downloads from Maven Central and stalls | Treat as build configuration drift; verify `SanguiBlog-server/.mvn/settings.xml` is copied before Maven runs and logs show `Downloading from aliyun-public`. |
| Missing remote backup file or checksum mismatch | Stop before touching local Docker volumes. |
| Existing local volumes | Back up `mysql_data`, `pgvector_data`, and `uploads_data` before overwrite; never default to `docker compose down -v`; stop if the helper image cannot be pulled or a volume backup command fails. |
| PgVector extension missing | Run/check `CREATE EXTENSION IF NOT EXISTS vector`; stop if unavailable. |
| uploads archive contains unsafe path | Stop before extraction. |
| Restored uploads subdirectories owned by root | Restore script runs `chown -R sangui:sangui /data/uploads` from backend container as root; if chown or write probe fails, fail restore with clear message and manual fix command. |
| Static upload URL returns SPA HTML | Treat as restore failure; inspect `docker/nginx/default.conf` aliases and `/data/uploads` volume content. |
| Backend startup detects non-writable upload directory | `StoragePathResolver` throws `IllegalStateException` naming the path and Docker chown hint; backend fails fast rather than failing silently at upload time. |

Good/Base/Bad cases:

| Case | Expected Result |
|------|-----------------|
| Good: `BackupAndRestore` full run | MySQL, PgVector, and uploads restore; `/api/site/meta`, `/api/games`, uploaded assets, and RAG checks pass. |
| Good: `BackupOnly` completes | Local backup dir contains `mysql.sql`, `pgvector.dump`, `uploads.tar.gz`, `SHA256SUMS`, and `manifest.json`; checksum passes; no local Docker volumes touched. |
| Base: `RestoreOnly` with existing backup dir | Core site restore passes; existing parameter contract preserved. |
| Base: AI/RAG intentionally disabled or OpenAI-compatible API key absent | Core blog/admin/uploads pass and RAG is marked skipped. |
| Bad: Stale MySQL schema, missing vector rows when RAG is enabled, unsafe uploads archive, or SPA fallback for static uploads | Script stops with clear error before corrupting local volumes. |
| Bad: `BackupOnly` remote SSH fails mid-backup | Script stops; partial files remain in remote backup dir for inspection; local Docker untouched. |

Required verification for docs/script-only restore work:

```bash
git diff --check
docker compose config --quiet
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -Mode RestoreOnly -ServerHost localhost -ServerUser test -RemoteBackupDir /tmp/test -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -Mode BackupOnly -ServerHost localhost -ServerUser test -RemoteProjectDir /tmp/sanguiblog -DryRun
```

If production compose or spec contract changes, also run:

```bash
docker compose -f docker-compose.prod.yml config --quiet
python .trellis\scripts\task.py validate .trellis\tasks\06-05-data-backup-plan
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
