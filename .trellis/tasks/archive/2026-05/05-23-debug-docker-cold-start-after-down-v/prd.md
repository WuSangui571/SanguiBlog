# Debug Docker Cold Start After down -v

## Goal

Fix the intermittent first-run failure after `docker compose down -v` followed by `docker compose up -d --build`, where `backend` may become unhealthy and `web` may not start correctly. A fresh empty-volume Docker cold start must converge to stable `mysql`, `pgvector`, `backend`, and `web` healthy/running states without requiring a second `down && up`.

## Task Classification

Complex Task.

Reasons:
- Crosses Docker Compose orchestration, MySQL initialization, Spring Boot startup, backend health checks, and web dependency ordering.
- Requires distinguishing port readiness from schema/data readiness.
- May require changes to infrastructure config, backend startup behavior, docs, and optional verification scripts.

## Scope

Allowed investigation and implementation areas:
- `docker-compose.yml`
- Docker healthcheck commands and timing for `mysql`, `pgvector`, `backend`, and `web`
- Docker-specific backend configuration under `SanguiBlog-server/src/main/resources/application-docker.yaml`
- MySQL init contract around `sanguiblog_db.sql` mounted into `/docker-entrypoint-initdb.d/`
- Backend startup readiness or DB wait/retry behavior, only if Compose healthcheck fixes are insufficient
- Docker/Nginx web startup dependency on backend health, if currently brittle
- Docker docs such as `README.md`, `README.zh-CN.md`, or docs under `docs/` that describe cold starts
- Optional cold-start verification script under `scripts/` if it reduces manual verification risk

Out of scope / do not modify unless direct evidence requires it:
- Business API behavior, DTO shapes, permissions, BotGuard scoring, AI chat/RAG behavior
- Entity/schema business changes unrelated to Docker init readiness
- Frontend UI/React components
- Production data migration behavior for existing non-empty Docker volumes
- Secrets or default credential values in `.env.example`
- Large unrelated refactors or formatting-only churn

## Current Failure Hypothesis

The most likely failure class is a readiness race during empty-volume initialization:
- MySQL container health may become healthy when the server accepts connections, before `sanguiblog_db.sql` has completed and before required tables are queryable.
- Backend may start against a DB whose port is open but whose schema is incomplete, causing connection, authentication, or missing-table failures.
- Backend healthcheck timing may be too short for first initialization, so the container is marked unhealthy even though it would become ready later.
- Web may depend on backend health and therefore fail or remain blocked when backend is temporarily unhealthy.

Implementation must verify the actual failure from logs before choosing the smallest fix.

## Reproduction / Diagnostic Commands

Primary cold-start reproduction:

```bash
docker compose down -v
docker compose up -d --build
docker compose ps
docker compose logs mysql
docker compose logs backend
docker inspect sanguiblog-backend --format "{{json .State.Health}}"
```

Additional DB-readiness probes, if containers are available:

```bash
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES;"'
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM users;"'
docker compose exec mysql sh -c 'mysqladmin ping -h 127.0.0.1 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD"'
```

The implementation should not log or print secret values.

## Docker / Infra Contract

Commands:
- `docker compose down -v` removes MySQL, PgVector, and upload data volumes. This is an empty-data cold start.
- `docker compose up -d --build` must build and start all services from the repo root.
- `docker compose ps` must eventually show:
  - `mysql`: healthy
  - `pgvector`: healthy or running according to current service definition
  - `backend`: healthy
  - `web`: running or healthy according to current service definition

Compose dependency contract:
- `backend` should not attempt normal Spring startup until MySQL is genuinely ready for application queries.
- `backend` should depend on `mysql` using `condition: service_healthy` if Compose file format supports it in the current project.
- `web` should not be considered ready before backend-dependent routes can proxy successfully, if web has a healthcheck.
- `web` dependency on backend should avoid permanent failure from a transient backend cold-start delay.

MySQL readiness contract:
- MySQL health must not mean "port open only" if `backend` depends on schema being ready.
- For a fresh volume, readiness should include ability to authenticate to `$MYSQL_DATABASE` and query at least one canonical table created by `sanguiblog_db.sql`.
- If a table probe is used, choose a stable core table from `sanguiblog_db.sql` and avoid AI-only optional tables as the sole readiness marker.

Backend readiness contract:
- Backend healthcheck should allow the first schema initialization window to finish.
- Healthcheck should test a meaningful endpoint or actuator-compatible readiness URL already available in the Docker image.
- If Spring Boot exits before DB is ready, prefer a startup wait/retry strategy over relying only on later healthcheck retries.

## API / Payload / DB / Env Contract

No business HTTP API, frontend API wrapper, DTO, or JSON payload changes are expected.

DB:
- No new business table or schema column is expected.
- `sanguiblog_db.sql` remains the canonical empty-volume initialization script.
- Existing-volume migrations remain out of scope; Docker init scripts only run for empty `mysql_data`.

Env/config:
- Existing `.env` keys must keep their current names unless a direct readiness fix requires a new optional tuning key.
- If adding a new env/config key, document it in `.env.example` and README docs, with safe defaults and no secrets.
- Do not print `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, `POSTGRES_PASSWORD`, DashScope keys, or other secrets in scripts/logs.

Command payloads:
- Verification scripts, if added, should accept repo-root execution and use Docker Compose service/env names already present.
- Script output should summarize status and failing service/log hints without dumping secrets.

## Validation / Error Matrix

| Case | Expected Result | Assertion Point |
|------|-----------------|-----------------|
| Fresh empty volumes after `docker compose down -v` | `docker compose up -d --build` eventually converges without manual second start | `docker compose ps` shows stable healthy/running services |
| MySQL port accepts connections before schema init completes | Backend does not fail permanently due to missing tables | Backend logs contain no terminal `Table ... doesn't exist` / schema-not-ready crash after readiness fixes |
| `sanguiblog_db.sql` initialization is slow | Backend healthcheck window is long enough or backend waits/retries until DB is queryable | Docker health JSON shows no permanent unhealthy state |
| MySQL auth/env misconfiguration | Failure remains visible and actionable, not hidden by infinite wait | Logs identify auth/config failure without printing secrets |
| PgVector startup is slower than backend | Backend behavior matches current RAG optional/required contract; core app still starts when AI/RAG is disabled | Backend logs and `docker compose ps` |
| Web starts before backend API is ready | Web does not permanently fail from backend transient cold-start delay | `web` remains running/healthy and proxies after backend ready |
| Existing non-empty volumes | Fix does not claim to migrate old schema automatically | Docs preserve "init only empty volume" warning |

## Good / Base / Bad Cases

Good:
- On a fresh clone with valid `.env`, `docker compose down -v` then `docker compose up -d --build` starts `mysql`, `pgvector`, `backend`, and `web` successfully on the first attempt. `backend` becomes healthy after MySQL schema is queryable. `web` can serve `/` and proxy `/api/site/meta`.

Base:
- First cold start takes longer than normal because MySQL imports `sanguiblog_db.sql`, but all services eventually converge without a second Docker cycle.

Bad:
- MySQL health reports healthy while required schema is not queryable, backend exits permanently, backend remains unhealthy beyond the configured window, or web requires a second restart to function.

## Required Research

Focused retrieval must cover:
- `docker-compose.yml` service definitions, healthchecks, `depends_on`, env vars, and volume mounts
- `sanguiblog_db.sql` canonical early/core tables and init size
- Docker-specific backend config under `application-docker.yaml`
- Backend health endpoint availability and actuator/dependency configuration
- Dockerfiles and entrypoints for backend and web
- Existing Docker docs and scripts for startup/verification conventions

## Likely Files To Modify

Expected implementation files, subject to evidence from logs:
- `docker-compose.yml`: MySQL/backend/web healthchecks, `start_period`, retry windows, dependency conditions
- `SanguiBlog-server/src/main/resources/application-docker.yaml`: Docker readiness/startup config only if needed
- `SanguiBlog-server/Dockerfile`: entrypoint/wait helper only if Compose healthcheck is insufficient
- `docker/nginx/default.conf`: only if web health/proxy readiness is part of the verified failure
- `README.md` and `README.zh-CN.md`: document `down -v` cold-start behavior and verification expectations
- Optional `scripts/docker-cold-start-check.*`: repeatable verification helper if manual checks are too error-prone

Files not expected to change:
- `SanguiBlog-front/src/**`
- Backend controllers/services/entities/DTOs unrelated to startup readiness
- `sanguiblog_db.sql`, unless investigation proves the init SQL itself is incomplete or invalid

## Required Tests / Verification

Static and config verification:

```bash
docker compose config
git diff --check
```

Backend compile verification if backend Docker/config/startup files change:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
```

Frontend build verification if web image/build/runtime config changes:

```bash
cd SanguiBlog-front
npm run build
```

Cold-start verification when Docker is available:

```bash
docker compose down -v
docker compose up -d --build
docker compose ps
docker compose logs mysql
docker compose logs backend
docker inspect sanguiblog-backend --format "{{json .State.Health}}"
```

Recommended final HTTP checks when services are up:

```bash
curl -i http://localhost/
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
```

## Implementation Guidance

1. Reproduce or inspect logs first. Do not guess the fix solely from desired behavior.
2. Identify whether backend failure is connection refused, access denied, missing database, missing table, slow healthcheck, PgVector dependency, or another startup exception.
3. Prefer the smallest durable readiness fix:
   - Strengthen MySQL healthcheck to prove `$MYSQL_DATABASE` and a canonical table are queryable.
   - Increase backend healthcheck `start_period` / retries if the backend remains healthy after a longer first boot.
   - Add backend DB wait/retry only if Spring startup exits before Compose readiness can protect it.
4. Keep Docker init semantics explicit: `down -v` is destructive and slower because volumes are recreated.
5. Add/update docs and optional script after the technical fix is known.

## Acceptance Criteria

- [ ] PRD and Trellis context are prepared before implementation.
- [ ] Implementation is based on collected logs or concrete code evidence.
- [ ] `docker compose down -v` followed by `docker compose up -d --build` succeeds on the first cold start.
- [ ] `docker compose ps` shows `mysql`, `pgvector`, `backend`, and `web` healthy/running after the configured startup window.
- [ ] Backend does not require a second `down && up` or manual restart because MySQL schema initialization raced startup.
- [ ] MySQL readiness reflects queryable database/schema, not only an open port, if backend depends on it.
- [ ] Backend healthcheck timing covers first empty-volume initialization.
- [ ] Web startup/dependency behavior is stable after backend cold start.
- [ ] Docs mention that `down -v` clears volumes and first startup can be slower, but should not fail.
- [ ] Required verification commands are run or skipped with explicit reason.
