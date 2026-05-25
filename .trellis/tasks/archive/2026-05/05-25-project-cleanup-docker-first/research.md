# Focused Code Research

## Relevant Specs

- `.trellis/workflow.md`: session start, spec reading, task context, and Trellis task lifecycle.
- `.trellis/spec/guides/index.md`: `.ai` has been backed up and is no longer active workflow source; future agents should use `.trellis/spec/**`.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: search/reuse before creating or deleting paths; record duplicate/obsolete path decisions.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: Docker Compose deployment and Docker data sync are infra/cross-layer contracts; required verification includes compose config, backend compile, frontend build/static tests.
- `.trellis/spec/backend/index.md`, `.trellis/spec/backend/directory-structure.md`, `.trellis/spec/backend/quality-guidelines.md`: do not create duplicate backend paths; pure docs/spec changes require static review; Docker/security/upload contracts must remain aligned.
- `.trellis/spec/frontend/index.md`, `.trellis/spec/frontend/directory-structure.md`, `.trellis/spec/frontend/quality-guidelines.md`: real frontend entry is `src/main.jsx -> App.jsx -> AppFull.jsx`; old prototypes are not active; build/lint/static Node tests are the verification baseline.

## Code Patterns Found

- Current Docker-first runtime:
  - `docker-compose.yml`
  - `docker-compose.prod.yml`
  - `SanguiBlog-server/Dockerfile`
  - `SanguiBlog-front/Dockerfile`
  - `docker/nginx/default.conf`
  - `docker/nginx/nginx.conf`
  - `docker/postgres/init/01-enable-pgvector.sql`
  - `.github/workflows/docker-images.yml`
  - `.env.example`
  - `sanguiblog_db.sql`
- Current docs:
  - `README.md`
  - `README.zh-CN.md`
  - `docs/docker-deploy.md`
  - `docs/docker-data-sync.md`
- Current data sync script:
  - `scripts/docker-data-sync-local-restore.ps1`
- Old/non-Docker deployment surfaces:
  - `ChangeEnv.md`: old `application-local.yaml` / remote DB / prod port switching guide.
  - `scripts/switch-env.ps1`: old environment switching script.
  - `scripts/sync_db.bat`, `scripts/sync_uploads.bat`: old host/server sync scripts.
  - `fake-nginx-config/**`: old host `/etc/nginx` reference; `docker/nginx/default.conf` has a comment pointing to it.
  - `docs/docker-deploy.md` still contains an old-deploy comparison and a note pointing to `fake-nginx-config`.
- Old/prototype frontend surfaces:
  - `newIndex/**`: static/React homepage prototype.
  - `SanguiBlog-front/myModel/indexV13.html`: prototype HTML.
  - `SanguiBlog-front/src/legacy/**`: marked legacy by README, but still inside frontend source tree; do not delete in this task unless active imports are proven absent and user approves broader source cleanup.
- Mis-tracked generated/cache files:
  - `.m2/**`: 1326 tracked Maven local repository files even though `.gitignore` includes `.m2/`.
  - `.trellis/scripts/common/__pycache__/**`: 17 tracked pyc files, currently modified after Trellis scripts run.

## Files Likely To Modify

- `.gitignore`: add or tighten ignores for `.ai/`, Python bytecode, backup/dump/archive artifacts, local tool/cache dirs; keep `.env.example` and current Docker/runtime files trackable.
- `.dockerignore`: optional consistency cleanup; must not exclude Docker build inputs.
- `docs/docker-deploy.md`: remove old host Nginx / `fake-nginx-config` / `switch-env.ps1` guidance and keep Docker-first wording.
- `docs/docker-data-sync.md`: only if old sync script references are found.
- `docker/nginx/default.conf`: comment-only cleanup for old `fake-nginx-config` reference; no directive changes.
- `scripts/README.md`: either update to current retained scripts or delete if the old script docs are no longer useful.

## Files / Dirs Likely To Delete Or Untrack

- `.ai/**`
- `.m2/**`
- `.trellis/scripts/common/__pycache__/**`
- `ChangeEnv.md`
- `fake-nginx-config/**`
- `newIndex/**`
- `SanguiBlog-front/myModel/**`
- `scripts/switch-env.ps1`
- `scripts/sync_db.bat`
- `scripts/sync_uploads.bat`
- `release/**` if no active docs link to it and user does not require in-repo historical release notes.

## Risk / Boundary Notes

- Do not change backend or frontend business implementation files.
- Do not alter Docker Compose service behavior, Nginx route/proxy/CSP directives, Dockerfiles, DB schema, API fields, DTOs, permissions, BotGuard, AI/RAG, uploads, analytics, sitemap/robots logic.
- `.m2/` and pycache are tracked despite ignore rules; normal deletion must remove them from Git index, otherwise they will remain in commits.
- Deleting `.ai/` is aligned with `.trellis/spec/guides/index.md`; any still-useful knowledge should already live in `.trellis/spec/**` or journal/task archives.
- `release/**` is the only discretionary cleanup item. Default cleanup is delete from active tree because history is recoverable from Git, but keep it if user wants an in-repo changelog archive.
- `SanguiBlog-front/public/static/ai/assistant-logo.png` is a current public asset candidate and should not be deleted unless an active reference scan proves it is unused and user accepts the visual asset removal.
- `SanguiBlog-front/src/legacy/**` is source-tree legacy, not obviously temporary root clutter; avoid deleting it in this task unless a separate scoped cleanup is requested.

## Required Tests

Required validation:

```powershell
git diff --check
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
cd SanguiBlog-server; mvn -q -DskipTests compile
cd SanguiBlog-front; cmd /c npm run lint
cd SanguiBlog-front; cmd /c npm run build
cd SanguiBlog-front; cmd /c node src/appfull/noNativeBlockingDialogs.test.js
```

Cleanup assertions:

```powershell
git ls-files .m2
git ls-files .ai
git ls-files .trellis/scripts/common/__pycache__
git ls-files fake-nginx-config newIndex SanguiBlog-front/myModel ChangeEnv.md
git ls-files scripts/switch-env.ps1 scripts/sync_db.bat scripts/sync_uploads.bat
rg -n -uu "fake-nginx-config|ChangeEnv|switch-env|sync_db|sync_uploads|newIndex|myModel|\\.ai/|\\.ai\\\\|\\.m2|__pycache__" -g "!Trellis/**" -g "!.git/**" -g "!SanguiBlog-front/node_modules/**" -g "!SanguiBlog-server/target/**"
```

