# CI/CD 镜像化发布流程 PRD

## 0. 当前项目状态摘要

本轮已执行 `$start` 上下文读取。当前工作区分支为 `main`，根目录 `.trellis` 只保留了当前任务指针和脚本缓存，完整 Trellis spec 与上一轮 Docker 化任务记录位于 `.kilo/worktrees/record-feat-docker/.trellis/`。当前 `main` 工作区尚未包含 `Dockerfile`、`docker-compose.yml`、`.dockerignore`、`docs/docker-deploy.md` 等 Docker 化文件；这些成果存在于 `.kilo/worktrees/record-feat-docker`，并在其 workspace journal 中记录为 `feat/docker` 分支的 12 个已完成会话。

上一轮 Docker 化已完成的关键内容包括：

- `feat/docker` 上新增了 `SanguiBlog-server/Dockerfile`、`SanguiBlog-front/Dockerfile`、根目录 `docker-compose.yml`、`.dockerignore`、`.env.example`、`docker/nginx/*`、`docker/postgres/init/*`、`docs/docker-deploy.md`、`docs/docker-data-sync.md`。
- Compose 服务包含 `web`、`backend`、`mysql`、`pgvector`，并处理了 uploads volume、健康检查、Nginx SPA/API/SSE/sitemap/robots/uploads 路由、Docker profile、BotGuard forwarded headers、MySQL 冷启动 readiness、uploads restore 权限。
- 上一轮最后的 temp deploy readiness 已完成文档闭环，测试记录包括 `docker compose config --quiet`、后端 Maven compile、前端 lint/build、静态测试和人工部署验证。
- 关键风险：这些 Docker 化成果尚未出现在当前 `main` 工作区。DeepSeek 实施本任务前必须确认 Docker 化改动已经合入当前工作区，或将 `feat/docker`/`.kilo/worktrees/record-feat-docker` 中的 Docker 化文件作为前置导入对象。不要在缺少 Dockerfile/compose 的 `main` 上直接编写 CI 镜像发布 workflow 并假设它能构建成功。

## 1. 任务范围判断

类型：Complex Task。

原因：

- 涉及 CI、镜像仓库、Docker buildx、GHCR 权限、GitHub Secrets、生产 compose、服务器部署命令、回滚策略、健康验证和密钥边界。
- 涉及 infra/cross-layer/storage/security，但不应改动业务 Controller/Service/DTO/DB schema/UI 行为。
- 需要先固定发布策略、镜像命名/tag 规则、CI 验证矩阵、部署 compose 合同、服务器 `.env` 留存方式和回滚命令。

## 2. 目标

把 SanguiBlog 从“服务器本地 build Compose 镜像”推进到“CI 构建并推送镜像，服务器直接拉取 main 对应代码和镜像部署”的流程。

第一阶段目标：

- `main` 作为生产发布分支。
- PR 到 `main` 时运行验证，不推送生产镜像。
- push/merge 到 `main` 后由 GitHub Actions 构建并推送 `sanguiblog-web` 与 `sanguiblog-backend` 镜像到 GHCR。
- 生产服务器使用 `docker-compose.prod.yml` 中的 `image:` 拉取镜像，不在服务器上执行 `build:`。
- 服务器 `.env` 继续留在服务器，不进入仓库。
- 部署命令固定为 `git pull origin main`、`docker compose -f docker-compose.prod.yml pull`、`docker compose -f docker-compose.prod.yml up -d`、`docker compose ps`、`curl` 健康验证。
- 提供可执行回滚流程：切换旧 tag，`docker compose pull && docker compose up -d`，验证核心端点。

非第一阶段目标：

- 不默认启用 CI 通过 SSH 自动登录服务器执行部署。可在文档中预留方案 A，但首版以手动/服务器侧拉取镜像为准，降低 SSH key 泄露、误部署和回滚风险。
- 不引入 Watchtower 作为默认方案。Watchtower 自动拉镜像回滚可控性较弱，仅作为后续可选方案说明。

## 3. 发布策略

### 3.1 分支与触发

采用以下策略：

- `main` 是生产发布分支。
- 开发可以在 `feat/docker` 或其他 feature 分支完成，合并到 `main` 后发布。
- Pull Request 到 `main`：
  - 运行 compose 配置检查、后端 Maven compile/test、前端 lint/build、Docker buildx build。
  - 不 push 生产镜像，避免未合并代码进入生产 registry tag。
- Push 到 `main`：
  - 运行同样验证。
  - 构建并 push `web` 与 `backend` 镜像到 GHCR。
- `workflow_dispatch`：
  - 允许人工重跑构建/发布。
  - 可接受可选 `image_tag` 输入用于手工补发，但默认使用 git sha。
- 可选 Git tag `vX.Y.Z`：
  - 后续如需要版本化发布，可让 tag 触发额外 `vX.Y.Z` 镜像 tag。
  - 本任务不强制更新站点版本号或创建 release 文档，除非用户另行要求。

### 3.2 镜像 tag 规则

默认 registry：GHCR。

镜像名：

- `ghcr.io/<owner>/<repo>/sanguiblog-web`
- `ghcr.io/<owner>/<repo>/sanguiblog-backend`

tag：

- `sha-<short_sha>`：不可变部署与回滚首选 tag。
- `main`：当前 main 最新构建。
- `latest`：仅在 push 到 main 时更新，语义等同当前生产默认最新镜像。
- `vX.Y.Z`：仅当 Git tag `v*` 触发时生成，可选。

生产 compose 默认建议使用可回滚的变量化 tag：

```env
SANGUI_IMAGE_REGISTRY=ghcr.io/<owner>/<repo>
SANGUI_IMAGE_TAG=sha-abcdef0
```

`docker-compose.prod.yml` 中使用：

```yaml
image: ${SANGUI_IMAGE_REGISTRY:-ghcr.io/<owner>/<repo>}/sanguiblog-web:${SANGUI_IMAGE_TAG:-main}
image: ${SANGUI_IMAGE_REGISTRY:-ghcr.io/<owner>/<repo>}/sanguiblog-backend:${SANGUI_IMAGE_TAG:-main}
```

### 3.3 镜像仓库与权限

默认选择 GHCR，原因：

- GitHub Actions 可用 `GITHUB_TOKEN` 登录 `ghcr.io`。
- 与 GitHub 仓库权限、package visibility、审计路径一致。
- 不需要额外 Docker Hub/ACR token 作为第一阶段依赖。

需要配置：

- Repository Actions permissions：允许 `contents: read`、`packages: write`。
- GHCR package visibility：按部署需要设置 private/public。若 private，服务器必须 `docker login ghcr.io`。
- 服务器部署用户只需要 read package 权限的 PAT 或可访问 package 的凭据。

Secrets：

- GitHub Actions 首版 build/push 可以优先使用 `GITHUB_TOKEN`，不新增 registry secret。
- 如果 GHCR package 为 private，服务器 `.env` 不保存 registry password；服务器本机执行一次 `docker login ghcr.io -u <github-user> --password-stdin`，凭据保存在 Docker credential store。
- 如后续开启 SSH 自动部署，才新增 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_PATH` 等 GitHub Secrets。

## 4. Scope

### In Scope

- 新增 GitHub Actions workflow，用于 CI 检查、Docker buildx 构建、main push 镜像 push 到 GHCR。
- 新增或调整 `docker-compose.prod.yml`，生产服务使用 `image:` 拉取 web/backend 镜像，不使用服务器端 `build:`。
- 保留或调整开发/本地 `docker-compose.yml`：可继续使用 `build:`，便于本地调试。
- 文档化服务器部署命令、首次 GHCR 登录、`.env` 留存、健康验证、回滚流程。
- 文档化 tag 规则与手动发布/回滚策略。
- 如果 Docker 化文件尚未合入 `main`，实施时必须先把上一轮 Docker 化成果纳入当前工作区或明确阻塞。

### Out of Scope

- 不修改业务 API、Controller、Service、Repository、Entity、DTO、React UI 业务交互。
- 不修改数据库 schema。
- 不提交真实 `.env`、JWT secret、数据库密码、DashScope key、SSH key、registry token。
- 不默认启用 CI SSH 自动部署。
- 不引入 Watchtower。
- 不更新站点版本号，不新增 release 文档，除非用户明确要求。
- 不在 Codex 本轮写业务代码或实现文件；本轮仅准备 Trellis task、PRD、context、研究与测试计划。

## 5. Cross-Layer / Infra Contract

### 5.1 Commands

CI 必须覆盖：

```bash
docker compose config --quiet
cd SanguiBlog-server && mvn -q -DskipTests compile
cd SanguiBlog-server && mvn -q test
cd SanguiBlog-front && npm ci
cd SanguiBlog-front && npm run lint
cd SanguiBlog-front && npm run build
docker buildx build --file SanguiBlog-server/Dockerfile ...
docker buildx build --file SanguiBlog-front/Dockerfile ...
```

生产服务器部署命令：

```bash
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -i http://localhost/
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
```

生产回滚命令：

```bash
# 编辑服务器 .env 中的 SANGUI_IMAGE_TAG=sha-previous
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -i http://localhost/api/site/meta
```

### 5.2 Env / Config Fields

新增生产镜像字段：

| Key | Required | Location | Notes |
| --- | --- | --- | --- |
| `SANGUI_IMAGE_REGISTRY` | Recommended | server `.env` | 默认 `ghcr.io/<owner>/<repo>`；不要放 token |
| `SANGUI_IMAGE_TAG` | Recommended | server `.env` | 默认 `main`；生产建议固定 `sha-<short_sha>` |

沿用 Docker 部署必填字段：

| Key | Required | Notes |
| --- | --- | --- |
| `JWT_SECRET` | Yes | 服务器 `.env`，不进仓库 |
| `MYSQL_PASSWORD` | Yes | 服务器 `.env` |
| `MYSQL_ROOT_PASSWORD` | Yes | 服务器 `.env` |
| `POSTGRES_PASSWORD` | Yes | 服务器 `.env` |
| `SITE_BASE_URL` | Production recommended | 用于 sitemap/robots canonical |
| `SITE_ALLOWED_HOSTS` | Production recommended | 包含用户访问域名 |
| `SECURITY_CORS_ALLOWED_ORIGINS` | Production recommended | 同源部署通常等于 `SITE_BASE_URL` |
| `SITE_ASSET_BASE_URL` | Optional | 同源 Docker 部署保持空 |

GitHub Secrets 第一阶段：

| Secret | Required | Notes |
| --- | --- | --- |
| none for GHCR push | No | 优先使用 `GITHUB_TOKEN` + `packages: write` |

后续自动部署可选 Secrets：

| Secret | Required for SSH deploy | Notes |
| --- | --- | --- |
| `DEPLOY_HOST` | Yes | 服务器地址 |
| `DEPLOY_USER` | Yes | SSH 用户 |
| `DEPLOY_SSH_KEY` | Yes | 私钥，不能打印 |
| `DEPLOY_PATH` | Yes | 服务器仓库目录 |

### 5.3 Compose Contract

`docker-compose.prod.yml`：

- `web` 和 `backend` 必须使用 `image:`。
- `web` 和 `backend` 不得含 `build:`。
- `mysql` 与 `pgvector` 可继续使用固定 upstream image。
- volumes、networks、healthcheck、depends_on、uploads_data、mysql_data、pgvector_data 保持与 Docker 化 compose 一致。
- `sanguiblog_db.sql` 仍只作为空 MySQL volume 初始化脚本，不作为已有数据迁移工具。
- `.env` 留在服务器。

开发/本地 `docker-compose.yml`：

- 可以保留 `build:`，用于本地 `docker compose up -d --build`。
- 不要让生产文档要求服务器执行 build。

### 5.4 Validation / Error Matrix

| Case | Validation Point | Expected Result | Follow-up |
| --- | --- | --- | --- |
| PR 到 main | GitHub Actions | compile/lint/build/docker build 通过；不 push 镜像 | 修复失败项后再合并 |
| push main | GitHub Actions | 通过检查后 push web/backend 镜像到 GHCR，生成 `main/latest/sha-*` tags | 记录 sha tag 用于服务器部署 |
| GHCR package private 且服务器未登录 | `docker compose pull` | pull 失败，提示 unauthorized | 服务器执行 `docker login ghcr.io` |
| `docker-compose.prod.yml` 仍有 `build:` | code review / compose config | 不符合生产拉镜像部署目标 | 改为 `image:` |
| `SANGUI_IMAGE_TAG` 缺失 | compose interpolation | 使用 `main` fallback | 生产建议改为固定 `sha-*` |
| CI 日志打印 secrets | GitHub Actions logs | 不应出现 secret 值 | 移除 echo/config 输出；只用 `--quiet` |
| `docker compose config` 展开完整 `.env` | CI/docs | CI 使用示例 env 或 `--quiet`，不上传完整输出 | 只检查 exit code |
| `/sitemap.xml` 返回 HTML | post-deploy curl | 错误，Nginx route 或 compose image 版本不对 | 回滚或修复 Nginx config |
| 上传目录不可写 | upload write probe | 错误，uploads volume owner 不对 | `chown -R sangui:sangui /data/uploads` |
| 新镜像启动失败 | `docker compose ps`/logs | web/backend unhealthy | 回滚 `SANGUI_IMAGE_TAG` 到上一 sha |
| 数据丢失 | 普通 `down/up` 后检查 | 不应丢失，volumes 保持 | 确认未执行 `down -v` |

### 5.5 Good / Base / Bad Cases

Good:

- PR 阶段完整检查通过但不发布镜像；合并到 `main` 后 CI 推送 `ghcr.io/<owner>/<repo>/sanguiblog-web:sha-xxxxxxx` 和 `sanguiblog-backend:sha-xxxxxxx`。
- 服务器 `.env` 设置 `SANGUI_IMAGE_TAG=sha-xxxxxxx`，执行 pull/up 后 `/`、`/api/site/meta`、`/sitemap.xml`、`/robots.txt`、uploads 写入均通过。

Base:

- 生产 `.env` 未设置 `SANGUI_IMAGE_TAG` 时默认拉 `main` tag；适合临时环境，但生产回滚可追溯性较弱。
- `AI_RAG_ENABLED=false`、DashScope key 为空时，核心博客、后台、uploads、sitemap/robots 仍可用。

Bad:

- 服务器继续使用 `build:`，导致部署依赖服务器 Maven/npm/buildx 环境。
- CI 在 PR 阶段推送 `latest`，导致未合并代码可能被服务器拉取。
- CI 或文档打印 `.env` 完整展开值。
- 生产使用 `latest` 且没有记录 sha tag，无法快速回滚。
- Watchtower 自动拉取 latest 后破坏生产且无明确回滚 tag。

## 6. Acceptance Criteria

- [ ] `main` 中存在 Docker 化前置文件，或实施记录明确说明已从 `feat/docker`/`.kilo/worktrees/record-feat-docker` 合入所需 Dockerfile/compose/nginx/docs 文件。
- [ ] 新增 GitHub Actions workflow，PR 到 `main` 只检查不 push，push 到 `main` 才 push GHCR 镜像。
- [ ] workflow 权限最小化：`contents: read`、`packages: write`，不引入多余 secret。
- [ ] workflow 使用 Docker buildx 构建 `sanguiblog-web` 与 `sanguiblog-backend`。
- [ ] workflow tags 覆盖 `sha-<short_sha>`、`main`、`latest`，可选支持 `v*`。
- [ ] CI 包含 `docker compose config --quiet`，避免在日志中输出完整 `.env` 展开值。
- [ ] CI 包含后端 `mvn -q -DskipTests compile` 和至少一个合理测试阶段；若全量 `mvn -q test` 不可行，必须在 PRD/实现说明中记录原因和替代 targeted tests。
- [ ] CI 包含前端 `npm ci`、`npm run lint`、`npm run build`。
- [ ] 新增 `docker-compose.prod.yml`，生产 `web/backend` 仅使用 `image:`，不含 `build:`。
- [ ] `docker-compose.prod.yml` 保留 mysql/pgvector/uploads volumes，不破坏数据持久化。
- [ ] 文档列出服务器首次 `docker login ghcr.io`、部署命令、健康验证、回滚命令。
- [ ] 文档明确 `.env` 留在服务器，不进入仓库。
- [ ] 文档明确不要在生产执行 `docker compose down -v`。
- [ ] 文档明确 Watchtower 不作为首版默认方案。
- [ ] 不修改业务 API/DTO/DB schema/frontend UI 行为。

## 7. Focused Code Research

### Relevant Specs

- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/index.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/directory-structure.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/quality-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/database-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/error-handling.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/backend/logging-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/index.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/directory-structure.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/quality-guidelines.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/frontend/type-safety.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/guides/index.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.kilo/worktrees/record-feat-docker/.trellis/spec/guides/cross-layer-thinking-guide.md`

### Code Patterns Found

- Current `main` has no committed Dockerfile/compose files; `git status --short` shows untracked `Trellis/` only.
- Dockerized worktree contains `docker-compose.yml` with `web/backend/mysql/pgvector`, required secret interpolation, uploads volume, MySQL `roles` TCP healthcheck, PgVector healthcheck, and `AI_RAG_ENABLED=false` default.
- Dockerized worktree backend image uses multi-stage Maven + Temurin Java 21 runtime, non-root `sangui` user, `/data/uploads`, healthcheck against `/api/site/meta`.
- Dockerized worktree frontend image uses Node 20 build + Nginx runtime, same-origin `/api`, Docker Nginx config for SPA fallback, SSE, sitemap/robots, uploads.
- Dockerized worktree `.dockerignore` excludes `.env`, `.env.*`, node_modules, target, uploads, docs/scripts/release, and Trellis metadata from build contexts.
- `SanguiBlog-front/package.json` has `npm run lint` and `npm run build`; no separate test script, static tests are plain `node` files.
- `SanguiBlog-server/pom.xml` uses Java 21 and Spring Boot 3.5.11; Maven tests are available under `SanguiBlog-server/src/test/java`.
- `.kilo/worktrees/record-feat-docker/docs/docker-deploy.md` already documents first-run build deployment and temp server validation; this task should extend docs toward image pull deployment rather than duplicating a second unrelated guide.
- Cross-layer spec already has a Docker Compose Deployment contract and required verification for Docker/infra work.

### Files Likely To Modify

Expected after Docker baseline is present in `main`:

- `.github/workflows/docker-images.yml` or `.github/workflows/ci.yml`: create CI/build/push workflow.
- `docker-compose.prod.yml`: create production pull-only compose.
- `docker-compose.yml`: optional small adjustments only if needed to keep dev/local build compose valid.
- `.env.example`: optional add `SANGUI_IMAGE_REGISTRY` and `SANGUI_IMAGE_TAG` as documented non-secret fields.
- `docs/docker-deploy.md`: update deployment guide with GHCR/image pull deployment, tag strategy, rollback.
- `README.md` and `README.zh-CN.md`: add concise pointer to image-based deployment.
- `.dockerignore`: only if build context needs workflow/prod compose exclusion tuning.

If Docker baseline is not yet in current `main`, likely prerequisite files to import from `feat/docker`/`.kilo/worktrees/record-feat-docker`:

- `.dockerignore`
- `.env.example`
- `docker-compose.yml`
- `SanguiBlog-server/Dockerfile`
- `SanguiBlog-front/Dockerfile`
- `docker/nginx/nginx.conf`
- `docker/nginx/default.conf`
- `docker/postgres/init/01-enable-pgvector.sql`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`

### Risk / Boundary Notes

- Do not edit business implementation to satisfy CI unless a real compile/test failure proves Docker baseline is inconsistent; if that happens, stop and ask for scope confirmation.
- Do not add GitHub Secrets or SSH deploy job unless the user explicitly provides/approves deployment automation.
- Avoid `docker compose config` without `--quiet` in CI logs because it may expand `.env` values.
- GHCR private package requires server-side login; CI push success does not imply server can pull.
- `latest`/`main` are moving tags; production rollback should use `sha-*`.
- `docker compose down -v` remains destructive and must not be part of normal production deploy docs.
- If `mvn -q test` is too slow/flaky in CI, implementation must document the tradeoff and choose targeted tests plus compile, but the PRD preference is full backend tests for CI.

### Required Tests

Local/CI static checks:

```bash
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
cd SanguiBlog-server && mvn -q -DskipTests compile
cd SanguiBlog-server && mvn -q test
cd SanguiBlog-front && npm ci
cd SanguiBlog-front && npm run lint
cd SanguiBlog-front && npm run build
```

Docker image build checks:

```bash
docker buildx build --file SanguiBlog-server/Dockerfile --tag sanguiblog-backend:test ./SanguiBlog-server --load
docker buildx build --file SanguiBlog-front/Dockerfile --tag sanguiblog-web:test . --load
```

Post-deploy smoke checks:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -i http://localhost/
curl -i http://localhost/api/site/meta
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test'
```

## 8. Planning Self-Check

- 是否已经明确验收标准：Yes，见 Acceptance Criteria。
- 是否已经明确禁止修改范围：Yes，见 Out of Scope 与 Risk / Boundary Notes。
- 是否已经列出预计修改文件：Yes，见 Files Likely To Modify。
- 是否已经列出必跑测试：Yes，见 Required Tests。
- 是否已经读取具体 guideline，而不是只读 spec index：Yes，已读取 backend/frontend/guides index 及 checklist 指向的 directory、quality、database、error、logging、type-safety、code-reuse、cross-layer 具体 guideline。
- 是否存在需求不清、需要用户确认的问题：No。默认选择 GHCR、main 发布、PR 检查不推送、push main 推送、服务器手动 pull/up，SSH 自动部署留作后续可选。
- 是否有 API / DB / frontend types / DTO 字段未对齐：No planned business API/DB/frontend DTO change。涉及的是 command/env/compose/image tag 合同，已在 PRD 中列出。

## 9. DeepSeek Execution Notes

DeepSeek 执行时必须先读本 PRD 与 task context。第一步确认当前工作区是否已经包含上一轮 Docker 化成果；如果没有，先处理 Docker baseline 合入或向用户确认是否以 `.kilo/worktrees/record-feat-docker` 为来源导入。不要直接在没有 Dockerfile/compose 的 `main` 上编写不可验证的 CI。

优先按“先手动镜像 pull 部署，再自动 CI/CD”的顺序推进：本任务第一阶段实现 GitHub Actions 构建/推送 GHCR 镜像 + `docker-compose.prod.yml` 拉镜像部署 + 文档化部署/回滚。自动 SSH 部署只记录方案，不默认启用。
