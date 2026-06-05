[简体中文](./README.zh-CN.md)

# SanguiBlog

A decoupled personal blog system built with Spring Boot 3 + MySQL (backend) and React 19 + Vite (frontend SPA), deployed via Docker Compose with GHCR images.

> Current version: **V2.3.1**

## Quick Start (Docker Production Deployment)

### Prerequisites

- Docker and Docker Compose (v2+)
- Git

### 1. Clone and Configure

```bash
git clone https://github.com/WuSangui571/SanguiBlog.git
cd SanguiBlog
cp .env.example .env
vim .env
```

Fill in required secrets in `.env` (at minimum `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_PASSWORD`). All sensitive defaults are blank; Compose will fail fast if any required value is missing.

### 2. Pull Images and Start

```bash
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
```

> Systems where your user is in the `docker` group can omit `sudo`.

### 3. Verify

```bash
sudo docker compose -f docker-compose.prod.yml ps
curl -i http://localhost:8090/
curl -i http://localhost:8090/api/site/meta
curl -i http://localhost:8090/sitemap.xml
curl -i http://localhost:8090/robots.txt
```

### 4. Stop

```bash
sudo docker compose -f docker-compose.prod.yml down
```

> `down` stops containers without removing volumes. Your data persists in Docker volumes (`mysql_data`, `pgvector_data`, `uploads_data`).

## Version Update / Redeploy

```bash
git pull origin main
vim .env                    # review config and SANGUI_IMAGE_TAG if needed
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml ps
curl -i http://localhost:8090/api/site/meta
```

## Viewing Logs

```bash
sudo docker compose -f docker-compose.prod.yml logs -f backend
```

## Optional: AI Assistant

Core blog features (posts, categories, tags, comments, admin) work without any AI configuration. The AI assistant requires:

- `AI_DASHSCOPE_API_KEY` in `.env`
- PostgreSQL + PgVector (included in the Compose stack) for blog RAG; set `AI_RAG_ENABLED=true`

AI can be toggled on/off centrally from the admin settings panel.

## Further Reading

- [Docker Deployment Guide](./docs/docker-deploy.md) - detailed production/development Docker runbook, image tagging, GHCR, health checks, rollback, data persistence
- [Docker Data Sync/Restore](./docs/docker-data-sync.md) - production-to-local data restore workflow
- [Backend](./SanguiBlog-server/) - Spring Boot source tree
- [Frontend](./SanguiBlog-front/) - React SPA source tree
- [Scripts](./scripts/) - utility scripts including `bump-version.ps1`

## Project Structure

```
|-- SanguiBlog-server/          # Spring Boot backend (REST API, auth, sitemap, etc.)
|-- SanguiBlog-front/           # React SPA (public site + admin UI)
|-- docker/nginx/               # Docker Nginx reverse proxy config
|-- docker/postgres/init/       # PgVector extension init script
|-- docs/                       # Deployment and data sync guides
|-- scripts/                    # Utility scripts
|-- sanguiblog_db.sql           # Database bootstrap script (runs only on first init)
|-- docker-compose.yml          # Dev/local Compose (builds images locally)
|-- docker-compose.prod.yml     # Production Compose (pulls images from GHCR)
`-- .env.example                # Environment variable template
```

## Troubleshooting

| Symptom | Possible Cause | Solution |
| --- | --- | --- |
| Backend fails to start | Missing required `.env` secret | Check `JWT_SECRET`, `MYSQL_PASSWORD`, etc. are set |
| `/sitemap.xml` returns SPA HTML | Missing Nginx location rule | Ensure `docker/nginx/default.conf` routes sitemap/robots to backend |
| AI chat unavailable | DashScope key not configured | Check `AI_DASHSCOPE_API_KEY` in `.env` |
| Images fail to load | `asset-base-url` misconfigured | Leave `SITE_ASSET_BASE_URL` empty for same-origin Docker deployment |
