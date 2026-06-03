# Production AI RAG Degradation and Resource Isolation Research

## Relevant Specs Read

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## Retrieval Report

- Keywords searched:
  - `AiBlogRagService`, `retrieve(`, `PgVectorStore`, `DashScope`, `Embedding`, `AI_RAG`, `ai.rag`, `@Transactional`, `SseEmitter`, `streamChat`, `chat(`
  - `streamAiChatReliable`, `consumeSse`, `terminal`, `complete`, `error`, `reader.read`, `AI_STREAM_TIMEOUT`, `timeoutMs`, `EOF`, `done`
  - `spring-ai`, `dashscope`, `alibaba`, `pgvector`, `resilience`, `timeout`, `semaphore`, `bulkhead`
  - `Semaphore`, `RateLimiter`, `Bulkhead`, `Executor`, `CompletableFuture`, `TransactionTemplate`, `REQUIRES_NEW`
- Candidate implementations:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`: owns `/api/ai/chat` and `/api/ai/chat/stream`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`: single chat/session/access/RAG/provider orchestration owner.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`: single blog/custom knowledge vector retrieval owner.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfig.java`: PgVector vector store creation path that injects DashScope `EmbeddingModel`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`: existing `ai.rag.*` config owner.
  - `SanguiBlog-front/src/api.js`: single frontend API facade and stream request owner.
  - `SanguiBlog-front/src/utils/aiStream.js`: single SSE parser/helper.
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`: pending `...` state and error replacement owner.
  - `docker-compose.prod.yml`: production env injection and production-only RAG/provider operational context.
  - `docs/docker-deploy.md`: likely runbook location for DNS/RAG recovery notes.
- Decision:
  - Modify existing AI chat/RAG/frontend stream paths only.
  - New backend helper is acceptable only for transaction/concurrency isolation if it keeps `AiChatService` as orchestrator.
- Duplicate risk:
  - High if a new chat service/controller/API wrapper/SSE parser is created.
  - Avoid by extending `AiChatController -> AiChatService -> AiBlogRagService` and `api.js -> aiStream.js -> AiAssistantWidget.jsx`.

## Code Patterns Found

### Backend Chat Path

- `AiChatController.chat(...)` maps `POST /api/ai/chat` and delegates to `AiChatService.chat(...)`.
- `AiChatController.streamChat(...)` maps `POST /api/ai/chat/stream`, produces `text/event-stream`, delegates to `AiChatService.streamChat(...)`, and currently only catches `AiAccessControlException` to build an SSE `error` emitter.
- `AiChatService.chat(...)` is annotated `@Transactional`.
- Inside that transaction, it:
  - asserts assistant enabled;
  - resolves guest access and session;
  - normalizes message;
  - checks capability direct answer;
  - loads context;
  - calls referenced/current page advice;
  - calls `aiBlogRagService.retrieve(userMessage)`;
  - calls `chatModel.call(new Prompt(promptMessages))`;
  - saves user and assistant messages.
- This means the sync endpoint can hold a MySQL transaction while waiting for RAG embedding and chat provider calls.

### Backend Stream Path

- `AiChatService.streamChat(...)` is not method-level `@Transactional`.
- It performs access/session resolution, context loading, referenced advice, and RAG retrieval before creating the `SseEmitter`.
- It saves the user message before subscribing to `chatModel.stream(...)`.
- It now uses `STREAM_EMITTER_TIMEOUT_MILLIS = 300_000L` and sends `AI 服务响应超时，请稍后再试` on emitter timeout.
- Provider stream error attempts a sync fallback via `callSyncReply(promptMessages)`.
- `completeAssistantReply(...)` saves assistant message and emits `complete`.
- Because RAG retrieval happens before emitter creation, a slow/failing embedding call can still delay or prevent any SSE terminal event.

### RAG Path

- `AiBlogRagService.retrieve(String question)` checks `ragProperties.isConfigured()` and `question`.
- It obtains `VectorStore` from `ObjectProvider<VectorStore>`.
- It builds `SearchRequest` with `query`, `topK`, and `similarityThreshold`.
- It calls `vectorStore.similaritySearch(request)`.
- It catches `Exception`, logs `执行博客 RAG 检索失败`, and returns `AiBlogRagContext.empty()`.
- This is functionally degradable, but logging lacks stage/elapsed metadata and RAG still runs inside `chat()` transaction and before stream emitter creation.

### PgVector / Embedding Config

- `AiBlogVectorStoreConfig.aiBlogVectorStore(...)` is conditional on `ai.rag.enabled=true`.
- It requires an `EmbeddingModel`; if missing, startup fails with `未找到 DashScope EmbeddingModel，无法初始化博客 RAG 向量库`.
- It creates a separate Hikari-backed PgVector `DataSource`, `JdbcTemplate`, and `PgVectorStore`.
- `AiBlogRagProperties.isConfigured()` requires:
  - `enabled=true`
  - pgvector URL
  - pgvector username
  - pgvector password
- `application.yaml` defaults `AI_RAG_ENABLED=false`, but `AI_RAG_SYNC_ON_STARTUP=true`.
- `application-docker.yaml` sets RAG startup sync false and PgVector defaults to the compose service.
- `docker-compose.prod.yml` sets:
  - `AI_RAG_ENABLED: "${AI_RAG_ENABLED:-false}"`
  - `AI_RAG_SYNC_ON_STARTUP: "${AI_RAG_SYNC_ON_STARTUP:-false}"`
  - `SPRING_AI_DASHSCOPE_API_KEY` from `AI_DASHSCOPE_API_KEY`.

### Spring AI Alibaba Timeout Evidence

- Project dependency versions:
  - `spring-ai.version = 1.1.2`
  - `spring-ai-alibaba.version = 1.1.2.0`
- Local jar inspection found:
  - `DashScopeConnectionProperties.CONFIG_PREFIX = spring.ai.dashscope`
  - `DashScopeConnectionProperties` has `Integer readTimeout`
  - `DashScopeChatProperties.CONFIG_PREFIX = spring.ai.dashscope.chat`
  - `DashScopeEmbeddingProperties.CONFIG_PREFIX = spring.ai.dashscope.embedding`
  - `DashScopeChatAutoConfiguration` and `DashScopeEmbeddingAutoConfiguration` create `DashScopeApi` using provided `RestClient.Builder` and `WebClient.Builder`
  - The decompiled auto-config methods did not visibly apply `readTimeout` to the builders.
- Planning conclusion:
  - Do not blindly add timeout config keys as the only fix.
  - Implementation must either prove `spring.ai.dashscope.read-timeout` is applied or add a bounded application-level strategy.

### Frontend Stream Path

- `api.js` imports `consumeSseStream` from `src/utils/aiStream.js`.
- `streamAiChatReliable(...)` calls `consumeSseStream` with `timeoutMs: 300000`.
- `consumeSseStream(...)`:
  - parses `chunk`, `complete`, and `error`;
  - treats `complete` as terminal success;
  - throws terminal `error`;
  - cancels reader on timeout;
  - currently returns successfully when `done=true` occurs without terminal event.
- `AiAssistantWidget.jsx`:
  - inserts pending assistant message from `assistantConfig.pendingReply`;
  - replaces pending content on chunk/complete;
  - catch path replaces pending content with error text;
  - `streamCompleted` prevents post-complete error overwrite.
- Missing frontend case:
  - empty EOF or chunk then EOF without `complete`/`error` should throw instead of returning.

### Existing Tests

- `AiChatServiceTest` currently only asserts `buildCompleteEventPayload(...)` allows null session id and normalizes references.
- `aiStream.test.js` currently covers terminal `error` and pending reader timeout/cancel.
- `AiAssistantWidget.test.js` is mostly static UI assertions and does not cover stream EOF behavior.
- Existing AI service tests should remain part of regression coverage:
  - `AiGuestAccessServiceTest`
  - `AiAssistantCapabilityServiceTest`
  - `AiCurrentPageContextServiceTest`
  - `AiReferencedPostContextServiceTest`

### Existing Transaction Isolation Pattern

- `AiBlogKnowledgeSyncService` and `AiCustomKnowledgeSyncService` already use `TransactionTemplate` with `PROPAGATION_REQUIRES_NEW` for isolated knowledge sync units.
- This is a local pattern DeepSeek can reuse for AI chat persistence if extracting a service is too large.
- Avoid private `@Transactional` self-invocation.

## Files Likely To Modify

Expected implementation files:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `docker-compose.prod.yml`
- `docs/docker-deploy.md`
- `SanguiBlog-front/src/utils/aiStream.js`
- `SanguiBlog-front/src/utils/aiStream.test.js`
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`

Potential new helper files if justified:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatPersistenceService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiProviderConcurrencyGuard.java`

## Risk / Boundary Notes

- `AiChatService` remains the single orchestration owner; do not bypass guest access, assistant setting, history visibility, current page context, referenced-post context, system facts, or RAG mode semantics.
- `AiBlogRagService` already degrades exceptions to empty context, but it is still called in risky positions. The main fix is boundary placement and resource isolation.
- `chat()` currently has the highest DB-connection risk due to `@Transactional` wrapping provider calls.
- `streamChat()` creates the emitter after RAG retrieval, so pre-emitter failures can still surface as empty/late HTTP errors rather than terminal SSE.
- Concurrency guard must release permits across success, stream error, sync fallback success/failure, timeout, and client disconnect.
- Do not log full question text, prompt messages, model reply, API key, JWT, or knowledge chunks.
- Do not treat `AI_RAG_ENABLED=false` as the final fix. It is a production recovery lever plus a Base case.
- Production DNS tuning may be needed, but application resilience is mandatory.
- Raising Hikari pool size would mask the issue and should not be the main solution.

## Required Tests

Backend:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiChatServiceTest,AiGuestAccessServiceTest,AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest,AiReferencedPostContextServiceTest" test
mvn -q "-Dtest=AiBlogKnowledgeSyncServiceTest,AiCustomKnowledgeSyncServiceTest" test
mvn -q -DskipTests compile
```

Frontend:

```powershell
cd SanguiBlog-front
node src/utils/aiStream.test.js
node src/appfull/ui/AiAssistantWidget.test.js
node src/appfull/ui/AiAssistantMobileViewport.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Compose/static:

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
```

Production manual smoke:

- public `/api/ai/chat/stream` SSE request gets either chunk+complete or error terminal path;
- direct backend stream through compose network behaves the same;
- `/api/ai/chat` sync endpoint returns response or readable error within bounded time;
- `AI_RAG_ENABLED=false` can restore basic chat if production RAG/DNS is failing;
- backend logs show no secrets, prompt, reply, or full knowledge content.

