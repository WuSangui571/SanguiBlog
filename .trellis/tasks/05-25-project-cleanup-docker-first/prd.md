# 整理项目：Docker-first 仓库清理 PRD

## 1. 当前项目状态

最近 16 次 workspace journal 显示，项目已经从 `feat/docker` 线收敛到 `main`，核心状态如下：

- Docker Compose 容器化部署已成为当前主路径，包含 `web`、`backend`、`mysql`、`pgvector`、uploads volume、Docker Nginx、GHCR 镜像发布和 production compose。
- 当前可稳定运行的部署入口是 `docker-compose.yml` 与 `docker-compose.prod.yml`，配套文档是 `README.md`、`README.zh-CN.md`、`docs/docker-deploy.md`、`docs/docker-data-sync.md`。
- V2.3.0 Docker-first README 已完成并经手工部署验证，当前不再以旧宿主机 Nginx / `ChangeEnv.md` / `switch-env.ps1` / `.ai` 作为工作流或部署权威。
- 当前没有 active Trellis task；本任务是新的整理任务。
- `git status --short` 显示 `.trellis/scripts/common/__pycache__/*.pyc` 已有 17 个被跟踪的 pyc 文件处于 modified 状态，属于本轮仓库清理的重点之一。
- `git ls-files .m2` 显示 `.m2/` 下 1326 个 Maven 本地缓存文件被 Git 跟踪，即使 `.gitignore` 已有 `.m2/`，仍需要从版本库移除。

## 2. 任务范围判断

Classification: **Complex Task**

原因：

- 涉及仓库结构、Git 跟踪状态、忽略规则、部署文档、历史原型/旧配置/缓存依赖清理。
- 可能删除大量已跟踪文件，必须通过引用扫描和构建/配置验证确认不会破坏当前 Docker-first 运行路径。
- 属于 infra/repo-hygiene/storage-adjacent 变更，但明确禁止改业务实现代码。

## 3. 目标

把 SanguiBlog 仓库整理为 Docker-first 项目：

- 移除旧的非容器部署文档、宿主机 Nginx 参考、临时原型、过期 AI 工作流、误跟踪缓存依赖和 Python bytecode。
- 整理 `.gitignore`，让不该上传的本地缓存、运行数据、备份、临时文件、AI/IDE 工作目录继续被忽略。
- 保留当前容器化部署所需的源码、配置、Docker Compose、Dockerfile、Docker Nginx、初始化 SQL、GitHub Actions、Trellis spec/task/context、README 和 Docker 数据同步脚本。
- 清理后项目仍能通过当前 Docker-first 关键静态验证和构建验证。

## 4. 非目标 / 禁止修改范围

本任务不允许：

- 修改业务实现代码：`SanguiBlog-server/src/main/java/**`、`SanguiBlog-front/src/**` 下业务逻辑、组件、API wrapper、DTO、service、controller、repository 等。
- 修改数据库 schema 语义：不得改 `sanguiblog_db.sql` 的表结构或数据语义。
- 修改 Docker 运行语义：不得改 compose service、image、volume、port、env contract、Nginx route/CSP/proxy 行为。若必须删除旧引用，只允许改注释或文档文字。
- 修改 API/DTO/payload 字段。
- 修改权限、安全、BotGuard、AI/RAG、上传、analytics 行为。
- 删除当前 Docker-first 运行必需文件。
- 删除 Trellis 的 active task/spec/workflow 文件；只允许写本 task 的 PRD/context 文件。

## 5. 清理候选与处理原则

### 5.1 应删除或从 Git 跟踪移除

| 路径 | 当前发现 | 处理原则 |
|---|---|---|
| `.ai/` | 已过期，spec 明确 `.ai` 不再是 workflow source；含大体积历史记忆 | 删除已跟踪文件，并在 `.gitignore` 中忽略 `.ai/` |
| `ChangeEnv.md` | 旧非容器部署/切环境说明，包含 `application-local.yaml`、远程/本地 DB 切换 | 删除；Docker-first 文档以 `.env` + `application-docker.yaml` 为准 |
| `fake-nginx-config/` | 旧宿主机 `/etc/nginx` 配置参考，docs 当前仍提到它 | 删除；同步清理 docs / comments 中对它的引用 |
| `newIndex/` | 首页原型/临时设计稿，当前真实入口是 `SanguiBlog-front/src/appfull/public/Hero.jsx` 等 | 删除 |
| `SanguiBlog-front/myModel/` | 历史 HTML prototype，非当前 Vite build 入口 | 删除 |
| `.m2/` | 1326 个 Maven local repository artifact 被跟踪 | 从 Git 移除；本地可保留但必须被 ignore |
| `.trellis/scripts/common/__pycache__/` | 17 个 Python bytecode 被跟踪并处于 modified | 从 Git 移除；增加 `__pycache__/`、`*.py[cod]` ignore |
| `scripts/switch-env.ps1` | 旧非容器 env 切换脚本 | 删除，避免与 Docker `.env` contract 冲突 |
| `scripts/sync_db.bat` / `scripts/sync_uploads.bat` | 旧宿主机同步脚本，README 内容乱码且路径指向旧部署 | 删除；当前数据同步保留 `docker-data-sync-local-restore.ps1` |
| `release/` | V2.1/V2.2 历史 release notes，当前 V2.3.0 Docker-first 不生成 release doc | 若无 active 引用，删除；如用户仍需要历史发布档案，应提前停止删除该目录 |

### 5.2 应保留

| 路径 | 理由 |
|---|---|
| `README.md`, `README.zh-CN.md` | Docker-first 顶层入口 |
| `docs/docker-deploy.md`, `docs/docker-data-sync.md` | 当前部署/数据恢复权威文档 |
| `docker-compose.yml`, `docker-compose.prod.yml` | 当前运行入口 |
| `docker/**` | 当前 Docker Nginx 与 PgVector 初始化 |
| `SanguiBlog-server/Dockerfile`, `SanguiBlog-front/Dockerfile` | 当前镜像构建入口 |
| `.github/workflows/docker-images.yml` | GHCR 镜像发布 |
| `.env.example` | 当前 Docker env template |
| `sanguiblog_db.sql` | Docker empty volume 初始化 canonical schema |
| `scripts/docker-data-sync-local-restore.ps1` | 当前 Docker 数据同步/恢复脚本 |
| `scripts/bump-version.ps1` | 可保留的版本维护脚本，除非引用已坏或用户另行要求 |
| `SanguiBlog-front/public/static/ai/assistant-logo.png` | 当前 public asset，只有确认未引用/不需要时才删除 |
| `SanguiBlog-front/src/legacy/**` | 已有 README 标注 legacy，除非引用扫描证明完全无价值，否则本轮不强删业务源码历史组件 |
| `.trellis/**` spec/workflow/tasks | 当前 workflow authority |

## 6. Docker/Infra Contract

本任务不新增 API，也不改 DB 或 frontend DTO；但清理会影响仓库和部署文档，因此按 infra contract 约束：

### Commands

必须保持以下命令可用：

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
cd SanguiBlog-server; mvn -q -DskipTests compile
cd SanguiBlog-front; cmd /c npm run lint
cd SanguiBlog-front; cmd /c npm run build
cd SanguiBlog-front; cmd /c node src/appfull/noNativeBlockingDialogs.test.js
git diff --check
```

建议增加清理专项检查：

```powershell
git ls-files .m2 .ai .trellis/scripts/common/__pycache__ fake-nginx-config newIndex SanguiBlog-front/myModel ChangeEnv.md
git ls-files scripts/switch-env.ps1 scripts/sync_db.bat scripts/sync_uploads.bat
rg -n "fake-nginx-config|ChangeEnv|switch-env|sync_db|sync_uploads|newIndex|myModel|\\.ai|\\.m2|__pycache__" -g "!Trellis/**" -g "!.git/**" -g "!SanguiBlog-front/node_modules/**" -g "!SanguiBlog-server/target/**"
```

### Payload / File Contract

No HTTP payload changes. File-level contract:

- `.gitignore` must ignore local/generated/sensitive content:
  - `.env`, `.env.*` except root `.env.example` style templates.
  - `.m2/`, `__pycache__/`, `*.py[cod]`.
  - `.ai/`, `.claude/`, `.cursor/`, `.kilo/`, `.kilocode/`, `.opencode/` unless a future tool file is intentionally tracked.
  - runtime uploads, backups, restore dumps, logs, temp dirs, build outputs.
- `.dockerignore` should continue excluding docs/scripts/Trellis/local configs from image build context, while not excluding Docker build inputs such as `docker/nginx/**` and app source.
- Current Docker runtime files must remain tracked.

## 7. Validation / Error Matrix

| Case | Expected Result |
|---|---|
| Delete `.ai/` | No active workflow doc requires `.ai`; `.trellis/spec/**` remains the workflow authority |
| Delete `fake-nginx-config/` | No README/docs/docker config points users to old host Nginx reference |
| Delete `ChangeEnv.md` and `scripts/switch-env.ps1` | Docker docs guide users to `.env` / `.env.example`, no old local/remote DB switch instructions remain |
| Remove `.m2/` from Git | `git ls-files .m2` returns empty; Maven compile can still resolve dependencies through normal local/global Maven cache or project `.mvn` settings |
| Remove pycache from Git | `git ls-files .trellis/scripts/common/__pycache__` returns empty; running Trellis scripts may recreate ignored local pyc without dirtying Git |
| Remove prototype dirs | Build still uses `SanguiBlog-front/src/main.jsx -> App.jsx -> AppFull.jsx`, not `newIndex` or `myModel` |
| Remove old sync scripts | `scripts/docker-data-sync-local-restore.ps1` remains and docs point to it |
| `.gitignore` tightened | `git status --short` does not show generated cache/pyc/env/upload/backup artifacts after normal checks |
| Accidentally delete active runtime asset/config | Build/compose/static scan fails; restore file before finishing |

## 8. Good / Base / Bad Cases

Good:

- Repo no longer tracks `.ai/`, `.m2/`, pycache, old host Nginx config, old env switch docs/scripts, prototype dirs, and stale release docs.
- Docker-first docs and runtime files remain intact.
- Compose config, backend compile, frontend lint/build, and static UI guard pass.
- Running Trellis context scripts again does not dirty tracked pyc files.

Base:

- Local `.m2/`, `.env`, `uploads/`, IDE/tool directories may still exist in the working tree but are ignored and not part of future commits.
- AI/RAG remains optional and unchanged.
- Historical information remains recoverable from Git history, not from active files.

Bad:

- A cleanup deletes current Docker/Nginx/compose runtime files or changes their behavior.
- `.gitignore` ignores files that should be committed, such as `.env.example`, `.github/workflows/docker-images.yml`, `docker/**`, `sanguiblog_db.sql`, or current README/docs.
- Docs still point to `fake-nginx-config`, `ChangeEnv.md`, `switch-env.ps1`, `newIndex`, `myModel`, `.ai`, or old host deployment as current guidance.
- Build or compose validation fails after cleanup.

## 9. Expected Files To Modify

Expected modifications:

- `.gitignore`
- `.dockerignore` if needed for consistency
- `README.md` and `README.zh-CN.md` only if stale references are found
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md` only if stale old-script references are found
- `docker/nginx/default.conf` only for comment cleanup, not runtime directive changes
- `scripts/README.md` if scripts directory is kept; otherwise delete with old scripts after updating references

Expected deletions / untracking:

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
- `release/**` if no active reference remains and user does not require historical release docs in-tree

Do not modify:

- `SanguiBlog-server/src/main/java/**`
- `SanguiBlog-server/src/test/java/**` unless cleanup somehow requires test-only path fixes, which is not expected
- `SanguiBlog-front/src/**`
- `sanguiblog_db.sql`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker/nginx/default.conf` directives
- `.github/workflows/docker-images.yml`

## 10. Implementation Plan For DeepSeek

1. Establish baseline:
   - Run `git status --short`.
   - Run targeted `git ls-files` checks for cleanup candidates.
   - Run stale-reference `rg` scan.

2. Update ignore rules:
   - Add missing generated/cache/tool ignores to `.gitignore`.
   - Keep root `.env.example` unignored.
   - Ensure `.m2/`, `__pycache__/`, `*.py[cod]`, `.ai/`, backup artifacts, dumps, archives, and local tool dirs are ignored.
   - Do not ignore required Docker/source/docs files.

3. Remove tracked generated/cache files:
   - Remove `.m2/**` from Git.
   - Remove `.trellis/scripts/common/__pycache__/**` from Git.
   - Verify `git ls-files .m2 .trellis/scripts/common/__pycache__` is empty.

4. Remove obsolete workflow/deployment/prototype material:
   - Delete `.ai/**`, `ChangeEnv.md`, `fake-nginx-config/**`, `newIndex/**`, `SanguiBlog-front/myModel/**`.
   - Delete old host deployment scripts: `scripts/switch-env.ps1`, `scripts/sync_db.bat`, `scripts/sync_uploads.bat`.
   - Decide `scripts/README.md`: update it to only document retained scripts, or delete it if only `docker-data-sync-local-restore.ps1` and `bump-version.ps1` are self-explanatory and documented elsewhere.
   - Delete `release/**` only after confirming no active docs link to it.

5. Clean stale references:
   - Remove references to `fake-nginx-config`, `ChangeEnv.md`, `switch-env.ps1`, old host Nginx deployment, `newIndex`, `myModel`, `.ai`, `.m2`, and pycache from active docs/config comments.
   - If `docker/nginx/default.conf` only references `fake-nginx-config` in a comment, remove/update that comment without changing directives.

6. Validate:
   - Run required commands in section 6.
   - Run targeted `git ls-files` and `rg` cleanup checks.
   - Inspect `git status --short` to ensure only intentional deletions/docs/ignore changes remain.

7. Record results:
   - Update Trellis task notes/context if needed.
   - Do not commit unless user explicitly asks.

## 11. Required Tests And Assertion Points

Required:

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
rg -n "fake-nginx-config|ChangeEnv|switch-env|sync_db|sync_uploads|newIndex|myModel|\\.ai/|\\.ai\\\\|\\.m2|__pycache__" -g "!Trellis/**" -g "!.git/**" -g "!SanguiBlog-front/node_modules/**" -g "!SanguiBlog-server/target/**"
```

Assertion points:

- `git ls-files` for deleted/untracked cleanup targets returns empty.
- `rg` finds no stale active guidance except intentional historical mention in this PRD/Trellis task files.
- `.env.example`, `docker/**`, compose files, Dockerfiles, current docs, source files, package lock, and GitHub workflow remain tracked.
- Compose validation does not require secrets output to be pasted or committed.

## 12. Open Questions / User Confirmation

No blocker before implementation. The only discretionary item is `release/**`:

- Default plan: delete the old in-tree `release/` docs because current V2.3.0 Docker-first workflow explicitly did not create a release document and historical content is recoverable from Git history.
- If the user wants an in-repo historical changelog archive, keep `release/**` and only remove active references to it.

