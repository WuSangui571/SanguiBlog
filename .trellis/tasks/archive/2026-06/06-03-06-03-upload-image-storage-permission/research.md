# Upload Image Storage Permission Research

## Scope Judgment

Complex Task.

This is not only a controller bug. The failing boundary is Docker upload-volume ownership plus backend storage initialization. The backend runs as `uid=100/gid=101`, while the failing production directory `/data/uploads/covers` is `root:root 755`, so the Java process cannot create date/UUID child directories there. A durable fix must include Docker/init/runtime behavior, not just upload error handling.

## Relevant Specs

- `.trellis/spec/backend/index.md`
  - Read first. Uploads/files/static assets require Directory Structure, Error Handling, and Quality Guidelines.
- `.trellis/spec/backend/directory-structure.md`
  - Upload extension rule: reuse `UploadController`, `PostAssetService`, `AvatarStorageService`, and `StoragePathResolver`.
  - Anti-pattern: do not scatter static file path rules.
- `.trellis/spec/backend/error-handling.md`
  - Upload validation uses `IllegalArgumentException`; state/storage failures use `IllegalStateException`.
  - JSON failures should expose user-facing text in `message`, not raw stack traces.
- `.trellis/spec/backend/quality-guidelines.md`
  - Keep `SUPER_ADMIN` fallback on upload/post permissions.
  - Minimum verification for security/upload changes: targeted controller/security tests.
- `.trellis/spec/backend/logging-guidelines.md`
  - Upload failures may log safe filename/path/size/user id metadata, not file bytes or article content.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
  - Reuse existing upload/storage entry points; do not add duplicate services/controllers.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Docker upload storage contract: `uploads_data` volume mounted at `/data/uploads`; URLs remain `/uploads/...`.
  - Docker/infra work must run compose config checks.
  - Restore contract already recognizes root-owned uploads subdirectories as a failure mode.
- `.trellis/spec/frontend/index.md`
  - Read because user requested backend/frontend spec indexes. No frontend implementation is currently expected.
- `docs/docker-deploy.md`
  - Production runbook says `docker-compose.prod.yml` has an `uploads-init` one-shot service and write probes for `posts`, `covers`, and `avatar`.
- `docs/docker-data-sync.md`
  - Documents the same root cause: `docker compose cp` or tar restore can create root-owned `755` upload subdirectories, blocking backend writes.

## Retrieval Report

Keywords searched:

- `StoragePathResolver`, `PostAssetService`, `AvatarStorageService`, `UploadController`
- `无法创建存储目录`, `Files.createDirectories`, `Files.isWritable`
- `/data/uploads`, `uploads-init`, `chown`, `chmod`, `USER sangui`
- `uploadPostCover`, `uploadPostAssets`, `uploadAvatar`

Candidate implementations:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`
  - Central owner of upload root and subdirectory creation.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostAssetService.java`
  - Owns article image folder normalization and nested file copy under `posts/...`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`
  - Owns post cover and article image upload endpoint contracts.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AvatarStorageService.java`
  - Owns avatar storage through `StoragePathResolver`.
- `docker-compose.prod.yml`
  - Already has root `uploads-init` service that creates/chowns/chmods upload directories before backend startup.
- `docker-compose.yml`
  - Local compose lacks `uploads-init`.
- `scripts/docker-data-sync-local-restore.ps1`
  - Existing restore flow runs root `chown -R sangui:sangui /data/uploads` and verifies write probes.
- Historical reference `b9c17ee`
  - Added `StoragePathResolver` `Files.isWritable(...)` fail-fast and storage tests on `feat/docker`, but this commit is not an ancestor of current `main`.

Decision:

- Modify existing storage/Docker paths. Do not create new upload services/controllers.
- Restore or adapt the previous `StoragePathResolver` writable check into current `main`.
- Align local compose with production uploads init.
- Keep production compose init idempotent; if restart-only repair cannot be supported, document the supported init/redeploy command.

Duplicate risk:

- Low if implementation stays in `StoragePathResolver` and existing Compose files.
- High if a new upload resolver/service or separate admin upload endpoint is introduced. Do not do that.

## Code Patterns Found

### StoragePathResolver

Current behavior:

```text
constructor -> initializeDefaultDirectories()
initializeDefaultDirectories -> ensure root/avatar/posts/covers
ensureDirectoryExists -> Files.createDirectories(path)
```

Problem:

- `Files.createDirectories(path)` succeeds if the target directory already exists, even if it is not writable.
- If parent `/data/uploads/covers` is `root:root 755`, `ensureRelativePath("covers/yyyyMMdd/...")` fails later with `IOException` while creating a child directory.
- Current error message names the child directory but not the parent ownership problem or Docker remedy.

Historical behavior in `b9c17ee`:

```java
if (!Files.isWritable(path)) {
    throw new IllegalStateException(
            "存储目录存在但不可写: " + path
            + " (请检查目录权限，Docker 环境下可执行: "
            + "docker compose exec -u root backend sh -c \"chown -R sangui:sangui /data/uploads\")");
}
```

DeepSeek should port this idea carefully, but may improve message wording and directory checks.

### UploadController

Relevant endpoint contracts:

- `POST /api/upload/post-cover`
  - fields: `file`, optional `postSlug`
  - permission: `hasRole('SUPER_ADMIN') or hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')`
  - path: `covers/{slug-or-date}/{uuid}.{ext}`
- `POST /api/upload/post-assets/reserve`
  - field: optional `folder`
  - returns `folder`
- `POST /api/upload/post-assets`
  - fields: optional `folder`, repeated `files`
  - path: `posts/{slug-or-date-uuid}/...`
- `POST /api/upload/avatar`
  - field: `avatar`
  - path: `avatar/{uuid}.{ext}`

Do not change these route or payload contracts.

### Docker

`SanguiBlog-server/Dockerfile`:

- Creates `sangui:sangui`.
- Runs `mkdir -p /data/uploads && chown sangui:sangui /data/uploads`.
- Sets `USER sangui:sangui`.
- This does not affect a named volume mounted at `/data/uploads`.

`docker-compose.prod.yml`:

- Has `uploads-init`:

```text
mkdir -p /data/uploads/posts /data/uploads/covers /data/uploads/avatar /data/uploads/games /data/uploads/site/wechat
&& chown -R 100:101 /data/uploads
&& chmod -R u+rwX,g+rwX /data/uploads
```

- Backend depends on successful init.
- Potential limitation: completed one-shot service may not rerun on `docker compose restart backend` or if an operator action introduces root-owned dirs after initial `up`.

`docker-compose.yml`:

- No local `uploads-init`, so local named volume behavior can diverge from production.

## Files Likely To Modify

Expected:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/StoragePathResolverTest.java`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`

Possible only with clear justification:

- `SanguiBlog-server/Dockerfile`
- `scripts/docker-data-sync-local-restore.ps1`

Not expected:

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostAssetService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AvatarStorageService.java`
- DB schema, DTOs, repositories, permission definitions, BotGuard, JWT filters.

## Risk / Boundary Notes

- Non-root Java cannot chown `root:root 755` directories. Do not claim Java code alone fixes this.
- If Docker runtime repair is required on every container restart, compose one-shot init may be insufficient. Either document the supported `up --force-recreate uploads-init backend` path or justify an entrypoint/init change that still runs the Java process as non-root.
- Do not make the entire backend application run as root.
- Keep `uploads_data` as a named volume and never recommend `docker compose down -v` as a routine fix.
- Keep `/uploads/games/` CSP and `/avatar/` alias semantics unchanged.
- Use `docker compose config --quiet` for CI-like checks to avoid printing expanded `.env` values.
- Current local PowerShell may display Chinese file contents as mojibake; preserve source encoding and avoid accidental re-encoding churn.

## Required Tests

Backend:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=StoragePathResolverTest,UploadControllerStreamHandlingTest,UploadControllerAuthorizationTest" test
mvn -q -DskipTests compile
```

Compose:

```bash
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
```

Docker runtime, if available:

```bash
docker compose up -d --build
docker compose ps
docker compose exec backend sh -c 'id'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test && echo posts-writable'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo covers-writable'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test && echo avatar-writable'
```

Production manual acceptance command shape:

```bash
sudo docker compose -f docker-compose.prod.yml exec backend sh -c 'id'
sudo docker compose -f docker-compose.prod.yml exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo covers-writable'
```

Frontend:

- No frontend tests are required if frontend remains unchanged.
- If frontend upload code changes unexpectedly:

```bash
cd SanguiBlog-front
npm run build
node src/appfull/noNativeBlockingDialogs.test.js
```
