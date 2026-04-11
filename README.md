[简体中文](./README.zh-CN.md)

# SanguiBlog Deployment and Development Guide

SanguiBlog is a decoupled personal blog system with a Spring Boot + MySQL backend and a React + Vite (SPA) frontend. This document is intended for deployment, operations, and local development, covering the minimum workable path from environment setup to production rollout, along with common troubleshooting notes.

> Current site version: `V2.2.15` (provided centrally by backend `site.version`, and displayed on the homepage banner as `SANGUI BLOG // <version>`)
>
> `V2.2.x` continues the AI assistant system introduced in `V2.2.0`. The current `V2.2.15` site version keeps multi-turn chat for logged-in users, blog-article RAG, current article page context enhancement, super-admin knowledge import, and backend AI session auditing, while also updating the homepage and navigation visuals.

## 1. Directory Index

- Release notes directory: `release/` (the latest existing external release document in this repository is `release/V2.2.6.md`)
- Nginx reverse proxy example: `fake-nginx-config/nginx.conf`
- Environment switching notes: `ChangeEnv.md`
- Database initialization script: `sanguiblog_db.sql`

## 2. Project Structure

```
├─ SanguiBlog-server/      # Spring Boot backend service (REST API, auth, sitemap, etc.)
├─ SanguiBlog-front/       # React single-page app (public site + admin UI)
├─ uploads/                # Default upload directory (mount to persistent storage in production)
├─ release/                # Release notes (for example V2.1.287 / V2.2.0, current latest document is V2.2.6)
├─ sanguiblog_db.sql       # Database bootstrap script (schema + seed data)
└─ README.md               # This document
```

## 3. Environment Requirements

| Component | Recommended Version | Notes |
| --- | --- | --- |
| JDK | 21 | Backend `pom.xml` sets `java.version=21` |
| Maven | 3.9.x | Used to build/package the backend |
| Node.js | >= 18 (20 recommended) | Used to build the frontend |
| MySQL | >= 8.0 | Main application database, UTF8MB4 recommended |
| PostgreSQL | 13+ (optional) | Required only when enabling blog/knowledge-base RAG, with PgVector installed |
| Git | Any recent version | Used to clone/pull the repository |

> Both Windows and Linux are supported. For production, it is recommended to build both frontend and backend in CI or on a build machine, and deploy only the build artifacts online (backend JAR + frontend `dist` + persistent `uploads`).
>
> If you are not enabling AI RAG for now, PostgreSQL / PgVector is not required. For basic AI chat only, MySQL remains the only required database.

## 4. Initialize the Database

1. Create the database (example):
   ```sql
   CREATE DATABASE sanguiblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ```
2. Import the root-level `sanguiblog_db.sql`:
   ```bash
   mysql -u root -p sanguiblog_db < sanguiblog_db.sql
   ```
3. It is recommended to create a dedicated application user with read/write permissions, then configure that username/password in backend config (see next section).
4. If you plan to enable AI chat related features, make sure the root-level `sanguiblog_db.sql` is synced to the current version. It already includes:
   - AI session and message tables
   - Blog RAG tracking tables
   - Super-admin text knowledge base tables

## 5. Backend Configuration and Startup (`SanguiBlog-server`)

Backend configuration files:
- Shared config (committed to Git): `SanguiBlog-server/src/main/resources/application.yaml`
- Private config (not committed): `SanguiBlog-server/src/main/resources/application-local.yaml`

`application.yaml` already imports `application-local.yaml` through `spring.config.import`, so database/JWT/site private settings can be loaded there.

Example `application-local.yaml` (adjust to your environment):

```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/sanguiblog_db?useSSL=true&serverTimezone=Asia/Shanghai&characterEncoding=utf-8
    username: your_db_user
    password: your_db_password
    driver-class-name: com.mysql.cj.jdbc.Driver
  ai:
    dashscope:
      api-key: your_dashscope_api_key

jwt:
  secret: your_jwt_secret

storage:
  base-path: /path/to/uploads

security:
  cors:
    allowed-origins: >
      https://sangui.top,
      https://www.sangui.top,
      http://localhost:5173

site:
  base-url: https://www.sangui.top
  allowed-hosts: sangui.top,www.sangui.top
  asset-base-url: https://www.sangui.top/uploads
```

### 5.1 Required Settings

- Database: `spring.datasource.url/username/password` (in `application-local.yaml` or env vars)
  - Compatible env vars: `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` (or `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`)
- JWT secret: `jwt.secret` (in `application-local.yaml` or env var `JWT_SECRET`)
- Upload directory: `storage.base-path` (in `application-local.yaml` or env var `STORAGE_BASE_PATH`)

### 5.2 Port and CORS

- Service port: `server.port` (repository default is `8080`)
- CORS: `security.cors.allowed-origins` (in `application-local.yaml` or env var `SECURITY_CORS_ALLOWED_ORIGINS`)

### 5.3 Startup Options

Development mode (local debugging):

```bash
cd SanguiBlog-server
mvn spring-boot:run
```

Production mode (build JAR first, then run):

```bash
cd SanguiBlog-server
mvn -DskipTests package
java -jar target/SanguiBlog-server-*.jar
```

### 5.4 AI Assistant and RAG (`V2.2.0+`)

Starting from `V2.2.0`, the project includes a built-in AI assistant. The current `V2.2.15` site version continues and improves this capability. It includes:

- Public-site AI chat entry
- Multi-turn chat and chat history for logged-in users
- RAG enhancement based on published blog articles
- Temporary summary of the current article page context
- Super-admin text knowledge import
- Backend AI session audit

Basic AI chat requires at least:

- `SPRING_AI_DASHSCOPE_API_KEY` or `AI_DASHSCOPE_API_KEY`

To enable blog / knowledge-base RAG, you also need PostgreSQL + PgVector, with configuration like:

```bash
AI_RAG_ENABLED=true
AI_RAG_SYNC_ON_STARTUP=true
AI_RAG_PGVECTOR_URL=jdbc:postgresql://127.0.0.1:5432/sanguiblog_ai
AI_RAG_PGVECTOR_USERNAME=your_pg_user
AI_RAG_PGVECTOR_PASSWORD=your_pg_password
AI_RAG_PGVECTOR_SCHEMA=public
AI_RAG_PGVECTOR_TABLE=vector_store
AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=false
AI_DASHSCOPE_EMBEDDING_MODEL=text-embedding-v4
```

Notes:

- When creating `vector_store` for the first time, you may temporarily set `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=true`; after the table is created, it is recommended to switch it back to `false`
- The AI entry can be enabled/disabled centrally in the `AI助理` section of backend `/admin/settings`
- Super admins can manage AI knowledge bases and AI session audits in the backend

## 6. Frontend Build and Deployment (`SanguiBlog-front`)

The frontend uses same-origin `/api` by default, so production usually does not require extra frontend config. If you need cross-origin or separate-domain deployment, set the following in `SanguiBlog-front/.env` or `.env.production`:

```
VITE_API_BASE=/api
# or: VITE_API_BASE=https://your-domain.com/api
VITE_API_ORIGIN=https://your-domain.com
VITE_ASSET_ORIGIN=https://your-domain.com
```

Build:

```bash
cd SanguiBlog-front
npm install
npm run build
```

The build output is in `SanguiBlog-front/dist/`.

Local development (optional):

```bash
cd SanguiBlog-front
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`.

## 7. Nginx Reverse Proxy Recommendations (including sitemap/robots)

If you use SPA fallback (`try_files $uri /index.html`), make sure `sitemap.xml/robots.txt` is routed to the backend first; otherwise they may fall back to the frontend homepage and behave incorrectly.

You can refer to the example config in `fake-nginx-config/nginx.conf`. Core snippet (adjust domain/port/path as needed):

```
server {
  root /var/www/sanguiblog/dist;
  index index.html;

  location = /sitemap.xml { proxy_pass http://127.0.0.1:8080/sitemap.xml; }
  location = /robots.txt  { proxy_pass http://127.0.0.1:8080/robots.txt; }

  location /api/ { proxy_pass http://127.0.0.1:8080/api/; }
  location /uploads/ { alias /your/storage/uploads/; }

  location / { try_files $uri /index.html; }
}
```

## 8. sitemap/robots Notes (`V2.1.275+`)

- Sitemap: `GET /sitemap.xml`
  - Returns `<sitemapindex>` when URL count exceeds the threshold, and supports paged retrieval via `GET /sitemap.xml?page=1..N`
  - Supports `ETag/If-None-Match`, returning `304` when matched
- robots: `GET /robots.txt`
  - By default disallows `/admin` and `/api/`, and points to `Sitemap: https://<domain>/sitemap.xml`

Threshold config: `site.sitemap.max-urls-per-file` (default `45000`, corresponding env var `SITE_SITEMAP_MAX_URLS_PER_FILE`).

## 9. Common Troubleshooting

| Symptom | Possible Cause | Solution |
| --- | --- | --- |
| Frontend API returns 404 | Nginx does not proxy `/api/` | Add `location /api/` and reload Nginx |
| `/sitemap.xml` opens the homepage | `try_files` is evaluated before sitemap location | Add `location = /sitemap.xml` and `location = /robots.txt`, and place them before `try_files` |
| Upload fails / files cannot be found | `storage.base-path` is not writable, or Nginx `/uploads/` is not mapped | Ensure the directory is writable, configure `alias`, or serve it through backend static mapping |
| Service fails to start due to JWT_SECRET | JWT secret is missing | Set env var `JWT_SECRET` before starting |
| AI chat is unavailable | DashScope key is not configured, or AI assistant was disabled in backend | Check `SPRING_AI_DASHSCOPE_API_KEY` / `/admin/settings -> AI助理` |
| AI RAG is not working | `AI_RAG_ENABLED` is off, or PgVector is not ready | Check PostgreSQL / PgVector, `vector_store`, and sync logs at startup |
| `content_script.js` errors appear in console | Browser extension injected script noise | Verify in incognito mode or disable extensions (usually unrelated to the site itself) |

For deeper implementation details, refer to the historical release notes in this repository and the source code comments.
