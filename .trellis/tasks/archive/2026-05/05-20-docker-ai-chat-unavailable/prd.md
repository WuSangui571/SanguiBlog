# 排查 Docker 环境 AI 聊天不可用

## Goal

定位并修复 Docker 部署环境下 AI 聊天不可用的问题，使基础 AI 聊天在容器环境中可验证、可诊断，并在必要时补齐 Docker 部署文档与 Trellis spec。

本任务当前阶段采用双端协作模式：

- Codex 端负责：任务范围判断、PRD、实施计划、Trellis task/context 准备、spec 读取、代码研究、测试计划。
- DeepSeek 端负责：后续业务代码、配置和文档实现。
- Codex 本轮不得修改业务实现文件，只允许维护 Trellis task、PRD 和 context 文件。

## Classification

Complex Task。

原因：问题可能跨 Docker env/Compose 注入、Spring Boot 配置绑定、Spring AI DashScope 上游认证、数据库后台开关、SSE API、前端错误提示、PgVector/RAG 依赖和部署文档，属于跨层与基础设施排障。

## Scope

### In Scope

- 定位 Docker 后端容器中 AI 调用失败的真实异常。
- 核对 `.env` / `.env.example` / `docker-compose.yml` / `application-docker.yaml` 中 AI 相关环境变量映射。
- 验证 `AI_DASHSCOPE_API_KEY` 是否被 Compose 正确注入为 Spring AI 期望的 `SPRING_AI_DASHSCOPE_API_KEY`。
- 核对后台 AI 助手开关来源，包括数据库 `ai_assistant_settings` 与 `/api/site/meta` 的 `aiAssistant.enabled`。
- 直接验证 AI chat API / SSE，区分前端提示、后端业务错误、上游 DashScope 错误和网络出口问题。
- 先以 `AI_RAG_ENABLED=false` 或等价配置验证基础 AI 聊天，再单独排查 PgVector/RAG。
- 如果根因来自 Docker env 命名、DashScope 配置、RAG 开关或部署诊断流程，补充 Docker 部署文档和 Trellis spec。

### Out of Scope

- 不重构 AI 聊天业务架构。
- 不新增模型供应商。
- 不改变非 Docker 环境的默认行为，除非证明当前配置契约本身错误。
- 不修改鉴权体系、用户体系或后台设置页面的非相关功能。
- 不把 RAG 修复与基础 AI 聊天修复强行合并；基础聊天应先可独立验证。
- 不在本轮 Codex 阶段修改业务实现文件。

## Environment / Command / Payload Contracts

### Docker / Env Contract

Expected external env keys:

- `AI_DASHSCOPE_API_KEY`: operator-facing key in `.env` / `.env.example`.
- `AI_RAG_ENABLED`: operator-facing switch for RAG in Docker deployment.
- Existing DB and vector env keys remain unchanged unless directly required by the fix.

Expected container/Spring env keys:

- `SPRING_AI_DASHSCOPE_API_KEY`: value must come from `${AI_DASHSCOPE_API_KEY}`.
- `AI_RAG_ENABLED` or the project-specific Spring property binding used by the RAG implementation must be explicitly understood before changes.

Validation command examples for diagnosis:

- `docker compose config`
- `docker compose exec backend env`
- `docker compose logs backend`
- `docker compose exec mysql mysql ...`
- `curl -i http://localhost/api/site/meta`
- `curl -N http://localhost/api/ai/chat/stream...`

### API Contract

Known endpoints to verify through code research:

- `GET /api/site/meta`
  - Must expose `aiAssistant.enabled` or the existing equivalent field consumed by frontend.
  - Used to distinguish disabled assistant setting from broken AI invocation.
- AI chat SSE endpoint, likely under `/api/ai/chat/stream`.
  - Must stream successful responses when AI assistant is enabled, DashScope key is present, provider is reachable, and RAG is disabled or healthy.
  - Must expose a diagnosable error path without leaking API secrets.

The implementer must confirm exact request method, query/body fields, auth/session requirements, response event names, and error envelope from existing code before changing behavior.

### Database Contract

Known table to inspect:

- `ai_assistant_settings`
  - Must confirm the row/fields that control assistant enablement.
  - Must verify fresh Docker seed/default behavior.

No schema migration should be added unless root cause requires a persistent contract change. If a migration is needed, document the compatibility impact and add DB tests.

### RAG Contract

- Basic AI chat must be tested independently with RAG disabled.
- RAG/PgVector failures must not mask a valid basic chat path if the product has or should have a RAG disable switch.
- If current code cannot disable RAG cleanly in Docker, the implementation must decide whether this is a config binding bug or missing fallback behavior and document the decision.

## Validation / Error Matrix

| Case | Input / Condition | Expected Result | Notes |
|------|-------------------|-----------------|-------|
| Missing key | `AI_DASHSCOPE_API_KEY` empty or not mapped | Backend fails fast or AI call returns controlled error; logs identify missing DashScope API key without printing secret | Decide based on existing startup/config pattern |
| Wrong key | Key mapped but invalid | AI chat API returns controlled upstream auth failure; backend logs DashScope authentication failure without secret | Do not convert to generic frontend-only failure |
| Wrong model | Model name invalid/unsupported | AI chat API returns controlled upstream/model error; logs identify model/config issue | Check existing `application-*.yaml` model config |
| Network blocked | Container cannot reach DashScope endpoint | AI chat API returns controlled upstream connectivity failure; logs include endpoint/connectivity category | Do not expose stack trace to users |
| Assistant disabled | DB setting or site meta disables assistant | `/api/site/meta` reports disabled and frontend should not present chat as available | Do not treat as DashScope failure |
| RAG disabled | `AI_RAG_ENABLED=false` | Basic AI chat works without PgVector/RAG dependency | Primary isolation case |
| RAG enabled but PgVector unhealthy | PgVector/vector store unavailable | Either controlled RAG error/fallback per existing design; basic chat behavior must be explicit | Do not silently hide infra failure in logs |
| Frontend proxy issue | Backend endpoint works directly, frontend fails via Nginx | Nginx/SSE proxy config identified and fixed/documented | Especially `/api/ai/chat/stream` |

## Good / Base / Bad Cases

### Good

- Docker stack is healthy.
- `AI_DASHSCOPE_API_KEY` is set in `.env`.
- `SPRING_AI_DASHSCOPE_API_KEY` is visible inside backend container.
- `/api/site/meta` returns `aiAssistant.enabled=true`.
- With RAG disabled, AI chat SSE returns streamed assistant content.
- With RAG enabled and PgVector healthy, RAG path works or degrades according to existing product contract.

### Base

- Docker stack starts with AI key absent for local non-AI usage.
- Site remains usable.
- AI chat reports a controlled unavailable state and logs a precise diagnostic category.
- Documentation explains required env keys to enable AI chat.

### Bad

- Compose uses `AI_DASHSCOPE_API_KEY` but Spring only reads `SPRING_AI_DASHSCOPE_API_KEY`.
- Backend logs only a generic error, masking DashScope auth/model/network failures.
- AI assistant is disabled in DB while frontend still suggests chat is available.
- RAG/PgVector failure prevents all basic chat even when RAG should be disabled.
- SSE fails only through Docker Nginx because proxy buffering/timeouts/route are wrong.

## Acceptance Criteria

- [ ] Root cause is identified and categorized as env injection, DashScope auth, model config, network egress, assistant setting, SSE proxy, RAG/PgVector, or a combination.
- [ ] Basic Docker AI chat can be verified independently of RAG.
- [ ] `.env.example`, Docker Compose, Spring Docker config, and docs are aligned on AI env key names if config is involved.
- [ ] `/api/site/meta` assistant enablement and AI chat API behavior are verified and documented.
- [ ] No secrets are logged or committed.
- [ ] If implementation changes docs/spec, the new guidance names the exact Docker env keys, relevant endpoints, and diagnostic commands.
- [ ] Targeted backend tests cover changed AI/config/error behavior.
- [ ] Targeted frontend/static tests cover changed frontend availability/error behavior if frontend code changes.
- [ ] Docker-level verification commands are recorded in the final implementation notes.

## Expected Files To Inspect

- `.env.example`
- `docker-compose.yml`
- `docs/docker-deploy.md`
- `README.zh-CN.md`
- `ChangeEnv.md`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `SanguiBlog-server/src/main/resources/application*.yaml`
- `SanguiBlog-server/src/main/java/**/ai/**`
- `SanguiBlog-server/src/main/java/**/site/**`
- `SanguiBlog-server/src/test/java/**/*Ai*Test.java`
- `SanguiBlog-front/src/appfull/**/*Ai*`
- `SanguiBlog-front/src/appfull/**/site*`
- `docker/nginx/default.conf`
- `.trellis/spec/backend/*.md`
- `.trellis/spec/frontend/*.md`
- `.trellis/spec/guides/*.md`

## Expected Files Likely To Modify

DeepSeek must narrow this list after diagnosis:

- `.env.example`: AI key/RAG env defaults and comments.
- `docker-compose.yml`: env mapping into backend container if missing or wrong.
- `SanguiBlog-server/src/main/resources/application-docker.yaml`: Spring AI/RAG property binding if wrong.
- `SanguiBlog-server/src/main/java/...`: only if error handling, config validation, RAG fallback, or SSE behavior is proven defective.
- `SanguiBlog-server/src/test/java/...`: targeted tests for changed backend behavior.
- `SanguiBlog-front/src/appfull/...`: only if frontend misreports disabled/unavailable states or SSE handling is wrong.
- `SanguiBlog-front/src/appfull/**/*.test.js`: targeted static/runtime tests for changed frontend behavior.
- `docs/docker-deploy.md`, `README.zh-CN.md`, `ChangeEnv.md`: deployment and troubleshooting guidance.
- `.trellis/spec/backend/*.md`, `.trellis/spec/frontend/*.md`, `.trellis/spec/guides/*.md`: only if a reusable contract or missing guideline is discovered.

## Required Research Report

Before coding, record:

- Keywords searched.
- Existing candidate implementations, ideally 3 or more.
- Reuse/modify/refactor/new decision.
- Duplicate implementation risk and how it is avoided.

## Required Tests And Assertion Points

Backend:

- `mvn -q -DskipTests compile`
- Existing or new targeted AI tests, likely `mvn -q "-Dtest=AiChatServiceTest,AiAssistantSettingServiceTest,AiAssistantCapabilityServiceTest" test`
- Add or adjust tests only around changed behavior.
- Assertions should cover env/config binding, assistant disabled state, controlled upstream errors, and RAG-disabled basic chat where applicable.

Frontend:

- `node src/appfull/ui/AiAssistantWidget.test.js`
- `node src/appfull/noNativeBlockingDialogs.test.js`
- `npm run build`
- Add or adjust focused tests only if frontend behavior changes.

Docker/manual:

- `docker compose config -q`
- `docker compose --env-file .env.example config -q`
- `docker compose up -d --build`
- `docker compose ps`
- `docker compose logs backend`
- `curl -i http://localhost/api/site/meta`
- Direct AI chat SSE request using the existing endpoint contract.
- Container env inspection proving key mapping, without printing secret value in shared logs.

## Implementation Notes For DeepSeek

- Diagnose first from logs and direct endpoint calls; do not start by refactoring.
- Keep fixes narrowly tied to the proven root cause.
- Preserve existing API field names and frontend contracts unless current contract is demonstrably wrong.
- Do not log full API keys, Authorization headers, cookies, JWTs, prompts containing private data, or full upstream response bodies if they may contain sensitive content.
- Prefer controlled error categories and existing `ApiResponse`/SSE error patterns.
- If RAG is involved, isolate basic chat with RAG disabled before changing vector-store behavior.
