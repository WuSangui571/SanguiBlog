# 版本号与 README Docker 部署文档更新

## Task Classification

Complex Task.

Rationale: this is mostly documentation, but it spans the public version source, homepage display fallback, root English/Chinese README structure, Docker Compose command/env contracts, and verification. It should be planned through Trellis, then implemented narrowly.

## Goal

Update SanguiBlog from `V2.2.23` to `V2.3.0`, refresh the root English and Chinese README files so first-time users can deploy with Docker Compose quickly, and keep both README files structurally aligned without creating a new release document.

## Scope

In scope:

- Find and update the canonical site version source from `V2.2.23` to `V2.3.0`.
- Keep homepage display aligned with the backend-provided `site.version` path and update frontend hardcoded fallback version strings if touched by the display chain.
- Refresh root `README.md` and `README.zh-CN.md`.
- Add a short changelog/update note that highlights:
  - Docker deployment support and documentation.
  - Docker public page BotGuard false-positive fix.
  - Deployment experience improvements.
- Remove or de-emphasize outdated host/manual deployment instructions that no longer fit the current recommended Docker path.
- Preserve still-accurate project introduction, feature descriptions, stack, screenshots/links, paths, and helper document links.
- Link to detailed docs such as `docs/docker-deploy.md` and `docs/docker-data-sync.md` instead of turning README into a full operations manual.

Out of scope:

- Do not create `release/V2.3.0.md` or any new release document.
- Do not change backend API behavior, DB schema, Docker service topology, Nginx routing, BotGuard logic, storage paths, AI/RAG behavior, or frontend UI behavior beyond version fallback strings.
- Do not rewrite `docs/docker-deploy.md`, `docs/docker-data-sync.md`, Dockerfiles, `docker-compose.yml`, `.env.example`, or scripts unless a README link/command check reveals a concrete broken path that must be corrected separately with user confirmation.
- Do not do broad formatting churn or unrelated cleanup.

## Requirements

### 1. Version Update

- Locate the canonical `site.version` source and update it to `V2.3.0`.
- Preserve the current display flow:
  - Backend config `site.version`.
  - `SiteService` reads `@Value("${site.version:...}")`.
  - `GET /api/site/meta` returns `SiteMetaDto.version`.
  - Frontend `useBlogData.jsx` fetches `/site/meta`.
  - `HomeView.jsx` and `Navigation.jsx` display `meta.version` / `siteVersion`.
- Update hardcoded frontend fallback version strings from `V2.2.23` to `V2.3.0` where they are part of the active homepage/nav display path.
- Leave historical release notes under `release/` unchanged.
- Do not chase unrelated historical prototypes unless `rg "V2.2.23|V2.3.0" .` shows an active/current file that would contradict the root docs or homepage fallback.

### 2. README Structure

- Root English `README.md` and Chinese `README.zh-CN.md` must have the same high-level structure.
- The Chinese README should be natural for Chinese users, not a rigid word-for-word translation.
- Both README files must keep version number, commands, paths, and document links aligned.
- Recommended structure:
  - Project intro and current version.
  - Short V2.3.0 update/changelog note.
  - Directory/document index.
  - Requirements.
  - Quick Docker deployment.
  - Required/default/optional env variables.
  - Useful Docker commands and verification.
  - Manual/local development notes kept shorter than Docker path.
  - Feature overview / tech stack / operational notes.
  - Troubleshooting and links to deeper docs.

### 3. Docker Deployment README Rewrite

- Target audience: a first-time user cloning the project.
- Keep the path short and executable:
  - Install Docker and Docker Compose.
  - Copy `.env.example` to `.env`.
  - Fill required secrets.
  - Run `docker compose config`.
  - Run `docker compose up -d --build`.
  - Visit `http://localhost` or `http://localhost:${WEB_PORT}` if configured.
  - View logs.
  - Stop services.
- Explicitly identify required variables and defaults:
  - Required sensitive values: `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_PASSWORD`.
  - `SPRING_DATASOURCE_PASSWORD` should match `MYSQL_PASSWORD` if explicitly set; otherwise Compose defaults to `MYSQL_PASSWORD`.
  - Common defaults that can usually stay unchanged: `MYSQL_DATABASE`, `MYSQL_USER`, `POSTGRES_DB`, `POSTGRES_USER`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `STORAGE_BASE_PATH`, `SITE_BASE_URL`, `SITE_ALLOWED_HOSTS`, `SITE_ASSET_BASE_URL`, `SECURITY_CORS_ALLOWED_ORIGINS`, `AI_RAG_ENABLED`.
  - Optional AI values: `AI_DASHSCOPE_API_KEY`, `AI_RAG_PGVECTOR_URL`, `AI_RAG_PGVECTOR_USERNAME`, `AI_RAG_PGVECTOR_PASSWORD`, `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA`.
- Make clear that `.env.example` must not contain real secrets and `.env` is the user-specific local deployment file.
- Mention Docker volumes and `docker compose down -v` data-loss risk briefly, with deeper link to `docs/docker-deploy.md`.

## Infra / Command Contract

This task does not change runtime infra code, but README must accurately describe the current executable contract:

| Concern | Contract |
|---------|----------|
| Compose entry | Run from repo root: `docker compose config`, `docker compose up -d --build`, `docker compose ps`, `docker compose logs -f backend`, `docker compose down`. |
| Env template | Copy `.env.example` to `.env`; sensitive defaults stay blank; Compose fails fast if required secrets are missing. |
| Required secrets | `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_PASSWORD`; `SPRING_DATASOURCE_PASSWORD` only needs explicit filling when overriding datasource credentials and should match MySQL user password. |
| Public URL | Default `WEB_PORT` is `80`, so site is `http://localhost`; if `WEB_PORT=8088`, site is `http://localhost:8088`. |
| AI optional path | Core blog should run with `AI_RAG_ENABLED=false` and no DashScope key; AI chat/RAG need extra keys/config. |
| Detailed help | Root README links to `docs/docker-deploy.md` for full deployment details and `docs/docker-data-sync.md` for data migration/restore. |

## Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| Fresh clone, `.env` missing | README tells user to copy `.env.example` before Compose startup. |
| Required secret blank | README says `docker compose config` / `docker compose up` fails fast and names the missing key; do not suggest dummy secrets. |
| AI key omitted | README says core blog can run; AI chat/RAG may be unavailable or disabled. |
| Same-origin Docker deploy | README recommends leaving `SITE_ASSET_BASE_URL` empty unless using CDN/cross-domain assets. |
| User wants detailed backup/restore | README links to `docs/docker-data-sync.md` instead of embedding the full process. |
| User wants manual host deployment | README keeps a concise local/manual development path, but Docker remains the recommended first path. |

## Good / Base / Bad Cases

Good:

- `README.md` and `README.zh-CN.md` both guide a new user through Docker deployment in minutes, with matching commands and file paths.
- `site.version` and active homepage/nav fallback strings all read `V2.3.0`.
- `rg "V2.2.23|V2.3.0" .` shows no accidental active `V2.2.23` references outside historical release docs or explicitly historical text.

Base:

- Existing detailed Docker docs remain the source for full operations detail.
- Manual host development instructions are preserved only where still accurate and clearly secondary.

Bad:

- README still presents old host-first deployment as the main path.
- README says optional variables are required or omits required Compose secrets.
- English and Chinese README drift in commands, version, paths, or link targets.
- A new release doc is created despite the explicit requirement not to.

## Acceptance Criteria

- [ ] Current project state and previous journal status are summarized before handoff.
- [ ] Canonical version source and homepage display chain are documented in task context.
- [ ] `V2.3.0` is used for the current version in active config/docs/fallbacks.
- [ ] No `release/V2.3.0.md` or equivalent release document is created.
- [ ] Root English README and Chinese README share the same high-level structure.
- [ ] Both READMEs include a concise V2.3.0 update note/changelog.
- [ ] Both READMEs include a clear first-time Docker deployment path.
- [ ] Both READMEs distinguish required, default-safe, and optional env variables.
- [ ] Both READMEs link to existing detailed Docker docs instead of duplicating all operations detail.
- [ ] Outdated Docker-incompatible host deployment guidance is removed or clearly scoped as manual/local development only.
- [ ] README commands, links, and file names are checked against the repository.
- [ ] Verification commands are run or explicitly documented as skipped with reason.

## Likely Files To Modify

- `SanguiBlog-server/src/main/resources/application.yaml`: update `site.version`.
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`: update active fallback version string if still present.
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`: update active fallback version string if still present.
- `README.md`: rewrite/sync Docker-first docs and version note.
- `README.zh-CN.md`: rewrite/sync Docker-first docs and version note.

Likely read-only verification/context files:

- `.env.example`
- `docker-compose.yml`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/SiteController.java`
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
- `SanguiBlog-front/src/api.js`

## Required Verification

Must run after implementation:

```bash
rg "V2.2.23|V2.3.0" .
docker compose config
```

Recommended static checks:

```bash
git diff --check
```

Conditional verification:

- If only README/config version/fallback strings change, Maven compile and frontend build are optional but should be considered:
  - Backend compile if `application.yaml` change needs config sanity beyond Compose.
  - Frontend build if JSX files are edited.
- If frontend fallback strings are edited, run:

```bash
cd SanguiBlog-front
npm run build
```

- If backend config is edited and time allows, run:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
```

## Retrieval Report

- Keywords searched:
  - `V2.2.23`, `V2.3.0`, `site.version`, `SiteMetaDto`, `fetchSiteMeta`, `meta?.version`, `siteVersion`
  - `Docker`, `docker compose`, `.env.example`, `JWT_SECRET`, `MYSQL_PASSWORD`, `POSTGRES_PASSWORD`
- Candidate implementations / source paths:
  - `SanguiBlog-server/src/main/resources/application.yaml`: canonical `site.version` source.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`: reads `site.version` and maps it to `SiteMetaDto.version`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/SiteController.java`: exposes `GET /api/site/meta`.
  - `SanguiBlog-front/src/hooks/useBlogData.jsx`: fetches/caches site meta.
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`: derives `siteVersion` from `meta.version`, with fallback.
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`: displays `siteVersion`, with fallback.
  - `.env.example`, `docker-compose.yml`, `docs/docker-deploy.md`, `docs/docker-data-sync.md`: Docker env/command documentation sources.
- Decision:
  - Modify existing version/config/docs and active fallback strings. Do not add new version service, endpoint, docs subsystem, or release file.
- Duplicate risk:
  - Low if implementation keeps `application.yaml` as the only current version source and README explicitly says the backend `site.version` remains canonical.

## Notes For Implementer

- Treat `release/V2.2.23.md` and older release docs as historical; do not edit them just to remove old version references.
- `newIndex/**` and `SanguiBlog-front/myModel/**` appear to be prototypes/static historical mockups. Do not modify them unless a later human decision says they are active.
- Prefer concise README sections over exhaustive operations content; deeper operations belong in `docs/docker-deploy.md` and `docs/docker-data-sync.md`.
