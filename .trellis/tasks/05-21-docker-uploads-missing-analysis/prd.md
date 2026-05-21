# Docker uploads 写权限修复

## Task Classification

Complex Task.

原因：问题跨 Docker named volume、容器 UID/GID、恢复脚本、后端上传目录初始化、Nginx 静态读取和上传接口验证。根因已从“前端 URL 错误”收敛为“恢复/复制后 uploads 子目录 owner 为 root，backend 以非 root 用户运行无法写入”。

## Current Project State

- Branch: `feat/docker`.
- 当前 Trellis task：`.trellis/tasks/05-21-docker-uploads-missing-analysis`，复用并升级为权限修复任务。
- 上一轮 journal 记录已完成 Docker 容器化、Docker AI 缺表排障、工具页空状态修复、Docker 数据同步恢复文档收尾。
- 当前工作区已有未提交变更，Codex 本轮只允许更新 Trellis task / PRD / context，不允许改业务实现文件。

## Observed Evidence

运行中容器权限已由用户确认：

```text
backend uid=100(sangui) gid=101(sangui)
/data/uploads          sangui:sangui
/data/uploads/avatar   root:root 755
/data/uploads/covers   root:root 755
/data/uploads/posts    root:root 755
```

后端创建以下目录时失败：

```text
/data/uploads/posts/20260521/...
/data/uploads/covers/20260521/...
```

错误表现：

```text
无法创建存储目录
```

临时修复命令：

```bash
docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"
```

如果执行后文章正文图、封面图、头像、首页背景、游戏 HTML 上传恢复，根因即为恢复/复制 uploads 数据时 owner 被 root 固化。

## Goal

让 Docker 环境中的 `uploads_data` volume 在恢复数据后仍可被 backend 容器用户 `sangui` 写入，并在权限异常时给出明确诊断，避免用户再次把问题误判为前端 URL 或 Nginx 静态资源问题。

## Requirements

- 修复 Docker restore 流程：`scripts/docker-data-sync-local-restore.ps1` 恢复 uploads 后必须修正 `/data/uploads` ownership，使 backend 用户可写。
- 补强恢复文档：`docs/docker-data-sync.md` 和必要时 `docs/docker-deploy.md` 应说明 uploads 权限根因、临时修复命令、验证命令。
- 后端启动/运行防御：评估并实现 `/data/uploads`、`avatar`、`posts`、`covers` 目录存在但不可写时的明确错误信息；不要静默等到上传时才抛出模糊 IO 错误。
- 保持 Docker storage contract：backend 与 web 继续共享 `uploads_data:/data/uploads`，web 只读访问静态文件，backend 写入上传文件。
- 保持已有 URL 合同：`/uploads/...`、`/avatar/...`、`/uploads/games/...` 不改路径、不改 DTO 字段、不新增 URL helper。
- 验证上传矩阵：文章正文图片、封面图、头像、首页背景、游戏 HTML；并确认旧图片仍可访问。

## Non-Goals / Forbidden Scope

- 不要修改前端 asset URL 逻辑，除非新的证据推翻“权限是根因”。
- 不要修改 `site.asset-base-url`、`ASSET_ORIGIN`、`buildAssetUrl` 的合同。
- 不要修改数据库 schema、DTO 字段或 API response shape。
- 不要新增上传接口、Nginx config 文件、第二套 storage resolver 或第二套 restore 脚本。
- 不要把 backend 容器改回 root 长期运行。
- 不要清空 Docker volumes 或执行 `docker compose down -v` 作为修复方案。
- 不要改 AI、auth、analytics、sitemap、UI 视觉等无关范围。
- Codex 当前规划轮不改业务实现文件；DeepSeek 才执行代码/脚本/文档修改。

## Cross-Layer Contract

### 1. Scope / Trigger

本任务改变 Docker restore 后的 uploads volume 权限修复流程，并可能改变后端 storage 初始化对“目录存在但不可写”的错误检测。它跨 infra、脚本、后端启动、上传接口和静态资源服务。

### 2. Commands

临时手动修复命令：

```bash
docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"
```

建议 restore 脚本内部等价动作：

```bash
docker compose exec -u root backend sh -c 'chown -R sangui:sangui /data/uploads'
docker compose exec backend sh -c 'test -w /data/uploads && test -w /data/uploads/posts && test -w /data/uploads/covers && test -w /data/uploads/avatar'
```

权限诊断命令：

```bash
docker compose exec backend sh -c 'id && ls -ld /data/uploads /data/uploads/avatar /data/uploads/covers /data/uploads/posts'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test'
```

Docker config contract:

```yaml
services:
  backend:
    user: image USER sangui:sangui
    volumes:
      - uploads_data:/data/uploads
  web:
    volumes:
      - uploads_data:/data/uploads
```

### 3. API / Payload Fields

No API shape changes expected.

Existing upload endpoints remain:

- `POST /api/upload/post-assets`
  - multipart fields: `folder?`, `files`
  - response: `ApiResponse<Map<String,Object>>` with `folder`, `count`, `files`, `urls`, `joined`
- `POST /api/upload/post-cover`
  - multipart fields: `file`, `postSlug?`
  - response: `ApiResponse<Map<String,String>>` with `url`, `path`, `filename`
- `POST /api/upload/avatar`
  - multipart field: `avatar`
  - response: `ApiResponse<Map<String,String>>` with `url`, `filename`
- `POST /api/admin/home-backgrounds` or existing admin background upload endpoint
  - multipart field: `file`
  - response remains existing `HomeBackgroundAdminDto`
- `POST /api/admin/games` / update endpoint
  - multipart HTML field remains existing admin game contract

### 4. Env / Directory Payload Fields

- `STORAGE_BASE_PATH=/data/uploads`
- `site.asset-base-url=${SITE_ASSET_BASE_URL:}` remains unchanged.
- backend runtime user: `sangui:sangui` (`uid=100`, `gid=101` in current image).
- required writable directories for backend:
  - `/data/uploads`
  - `/data/uploads/avatar`
  - `/data/uploads/posts`
  - `/data/uploads/covers`
  - `/data/uploads/home/backgrounds` when home background upload is used
  - `/data/uploads/games` when game HTML upload is used

## Validation / Error Matrix

| Case | Evidence | Expected Action |
|------|----------|-----------------|
| `/data/uploads` and children are `sangui:sangui` writable | `id`, `ls -ld`, `test -w` pass | Uploads should work; no ownership fix needed. |
| `/data/uploads` is writable but `posts/covers/avatar` are `root:root 755` | `test -w` fails for child dirs | Restore script must run root `chown -R sangui:sangui /data/uploads`; backend startup should report clear non-writable directory. |
| `docker compose cp` creates restored files/dirs as root | permissions after restore show root owner | Add post-copy ownership repair in restore workflow, then verify write tests. |
| backend runs as root | `id` shows uid 0 | Do not accept as permanent fix; keep non-root image user and fix volume owner. |
| Nginx static reads fail after chown | `curl -I /uploads/...` returns 403/404 unexpectedly | Confirm permissions still allow web read; do not make files backend-only. |
| Upload endpoints return generic 500 | backend logs contain unclear IO message | Improve storage writability diagnostics; preserve API error sanitization. |
| Frontend images fail but upload write tests pass | Network/curl shows URL/static issue | Treat as separate follow-up; do not mix into this permission task unless directly caused by chmod/chown. |

## Good / Base / Bad Cases

- Good: after restore, `backend` user can create files under `posts`、`covers`、`avatar`、`home/backgrounds`、`games`; uploaded assets are returned as `/uploads/...` or `/avatar/...`; `web` serves old and new files.
- Base: restore skips uploads; backend startup creates default upload directories owned by `sangui` and writable.
- Bad: restored child directories are `root:root 755`; backend upload fails with “无法创建存储目录”; workaround works until next restore; frontend URL logic is changed to mask a storage permission fault.

## Acceptance Criteria

- [ ] Restore script fixes ownership of `/data/uploads` after uploading restored data into `uploads_data`.
- [ ] Restore script or docs verify backend user write access to `avatar`、`posts`、`covers` and any created `home/backgrounds`、`games` dirs.
- [ ] Docs include the temporary repair command and a clear explanation that root-owned restored subdirectories cause backend write failure.
- [ ] Backend storage startup/runtime diagnostics clearly identify non-writable upload directories if present.
- [ ] Existing URL contracts remain unchanged: `/uploads/...`、`/avatar/...`、`/uploads/games/...`.
- [ ] Verification matrix covers article body image, cover image, avatar, home background, game HTML, and old static file access.
- [ ] Required tests pass or skipped tests are documented with reason.

## Files Likely To Modify

Expected:

- `scripts/docker-data-sync-local-restore.ps1`: after `docker compose cp "$actualRestoreDir/." web:/data/uploads/`, run root ownership repair from a container that knows the backend user, then verify write access.
- `docs/docker-data-sync.md`: add restore permission repair and troubleshooting section.
- `docs/docker-deploy.md`: add concise upload permission troubleshooting note.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`: add writable directory check and clearer error if an existing directory is not writable.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/StoragePathResolverTest.java`: add/update targeted tests if feasible on the local filesystem.

Possibly, only if research during implementation proves necessary:

- `SanguiBlog-server/Dockerfile`: if user/group UID/GID stability needs explicit documentation or build-time pinning. Avoid changing unless required.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: update Docker Data Sync / Restore contract to require uploads ownership repair after restore.

Not expected:

- `SanguiBlog-front/src/utils/asset.js`
- `SanguiBlog-front/src/AppFull.jsx`
- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
- `docker/nginx/default.conf`
- `docker-compose.yml`
- DB schema / DTO files

## Required Tests / Verification

Static/script checks:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -ServerHost localhost -ServerUser test -RemoteBackupDir /tmp/test -DryRun
docker compose config
```

Backend compile/tests if Java changes:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
mvn -q "-Dtest=StoragePathResolverTest,UploadControllerStreamHandlingTest" test
```

Docker permission verification:

```bash
docker compose up -d --build
docker compose exec backend sh -c 'id && ls -ld /data/uploads /data/uploads/avatar /data/uploads/covers /data/uploads/posts'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test'
```

Manual feature verification:

- Upload article body image.
- Upload post cover image.
- Upload user/admin avatar.
- Upload/select homepage background image.
- Upload game HTML and open `/tools/:id`.
- Confirm old restored image URLs still return non-HTML static content with `curl -I`.

Frontend build is not required unless frontend files are changed. If frontend files remain untouched, document that URL behavior was intentionally left unchanged.

## Planning Notes For DeepSeek

Start from the permission evidence, not from frontend URL hypotheses. The shortest likely implementation is:

1. In the restore script, after copying uploads into the shared volume, run a root command in `backend` to `chown -R sangui:sangui /data/uploads`.
2. Add a backend-user write probe for key upload directories and fail the restore with a clear message if it cannot write.
3. Document the one-off repair command and explain why `docker compose cp`/restore can leave root-owned subdirectories.
4. Add backend storage writability diagnostics so future failures name the exact non-writable path.
5. Keep URL, API, DB, and frontend behavior unchanged unless fresh evidence proves a second root cause.
