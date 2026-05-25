# V2.3.0 Version and Docker-First README Refresh

## Current Project Status

`$start` has been executed for this session.

- Current branch: `main`.
- Active Trellis task before this work: none.
- Workspace journal active file: `.trellis/workspace/sangui/journal-1.md`.
- Latest recorded sessions:
  - Session 15, 2026-05-25: fixed Docker analytics real visitor IP, archived task `05-25-analytics-real-ip-docker`, commit `11aa5cd`.
  - Session 14, 2026-05-24: production Docker deployment hardening, commits `8501eeb` and `7d15346`.
  - Session 13, 2026-05-24: CI/CD GHCR image release, commit `5c75ff4`.
- Current Docker deployment baseline already exists on `main`: `docker-compose.yml`, `docker-compose.prod.yml`, `.env.example`, Dockerfiles, Docker Nginx config, `docs/docker-deploy.md`, `docs/docker-data-sync.md`, and production image release workflow.
- Root Trellis tool files were incomplete after the branch switch: `.trellis/scripts/task.py`, source scripts, `.trellis/spec/**`, `workflow.md`, and config files were missing. Codex restored those Trellis source/spec/config files from `.kilo/worktrees/record-feat-docker/.trellis` before creating this task so `task.py`, `$start`, and `$before-dev` can run in the current workspace. Current task/workspace journals were not replaced.

## Task Scope Classification

Classification: **Complex Task**.

Reason:

- The user requested a version bump from `V2.2.23` to `V2.3.0`.
- The public homepage version display depends on a backend-to-frontend site meta contract and frontend fallback strings.
- The root English and Chinese README files need a major Docker-first rewrite, not a small text replacement.
- Deployment docs must emphasize Docker container deployment and no longer recommend non-container deployment as the main path.
- The task also includes Trellis workflow repair caused by missing scripts/spec files after switching from `feat/docker` to `main`.

## Goal

Update the project to present `V2.3.0` as the current site version and refresh the root README pair so new users see Docker container deployment as the recommended path.

The implementation must be tightly scoped: no release document, no business logic refactor, no API redesign, and no database/schema change.

## Requirements

- Update the site version from `V2.2.23` to `V2.3.0`.
- Ensure homepage version display resolves to `V2.3.0`.
- Rewrite root `README.md` around:
  - Project introduction.
  - Current version `V2.3.0`.
  - Recommended Docker container deployment.
  - Data preparation:
    - `git clone https://github.com/WuSangui571/SanguiBlog.git`
    - `cd SanguiBlog`
    - `cp .env.example .env`
    - `vim .env`
  - Startup:
    - `sudo docker compose -f docker-compose.prod.yml pull`
    - `sudo docker compose -f docker-compose.prod.yml up -d`
    - `sudo docker compose -f docker-compose.prod.yml ps`
    - `sudo docker compose -f docker-compose.prod.yml down`
  - Version update / redeploy commands.
  - Links to deeper module/deployment docs instead of keeping detailed internal module explanations in root README.
- Apply equivalent content updates to `README.zh-CN.md`, keeping the Chinese README aligned with English README.
- Do not create a new `release/V2.3.0.md`.
- Do not modify detailed release notes unless explicitly asked later.
- Do not change Docker Compose runtime semantics unless README verification exposes an incorrect command or broken reference.
- Keep sensitive env examples blank; never add real secrets or fake production secrets.

## Non-Goals / Forbidden Scope

- Do not write or generate release documentation.
- Do not change database schema or `sanguiblog_db.sql`.
- Do not change Docker service topology, volumes, image names, GHCR workflow, Nginx config, or env variable names unless a command/reference is proven wrong and the user approves.
- Do not modify backend service/controller/DTO logic.
- Do not modify frontend layout, CSS, routing, or API wrappers.
- Do not touch AI, upload, auth, analytics, BotGuard, system-monitor, sitemap, or admin behavior.
- Do not run destructive Docker commands such as `docker compose down -v`.
- Do not commit, push, or create PRs from Codex in this planning round.

## Acceptance Criteria

- [ ] `SanguiBlog-server/src/main/resources/application.yaml` has `site.version: "V2.3.0"`.
- [ ] Frontend fallback version strings in the active homepage/navigation path use `V2.3.0` so the UI still shows the new version if `/api/site/meta` is absent or stale.
- [ ] `README.md` is rewritten as a Docker-first deployment/development guide and no longer presents non-container deployment as the recommended production path.
- [ ] `README.zh-CN.md` is rewritten with equivalent Chinese content and stays aligned with the English README.
- [ ] Both README files mention current version `V2.3.0`.
- [ ] README deploy snippets use the production compose file `docker-compose.prod.yml` and include clone, env copy/edit, pull, up, ps, down, and update/redeploy commands.
- [ ] README links to deeper docs such as `docs/docker-deploy.md`, `docs/docker-data-sync.md`, component sub-READMEs, and release directory instead of embedding all internal module details.
- [ ] No `release/V2.3.0.md` file is created.
- [ ] No business API, DTO, DB schema, frontend types, permissions, or runtime Docker topology changes are introduced.
- [ ] Required verification commands below pass or any skipped command is documented with reason.

## Cross-Layer / Infra Contract

This task does not add a new API, DTO, DB table, or Docker service. It updates an existing config-to-frontend display contract and root deployment documentation.

### 1. Existing API / Service / Payload

- Backend config source:
  - File: `SanguiBlog-server/src/main/resources/application.yaml`
  - Key: `site.version`
  - Target value: `"V2.3.0"`
- Backend service:
  - `SiteService` injects `@Value("${site.version:V1.0.0}")`.
  - `SiteService.meta()` maps that value into `SiteMetaDto.version`.
- Public API:
  - `GET /api/site/meta`
  - Response follows the existing `ApiResponse<SiteMetaDto>` shape.
  - Relevant response field: `data.version`.
- Frontend consumers:
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx` uses `meta?.version || '<fallback>'`.
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx` displays `siteVersion || '<fallback>'`.

### 2. Deployment Commands

Root README production path should document these commands with short explanations:

```bash
git clone https://github.com/WuSangui571/SanguiBlog.git
cd SanguiBlog
cp .env.example .env
vim .env
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml ps
sudo docker compose -f docker-compose.prod.yml down
```

Recommended update / redeploy flow:

```bash
git pull origin main
vim .env
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml ps
curl -i http://localhost:8090/api/site/meta
```

Optional log/health snippets may be included:

```bash
sudo docker compose -f docker-compose.prod.yml logs -f backend
curl -i http://localhost:8090/
curl -i http://localhost:8090/api/site/meta
curl -i http://localhost:8090/sitemap.xml
curl -i http://localhost:8090/robots.txt
```

### 3. Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| `site.version` changed to `V2.3.0` and backend starts | `/api/site/meta` returns `data.version = "V2.3.0"` through the existing response shape |
| Frontend receives `meta.version = "V2.3.0"` | Navigation/home banner displays `V2.3.0` |
| Frontend does not yet have meta due to loading/failure | Fallback string displays `V2.3.0`, not `V2.2.23` |
| README reader follows Docker production commands with a filled `.env` | Compose pulls GHCR images, starts services, and `ps` shows expected services |
| README reader runs stop command | `docker compose -f docker-compose.prod.yml down` stops containers without deleting volumes |
| README reader upgrades version | `git pull`, `pull`, `up -d`, and health checks are enough for normal image update |
| `.env` missing required secrets | Compose validation/startup fails fast according to existing `.env.example` / compose contract; README should instruct filling `.env` |
| AI/RAG variables are empty/default-disabled | Core blog deployment remains valid; README should describe AI as optional |
| Existing data volume already exists | README must not imply `sanguiblog_db.sql` reruns as a migration; existing Docker volume data persists |

### 4. Good / Base / Bad Cases

| Case | Expected Result |
|------|-----------------|
| Good | A fresh user can clone the repo, copy/edit `.env`, pull production images, start services, verify homepage/meta/sitemap/robots, and understand where deeper Docker docs live |
| Base | User does not enable AI/RAG; README still presents a complete core blog deployment path |
| Bad | README recommends manual JDK/Maven/Node production deployment as the main path, documents `down -v` as normal stop flow, creates a release doc despite the request, or leaves any active version string at `V2.2.23` |

## Focused Code Research

### Relevant Specs

- `.trellis/workflow.md`: Trellis task workflow and requirement to read specs before development.
- `.trellis/spec/backend/index.md`: backend spec index; version contract is in backend quality guidelines.
- `.trellis/spec/backend/directory-structure.md`: backend config and service placement; `application.yaml` is the shared config file.
- `.trellis/spec/backend/quality-guidelines.md`: explicit version rule and release-doc rule; release documents are generated only when explicitly requested.
- `.trellis/spec/frontend/index.md`: frontend spec index and verification commands.
- `.trellis/spec/frontend/directory-structure.md`: active frontend path is `AppFull.jsx`, `appfull/public`, and `appfull/ui`.
- `.trellis/spec/frontend/quality-guidelines.md`: home/navigation contracts and verification matrix.
- `.trellis/spec/frontend/component-guidelines.md`: component/fallback patterns and active UI reuse.
- `.trellis/spec/frontend/type-safety.md`: `SiteMetaDto.version` is an existing cross-layer field; avoid blind payload assumptions.
- `.trellis/spec/frontend/state-management.md`: site meta is global public site state owned by `useBlogData.jsx`.
- `.trellis/spec/frontend/hook-guidelines.md`: site data should continue flowing through existing context/API paths.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: retrieve-first rule and reuse existing version/meta path.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: site meta and Docker Compose deployment are cross-layer/infra contracts.

### Retrieval Report

- Keywords searched:
  - `V2.2.23`, `2.2.23`, `V2.3.0`, `site.version`, `meta?.version`, `home-nav-brand__version`, `docker-compose.prod.yml`, `bump-version.ps1`.
- Candidate implementations:
  - `SanguiBlog-server/src/main/resources/application.yaml`: canonical `site.version` source, currently `"V2.2.23"`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`: injects `site.version` and maps it to site meta.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteMetaDto.java`: contains existing `version` DTO field.
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`: derives `siteVersion = meta?.version || 'V2.2.23'`.
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`: displays `siteVersion || 'V2.2.23'`.
  - `scripts/bump-version.ps1`: existing version bump script updates backend version, frontend fallback, and README/release references, but the README rewrite in this task is too large for blind script-only use and release docs must not be generated.
  - `docs/docker-deploy.md`: detailed Docker deployment contract; root README should link here rather than duplicate all details.
  - `docs/docker-data-sync.md`: deeper data sync/restore guide; root README should link here.
  - `docker-compose.prod.yml`: production compose file to document.
- Decision:
  - Modify existing version/meta path and existing README files.
  - Do not create new version endpoint, frontend component, deploy script, or release doc.
- Duplicate risk:
  - Low if implementation only updates existing `site.version` and existing fallback strings.
  - README should link deeper docs rather than duplicating full deployment/runbook content.

### Code Patterns Found

- Site version source pattern:
  - `application.yaml` -> `SiteService.siteVersion` -> `SiteMetaDto.version` -> frontend `meta.version`.
- Frontend fallback pattern:
  - Active public home path uses `HomeView.jsx` and `Navigation.jsx`; no need to edit legacy/prototype files.
- Docker deployment documentation pattern:
  - `docs/docker-deploy.md` already owns detailed production/development Docker runbooks, tag strategy, GHCR, health checks, rollback, data persistence, and troubleshooting.
- Existing version script pattern:
  - `scripts/bump-version.ps1 -Version V2.3.0` can update version fields, but it currently tries README substitutions and may not fit the requested README rewrite. If used, run it without release generation and still manually review all README content.

### Files Likely To Modify

- `SanguiBlog-server/src/main/resources/application.yaml`
  - Change `site.version` from `"V2.2.23"` to `"V2.3.0"`.
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - Change fallback version from `'V2.2.23'` to `'V2.3.0'`.
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - Change fallback version from `'V2.2.23'` to `'V2.3.0'`.
- `README.md`
  - Rewrite as Docker-first English root guide.
- `README.zh-CN.md`
  - Rewrite as Docker-first Chinese root guide aligned with `README.md`.
- Trellis restored files already created by Codex before implementation:
  - `.trellis/scripts/**`
  - `.trellis/spec/**`
  - `.trellis/workflow.md`
  - `.trellis/config.yaml`
  - `.trellis/worktree.yaml`
  - `.trellis/.gitignore`
  - `.trellis/.version`

### Files Not Expected To Modify

- `release/**` unless the user later asks for a release document.
- `docker-compose.yml`, `docker-compose.prod.yml`, `docker/nginx/**`, `.env.example`, `.github/workflows/**` unless README verification exposes an objective mismatch and the user approves.
- `SanguiBlog-server/src/main/java/**` business logic.
- `SanguiBlog-front/src/api.js`, routing, CSS, or active UI behavior beyond fallback version strings.
- `sanguiblog_db.sql`.
- `docs/docker-deploy.md` and `docs/docker-data-sync.md` unless the root README reveals broken links or outdated command references.

## Required Tests / Verification

Minimum commands for DeepSeek implementation:

```bash
git diff --check
docker compose -f docker-compose.prod.yml config --quiet
cd SanguiBlog-server
mvn -q -DskipTests compile
cd ..\SanguiBlog-front
npm run build
```

Recommended additional checks:

```bash
cd SanguiBlog-front
npm run lint
node src/appfull/noNativeBlockingDialogs.test.js
```

Static/manual assertions:

- `rg -n "V2\.2\.23|2\.2\.23" README.md README.zh-CN.md SanguiBlog-server/src/main/resources/application.yaml SanguiBlog-front/src/appfull/public/HomeView.jsx SanguiBlog-front/src/appfull/ui/Navigation.jsx` should return no active current-version references.
- `rg -n "release/V2\.3\.0|V2\.3\.0\.md" README.md README.zh-CN.md release` should not show a newly created release doc requirement.
- `rg --files release | rg "V2\.3\.0"` should return nothing unless the user later asks for release notes.
- Open/read both README files to ensure:
  - English and Chinese content are aligned.
  - Markdown fences and section numbering are valid.
  - Docker-first recommendation is clear.
  - Stop command uses `down`, not `down -v`.
  - Update/redeploy flow includes `git pull`, `pull`, `up -d`, `ps`, and health checks.

## Planning Self-Check

- Acceptance criteria explicit: Yes.
- Forbidden modification scope explicit: Yes.
- Expected modified files listed: Yes.
- Required tests listed: Yes.
- Concrete guidelines read, not only spec indexes: Yes. Read backend directory/quality; frontend directory/quality/component/type-safety/state/hook; guides code-reuse/cross-layer.
- Requirement unclear / needs user confirmation: No. The user explicitly requested no release document and Docker-first README rewrite.
- API / DB / frontend types / DTO alignment:
  - API path unchanged: `GET /api/site/meta`.
  - DTO field unchanged: `SiteMetaDto.version`.
  - DB unchanged.
  - Frontend consumes existing `meta.version`; only fallback string changes.

## DeepSeek Implementation Notes

- Keep README content concise enough for the root README. Move deep internal module details to links:
  - Backend: `SanguiBlog-server/README.md` if useful, or source tree.
  - Frontend: `SanguiBlog-front/README.md`.
  - Docker deployment: `docs/docker-deploy.md`.
  - Data sync/restore: `docs/docker-data-sync.md`.
  - Script notes: `scripts/README.md`.
- The current README files appear to contain mojibake when printed in the terminal. Rewrite them as UTF-8 Markdown and verify rendered content manually by reading the files after editing.
- Prefer `sudo docker compose ...` in root README production snippets as requested by the user, but note that systems where the user is in the `docker` group can omit `sudo`.
- For production image tag guidance, prefer fixed `sha-<short_sha>` or a Git tag when available; explain that `main/latest` are moving tags and less ideal for production rollback.
- If the implementation uses `scripts/bump-version.ps1`, do not allow it to create release docs. Review README rewrites afterward because this task requires a full document restructure.
