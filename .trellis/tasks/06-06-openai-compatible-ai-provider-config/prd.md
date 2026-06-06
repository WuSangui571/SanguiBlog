# 支持 OpenAI-compatible AI Provider 配置 PRD

## 任务分类

Complex Task.

原因：本任务跨后端依赖和 Spring AI provider 自动配置、Docker Compose 环境变量、AI/RAG 运行边界、README 与 Docker 文档。它不应作为单点配置或文档补丁处理。

## 背景

当前 SanguiBlog 业务层大体使用 Spring AI 的 `ChatModel` / `EmbeddingModel` 抽象，但依赖与配置仍是 DashScope 专用：

- `SanguiBlog-server/pom.xml` 使用 `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`。
- `SanguiBlog-server/src/main/resources/application.yaml` 使用 `spring.ai.dashscope.*`。
- `docker-compose.yml` / `docker-compose.prod.yml` 注入 `SPRING_AI_DASHSCOPE_API_KEY`。
- `.env.example`、`README.md`、`README.zh-CN.md`、`docs/docker-deploy.md`、`docs/docker-data-sync.md` 仍把 AI 配置描述为 DashScope。

目标是迁移到 Spring AI OpenAI provider，使 OpenAI-compatible endpoint、chat model、embedding model 可以通过 `.env` 配置。

## Goals

1. 后端改用 Spring AI OpenAI provider，保留业务层 `ChatModel` / `EmbeddingModel` 抽象注入。
2. `.env.example` 新增并文档化：
   - `AI_OPENAI_API_KEY=`
   - `AI_OPENAI_BASE_URL=`
   - `AI_OPENAI_CHAT_MODEL=`
   - `AI_OPENAI_EMBEDDING_MODEL=`
3. Docker Compose local/prod 注入上述变量到后端容器。
4. `AI_RAG_ENABLED=false` 时不要求 embedding provider 或 PgVector 可用。
5. 不配置 AI key 时后端仍能启动，核心 blog/admin/upload/sitemap/robots 功能不受影响。
6. 配置 OpenAI-compatible chat 后，现有 AI 对话接口和 SSE 语义保持可用。
7. 文档不再把 AI provider 写成 DashScope-only，并说明：
   - chat model 用于 AI 对话。
   - embedding model 用于 RAG。
   - 没有 embedding model 或 endpoint 不支持 embeddings 时保持 `AI_RAG_ENABLED=false`。
   - 更换 embedding model 后需要重新同步或重建向量。

## Non-Goals / 禁止越界

- 不新增第二套 AI chat controller/service/pipeline。
- 不重写 `AiChatService` 的 session、guest access、current-page context、referenced-post context、SSE completion、RAG 组织方式。
- 不修改 AI chat HTTP/SSE payload shape，除非发现 Spring AI OpenAI provider 必须改动且先回到 Codex 端确认。
- 不修改 DB schema、RAG MySQL 表结构、PgVector 表名默认值或 vector ID 规则。
- 不改前端 AI assistant UI、状态管理、stream reader 或 markdown 渲染，除非后端 payload contract 变更被明确批准。
- 不记录或输出真实 API key、完整 prompt、完整知识库内容、JWT、生产 `.env` 内容。
- 不把 `AI_RAG_ENABLED` 默认值改成 `true`。
- 不引入除 Spring AI OpenAI provider 迁移所需以外的新 AI provider abstraction layer。

## Provider Compatibility Decision

本 PRD 选择“明确废弃 DashScope 专用配置”，而不是承诺旧 DashScope key 单独可继续工作。

原因：

- 旧 `AI_DASHSCOPE_API_KEY` 只表达 DashScope 专用 provider，不包含 OpenAI-compatible `base-url`。
- 迁移到 Spring AI OpenAI provider 后，仅 fallback 一个 key 可能会把 DashScope key 发到默认 OpenAI endpoint，形成误配置。
- 更清晰的迁移路径是：统一使用 `AI_OPENAI_API_KEY` + `AI_OPENAI_BASE_URL` + model vars。若运营方要继续使用 DashScope compatible mode，也应显式填写 DashScope OpenAI-compatible base URL 和对应模型名。

执行要求：

- `.env.example` 和 Docker docs 中应把 `AI_DASHSCOPE_API_KEY` 标为 deprecated/removed migration note，或完全移除 active 配置项。
- Compose 不应继续注入 `SPRING_AI_DASHSCOPE_API_KEY` 作为 active runtime contract。
- 若实现者认为必须保留短期 alias，必须做到不会在 `AI_OPENAI_BASE_URL` 为空时把 legacy key 误用于默认 OpenAI endpoint，并在 PRD/check context 中记录决策。

## Cross-Layer Contract

### 1. Scope / Trigger

更改 AI provider 的依赖、配置、容器环境变量和文档，不改变前端调用的 AI chat API。

### 2. Signatures

Backend dependencies:

- Replace `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`.
- Add `org.springframework.ai:spring-ai-starter-model-openai`.
- Keep `org.springframework.ai:spring-ai-pgvector-store`.
- Re-evaluate whether `spring-ai-alibaba-bom` and `spring-ai-alibaba.version` are still needed; remove if unused.

Backend config keys:

- `spring.ai.openai.api-key`
- `spring.ai.openai.base-url`
- `spring.ai.openai.chat.options.model`
- `spring.ai.openai.chat.options.temperature`
- `spring.ai.openai.embedding.options.model`
- Consider `spring.ai.model.chat=openai`.
- Consider `spring.ai.model.embedding=openai` only when RAG/embedding is intentionally enabled and safe. If OpenAI embedding auto-config creates startup risk without a key/model, use Spring AI-supported disable semantics and keep `AI_RAG_ENABLED=false` as the safe no-embedding base case.

Env/config payload:

```env
AI_OPENAI_API_KEY=
AI_OPENAI_BASE_URL=
AI_OPENAI_CHAT_MODEL=
AI_OPENAI_EMBEDDING_MODEL=
AI_RAG_ENABLED=false
```

Docker Compose payload:

- `docker-compose.yml` backend environment must inject `AI_OPENAI_API_KEY`, `AI_OPENAI_BASE_URL`, `AI_OPENAI_CHAT_MODEL`, `AI_OPENAI_EMBEDDING_MODEL`.
- `docker-compose.prod.yml` backend environment must inject the same variables.
- Remove active `SPRING_AI_DASHSCOPE_API_KEY` injection unless a guarded compatibility alias is explicitly implemented.

HTTP/SSE API payloads unchanged:

- `POST /api/ai/chat`
- `POST /api/ai/chat/stream`
- SSE events remain:
  - `chunk`: `{ "text": "..." }`
  - `complete`: `{ "reply", "sessionId", "model", "mode", "references" }`
  - `error`: `{ "message": "..." }`

DB:

- No MySQL schema change.
- No PgVector schema/table change unless a separate migration is approved.
- Existing RAG tables and `ai.rag.pgvector.*` stay intact.

### 3. Validation / Error Matrix

| Case | Expected result | Assertion point |
| --- | --- | --- |
| No `AI_OPENAI_API_KEY`, `AI_RAG_ENABLED=false` | Backend starts; core non-AI endpoints stay available; AI provider is not called during startup | Spring context or Docker startup smoke; `/api/site/meta` works |
| No `AI_OPENAI_API_KEY`, AI assistant enabled and user sends chat | Request fails gracefully through existing AI error path, no secret leakage | `POST /api/ai/chat` returns readable error or admin setting keeps assistant disabled |
| `AI_OPENAI_API_KEY` set, `AI_OPENAI_BASE_URL` set, `AI_OPENAI_CHAT_MODEL` set, `AI_RAG_ENABLED=false` | Chat endpoint uses configured chat model; no embedding requirement | AI response `model` equals configured chat model; no PgVector/embedding call |
| `AI_RAG_ENABLED=false`, no `AI_OPENAI_EMBEDDING_MODEL` | Backend starts; chat can work; RAG skipped | `AiBlogRagService.retrieve` returns empty context or not requiring VectorStore |
| `AI_RAG_ENABLED=true`, embedding model missing or embedding provider unavailable | Startup or RAG initialization fails fast with provider-neutral message, or RAG call returns a controlled error according to existing contract | `AiBlogVectorStoreConfig` message no longer says DashScope |
| `AI_RAG_ENABLED=true`, embedding configured and PgVector configured | RAG vector store initializes and retrieval path works | targeted RAG tests; manual sync/rebuild note |
| Legacy `AI_DASHSCOPE_API_KEY` only | Not an active supported runtime contract unless guarded alias is explicitly implemented; docs tell operator to migrate | grep docs and Compose for active DashScope-only instructions |
| Provider returns 4xx/5xx/network error | JSON chat returns HTTP `502` style readable failure; SSE emits `error` and completes where possible | existing AI service/SSE tests still pass |
| Provider stream never emits terminal event | Server timeout and frontend reader timeout contracts remain intact | existing `aiStream` / AI widget tests still pass if touched |

### 4. Good / Base / Bad Cases

Good:

- Operator sets `AI_OPENAI_API_KEY`, `AI_OPENAI_BASE_URL`, `AI_OPENAI_CHAT_MODEL`, leaves `AI_RAG_ENABLED=false`, starts Docker stack, and AI chat responds using configured model.
- Operator additionally sets `AI_OPENAI_EMBEDDING_MODEL` plus PgVector config, enables `AI_RAG_ENABLED=true`, then re-syncs/rebuilds vectors before relying on RAG.

Base:

- Operator leaves all AI key/model vars blank and keeps `AI_RAG_ENABLED=false`; backend still starts and core blog/admin/upload work.
- Existing frontend AI assistant remains hidden when admin AI setting is disabled, regardless of provider config.

Bad:

- `AI_RAG_ENABLED=true` without embedding model/provider support.
- Docs say “DashScope key required” after provider migration.
- Compose injects only the old DashScope key and silently targets the wrong provider.
- Changing embedding model without rebuilding/syncing existing vectors.
- Logging API keys or prompts during provider errors.

## Implementation Plan

1. Dependency migration:
   - In `SanguiBlog-server/pom.xml`, replace DashScope starter with Spring AI OpenAI starter.
   - Remove Alibaba BOM/version if no remaining dependency uses it.
   - Keep Spring AI BOM version aligned with existing project version unless a separate upgrade is required.

2. Backend config migration:
   - Replace `spring.ai.dashscope.*` in `application.yaml` with `spring.ai.openai.*`.
   - Wire common API key/base URL from `AI_OPENAI_API_KEY` / `AI_OPENAI_BASE_URL`.
   - Wire chat model from `AI_OPENAI_CHAT_MODEL`.
   - Wire embedding model from `AI_OPENAI_EMBEDDING_MODEL`.
   - Preserve `AI_RAG_ENABLED=false` default.
   - Ensure missing AI key does not prevent backend startup.

3. Service/config cleanup:
   - Update `AiChatService.configuredModel` property from `spring.ai.dashscope.chat.options.model` to `spring.ai.openai.chat.options.model`.
   - Replace DashScope-specific log/error text with provider-neutral OpenAI-compatible wording.
   - Update `AiBlogVectorStoreConfig` missing `EmbeddingModel` message to provider-neutral wording.
   - Do not change `ChatModel` / `EmbeddingModel` abstraction injection unless required to satisfy no-key startup. If injection must change, use `ObjectProvider` narrowly and preserve existing public behavior.

4. Docker Compose:
   - Update `docker-compose.yml` and `docker-compose.prod.yml` backend environment variables.
   - Remove active `SPRING_AI_DASHSCOPE_API_KEY` injection unless a guarded compatibility alias is implemented.
   - Keep PgVector env vars and `AI_RAG_ENABLED` behavior unchanged.

5. Docs:
   - Update `.env.example`.
   - Update `README.md` and `README.zh-CN.md`.
   - Update `docs/docker-deploy.md` and `docs/docker-data-sync.md`.
   - Replace DashScope DNS/key checks with OpenAI-compatible endpoint/key presence checks.
   - Document chat-vs-embedding split and vector rebuild requirement after embedding model changes.

6. Tests:
   - Add or update targeted backend tests for configured model property, provider-neutral vector-store error text, and no-key startup behavior where feasible.
   - Run existing AI service/RAG tests.
   - Run Docker Compose config validation.
   - Run frontend AI stream/widget tests only if frontend AI contract is touched; otherwise include no-frontend-change note.

## Required Tests / Commands

Backend:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiChatServiceTest,AiProviderConcurrencyGuardTest,AiGuestAccessServiceTest,AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest,AiReferencedPostContextServiceTest" test
mvn -q "-Dtest=AiBlogKnowledgeOverviewTest,AiBlogKnowledgeSyncServiceTest,AiCustomKnowledgeSyncServiceTest" test
mvn -q -DskipTests compile
```

Add targeted tests if implementation adds them, for example:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiProviderConfigurationTest,AiBlogVectorStoreConfigTest" test
```

Frontend, only if AI frontend/SSE contract is touched:

```powershell
cd SanguiBlog-front
node src/utils/aiStream.test.js
node src/appfull/ui/AiAssistantWidget.test.js
node src/appfull/ui/AiAssistantMobileViewport.test.js
node src/appfull/noNativeBlockingDialogs.test.js
cmd /c npm run lint
cmd /c npm run build
```

Infra/docs:

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
python .\.trellis\scripts\task.py validate .trellis\tasks\06-06-openai-compatible-ai-provider-config
```

Manual smoke, with real OpenAI-compatible credentials only:

```powershell
# In .env:
# AI_OPENAI_API_KEY=<real key>
# AI_OPENAI_BASE_URL=<provider base URL, for example https://api.openai.com>
# AI_OPENAI_CHAT_MODEL=<chat model>
# AI_RAG_ENABLED=false

docker compose up -d --build
docker compose ps
curl.exe -i http://localhost/api/site/meta
# Then test AI chat through the UI or authenticated API path without printing API keys.
```

## Acceptance Criteria

- [ ] `rg "DashScope|dashscope|DASHSCOPE|AI_DASHSCOPE|SPRING_AI_DASHSCOPE" .env.example README.md README.zh-CN.md docs docker-compose.yml docker-compose.prod.yml SanguiBlog-server/src/main/resources SanguiBlog-server/src/main/java` shows no active DashScope-only runtime contract. Any remaining mention must be an explicit migration/deprecation note.
- [ ] `SanguiBlog-server/pom.xml` uses Spring AI OpenAI provider and no longer requires DashScope starter for the AI assistant.
- [ ] `application.yaml` uses `spring.ai.openai.*` and exposes `AI_OPENAI_*` env vars.
- [ ] Compose local/prod inject `AI_OPENAI_API_KEY`, `AI_OPENAI_BASE_URL`, `AI_OPENAI_CHAT_MODEL`, `AI_OPENAI_EMBEDDING_MODEL`.
- [ ] Backend starts with no AI key and `AI_RAG_ENABLED=false`.
- [ ] Configured OpenAI-compatible chat works and response model reflects `AI_OPENAI_CHAT_MODEL`.
- [ ] `AI_RAG_ENABLED=false` does not require embedding model/provider/PgVector readiness beyond existing stack constraints.
- [ ] Docs clearly explain chat model vs embedding model and vector rebuild after embedding model changes.
- [ ] Required targeted tests and Compose config checks pass or skipped tests are explicitly justified.

## External References

- Spring AI OpenAI Chat reference: https://docs.spring.io/spring-ai/reference/api/chat/openai-chat.html
- Spring AI OpenAI Embeddings reference: https://docs.spring.io/spring-ai/reference/api/embeddings/openai-embeddings.html

