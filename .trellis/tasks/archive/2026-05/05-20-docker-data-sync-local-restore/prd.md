# 服务器网站数据同步到本地 Docker 环境并沉淀恢复文档

## Task

- Slug: `docker-data-sync-local-restore`
- Type: Complex Task
- Scope: infra / DB / storage / Docker / docs / AI RAG runtime contract
- Execution mode: 双端协作。Codex 本轮只准备 PRD、计划、context、研究和测试清单；DeepSeek 端负责后续实现；Codex 回来执行 check / finish-work。

## Goal

把服务器 Linux 上的真实 SanguiBlog 网站数据同步到本地 Windows Docker 环境，并沉淀成可重复执行、可校验、可回滚的恢复文档和本地执行入口。

目标不是改业务逻辑，而是把现有 Docker 部署合同补齐为“真实数据导出 -> 本地 Docker 导入 -> 验证 -> 回滚/排障”的可执行流程。

## Non-Goals / 禁止范围

- 不修改业务 API、Controller、Service、Entity、DTO、React 组件或前端业务逻辑，除非实施阶段发现现有 Docker 合同明显缺失且必须修正，并需要在交接前单独确认。
- 不把真实服务器密码、JWT secret、数据库密码、API key、SSH key、DashScope key、真实 dump 文件、真实上传文件写入仓库。
- 不提交 `.env`、数据库 dump、uploads 包、备份产物、临时恢复目录。
- 不使用 `docker compose down -v` 作为默认恢复步骤；清空 volume 必须是显式参数或文档中的危险操作。
- 不把服务器真实主机、用户名、生产路径中的敏感部分硬编码进脚本。文档可以使用占位符或项目已公开的非敏感默认值。

## Requirements

1. 数据资产盘点
   - MySQL：记录库名、用户、字符集/排序规则、表数量、关键表记录数、dump 文件名和大小。
   - PgVector/PostgreSQL：记录库名、schema、`vector` extension、向量表名、embedding 行数、dump 文件名和大小。
   - uploads：记录服务器 uploads 根目录、头像、文章图片、游戏 HTML、其他上传资源的目录结构、文件数量、归档文件名和大小。
   - 环境配置：记录 `.env.example` 与 Docker profile 相关的非敏感 key，包括 `STORAGE_BASE_PATH=/data/uploads`、`SITE_ASSET_BASE_URL=/uploads`、`AI_RAG_*`、数据库连接 key。
   - 敏感信息：列出不能写入文档/仓库的类型，只允许写 key 名和获取方式，不写真实值。

2. 服务器导出方案
   - MySQL 使用 `mysqldump`，建议带 `--single-transaction`、`--routines`、`--triggers`、`--events`、`--default-character-set=utf8mb4`。
   - PgVector 使用 `pg_dump`，优先采用 custom format `-Fc`，并明确恢复前必须确保 `vector` extension 可用。
   - uploads 使用 `tar` 打包，或文档化 `rsync/scp` 替代路径。
   - 生成 manifest 和 checksum，至少包含文件大小、表数量、关键记录数、SHA-256。

3. 本地 Docker 导入方案
   - MySQL dump 导入本地 `mysql_data` 对应容器/volume。
   - PgVector dump 导入本地 `pgvector_data` 对应容器/volume。
   - uploads 解压到 `uploads_data` volume 的 `/data/uploads` 合同路径。
   - 校验 `docker-compose.yml` 中 `uploads_data:/data/uploads` 和 `application-docker.yaml` 中 `storage.base-path=/data/uploads` 一致。
   - 导入前必须处理本地现有 volume 的风险提示和备份/覆盖策略。

4. Windows 本地执行脚本
   - 建议新增 PowerShell 脚本，例如 `scripts/docker-data-sync-local-restore.ps1`。
   - 脚本职责：
     - 创建本地备份目录。
     - 从服务器下载 dump、uploads 包和 manifest/checksum。
     - 停止相关 Docker 服务。
     - 导入 MySQL/PgVector。
     - 恢复 uploads。
     - 重启服务并执行健康检查。
   - 必须考虑 Windows 路径、UTF-8、换行、PowerShell 错误处理、Docker volume 与容器路径差异。
   - 脚本不应读取或打印敏感值；需要 secrets 时从本地 `.env`、交互输入或已配置 SSH profile 获取。

5. 验证清单
   - `docker compose ps`
   - `curl http://localhost/api/site/meta`
   - `curl http://localhost/api/games`
   - 登录后台。
   - 检查文章、图片、头像、工具页、AI/RAG 开关。
   - 检查上传资源返回真实静态文件，不能落到 SPA HTML。
   - 检查 PgVector 表和 `vector` extension 存在；RAG 根据开关正常启用/禁用。

6. 恢复文档
   - 新增或更新 `docs/docker-data-sync.md`。
   - 必须区分：
     - 本地 Windows 验证流程。
     - 服务器 Linux 正式部署/迁移流程。
     - 回滚流程。
     - 敏感信息处理。
     - 常见失败排查。
   - 允许从 `docs/docker-deploy.md` 复用现有 Docker 合同，不重复发散出第二套部署说明。

## API / Command / Payload Contract

本任务不新增业务 HTTP API。跨层合同是 infra command、Docker service、DB schema、storage path 和校验 payload。

### Planned Command Signatures

Server-side export commands documented in `docs/docker-data-sync.md`:

```bash
mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 \
  -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" > "$BACKUP_DIR/mysql.sql"

pg_dump -Fc \
  -h "$PGHOST" -p "$PGPORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f "$BACKUP_DIR/pgvector.dump"

tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "<uploads-parent>" "<uploads-dir-name>"

sha256sum "$BACKUP_DIR"/mysql.sql "$BACKUP_DIR"/pgvector.dump "$BACKUP_DIR"/uploads.tar.gz > "$BACKUP_DIR/SHA256SUMS"
```

Windows local restore script candidate:

```powershell
.\scripts\docker-data-sync-local-restore.ps1 `
  -ServerHost <host> `
  -ServerUser <user> `
  -RemoteBackupDir <remote-backup-dir> `
  -LocalBackupDir .\backups\docker-data-sync `
  [-SshPort 22] `
  [-ComposeProjectDir .] `
  [-RestoreUploadsMode Replace|Merge] `
  [-SkipDownload] `
  [-SkipMysql] `
  [-SkipPgVector] `
  [-SkipUploads] `
  [-DryRun]
```

Implementation may adjust parameter names, but must preserve these capabilities and document the final command exactly.

### Manifest Payload

Recommended generated artifact: `manifest.json`.

```json
{
  "generatedAt": "2026-05-20T00:00:00+08:00",
  "source": {
    "hostLabel": "production",
    "app": "SanguiBlog"
  },
  "mysql": {
    "database": "sanguiblog_db",
    "charset": "utf8mb4",
    "collation": "utf8mb4_general_ci",
    "dumpFile": "mysql.sql",
    "bytes": 0,
    "tableCount": 0,
    "keyCounts": {
      "users": 0,
      "posts": 0,
      "game_pages": 0,
      "ai_chat_sessions": 0,
      "ai_blog_knowledge_documents": 0,
      "ai_custom_knowledge_documents": 0
    }
  },
  "pgvector": {
    "database": "sanguiblog_ai",
    "schema": "public",
    "extension": "vector",
    "table": "vector_store",
    "dumpFile": "pgvector.dump",
    "bytes": 0,
    "rowCount": 0
  },
  "uploads": {
    "sourcePathLabel": "<server-uploads-path>",
    "archiveFile": "uploads.tar.gz",
    "bytes": 0,
    "fileCount": 0,
    "topLevelDirs": ["avatar", "posts", "games"]
  },
  "checksums": {
    "algorithm": "sha256",
    "file": "SHA256SUMS"
  }
}
```

### Docker / Env Contract

- Compose entry: `docker compose up -d --build`, `docker compose down`, `docker compose ps` from repo root.
- MySQL service: `mysql`, volume `mysql_data`, env keys `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`.
- PgVector service: `pgvector`, volume `pgvector_data`, env keys `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `AI_RAG_PGVECTOR_*`.
- Upload storage: `uploads_data` mounted at `/data/uploads` in both `web` and `backend`.
- Backend Docker profile: `SanguiBlog-server/src/main/resources/application-docker.yaml`.
- Static resource routing: `docker/nginx/default.conf` must serve `/uploads/`, `/uploads/games/`, and `/avatar/` from `/data/uploads` without SPA fallback.

## Validation / Error Matrix

| Case | Validation Point | Expected Result |
|------|------------------|-----------------|
| Missing local `.env` or required DB passwords | Script preflight / Docker Compose | Stop before restore, print missing key names only, no secret values |
| Missing `docker`, `docker compose`, `ssh/scp`, `tar`, or checksum tool | Script preflight | Stop with actionable install/config message |
| Remote backup files missing | Download step | Stop before touching local Docker volumes |
| Checksum mismatch | Local verification | Stop before import and keep downloaded files for inspection |
| Existing local Docker volumes contain data | Script preflight | Require explicit overwrite/backup path; default must not destroy data |
| MySQL import fails | Import step | Stop, keep local backup, print container logs command, do not continue to app validation |
| PgVector restore fails because extension is missing | PgVector pre-restore | Create/check `vector` extension first or document manual fix; stop if still missing |
| uploads archive has unsafe paths (`..`, absolute paths) | Extract preflight | Stop before extraction |
| `/uploads/...` returns SPA HTML | HTTP validation | Fail validation; inspect `docker/nginx/default.conf` alias and volume content |
| AI/RAG disabled intentionally | App validation | Core blog/admin/upload checks pass; RAG checks report disabled rather than failure |
| AI/RAG enabled but vector rows missing | App validation | Flag as restore failure or require RAG resync procedure |

## Good / Base / Bad Cases

| Case | Scenario | Expected Result |
|------|----------|-----------------|
| Good | Full server export exists, local Docker is configured, all three assets are restored | `/api/site/meta`, `/api/games`, articles, images, avatars, game HTML, and selected AI/RAG checks pass |
| Base | AI/RAG is disabled or DashScope key is absent | MySQL-backed site, admin, uploads and tools work; AI launcher follows `/api/site/meta.aiAssistant.enabled`; RAG validation is marked skipped/disabled |
| Bad | uploads unpack to wrong path or Nginx falls through to SPA | Static checks detect HTML response or 404; documentation points to `/data/uploads`, `uploads_data`, `/avatar/`, `/uploads/games/` fixes |
| Bad | Docker MySQL volume already has stale schema | Restore plan requires backup/overwrite or targeted migration; do not rely on `docker-entrypoint-initdb.d` rerunning |

## Acceptance Criteria

- [ ] Trellis task exists at `.trellis/tasks/05-20-docker-data-sync-local-restore/`.
- [ ] `prd.md` contains command, payload, validation, Good/Base/Bad, tests, and boundary rules.
- [ ] Implement context and check context include relevant specs and code patterns.
- [ ] Implementation creates/updates executable documentation, expected path `docs/docker-data-sync.md`.
- [ ] Implementation creates a Windows-friendly restore entry point or explicitly documents why manual commands are used instead.
- [ ] Documentation includes local Windows restore, server Linux export/deploy, rollback, sensitive data handling, and troubleshooting.
- [ ] No real secrets, dumps, backups, uploads packages, or `.env` are committed.
- [ ] Docker storage contract remains aligned: `uploads_data` -> `/data/uploads`, backend `storage.base-path`, Nginx `/uploads/`, `/uploads/games/`, `/avatar/`.
- [ ] Verification checklist includes Docker service status, public APIs, admin login, uploaded static assets, and PgVector/RAG checks.

## Retrieval Report

- Keywords searched:
  - `storage.base-path`, `STORAGE_BASE_PATH`, `/data/uploads`, `uploads_data`, `asset-base-url`, `SITE_ASSET_BASE_URL`
  - `pgvector`, `AI_RAG`, `vector_store`, `mysqldump`, `pg_dump`, `docker compose exec`
  - `sanguiblog_db`, `/avatar/`, `/uploads/games/`
- Candidate implementations / references:
  - `docs/docker-deploy.md`: existing Docker deploy guide, persistence volumes, backup snippets, AI table repair notes.
  - `.trellis/spec/guides/cross-layer-thinking-guide.md`: authoritative Docker Compose deployment contract and required Docker verification.
  - `docker-compose.yml`: service names, volumes, env keys, health checks, MySQL/PgVector init mounts.
  - `SanguiBlog-server/src/main/resources/application-docker.yaml`: Docker profile storage, site URL, asset URL, PgVector config.
  - `docker/nginx/default.conf`: static upload aliases, games CSP, avatar compatibility path, SPA fallback boundary.
  - `.env.example`: non-secret env key list and default local Docker values.
  - `scripts/sync_uploads.bat`: old WinSCP uploads-only sync script; useful as a legacy reference but insufficient for DB/PgVector restore.
- Decision:
  - Reuse and extend existing Docker docs/contracts; create a dedicated `docs/docker-data-sync.md` for restore workflow to avoid bloating `docs/docker-deploy.md`.
  - Add a new PowerShell restore script only if implementation keeps it infra-scoped and does not duplicate business logic.
- Duplicate risk:
  - No new business API, service, repository, React UI, or upload path implementation should be introduced.
  - The new doc/script should point back to `docker-compose.yml`, `.env.example`, `application-docker.yaml`, and `docker/nginx/default.conf` as the source of truth.

## Files Likely To Modify

- `docs/docker-data-sync.md`: new repeatable export/restore/verification/rollback/troubleshooting document.
- `scripts/docker-data-sync-local-restore.ps1`: new Windows local restore automation entry, if implemented.
- `docs/docker-deploy.md`: optional small cross-link only, if useful.
- `.gitignore`: optional only if new backup/script output paths need explicit ignore rules.
- `.trellis/spec/guides/cross-layer-thinking-guide.md` or backend database spec: optional only if implementation discovers a durable Docker data restore contract missing from specs.

## Required Tests / Verification Commands

Pure docs/script implementation should run at minimum:

```powershell
git diff --check
docker compose config
```

If PowerShell script is added:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -DryRun
```

If Docker is available and local env is configured:

```powershell
docker compose ps
curl.exe -i http://localhost/api/site/meta
curl.exe -i http://localhost/api/games
curl.exe -i http://localhost/sitemap.xml
curl.exe -i http://localhost/robots.txt
```

If backend/frontend implementation files are unexpectedly touched, also run:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
cd ../SanguiBlog-front
npm run build
```

## Open Questions

- 真实服务器连接方式、远端备份目录和上传根路径不应由 Codex 猜测。实施时使用占位符或从用户提供的本地私有配置读取。
- 本地恢复默认策略建议为“不销毁现有 volume，除非显式确认/参数覆盖”。如用户期望强制覆盖，需要单独确认。
