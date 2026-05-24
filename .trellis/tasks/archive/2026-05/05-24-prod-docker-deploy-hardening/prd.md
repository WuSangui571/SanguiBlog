# PRD: Production Docker Deployment Hardening

## Current Project Status

This session ran the Trellis start/context read before planning.

Workspace journal status:
- `.trellis/workspace/sangui/index.md` records 13 sessions, last active `2026-05-24`.
- Session 13 closed the CI/CD image release work on `main` with commit `5c75ff4 feat:docker-image-release`.
- The completed task `05-23-cicd-image-release` was archived at `.trellis/tasks/archive/2026-05/05-23-cicd-image-release`.
- Current `main` already contains Docker image release assets: `docker-compose.prod.yml`, `.env.example`, backend/frontend Dockerfiles, Docker Nginx config, GHCR workflow, Docker deployment docs, and `application-docker.yaml`.
- Current root `.trellis/scripts/task.py` is missing, but the previous Docker worktree copy at `.kilo/worktrees/record-feat-docker/.trellis/scripts/task.py` is usable against this repository root and supports `create`, `init-context`, `add-context`, and `start`.

## Task Classification

Complex Task.

Reason: this crosses production infrastructure, environment contract, database initialization SQL, Spring Boot startup behavior, and AI/RAG startup behavior. It must be planned and handed off before code changes. Codex must not edit business implementation files in this round.

## Problem Statement

Production server deployment exposed failure modes that local Docker deployment did not reliably catch:
- MySQL readiness may still be too tightly coupled to schema/table availability or fragile SQL.
- Backend may fail before database schema is fully available and may not restart aggressively enough.
- Production compose does not yet encode enough operational guardrails for memory, ports, and restart behavior.
- `.env.example` is not explicit enough about JVM memory constraints and host port defaults.
- `sanguiblog_db.sql` is partially idempotent only: later AI tables use `CREATE TABLE IF NOT EXISTS`, but core tables still use plain `CREATE TABLE`, and the script still contains a destructive `DROP TABLE IF EXISTS` block.
- AI/RAG startup listeners may query MySQL tables on `ApplicationReadyEvent`; if schema drift or init lag exists, startup behavior needs to remain recoverable and not poison the whole app.

## Goals

1. Harden `docker-compose.prod.yml` for production cold-start and restart behavior.
2. Rewrite `.env.example` so a new operator can deploy without relying on memory or port assumptions.
3. Make `sanguiblog_db.sql` safer and more idempotent for repeated/manual execution.
4. Add Spring Boot Docker-profile database connection retry/timing settings where appropriate.
5. Review AI/RAG startup-time behavior and make any mandatory changes narrowly.
6. Keep deployment docs aligned with the executable compose/env/SQL contracts.

## Non-Goals / Forbidden Scope

- Do not change frontend UI, routes, copy, or component behavior.
- Do not change public/business API response shapes.
- Do not add new business endpoints, DTO fields, database tables, or permissions beyond SQL idempotency/compatibility adjustments.
- Do not introduce Flyway/Liquibase or a new migration framework in this task.
- Do not change CI/CD image publishing semantics unless production compose validation requires a narrow workflow env update.
- Do not run destructive Docker commands such as `docker compose down -v` in this shared workspace.
- Do not log or document real secrets.

## Cross-Layer Contract

### 1. Scope / Trigger

This is an infra/DB/startup contract. It affects:
- Docker Compose commands used by operators.
- Environment variable payload consumed by compose and Spring Boot.
- MySQL initialization SQL mounted into `/docker-entrypoint-initdb.d/`.
- Spring Boot datasource/Hikari startup behavior.
- AI/RAG startup listeners that may touch MySQL/PgVector after application readiness.

### 2. Commands / Signatures

Production deployment commands:

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Validation commands:

```bash
docker compose -f docker-compose.prod.yml config --quiet
docker compose config --quiet
cd SanguiBlog-server && mvn -q -DskipTests compile
cd SanguiBlog-server && mvn -q "-Dtest=AiBlogKnowledgeSyncServiceTest,AiCustomKnowledgeSyncServiceTest" test
cd SanguiBlog-server && mvn -q "-Dtest=AiAssistantSettingServiceTest,AiAssistantCapabilityServiceTest,AiGuestAccessServiceTest" test
cd SanguiBlog-front && npm run build
git diff --check
```

When Docker runtime is available on the target server:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 mysql
docker compose -f docker-compose.prod.yml logs --tail=200 backend
curl -i http://localhost:${WEB_PORT:-8090}/
curl -i http://localhost:${WEB_PORT:-8090}/api/site/meta
curl -i http://localhost:${WEB_PORT:-8090}/sitemap.xml
curl -i http://localhost:${WEB_PORT:-8090}/robots.txt
```

### 3. Env / Payload Fields

`.env.example` must include explicit defaults or blank placeholders for:

| Field | Required | Default / Example | Notes |
|---|---:|---|---|
| `WEB_PORT` | no | `8090` | Host port mapping; avoids default collision with existing host Nginx on 80/443. |
| `SANGUI_IMAGE_REGISTRY` | no | `ghcr.io/wusangui571/sanguiblog` | No token in template. |
| `SANGUI_IMAGE_TAG` | no | `main` | Production docs should recommend immutable `sha-<short_sha>`. |
| `JAVA_TOOL_OPTIONS` | no | `-Duser.timezone=Asia/Shanghai -Xms256m -Xmx512m` | Must be consumed by backend compose. |
| `MYSQL_DATABASE` | no | `sanguiblog_db` | Main MySQL DB. |
| `MYSQL_USER` | no | `sanguiblog_user` | Main MySQL user. |
| `MYSQL_PASSWORD` | yes | blank | Compose should fail fast when missing. |
| `MYSQL_ROOT_PASSWORD` | yes | blank | Compose should fail fast when missing. |
| `POSTGRES_DB` | no | `sanguiblog_ai` | PgVector DB. |
| `POSTGRES_USER` | no | `sanguiblog_pg_user` | PgVector user. |
| `POSTGRES_PASSWORD` | yes | blank | Compose should fail fast when missing. |
| `JWT_SECRET` | yes | blank | Must remain blank in template. |
| `SPRING_DATASOURCE_URL` | no | MySQL container JDBC URL | Must not use `characterEncoding=utf8mb4`; use `utf8` or omit charset. |
| `SPRING_DATASOURCE_USERNAME` | no | `sanguiblog_user` | Aligns with `MYSQL_USER`. |
| `SPRING_DATASOURCE_PASSWORD` | yes | blank | Aligns with `MYSQL_PASSWORD`. |
| `STORAGE_BASE_PATH` | no | `/data/uploads` | Container path. |
| `SITE_BASE_URL` | no | `http://localhost:8090` | Should match `WEB_PORT` for default local/temporary deploy. |
| `SITE_ALLOWED_HOSTS` | no | `localhost` | Operator should customize for domain/IP. |
| `SITE_ASSET_BASE_URL` | no | blank | Same-origin default. |
| `SECURITY_CORS_ALLOWED_ORIGINS` | no | `http://localhost:8090` | Should match default host port. |
| `AI_DASHSCOPE_API_KEY` | no | blank | Optional. |
| `AI_RAG_ENABLED` | no | `false` | Core app must run when false. |
| `AI_RAG_SYNC_ON_STARTUP` | no | `false` for Docker template unless explicitly justified | Avoid production cold-start table/vector pressure. |
| `AI_RAG_PGVECTOR_URL` | no | `jdbc:postgresql://pgvector:5432/sanguiblog_ai` | Optional override. |
| `AI_RAG_PGVECTOR_USERNAME` | no | `sanguiblog_pg_user` | Optional override. |
| `AI_RAG_PGVECTOR_PASSWORD` | no | blank | Optional override; aligns with `POSTGRES_PASSWORD`. |
| `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA` | no | `false` | Keep explicit. |

### 4. Compose Contract

`docker-compose.prod.yml` should:
- Keep image-based `web` and `backend` deployment from GHCR.
- Default `web` host port to `${WEB_PORT:-8090}:80`.
- Pass backend `JAVA_TOOL_OPTIONS` from `.env` with fallback `-Duser.timezone=Asia/Shanghai -Xms256m -Xmx512m`.
- Keep `backend depends_on` for `mysql` and `pgvector`; MySQL should use health readiness, PgVector can remain health-gated.
- Use backend restart policy appropriate for production recovery. Prefer `restart: always` for backend if the intended behavior is "crash until DB schema exists, then recover".
- Keep `web depends_on backend condition: service_healthy` only if backend health check remains reliable and not too strict; otherwise document the tradeoff.
- Add practical memory guardrails. For plain Docker Compose, prefer widely supported service-level `mem_limit` / `mem_reservation` if acceptable for the target Compose version, and always keep JVM heap capped by `JAVA_TOOL_OPTIONS`.
- Keep named volumes `mysql_data`, `pgvector_data`, and `uploads_data`.
- Keep sensitive env values blank/fail-fast; do not substitute fake secrets.

MySQL healthcheck options:
- Prefer a non-fragile check that confirms SQL service is usable over TCP:

```yaml
test: ["CMD-SHELL", "mysql --protocol=TCP -h 127.0.0.1 -u\"$$MYSQL_USER\" -p\"$$MYSQL_PASSWORD\" \"$$MYSQL_DATABASE\" -e \"SELECT 1\""]
```

- If using a table probe, use stable `roles`, not the newest/last table.
- Do not use socket-only probes.
- Tune `start_period`, `interval`, `timeout`, and `retries` for slow low-memory servers.

### 5. SQL Contract

`sanguiblog_db.sql` should become safe for Docker empty-volume init and safer for manual repeat execution.

Required:
- Add/ensure `SET FOREIGN_KEY_CHECKS=0;` at the beginning and `SET FOREIGN_KEY_CHECKS=1;` at the end.
- Replace all plain `CREATE TABLE` with `CREATE TABLE IF NOT EXISTS`.
- Review existing `DROP TABLE IF EXISTS` block. Default implementation objective is data-preserving idempotency; a repeated script run should not drop production data. If any `DROP TABLE` remains, it must be explicitly justified and documented as destructive reset-only.
- Preserve `utf8mb4` charset/collation.
- Keep AI tables and compatibility `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` aligned with existing entities.

Important risk note:
- MySQL `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` is version-sensitive. The project already documents this risk. DeepSeek should verify target MySQL compatibility or update SQL/docs with a safe operator note, without inventing a migration framework.

### 6. Spring Boot Docker Profile Contract

`SanguiBlog-server/src/main/resources/application-docker.yaml` should:
- Keep Docker hosts (`mysql`, `pgvector`) and `/data/uploads`.
- Keep `server.forward-headers-strategy: native`.
- Add datasource/Hikari startup retry timing if useful:
  - `spring.datasource.hikari.initialization-fail-timeout`
  - `spring.datasource.hikari.connection-timeout`
  - `spring.datasource.hikari.validation-timeout`
  - `spring.datasource.hikari.maximum-pool-size` / `minimum-idle` only if memory constraints require it.
- Preserve `spring.jpa.hibernate.ddl-auto: none` from base config; do not switch Hibernate to schema generation.
- Consider `AI_RAG_SYNC_ON_STARTUP` in Docker env/profile to reduce startup DB/vector pressure.

### 7. AI / Startup Behavior Contract

Existing startup-time code found:
- `DataInitializer implements CommandLineRunner` reads/writes `roles` and calls `PermissionService.ensureDefaultPermissions()`. If core schema is absent, backend will fail startup. With `restart: always`, this can be allowed to crash/retry until MySQL init completes.
- `AiBlogKnowledgeSyncService.syncOnStartup()` runs on `ApplicationReadyEvent` when RAG is configured and `syncOnStartup` is true. It queries `posts` and AI knowledge tables.
- `AiCustomKnowledgeSyncService.syncOnStartup()` runs on `ApplicationReadyEvent` when RAG is operational. It queries custom knowledge tables.
- `AiBlogRagService.retrieve()` is already lazy and catches vector retrieval errors.

Required implementation stance:
- Do not create a second AI/RAG pipeline.
- Prefer Docker env default `AI_RAG_SYNC_ON_STARTUP=false` for production cold-start safety unless the user explicitly wants automatic sync.
- If code changes are needed, make them narrow: catch/log startup sync exceptions as recoverable, isolate per-document failures, and keep user-triggered sync paths intact.
- Avoid broad `catch (Exception)` in controllers; service-level startup fallback logs must follow logging guidelines and avoid secrets/full content.

## Validation / Error Matrix

| Case | Expected Result | Assertion Point |
|---|---|---|
| `.env` missing `JWT_SECRET` | Compose config/up fails fast | `docker compose -f docker-compose.prod.yml config --quiet` fails with key name, not fake secret. |
| `.env` missing DB passwords | Compose fails fast | Missing `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, or `POSTGRES_PASSWORD` is explicit. |
| Host already uses port 80 | Default prod compose does not bind 80 | `WEB_PORT=8090` default maps `8090:80`. |
| Low-memory server starts backend | JVM heap capped | Backend env has `JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Shanghai -Xms256m -Xmx512m`. |
| MySQL TCP accepts SQL but schema not complete | Backend may fail and restart until schema exists | `backend restart: always`; logs show retry/restart, not permanent stopped state. |
| MySQL healthcheck query syntax is invalid | Compose health does not deadlock on fragile table query | Healthcheck uses `SELECT 1` or stable `roles`; `docker compose config` validates YAML quoting. |
| Fresh empty `mysql_data` | DB initializes and services become healthy/running | Runtime server `docker compose ps`; `/api/site/meta` succeeds. |
| Existing `mysql_data` with old schema | Init SQL does not auto-migrate silently | Docs state manual schema drift check; backend may fail/restart if core tables absent. |
| Manual rerun of `sanguiblog_db.sql` | Should not drop existing data by default | No destructive `DROP TABLE` block unless documented reset-only. |
| RAG disabled / no DashScope key | Core blog/admin/uploads run | `AI_RAG_ENABLED=false`; `/api/site/meta` works. |
| RAG enabled but vector store unavailable during startup | Core app should not be taken down by non-core startup sync if code is adjusted | AI/RAG tests or manual log assertion; service degrades. |

## Good / Base / Bad Cases

Good:
- On a fresh production server, after filling `.env`, `docker compose -f docker-compose.prod.yml up -d` starts `mysql`, `pgvector`, `backend`, and `web`; `WEB_PORT=8090` works without colliding with host Nginx; backend heap is capped; `/`, `/api/site/meta`, `/sitemap.xml`, and `/robots.txt` work.

Base:
- `AI_RAG_ENABLED=false`, `AI_DASHSCOPE_API_KEY` blank, and `AI_RAG_SYNC_ON_STARTUP=false`; all core blog/admin/upload features start, AI/RAG is simply unavailable or disabled according to existing config.

Bad:
- Production compose defaults to host port 80 and collides with host Nginx.
- MySQL healthcheck probes the newest table or has SQL syntax that can keep the dependency chain unhealthy.
- Backend exits once because schema is late and remains stopped.
- `sanguiblog_db.sql` rerun drops production tables.
- AI startup sync throws on missing/stale tables and prevents core app startup when RAG is not required.

## Relevant Specs

Read and follow:
- `.kilo/worktrees/record-feat-docker/.trellis/workflow.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/index.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/directory-structure.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/quality-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/database-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/error-handling.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/logging-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/guides/index.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/guides/cross-layer-thinking-guide.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/index.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/directory-structure.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/quality-guidelines.md`

## Code Patterns Found

Retrieval report:
- Keywords searched: `docker-compose.prod`, `WEB_PORT`, `JAVA_TOOL_OPTIONS`, `healthcheck`, `SELECT 1`, `roles`, `FOREIGN_KEY_CHECKS`, `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`, `ApplicationRunner`, `CommandLineRunner`, `ApplicationReadyEvent`, `AI_RAG`, `pgvector`, `syncOnStartup`, `hikari`.
- Candidate implementations:
  - `docker-compose.prod.yml`: production image compose already has MySQL/PgVector/backend/web services, but defaults `WEB_PORT` to `80`, backend `JAVA_TOOL_OPTIONS` only sets timezone, and backend restart is `unless-stopped`.
  - `docker-compose.yml`: local build compose mirrors production behavior; useful for keeping development/prod parity, but user prioritized `docker-compose.prod.yml`.
  - `.env.example`: already lists GHCR, DB, JWT, datasource, storage, site, CORS, and AI vars, but lacks `WEB_PORT`, `JAVA_TOOL_OPTIONS`, and explicit `AI_RAG_SYNC_ON_STARTUP`.
  - `sanguiblog_db.sql`: begins with `SET FOREIGN_KEY_CHECKS=0`, repeats it, re-enables at line 32, contains destructive `DROP TABLE IF EXISTS` block, core tables still use plain `CREATE TABLE`, later AI/about/registration tables already use `CREATE TABLE IF NOT EXISTS`.
  - `SanguiBlog-server/src/main/resources/application-docker.yaml`: Docker profile sets datasource, storage, site, security, and PgVector values, but no Hikari retry/timing overrides.
  - `SanguiBlog-server/Dockerfile`: backend image has `HEALTHCHECK` against `/api/site/meta` and JVM entrypoint already uses container support plus `-XX:MaxRAMPercentage=75.0`; heap cap should come from `JAVA_TOOL_OPTIONS`.
  - `DataInitializer.java`: startup `CommandLineRunner` depends on `roles` and `permissions`; acceptable to crash/retry if schema is late, but not optional.
  - `AiBlogKnowledgeSyncService.java` and `AiCustomKnowledgeSyncService.java`: `ApplicationReadyEvent` startup sync can touch MySQL and PgVector when RAG operational.
  - `AiBlogRagService.java`: retrieval is already lazy and catches vector search failures.
  - `docs/docker-deploy.md`, `README.md`, `README.zh-CN.md`: deployment docs mention production compose, port conflicts, health checks, and AI/RAG env; they likely need alignment with new defaults.
- Decision: modify existing infra/config/docs files; no new business implementation path.
- Duplicate risk: no new services/controllers/pipelines should be introduced. AI/RAG changes, if any, must extend existing services only.

## Files Likely To Modify

Expected:
- `docker-compose.prod.yml`
- `.env.example`
- `sanguiblog_db.sql`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `docs/docker-deploy.md`
- `README.md`
- `README.zh-CN.md`

Possible, only if research proves startup sync can still break core deployment:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiCustomKnowledgeSyncService.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiCustomKnowledgeSyncServiceTest.java`

Avoid unless required:
- `docker-compose.yml` local compose. User specifically asked to thoroughly remodel `docker-compose.prod.yml`; local parity can be proposed but should not be widened without need.
- Frontend source files under `SanguiBlog-front/src/**`.
- Controllers, DTOs, permissions, entities, repositories unrelated to startup resilience.

## Risk / Boundary Notes

- SQL idempotency and destructive reset are in tension. Plain `CREATE TABLE IF NOT EXISTS` is not enough if `DROP TABLE IF EXISTS` remains. The implementation should default to data-preserving idempotency and document any reset-only behavior separately.
- `depends_on.condition: service_healthy` is Docker Compose-specific and may not work in Swarm. If using Swarm resource syntax (`deploy.resources`) it may be ignored by plain Compose; prefer Compose-compatible `mem_limit` plus JVM heap env.
- MySQL `SELECT 1` healthcheck proves DB accepts queries but not that all schema exists. Backend `restart: always` is therefore the recovery mechanism for schema lag or failed init.
- Backend image healthcheck uses `/api/site/meta`, which depends on core DB/service readiness. This is useful for web gating, but if site meta depends on optional tables, backend health may remain strict.
- Existing Spring Boot startup `DataInitializer` is not optional because roles/permissions are core. Do not hide core schema errors in Java unless the app can actually run safely.
- AI/RAG startup sync should be treated as optional/non-core when RAG is disabled or sync-on-startup is false.
- `.env.example` must not contain real or fake secrets. Blank sensitive values plus Compose fail-fast is the current contract.

## Required Tests And Assertion Points

Static/config:
- `git diff --check`: no whitespace/encoding churn.
- `docker compose -f docker-compose.prod.yml config --quiet`: prod compose parses with required CI dummy env values.
- `docker compose config --quiet`: local compose still parses if touched.

Backend:
- `cd SanguiBlog-server && mvn -q -DskipTests compile`: config and Java compile.
- If AI startup code changes: `cd SanguiBlog-server && mvn -q "-Dtest=AiBlogKnowledgeSyncServiceTest,AiCustomKnowledgeSyncServiceTest" test`.
- If AI assistant availability behavior changes: `cd SanguiBlog-server && mvn -q "-Dtest=AiAssistantSettingServiceTest,AiAssistantCapabilityServiceTest,AiGuestAccessServiceTest" test`.

Frontend/docs:
- If only README/docs env snippets change, no frontend static test is required.
- If any frontend file changes unexpectedly, run `cd SanguiBlog-front && npm run build` and relevant static tests.

Runtime target-server checks when Docker is available:
- `docker compose -f docker-compose.prod.yml pull`
- `docker compose -f docker-compose.prod.yml up -d`
- `docker compose -f docker-compose.prod.yml ps`
- Check `mysql` reaches healthy.
- Check `backend` restarts/retries rather than staying exited when DB is briefly unavailable.
- `curl -i http://localhost:${WEB_PORT:-8090}/`
- `curl -i http://localhost:${WEB_PORT:-8090}/api/site/meta`
- `curl -i http://localhost:${WEB_PORT:-8090}/sitemap.xml`
- `curl -i http://localhost:${WEB_PORT:-8090}/robots.txt`

## Acceptance Criteria

- `docker-compose.prod.yml` encodes production-safe defaults: `WEB_PORT=8090`, backend restart recovery, JVM heap cap through env, MySQL TCP healthcheck using `SELECT 1` or stable `roles`, and sensible memory guardrails.
- `.env.example` is a complete operator template with explicit default values and blank sensitive values; it includes `JAVA_TOOL_OPTIONS`, `WEB_PORT`, and AI/RAG startup toggles.
- `sanguiblog_db.sql` is idempotency-hardened: all table creates use `IF NOT EXISTS`, FK checks wrap the script, and destructive drops are removed or clearly separated/documented as reset-only.
- `application-docker.yaml` includes appropriate Docker-profile datasource retry/timing settings without enabling Hibernate DDL generation.
- AI/RAG startup behavior is reviewed and, if necessary, adjusted so optional sync does not take down core startup.
- Deployment docs and README snippets match the new port/env/compose behavior.
- Required static/config/backend verification commands pass or any skipped runtime Docker checks are documented with reason.

## Planning Self-Check

- Acceptance criteria defined: Yes.
- Forbidden modification scope defined: Yes.
- Expected modified files listed: Yes.
- Required tests listed: Yes.
- Specific guidelines read, not only spec index: Yes. Backend directory, quality, database, error, logging; guides code-reuse and cross-layer; frontend directory and quality were read.
- Unclear requirements needing user confirmation: No blocking question. Default assumption is data-preserving SQL idempotency; if the user wants reset-on-rerun SQL, they must explicitly say so.
- API / DB / frontend types / DTO alignment: No public API/DTO/frontend field changes expected. DB SQL alignment required against existing entities/tables only.
