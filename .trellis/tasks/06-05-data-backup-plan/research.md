# 数据备份方案 Focused Research

## Relevant Specs

- `.trellis/spec/backend/index.md`
  - Backend stack 包含 MySQL 主库和 PgVector/PostgreSQL 向量库。
  - Pre-Development Checklist 要求先读 directory、quality、code-reuse，再读 task-specific specs。
- `.trellis/spec/backend/directory-structure.md`
  - 数据库 schema 源是 `sanguiblog_db.sql`，Hibernate 不负责迁移。
  - uploads 路径规则由 `StoragePathResolver`、upload service 和 Docker mount 统一管理。
- `.trellis/spec/backend/quality-guidelines.md`
  - docs/spec 变更至少需要 static review 和 grep 占位符。
  - 禁止打印 secrets、JWT、password、完整 AI prompts 等敏感内容。
- `.trellis/spec/backend/error-handling.md`
  - uploads 相关错误应早失败、可读，并避免泄露内部细节。
- `.trellis/spec/backend/database-guidelines.md`
  - MySQL 是主业务库，PgVector 只存 embedding。
  - Docker MySQL init 不是现有 volume 的 migration runner。
  - AI/RAG 元数据同时涉及 MySQL 和 PgVector。
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
  - 优先复用现有脚本和文档，避免创建重复路径。
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - 已有 `Docker Data Sync / Restore` 合同，明确 `docs/docker-data-sync.md` 与 `scripts/docker-data-sync-local-restore.ps1` 是当前可执行 workflow。
  - 明确 MySQL/PgVector/uploads 的导出/恢复命令、checksum、manifest、uploads 权限修复、Good/Base/Bad cases 和必跑验证。

## Current Project State

- `git status --short --branch`：
  - `main...origin/main`
  - 工作区干净。
- `python .trellis/scripts/get_context.py`：
  - current task: none。
  - active tasks: none。
  - active journal: `.trellis/workspace/sangui/journal-1.md`。
- `.trellis/workspace/sangui/index.md`：
  - total sessions: 24。
  - last active: 2026-06-05。
  - 最近相关 sessions:
    - Session 4: Docker 数据同步恢复文档收尾。
    - Session 5: Docker uploads 恢复写权限修复。
    - Session 21: Upload storage permission initialization。
    - Session 24: Version 2.3.1 README cleanup。

## Code / Doc Patterns Found

### `docs/docker-data-sync.md`

Current content already covers:

- 数据资产表：
  - MySQL -> `mysql_data`
  - PgVector -> `pgvector_data`
  - uploads -> `uploads_data`
- Linux server export:
  - `mysqldump`
  - `pg_dump -Fc`
  - `tar -czf uploads.tar.gz`
  - `SHA256SUMS`
  - optional `manifest.json`
- Windows local restore:
  - script command examples using `scripts/docker-data-sync-local-restore.ps1`
  - manual scp download
  - checksum verification
  - backup local Docker volumes before restore
  - import MySQL
  - import PgVector
  - restore uploads
  - health checks and rollback
- uploads permission repair:
  - script runs `chown -R sangui:sangui /data/uploads`
  - write probes for `posts`、`covers`、`avatar`

Gap:

- It is currently framed as "server export then local restore", but the script only automates download/restore from an existing `RemoteBackupDir`.
- The user's new requirement asks specifically for backing up production Linux data to local Windows, then syncing local backup data to local Docker. The manual exists, but the local execution script should likely create/download the remote backup itself or clearly support `BackupOnly` mode.

### `scripts/docker-data-sync-local-restore.ps1`

Current behavior:

- Mandatory params:
  - `ServerHost`
  - `ServerUser`
  - `RemoteBackupDir`
- Optional params:
  - `LocalBackupDir`
  - `SshPort`
  - `ComposeProjectDir`
  - `RestoreUploadsMode Replace|Merge`
  - `SkipDownload`
  - `SkipMysql`
  - `SkipPgVector`
  - `SkipUploads`
  - `DryRun`
- Expected remote files:
  - `mysql.sql`
  - `pgvector.dump`
  - `uploads.tar.gz`
  - `SHA256SUMS`
- Steps:
  - local preflight
  - SSH connectivity
  - remote backup dir/file checks
  - scp download
  - checksum verify
  - backup existing Docker volumes
  - stop local services
  - import MySQL
  - import PgVector
  - restore uploads
  - restart and health check

Gap:

- No phase currently creates `RemoteBackupDir`.
- No script mode currently means "only download production backup to Windows and stop".
- `manifest.json` is documented but not currently required by `$ExpectedBackupFiles`.

### `docs/docker-deploy.md`

Relevant contracts:

- Docker services:
  - `web`
  - `backend`
  - `mysql`
  - `pgvector`
- Volumes:
  - `mysql_data`
  - `pgvector_data`
  - `uploads_data`
- `uploads-init` creates/chowns:
  - `/data/uploads/posts`
  - `/data/uploads/covers`
  - `/data/uploads/avatar`
  - `/data/uploads/games`
  - `/data/uploads/site/wechat`
- `docker compose restart backend` does not rerun `uploads-init`.
- Production should not run `docker compose down -v`.
- Deployment verification includes `/api/site/meta`、`/sitemap.xml`、`/robots.txt`、upload write probes.

### Compose Files

`docker-compose.yml` and `docker-compose.prod.yml` both define:

- `uploads-init`
- `web`
- `backend`
- `mysql`
- `pgvector`
- `mysql_data`
- `pgvector_data`
- `uploads_data`

This supports a script that runs production backup from `web`/`mysql`/`pgvector` containers and local restore into the same service names.

## Files Likely To Modify

Implementation phase expected:

- `docs/docker-data-sync.md`
  - Restructure and expand as a two-part handbook.
- `scripts/docker-data-sync-local-restore.ps1`
  - Add backup mode and remote backup generation.
  - Preserve existing restore behavior.
- `scripts/README.md`
  - Update short script description.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Update only if implementation adds stable new command parameters or changes restore contract.

Files not expected to modify:

- `SanguiBlog-server/**`
- `SanguiBlog-front/**`
- `sanguiblog_db.sql`
- `docker-compose.yml`
- `docker-compose.prod.yml`

## Risk / Boundary Notes

- Secret hygiene:
  - Do not print `.env` contents or expanded `docker compose config`.
  - Only print key names for missing values.
  - MySQL/Postgres passwords should expand inside remote shell/container command only.
- PowerShell 5.1:
  - Avoid relying on PowerShell 7-only syntax.
  - Avoid piping PgVector binary dump through PowerShell text streams.
  - Keep path handling explicit with `Join-Path`, `Resolve-Path`, and quoted arguments.
- Remote shell:
  - Production backup commands should be `set -e` style so partial backup fails loudly.
  - Remote `.env` loading must not echo variables.
  - If remote backup partially fails, do not continue into local restore.
- uploads:
  - Archive must not contain absolute paths or `..`.
  - After restore, owner must be `sangui:sangui` for backend writes.
  - Existing `uploads-init` helps startup/redeploy, but script restore still needs explicit chown because `docker compose cp` can create root-owned dirs.
- Docker volumes:
  - Never default to `down -v`.
  - Backup local volumes before overwrite.
- PgVector:
  - `pg_dump -Fc` / `pg_restore` is the right path.
  - `CREATE EXTENSION IF NOT EXISTS vector` must be checked before restore.
- AI/RAG:
  - If DashScope key absent or RAG disabled, core site restore can still pass as base case.
  - If RAG enabled and `vector_store` row count mismatches manifest, mark restore incomplete or requiring resync.

## Required Tests

Minimum implementation verification:

```powershell
git diff --check
docker compose config --quiet
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -Mode RestoreOnly -ServerHost localhost -ServerUser test -RemoteBackupDir /tmp/test -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -Mode BackupOnly -ServerHost localhost -ServerUser test -RemoteProjectDir /tmp/sanguiblog -DryRun
```

Additional when prod compose or spec contract changes:

```powershell
docker compose -f docker-compose.prod.yml config --quiet
python .trellis\scripts\task.py validate .trellis\tasks\06-05-data-backup-plan
```

Manual acceptance checklist:

- `BackupOnly` creates/downloads the five expected files.
- checksum passes locally.
- `RestoreOnly` can restore from already downloaded files.
- `BackupAndRestore` does not touch local Docker until backup + download + checksum pass.
- Local site loads after restore.
- Known article images/avatars/uploads are not SPA fallback HTML.
- Backend upload write probes pass.
- PgVector `vector_store` count matches manifest or RAG is intentionally skipped.

