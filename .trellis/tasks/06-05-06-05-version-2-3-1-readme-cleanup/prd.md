# Version 2.3.1 README and Repository Cleanup PRD

## Task Scope Judgment

**Scope**: Simple Task.

This task is a small release-maintenance and repository-hygiene pass. It updates the public project version from `V2.3.0` to `V2.3.1`, refreshes the root English and Chinese README files, and checks ignore/cleanup coverage. It does not require new business logic, DB schema changes, new API fields, permissions changes, AI/RAG changes, or infrastructure behavior changes.

## Current Project State

- Current branch from `$start`: `main`.
- Working directory before planning: clean.
- Active Trellis task before this task: none.
- Workspace journal has 23 recorded sessions; latest recorded work is production AI RAG provider isolation, production AI chat timeout, upload storage permission initialization, guest BotGuard public-read relief, and analytics GeoIP display regression.
- The existing version task for `V2.3.0` is archived at `.trellis/tasks/archive/2026-05/05-25-version-2-3-0-docker-readme`.

## Goal

Update the site and repository-facing documentation to `V2.3.1`, keep both root README files aligned, and ensure repository cleanup/ignore decisions prevent temporary, local, or generated files from being uploaded.

## Non-Goals / Forbidden Scope

- Do not create a release document.
- Do not change DB schema or `sanguiblog_db.sql`.
- Do not change API paths, DTO fields, response shapes, auth, permissions, BotGuard, uploads, analytics, AI, RAG, Docker runtime behavior, or Nginx proxy behavior.
- Do not refactor frontend layout, CSS, routing, API wrappers, React state, backend services, controllers, or repositories.
- Do not remove local user data such as `.env`, `uploads/`, IDE settings, Maven/npm caches, or `node_modules` as part of the branch.
- Do not run destructive cleanup commands such as `git clean -fdX`, broad recursive deletes, or `git add .`.

## Expected Changes

### Version Update

Update the canonical and fallback version references:

- `SanguiBlog-server/src/main/resources/application.yaml`
  - Change `site.version` from `"V2.3.0"` to `"V2.3.1"`.
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - Change the fallback `meta?.version || 'V2.3.0'` to `meta?.version || 'V2.3.1'`.
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - Change the fallback `{siteVersion || 'V2.3.0'}` to `{siteVersion || 'V2.3.1'}`.
- `README.md`
  - Change `Current version: **V2.3.0**` to `Current version: **V2.3.1**`.
- `README.zh-CN.md`
  - Change `当前版本：**V2.3.0**` to `当前版本：**V2.3.1**`.

### README Refresh

Review both root README files together and keep them content-aligned:

- Keep Docker-first production deployment as the primary path.
- Keep GHCR image deployment wording if it still matches `docker-compose.prod.yml`.
- Keep required secret guidance aligned with `.env.example` and Compose fail-fast keys:
  - `JWT_SECRET`
  - `MYSQL_PASSWORD`
  - `MYSQL_ROOT_PASSWORD`
  - `POSTGRES_PASSWORD`
- Keep port examples aligned with `.env.example` / production Compose default `WEB_PORT=8090`.
- Remove or correct stale project-structure entries. Current research found `release/` listed in both README files, but no root `release/` directory exists and this task explicitly forbids creating release docs.
- Keep the English README and Chinese README semantically equivalent. Do not fix only one language.
- Preserve UTF-8 content. The current Chinese README content is valid UTF-8; PowerShell 5.1 may display mojibake, but the file content is not itself broken.

### Cleanup / Ignore Review

Current ignored local/generated items:

- `.env`
- `.idea/`
- `.kilo/`
- `.m2/`
- `.vscode/`
- `uploads/`
- `SanguiBlog-front/.env.local`
- `SanguiBlog-front/dist/`
- `SanguiBlog-front/node_modules/`
- `SanguiBlog-server/src/main/resources/application-local.yaml`
- `SanguiBlog-server/target/`
- `.trellis/scripts/common/__pycache__/`
- `docker/ip2region/`
- `Trellis/` currently ignored only through local `.git/info/exclude`

Expected cleanup decision:

- Do not stage or upload any ignored local/generated directories.
- Consider adding `Trellis/` to the committed root `.gitignore` because it is currently protected only by local `.git/info/exclude`, not by a shared repo rule.
- Keep `.trellis/` active and tracked as the workflow source. Do not ignore or delete `.trellis/`.
- Do not delete `.env`, `uploads/`, `.m2/`, `node_modules/`, `.idea/`, `.vscode/`, or `.kilo/` during implementation. These are local state/caches and are already ignored.
- If any tracked obsolete artifact is discovered during implementation, stop and record it in the handoff/check notes before deleting it.

## Cross-Layer Contract

### 1. Scope / Trigger

`site.version` is backend config exposed through existing `/api/site/meta` and consumed by frontend home/navigation version display. The task changes the version value only; it does not add fields or change response shape.

### 2. Signatures

- Backend config: `site.version` in `SanguiBlog-server/src/main/resources/application.yaml`.
- Backend service path: `SiteService.meta()` reads `@Value("${site.version:V1.0.0}")` and maps `.version(siteVersion)`.
- Backend public endpoint: existing `GET /api/site/meta`.
- Response field: existing `data.version`.
- Frontend consumers:
  - `SanguiBlog-front/src/AppFull.jsx` passes `meta?.version` to navigation.
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx` reads `meta?.version` with fallback.
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx` renders `siteVersion` with fallback.
- DB: no table/column changes.
- Env/config: no new environment variable.

### 3. Payloads

Request:

```http
GET /api/site/meta
```

Response shape remains unchanged:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "version": "V2.3.1"
  }
}
```

The response contains many other existing fields; this task must not alter them.

### 4. Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| Backend config loads normally | `/api/site/meta` returns existing response shape with `data.version = "V2.3.1"` |
| Frontend receives `meta.version` | Home hero/navigation display `V2.3.1` |
| Frontend meta is absent during fallback path | Home/navigation fallback still displays `V2.3.1` |
| README root files are checked | `README.md` and `README.zh-CN.md` both show `V2.3.1` and remain content-aligned |
| Release docs search | No `release/V2.3.1.md` or similar release doc is created |
| Cleanup review | Ignored local/generated files remain untracked and are not staged |
| `Trellis/` ignore rule missing from committed ignore file | Add shared `.gitignore` rule or document why not |

### 5. Good / Base / Bad Cases

| Case | Expected Result |
|------|-----------------|
| Good | Site meta and frontend fallback values all use `V2.3.1`; README files are synchronized; `git status --ignored` shows local generated files remain ignored |
| Base | Only docs/config are changed; no API field, DB, Docker, AI, permission, or UI layout changes appear in `git diff` |
| Bad | A release document is created, `package.json`/dependency versions are bumped unnecessarily, `.env` or `uploads/` are deleted, `.trellis/` is ignored, or README files diverge between English and Chinese |

## Implementation Plan

1. Confirm branch is based on `main` before implementation.
2. Edit the five intended version references:
   - `application.yaml`
   - `HomeView.jsx`
   - `Navigation.jsx`
   - `README.md`
   - `README.zh-CN.md`
3. Review root README files against `.env.example`, `docker-compose.prod.yml`, and current root directory list.
4. Remove or correct stale README entries, especially the nonexistent `release/` directory.
5. Recheck `.gitignore` and `git status --ignored`.
6. If adding shared ignore coverage, keep the change minimal; likely add `Trellis/` under legacy workflow/local tool dirs.
7. Do not delete local ignored directories unless the user explicitly asks for destructive local cleanup.
8. Run the required verification commands.
9. Provide a small diff summary and leave the branch ready for Codex check/finish-work.

## Files Likely To Modify

- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- `README.md`
- `README.zh-CN.md`
- `.gitignore` only if adding shared ignore coverage for `Trellis/` or another confirmed generated/local path

## Files Not Expected To Modify

- `SanguiBlog-server/pom.xml`
- `SanguiBlog-front/package.json`
- `SanguiBlog-front/package-lock.json`
- `sanguiblog_db.sql`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.env.example`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`
- Any backend Java service/controller/DTO/entity/repository
- Any frontend API/state/routing/CSS file outside the listed fallback version files

## Required Tests And Assertion Points

Run from repository root unless noted:

```powershell
git diff --check
rg -n "V2\.3\.0|2\.3\.0" README.md README.zh-CN.md SanguiBlog-server/src/main/resources/application.yaml SanguiBlog-front/src/appfull/public/HomeView.jsx SanguiBlog-front/src/appfull/ui/Navigation.jsx
rg --files release
git status --short --ignored
docker compose -f docker-compose.prod.yml config --quiet
```

Run backend compile because `application.yaml` is changed:

```powershell
cd SanguiBlog-server
mvn -q -DskipTests compile
```

Run frontend checks because JSX fallback strings are changed:

```powershell
cd SanguiBlog-front
node src/appfull/noNativeBlockingDialogs.test.js
cmd /c npm run lint
cmd /c npm run build
```

Expected assertions:

- `git diff --check` passes.
- The targeted stale-version search returns no `V2.3.0` or `2.3.0` hits in the intended version/docs/display files.
- No `release/V2.3.1*` file exists.
- `docker compose -f docker-compose.prod.yml config --quiet` passes.
- Maven compile passes.
- Frontend no-native-dialog test, lint, and build pass.
- `git status --short --ignored` shows no unexpected untracked upload candidates and no accidental tracked deletions.

## Planning Self-Check

- Acceptance criteria defined: yes.
- Forbidden scope defined: yes.
- Expected modification files listed: yes.
- Required tests listed: yes.
- Concrete guidelines read beyond spec index: yes, backend/frontend directory and quality specs, frontend state/hooks/component/type-safety specs, code-reuse guide, and cross-layer guide.
- Open questions requiring user confirmation: none for planning. Destructive deletion of local ignored state would require separate user confirmation.
- API / DB / frontend field alignment: existing `/api/site/meta data.version` field is reused; no DB/API/DTO field changes.
