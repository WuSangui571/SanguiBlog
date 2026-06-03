# Upload Image Storage Permission PRD

## Current Project State

- Current branch before task planning: `main`.
- Working tree before task planning: clean.
- No active Trellis task existed before this task was created.
- Latest recorded workspace sessions:
  - Session 20: Guest BotGuard public read relief, commit `80a96f8`, archived and completed.
  - Session 19: Admin analytics GeoIP display regression, commit `3d8a1fd`, archived and completed.
- A prior related task existed on the old `feat/docker` line: commit `b9c17ee` (`fix:修复 Docker uploads 恢复写权限`) added `StoragePathResolver` writable checks and restore-script ownership repair, but `b9c17ee` is not an ancestor of current `main`. Current `main` has production `uploads-init` in `docker-compose.prod.yml`, but does not have the `StoragePathResolver` `Files.isWritable(...)` fail-fast check from that branch.

## Problem

When a super admin creates or edits a blog post and uploads a post cover or article image, the backend can fail with:

```json
{"success":false,"message":"无法创建存储目录: /data/uploads/covers/20260529/28a9f4ecb31549e0934cd80b36d2a06f"}
```

Observed production probe:

```text
uid=100(sangui) gid=101(sangui)
/data/uploads/covers -> root:root 755
mkdir /data/uploads/covers/test-write -> Permission denied
```

Temporary production workaround:

```bash
sudo docker compose -f docker-compose.prod.yml exec -u root backend sh -lc '
chown -R 100:101 /data/uploads
chmod -R u+rwX,g+rwX /data/uploads
'
```

Temporary local workaround:

```bash
docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"
docker compose restart backend
```

The product requirement is to stop requiring these manual permission fixes during normal local or production Docker operation.

## Scope Judgment

Classification: **Complex Task**

Reasons:

- Crosses backend storage initialization, Docker Compose, production/local deployment behavior, upload API error semantics, and manual acceptance commands.
- Root-owned `755` subdirectories cannot be repaired by the current non-root Java process. Any real automatic repair must happen in Docker/init/runtime infrastructure with root privileges, or the app must fail fast with a clear operator hint.
- The change must preserve existing upload API routes, permissions, static `/uploads` serving, and Docker data persistence.

## Goals

1. Ensure normal Docker startup/redeploy prepares `/data/uploads` and key upload subdirectories so backend user `sangui:sangui` (`uid=100`, `gid=101`) can write without manual `chown`.
2. Restore or reimplement `StoragePathResolver` writable-directory checks so non-writable upload directories fail early with a clear message and Docker fix hint rather than surfacing as a later ambiguous upload failure.
3. Bring local `docker-compose.yml` and production `docker-compose.prod.yml` into an aligned uploads-permission contract where practical.
4. Preserve all existing upload route contracts:
   - `POST /api/upload/post-cover`
   - `POST /api/upload/post-assets/reserve`
   - `POST /api/upload/post-assets`
   - `POST /api/upload/avatar`
5. Add focused tests and Docker validation so this does not regress.

## Non-Goals / Forbidden Scope

- Do not change post create/edit payloads, DTO fields, database schema, or frontend route structure.
- Do not relax upload authorization. Keep the existing `SUPER_ADMIN` fallback and `PERM_POST_CREATE` / `PERM_POST_EDIT` authority contract.
- Do not make the backend Java process run as root for the whole application lifetime.
- Do not add a second upload controller, storage service, path resolver, or frontend upload API wrapper.
- Do not change `/uploads/`, `/uploads/games/`, or `/avatar/` public URL semantics.
- Do not change uploaded-game CSP behavior.
- Do not remove named volumes or recommend `docker compose down -v`.
- Do not log uploaded file bytes, full article content, JWTs, secrets, or raw request bodies.

## Relevant Specs

Read before implementation:

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`

Spec constraints to preserve:

- Upload path ownership stays centralized in `StoragePathResolver`, `PostAssetService`, and `AvatarStorageService`.
- JSON API errors must keep user-facing text in `message` and flow through `ApiResponse` / `GlobalExceptionHandler` where possible.
- Docker upload storage contract: `uploads_data` volume mounted at `/data/uploads`; URLs remain `/uploads/...`.
- Docker deployments must not depend on ignored `application-local.yaml`.

## Existing Code Patterns Found

### Backend storage and upload

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`
  - Current owner for root upload path resolution.
  - Initializes root, `avatar`, `posts`, and `covers`.
  - Current `main` only calls `Files.createDirectories(path)` and wraps `IOException` as `IllegalStateException("无法创建存储目录: " + path, e)`.
  - Does not currently check `Files.isWritable(path)`.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostAssetService.java`
  - Normalizes article asset folders to `posts/...`.
  - Stores multipart article images under the resolved folder.
  - Calls `Files.createDirectories(target.getParent())` during nested file copy.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`
  - Owns avatar, post cover, post asset reserve, and post asset upload endpoints.
  - `post-cover` normalizes to `covers/...` and calls `StoragePathResolver.ensureRelativePath(folder)`.
  - `post-assets` normalizes to `posts/...` and calls `PostAssetService.ensureFolder(slug)`.
  - Existing permission annotation:
    `hasRole('SUPER_ADMIN') or hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')`

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AvatarStorageService.java`
  - Reuses `StoragePathResolver.resolveAvatarFile(filename)`.

### Docker and runtime

- `SanguiBlog-server/Dockerfile`
  - Creates non-root user `sangui:sangui`.
  - Creates `/data/uploads` and chowns it at image build time.
  - Runs application as `USER sangui:sangui`.
  - Image-layer chown does not repair a mounted named volume once Docker overlays `/data/uploads`.

- `docker-compose.prod.yml`
  - Has `uploads-init` one-shot service running as root.
  - It creates `posts`, `covers`, `avatar`, `games`, and `site/wechat`, then runs `chown -R 100:101` and `chmod -R u+rwX,g+rwX`.
  - `backend` depends on `uploads-init` with `service_completed_successfully`.
  - This may not repair later root-owned directories if only `docker compose restart backend` is used, or if the init service is already in a completed state and not recreated during an operator action.

- `docker-compose.yml`
  - Local compose currently mounts `uploads_data:/data/uploads` in `web` and `backend`.
  - It does not currently define a local `uploads-init` service.

- `scripts/docker-data-sync-local-restore.ps1`
  - After restoring uploads, it runs root `chown -R sangui:sangui /data/uploads`.
  - It verifies write access to `posts`, `covers`, and `avatar`.

### Existing tests

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/StoragePathResolverTest.java`
  - Currently only rejects avatar path traversal.
  - Prior branch `b9c17ee` added writable-directory regression coverage; use it as implementation reference, but adapt to current `main`.

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/UploadControllerAuthorizationTest.java`
  - Protects upload permission annotation.

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/UploadControllerStreamHandlingTest.java`
  - Protects post-cover input stream closure and output path.

## Root Cause Notes

Likely root causes:

1. `uploads_data` is a Docker named volume mounted over `/data/uploads`, so Dockerfile image-layer ownership is insufficient.
2. `docker compose cp`, tar restore, or manual root copy can create `avatar`, `posts`, or `covers` as `root:root 755`.
3. The backend Java process runs as `uid=100`, `gid=101` and cannot create child directories under `root:root 755` directories.
4. Current production compose has a one-shot `uploads-init`, but one-shot init does not necessarily run on every `docker compose restart backend` or after root-owned directories are introduced later.
5. Current local compose has no init service, so fresh or restored local volumes can reproduce the permission mismatch.

Important boundary:

- Java code running as `sangui` cannot reliably fix ownership of `root:root 755` directories. It can detect and fail fast; actual repair requires root in Docker/init/deployment flow.

## Required Implementation Plan

### Step 1: Reconcile prior branch behavior

- Inspect `b9c17ee` and its task artifacts for the previous `StoragePathResolver` writable check and tests.
- Bring the useful parts forward to current `main` without reverting unrelated current changes.
- Keep messages clear and actionable. The failure should identify the non-writable path and include a Docker chown/init hint.

Expected target:

- `StoragePathResolver.ensureDirectoryExists(path)` should:
  - create missing directory,
  - verify it is a directory,
  - verify it is writable by the current process,
  - throw `IllegalStateException` with a readable message when not writable.

### Step 2: Align Docker uploads initialization

Evaluate and implement the narrowest durable Docker fix:

- Add a local `uploads-init` service to `docker-compose.yml` mirroring the production ownership contract.
- Verify `docker-compose.prod.yml` still creates and chowns:
  - `/data/uploads/posts`
  - `/data/uploads/covers`
  - `/data/uploads/avatar`
  - `/data/uploads/games`
  - `/data/uploads/site/wechat`
- If needed, harden `uploads-init` command so it is idempotent and validates write-critical paths.
- If the chosen solution cannot repair root-owned directories on `docker compose restart backend`, document that limitation explicitly and provide the project-supported command that recreates/runs the init service. Do not pretend Java can chown as non-root.

Do not change the backend app to run as root for its full lifetime. If DeepSeek proposes an entrypoint that briefly runs as root and drops privileges, it must preserve the Java process as `uid=100/gid=101`, be justified in the PRD/check notes, and include a runtime `id`/process validation plan. Prefer compose init unless restart-time repair is explicitly required.

### Step 3: Keep upload API behavior stable

- Do not change endpoint paths.
- Do not change multipart field names:
  - avatar: `avatar`
  - post cover: `file`, optional `postSlug`
  - post assets reserve: optional `folder`
  - post assets upload: `files`, optional `folder`
- Do not change response shapes:
  - post cover: `ApiResponse<Map<String,String>>` with `url`, `path`, `filename`
  - post assets: `ApiResponse<Map<String,Object>>` with `folder`, `count`, `files`, `urls`, `joined`
  - avatar: `ApiResponse<Map<String,String>>` with `url`, `filename`

### Step 4: Update docs only if needed

- If Compose behavior changes, update:
  - `docs/docker-deploy.md`
  - `docs/docker-data-sync.md`
- Document probes as validation, not as routine manual repair.
- Keep commands secret-safe; do not print `.env` values.

## API / Command / Payload Contracts

### Upload API

| Endpoint | Method | Payload | Auth/Permission | Success shape | Must remain |
|---|---|---|---|---|---|
| `/api/upload/post-cover` | POST | multipart `file`, optional `postSlug` | `SUPER_ADMIN` or `PERM_POST_CREATE`/`PERM_POST_EDIT` | `success=true`, `data.url`, `data.path`, `data.filename` | yes |
| `/api/upload/post-assets/reserve` | POST | multipart optional `folder` | `SUPER_ADMIN` or `PERM_POST_CREATE`/`PERM_POST_EDIT` | `success=true`, `data.folder` | yes |
| `/api/upload/post-assets` | POST | multipart `files`, optional `folder` | `SUPER_ADMIN` or `PERM_POST_CREATE`/`PERM_POST_EDIT` | `success=true`, `data.folder/count/files/urls/joined` | yes |
| `/api/upload/avatar` | POST | multipart `avatar` | authenticated upload route as currently configured | `success=true`, `data.url`, `data.filename` | yes |

### Docker commands

Local structure check:

```bash
docker compose config --quiet
```

Production structure check:

```bash
docker compose -f docker-compose.prod.yml config --quiet
```

Expected write probes after starting containers:

```bash
docker compose exec backend sh -c 'id'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test && echo posts-writable'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo covers-writable'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test && echo avatar-writable'
```

Production probe variant:

```bash
sudo docker compose -f docker-compose.prod.yml exec backend sh -c 'id'
sudo docker compose -f docker-compose.prod.yml exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo covers-writable'
```

## Validation / Error Matrix

| Scenario | Expected result | Assertion point |
|---|---|---|
| Fresh local Docker volume | startup creates `posts`, `covers`, `avatar`; backend user can write | `docker compose up -d --build`, write probes pass |
| Fresh production Docker volume | `uploads-init` completes before backend; backend user can write | `docker compose -f docker-compose.prod.yml up -d`, write probes pass |
| Existing root-owned `/data/uploads/covers` before supported startup/redeploy path | project init/repair path makes it writable, or backend fails fast with explicit chown/init hint if repair path was not run | write probe or backend startup/error message |
| `docker compose restart backend` after root-owned dirs are introduced later | document whether this is supported; if not supported, backend should fail fast rather than later upload-only failure | docs and startup/error behavior |
| Super admin uploads post cover after startup | 200 JSON `success=true`, returned URL starts `/uploads/covers/` | controller/manual upload smoke |
| Super admin uploads article images after startup | 200 JSON `success=true`, returned URLs start `/uploads/posts/` | controller/manual upload smoke |
| Admin/user without upload permission | 403 remains from method security | `UploadControllerAuthorizationTest` and optional manual check |
| Oversized or unsupported image | 400-style `ApiResponse.fail(message)` remains | existing/targeted upload validation tests |
| Non-writable storage root in unit test | `StoragePathResolver` throws `IllegalStateException` naming path and permission hint | `StoragePathResolverTest` |
| Static uploaded asset URL | `/uploads/...` served as file, not SPA HTML | Docker Nginx/browser/curl smoke |

## Good / Base / Bad Cases

| Case | Description | Expected |
|---|---|---|
| Good | Fresh local and production compose startup with empty `uploads_data` | Backend runs as non-root app user; `posts`, `covers`, `avatar` are writable; cover and article image uploads succeed |
| Good | Existing volume has root-owned upload subdirectories before supported deploy/up path | Init/repair path restores write access without operator manually typing `chown` |
| Base | AI/RAG disabled or PgVector unused | Core blog/admin/uploads still run; no AI-specific change required |
| Base | Docker not available in CI/dev machine | Unit tests and `docker compose config --quiet` still cover the change; manual Docker smoke is documented as not run |
| Bad | Backend silently starts with non-writable `/data/uploads/covers` | Must not happen after this task; fail fast or repair through init path |
| Bad | Controller catches broad `Exception` and returns HTTP 200 `success=false` | Must not introduce this anti-pattern |
| Bad | Java app runs as root for whole lifetime | Must not happen |
| Bad | Upload URL shape changes or frontend must be rewritten | Out of scope |

## Required Tests And Assertion Points

Backend targeted tests:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=StoragePathResolverTest,UploadControllerStreamHandlingTest,UploadControllerAuthorizationTest" test
mvn -q -DskipTests compile
```

Assertions:

- `StoragePathResolverTest` covers path traversal and non-writable directory fail-fast where the OS allows this test. If Windows cannot reliably represent POSIX permissions, guard that case with a JUnit assumption and still assert the message on supported environments.
- `UploadControllerStreamHandlingTest` still proves cover uploads close input streams and write under `covers/...`.
- `UploadControllerAuthorizationTest` still proves post cover/assets endpoints keep `SUPER_ADMIN` and post create/edit permission contract.

Compose/static checks:

```bash
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
```

If Docker runtime is available:

```bash
docker compose up -d --build
docker compose ps
docker compose exec backend sh -c 'id'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test && echo posts-writable'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo covers-writable'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test && echo avatar-writable'
```

Frontend:

- No frontend change is expected.
- If `SanguiBlog-front/src/api.js` is changed unexpectedly, run:

```bash
cd SanguiBlog-front
npm run build
node src/appfull/noNativeBlockingDialogs.test.js
```

## Files Likely To Modify

Expected:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/StoragePathResolverTest.java`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`

Possible only if justified:

- `SanguiBlog-server/Dockerfile`
- `scripts/docker-data-sync-local-restore.ps1`

Not expected:

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostAssetService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AvatarStorageService.java`
- Any entity, repository, DB schema SQL, permission definition, or JWT/security filter.

## Acceptance Criteria

- A super admin can upload a new post cover and article images in Docker without manually running `chown`.
- Local Docker and production Docker have an explicit, repeatable uploads permission initialization/repair contract.
- Backend startup or storage initialization clearly rejects non-writable upload directories if the repair contract was not run.
- The backend Java application process remains non-root during normal runtime.
- Existing upload permission annotations and response shapes are unchanged.
- Required backend tests pass.
- Compose config checks pass for local and production files.
- PR/check notes explicitly state whether `docker compose restart backend` alone is supported for repairing newly root-owned directories. If unsupported, the supported no-manual-chown deploy command must be named.

## Planning Self-Check For Implementer

- [ ] Acceptance criteria are clear.
- [ ] Forbidden scope is clear.
- [ ] Expected modified files are listed.
- [ ] Required tests are listed.
- [ ] Concrete backend/guides specs have been read, not only indexes.
- [ ] API route, multipart field, response shape, and permission contracts are aligned.
- [ ] No DB schema or frontend DTO/type changes are planned.
- [ ] Any runtime limitation around `docker compose restart backend` is documented truthfully.
