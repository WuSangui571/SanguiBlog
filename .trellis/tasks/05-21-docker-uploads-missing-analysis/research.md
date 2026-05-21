# Focused Code Research: Docker uploads 写权限修复

## Relevant Specs

- `.trellis/spec/backend/directory-structure.md`: upload/storage owner is `UploadController`, `PostAssetService`, `AvatarStorageService`, `StoragePathResolver`; do not scatter path rules.
- `.trellis/spec/backend/quality-guidelines.md`: uploads are high-risk; use retrieve-first, preserve contracts, run targeted Maven verification for backend changes.
- `.trellis/spec/backend/error-handling.md`: upload validation and storage errors should keep stable API/error semantics and avoid leaking internals.
- `.trellis/spec/backend/logging-guidelines.md`: any new storage diagnostics may log safe path/user metadata but must not log secrets or file contents.
- `.trellis/spec/frontend/directory-structure.md`: uploaded assets are rendered through existing asset helpers; no frontend asset helper changes unless URL generation is proven wrong.
- `.trellis/spec/frontend/quality-guidelines.md`: if no frontend files change, frontend build is not mandatory; if asset helper changes, run sibling static tests and build.
- `.trellis/spec/frontend/type-safety.md`: `buildAssetUrl` is the only runtime asset URL owner.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: reuse existing Docker/upload/restore owners; do not create a parallel upload resolver or script.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: Docker Compose/Data Sync contracts define `uploads_data:/data/uploads`, `/uploads` aliases, restore workflow, and required verification.

## Retrieval Report

- Keywords searched:
  - `uploads_data`, `/data/uploads`, `STORAGE_BASE_PATH`, `SITE_ASSET_BASE_URL`
  - `chown`, `chmod`, `USER`, `adduser`, `sangui`, `uid`, `gid`
  - `StoragePathResolver`, `PostAssetService`, `AvatarStorageService`, `UploadController`, `无法创建存储目录`, `Files.createDirectories`
  - `buildAssetUrl`, `ASSET_ORIGIN`, `assetBaseUrl`, `coverImage`, `/uploads`, `/avatar`
- Candidate implementations:
  - `SanguiBlog-server/Dockerfile`: creates non-root user `sangui`, creates `/data/uploads`, then switches to `USER sangui:sangui`.
  - `docker-compose.yml`: mounts the same `uploads_data` volume into both `web` and `backend`; injects `STORAGE_BASE_PATH=/data/uploads`.
  - `scripts/docker-data-sync-local-restore.ps1`: copies restored uploads into `web:/data/uploads/` but currently does not repair ownership after `docker compose cp`.
  - `docs/docker-data-sync.md`: documents restore and static upload verification but does not yet call out root-owned child directories as a write-permission root cause.
  - `docs/docker-deploy.md`: has upload troubleshooting but currently points generally to path permissions.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`: creates default directories but only calls `Files.createDirectories`; existing root-owned directories may pass creation but still be non-writable.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`: cover and article asset upload paths rely on `StoragePathResolver` and `PostAssetService`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostAssetService.java`: creates article image subdirectories under `posts/...`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AvatarStorageService.java`: writes avatar files under `/data/uploads/avatar`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/HomeBackgroundAdminService.java`: writes homepage background files under `/data/uploads/home/backgrounds`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GamePageService.java`: writes game HTML under `/data/uploads/games/<slug>/index.html`.
  - `docker/nginx/default.conf`: serves `/uploads/`, `/avatar/`, `/uploads/games/`; likely unaffected because read permission from `755/644` is enough.
  - `SanguiBlog-front/src/utils/asset.js`: URL builder already has tests and should stay unchanged for this root cause.
- Decision: modify existing restore script/docs and, if implemented, existing `StoragePathResolver` only. Do not create new upload infrastructure.
- Duplicate risk: avoided by keeping upload path ownership in current backend classes and restore ownership repair in the existing restore script.

## Code Patterns Found

- Backend image/user:
  - `SanguiBlog-server/Dockerfile` creates `sangui` user/group, runs `mkdir -p /data/uploads && chown sangui:sangui /data/uploads`, then `USER sangui:sangui`.
  - Because `uploads_data` is a mounted volume, image-layer ownership only covers the initial directory creation. Restored content copied into the volume can override child ownership.
- Shared Docker volume:
  - `docker-compose.yml` mounts `uploads_data:/data/uploads` into both `web` and `backend`.
  - `web` reads static files via Nginx aliases; `backend` writes upload files via Java services.
  - `application-docker.yaml` maps `storage.base-path` to `${STORAGE_BASE_PATH:/data/uploads}`.
- Restore script:
  - `scripts/docker-data-sync-local-restore.ps1` extracts uploads archive, optionally strips top-level `uploads/`, starts `web`, clears `/data/uploads` in Replace mode, then runs `docker compose cp "$actualRestoreDir/." web:/data/uploads/`.
  - Current script verifies only file count with `find /data/uploads -type f | wc -l`.
  - Missing pattern: post-copy owner repair and backend-user write probe.
- Backend storage initialization:
  - `StoragePathResolver` constructor calls `initializeDefaultDirectories()`, which ensures root, avatar, posts, covers directories exist.
  - `ensureDirectoryExists` only calls `Files.createDirectories(path)`. If a directory already exists as `root:root 755`, this may not fail at startup but later child creation under that directory fails.
- Upload write paths:
  - article body images: `UploadController.uploadPostAssets` -> `PostAssetService.ensureFolder` -> `/data/uploads/posts/...`.
  - post covers: `UploadController.uploadPostCover` -> `storagePathResolver.ensureRelativePath("covers/...")`.
  - avatars: `AvatarStorageService.storeAvatar` -> `/data/uploads/avatar/<uuid>`.
  - home background: `HomeBackgroundAdminService.upload` -> `/data/uploads/home/backgrounds`.
  - games: `GamePageService.storeHtmlFile` -> `/data/uploads/games/<slug>/index.html`.
- Frontend/static serving:
  - `docker/nginx/default.conf` maps `/uploads/games/`, `/uploads/`, `/avatar/` to `/data/uploads`.
  - `SanguiBlog-front/src/utils/asset.js` already prevents duplicate `/uploads` prefixes and is covered by `src/utils/asset.test.js`.
  - Since uploads fail at write time and temporary `chown` is expected to fix it, frontend URL changes are out of scope.

## Files Likely To Modify

Expected:

- `scripts/docker-data-sync-local-restore.ps1`
  - Add a post-copy permission repair step after uploads restore.
  - Prefer running from `backend` with `-u root` because that image contains the `sangui` user.
  - Verify write access as the default backend user after repair.
- `docs/docker-data-sync.md`
  - Document restore ownership repair, temporary command, and verification probes.
- `docs/docker-deploy.md`
  - Add concise troubleshooting for root-owned `/data/uploads/*` child directories.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`
  - Add writable check for initialized directories and clearer error messages if not writable.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/StoragePathResolverTest.java`
  - Add/update tests if the writable check can be covered reliably.

Possible:

- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Update Docker Data Sync contract to state restore must repair uploads owner for backend non-root writes.
- `SanguiBlog-server/Dockerfile`
  - Only if DeepSeek decides stable UID/GID pinning is necessary. Current evidence does not require changing it.

Not likely:

- `docker-compose.yml`: mount alignment is already correct.
- `docker/nginx/default.conf`: read aliases are already correct for this root cause.
- `SanguiBlog-server/src/main/resources/application-docker.yaml`: storage root is already `/data/uploads`.
- `SanguiBlog-front/src/utils/asset.js`: URL logic is not the root cause.
- DB schema/DTO/API fields.

## Risk / Boundary Notes

- Running `chown -R` on `/data/uploads` can touch many files. It is appropriate after restore but should be scoped exactly to `/data/uploads`, not broader paths.
- Do not use `docker compose down -v` or volume deletion as the fix.
- Do not run backend as root permanently; that hides the volume ownership problem.
- If script adds `chmod`, avoid removing web read access. `chown` alone may be sufficient for `root:root 755` child directories.
- `docker compose cp` may create files owned by root; the restore workflow needs repair after copy, not before.
- `StoragePathResolver` writability checks can be platform-sensitive in unit tests. If Windows filesystem permissions make a negative test unreliable, prefer testing message helper logic or document manual Docker verification.
- Error messages should identify the non-writable path and suggest `chown -R sangui:sangui /data/uploads`, but should not include secrets or uploaded content.
- If manual post-chown upload still fails, re-open URL/static/API investigation as a separate second root cause.

## Required Tests

Script/docs/static:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -ServerHost localhost -ServerUser test -RemoteBackupDir /tmp/test -DryRun
docker compose config
```

Backend if Java changes:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
mvn -q "-Dtest=StoragePathResolverTest,UploadControllerStreamHandlingTest" test
```

Docker runtime permission verification:

```bash
docker compose up -d --build
docker compose exec backend sh -c 'id && ls -ld /data/uploads /data/uploads/avatar /data/uploads/covers /data/uploads/posts'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test'
```

Manual feature checks:

- Article body image upload writes under `/data/uploads/posts/...`.
- Post cover upload writes under `/data/uploads/covers/...`.
- Avatar upload writes under `/data/uploads/avatar/...`.
- Home background upload writes under `/data/uploads/home/backgrounds/...`.
- Game HTML upload writes under `/data/uploads/games/<slug>/index.html`.
- Old restored static files remain readable through `http://localhost/uploads/...`, `http://localhost/avatar/...`, and `http://localhost/uploads/games/...`.

## Suggested Implementation Shape

1. Keep `docker-compose.yml`, Nginx aliases, API response fields, and frontend asset helper unchanged.
2. Patch restore script after uploads copy:
   - run root `chown -R sangui:sangui /data/uploads` through `backend`;
   - verify key directories are writable as the backend default user;
   - fail restore with a clear message if verification fails.
3. Patch docs with:
   - temporary command;
   - explanation of `backend` non-root user vs root-owned restored volume dirs;
   - `id`, `ls -ld`, and `touch` verification commands.
4. Patch `StoragePathResolver` if desired:
   - after `Files.createDirectories(path)`, check `Files.isDirectory(path)` and `Files.isWritable(path)`;
   - throw `IllegalStateException` naming the path and Docker `chown` hint when not writable.
5. Run targeted tests and document any skipped Docker/manual verification.
