[简体中文](./README.zh-CN.md)

# SanguiBlog V2.3.0

SanguiBlog is a decoupled personal blog system with a Spring Boot + MySQL backend and a React + Vite (SPA) frontend. This document guides first-time deployment via Docker Compose, plus a shorter manual development path.

> Current site version: **V2.3.0** (provided centrally by backend `site.version` and displayed on the homepage navigation banner).

## V2.3.0 Update

- **Docker deployment support**: one-command `docker compose up -d --build` starts the full stack (Nginx, Spring Boot, MySQL, PgVector).
- **Docker public page BotGuard false-positive fix**: first-screen public API reads no longer trigger unnecessary captcha/block under Docker reverse-proxy headers.
- **Deployment experience improvements**: streamlined env template, fail-fast missing secret detection, and linked detailed Docker guides.

## Directory Index

| Path | Description |
|------|-------------|
| `release/` | Historical release notes |
| `sanguiblog_db.sql` | Database bootstrap script (schema + seed data) |
| `.env.example` | Docker Compose environment variable template |
| `docker-compose.yml` | Docker Compose service definition |
| `docker/nginx/default.conf` | Docker Nginx configuration |
| `docs/docker-deploy.md` | Full Docker deployment guide |
| `docs/docker-data-sync.md` | Data export, migration, and restore guide |

## Project Structure

```
├─ SanguiBlog-server/      # Spring Boot backend (REST API, auth, sitemap, etc.)
├─ SanguiBlog-front/       # React SPA (public site + admin UI)
├─ docker/                 # Docker Nginx config and Postgres init scripts
├─ scripts/                # Helper scripts (data sync restore, etc.)
├─ docs/                   # Extended deployment and data sync documentation
├─ release/                # Historical release notes
├─ sanguiblog_db.sql       # Database init script
├─ docker-compose.yml      # Docker Compose service definition
├─ .env.example            # Environment variable template
└─ README.md               # This document
```

## Requirements

### Docker Deployment (Recommended)

- Docker >= 24.0
- Docker Compose >= 2.17
- ~2 GB free disk space

### Local / Manual Development

| Component | Version | Notes |
|-----------|---------|-------|
| JDK | 21 | Backend `pom.xml` sets `java.version=21` |
| Maven | 3.9.x | Backend build |
| Node.js | >= 18 (20 recommended) | Frontend build |
| MySQL | >= 8.0 | Main database, UTF8MB4 |
| PostgreSQL | 13+ (optional) | Only required when enabling AI RAG, with PgVector extension |
| Git | Any recent version | Clone the repository |

## Quick Docker Deployment

```bash
# 1. Clone and enter the repository
git clone <your-repo-url>
cd SanguiBlog

# 2. Copy the environment template
cp .env.example .env

# 3. Edit .env and fill in required secrets
#    Required: JWT_SECRET, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, POSTGRES_PASSWORD
#    SPRING_DATASOURCE_PASSWORD defaults to MYSQL_PASSWORD; set it explicitly only if overriding

# 4. Verify the Compose configuration
docker compose config

# 5. Start all services (first run builds images, ~3–5 minutes)
docker compose up -d --build

# 6. Check service status
docker compose ps

# 7. Visit the site
#    Default: http://localhost  (WEB_PORT defaults to 80)
#    If WEB_PORT=8088 in .env: http://localhost:8088
```

## Environment Variables

### Required Secrets

These **must** be filled in `.env`. Compose will fail fast if any are missing or blank.

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | JWT signing key (recommend 32+ random characters) |
| `MYSQL_PASSWORD` | MySQL application user password |
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `POSTGRES_PASSWORD` | PgVector user password |

`SPRING_DATASOURCE_PASSWORD` defaults to `MYSQL_PASSWORD`. Only set it explicitly if you need different credentials.

### Common Defaults (Usually Unchanged)

These have sensible defaults and rarely need adjustment:

| Variable | Default | Notes |
|----------|---------|-------|
| `MYSQL_DATABASE` | `sanguiblog_db` | |
| `MYSQL_USER` | `sanguiblog_user` | |
| `POSTGRES_DB` | `sanguiblog_ai` | |
| `POSTGRES_USER` | `sanguiblog_pg_user` | |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://mysql:3306/sanguiblog_db?...` | Leave default for Compose networking |
| `SPRING_DATASOURCE_USERNAME` | `sanguiblog_user` | |
| `STORAGE_BASE_PATH` | `/data/uploads` | Container path, do not change |
| `SITE_BASE_URL` | `http://localhost` | Change to real domain in production |
| `SITE_ALLOWED_HOSTS` | `localhost` | |
| `SITE_ASSET_BASE_URL` | (empty) | Leave empty for same-origin deploy; set full URL for CDN |
| `SECURITY_CORS_ALLOWED_ORIGINS` | `http://localhost` | |
| `WEB_PORT` | `80` | Change if port 80 is occupied |

### Optional AI Variables

Core blog runs without AI. Fill these only if you want AI chat / RAG:

| Variable | Description |
|----------|-------------|
| `AI_DASHSCOPE_API_KEY` | DashScope API key for AI chat |
| `AI_RAG_ENABLED` | Enable blog RAG (default `false`) |
| `AI_RAG_PGVECTOR_URL` | PgVector JDBC URL (default points to `pgvector` service) |
| `AI_RAG_PGVECTOR_USERNAME` | PgVector username |
| `AI_RAG_PGVECTOR_PASSWORD` | PgVector password |
| `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA` | Set `true` for first-time `vector_store` table creation, then switch back to `false` |

> `.env.example` lists all keys but keeps sensitive values blank. Real secrets live only in your local `.env` file. Never commit `.env` to the repository.

## Useful Docker Commands

```bash
# Start with rebuild
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f mysql

# Stop services
docker compose down

# Stop and remove all data volumes (⚠ deletes all database and upload data)
# Note: next startup re-imports sanguiblog_db.sql (~731 lines); first cold start is slower (~1–2 min)
# but all services should converge to healthy/running without a second restart
docker compose down -v

# Restart a single service
docker compose restart backend

# Enter MySQL shell
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'

# Enter PostgreSQL shell
docker compose exec pgvector sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Verify Deployment

```bash
# Homepage
curl -i http://localhost/

# Site metadata API
curl -i http://localhost/api/site/meta

# Sitemap (should return XML, not HTML)
curl -i http://localhost/sitemap.xml

# robots.txt (should return text/plain, not HTML)
curl -i http://localhost/robots.txt
```

## Data Persistence

Docker volumes persist across `docker compose down`:

| Volume | Content |
|--------|---------|
| `mysql_data` | MySQL database files |
| `pgvector_data` | PgVector database files |
| `uploads_data` | Uploaded files (avatars, post images, covers, games) |

For data backup, migration, or restoring from a production server, see [docs/docker-data-sync.md](./docs/docker-data-sync.md).

## Local / Manual Development

If you prefer running services directly on the host machine:

### Database Setup

```sql
CREATE DATABASE sanguiblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

```bash
mysql -u root -p sanguiblog_db < sanguiblog_db.sql
```

### Backend (SanguiBlog-server)

Create `SanguiBlog-server/src/main/resources/application-local.yaml` with your local database, JWT, and storage settings. The file is gitignored.

```bash
cd SanguiBlog-server
mvn spring-boot:run
# Or build and run: mvn -DskipTests package && java -jar target/SanguiBlog-server-*.jar
```

### Frontend (SanguiBlog-front)

```bash
cd SanguiBlog-front
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build output in dist/
```

> For production host deployment with Nginx, refer to `docker/nginx/default.conf` for the current routing contract (sitemap/robots proxy, SPA fallback, SSE streaming, uploads alias).

## Features

- Public blog with article list, archive, search, category/tag filtering
- Article detail with Markdown rendering, comments, and traffic analytics
- Admin panel: post management, uploads, site settings, system monitor
- AI assistant: multi-turn chat, blog RAG, current-page context, guest access controls
- BotGuard: captcha/block risk engine with Docker public-read scoring
- Sitemap (XML index with pagination) and robots.txt
- Upload management: post covers, article assets, avatars, uploaded HTML tools (games)
- Dark mode toggle and Easter egg background animation
- Mobile-responsive layout with glass UI design system

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Backend fails to start | Missing required `.env` secret | Run `docker compose config`; fill `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_PASSWORD` |
| MySQL connection refused | Backend connects to host DB instead of `mysql` container | Keep default `SPRING_DATASOURCE_URL` (uses `mysql` hostname) |
| `/sitemap.xml` returns HTML | SPA fallback captures before sitemap proxy | Verify Nginx `location = /sitemap.xml` proxies to backend before `try_files` |
| AI chat unavailable | DashScope key missing or AI assistant disabled | Check `AI_DASHSCOPE_API_KEY` in `.env` and `/admin/settings -> AI助理` |
| AI RAG not working | `AI_RAG_ENABLED=false` or PgVector not initialised | Check `AI_RAG_ENABLED`, PostgreSQL, and `vector_store` table |
| Upload fails | Upload directory permissions | Backend writes to `/data/uploads`; if subdirectories are root-owned, run `docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"` |
| Port conflict | Host port 80 occupied | Set `WEB_PORT=8080` (or another free port) in `.env` |
| Data lost after restart | Volumes not persisted | Confirm `docker-compose.yml` defines and uses `mysql_data`, `pgvector_data`, `uploads_data` volumes |
| Services unhealthy after first `down -v && up` | MySQL healthcheck raced past schema init | Fixed: MySQL healthcheck now verifies over TCP that a core table is queryable before marking healthy. Allow ~1-2 min for cold start |

For temporary/backup server deployment verification, see the [Temporary Deployment Verification Checklist](./docs/docker-deploy.md#13-临时上线--备用服务器部署验证清单) in the Docker deploy guide. For detailed deployment help, see [docs/docker-deploy.md](./docs/docker-deploy.md). For data migration and restore, see [docs/docker-data-sync.md](./docs/docker-data-sync.md). For deeper implementation details, refer to the historical release notes in `release/` and source code comments.
