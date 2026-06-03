# Production AI RAG Degradation and Resource Isolation PRD

## Task Scope Judgment

- Classification: Complex Task.
- Reason: the production-only AI no-response incident spans backend AI chat orchestration, RAG/PgVector retrieval, DashScope embedding/chat provider behavior, MySQL transaction boundaries, SSE terminal events, frontend stream EOF handling, global concurrency protection, and production Docker/DNS diagnostics.
- Codex role for this round: planning, PRD, Trellis context, spec reading, focused code research, and test plan only.
- Implementation owner for next round: DeepSeek.
- Do not write business implementation code in this planning round.

## Current Project State

Session 22 already recorded the first production AI chat timeout fix:

- Commit `2d21993` changed `AiChatService`, `api.js`, `aiStream.js`, `aiStream.test.js`, and Trellis specs.
- That round bounded the backend emitter and frontend reader timeout so an endlessly silent stream should eventually surface an error.
- Production acceptance was not completed in that round.
- The new incident evidence points deeper than frontend stream waiting: production logs show DashScope embedding DNS/provider failure and Hikari pool exhaustion.

This task is a follow-up, not a duplicate of the archived `06-03-prod-ai-chat-no-response` task.

## Problem Statement

In production Docker (`docker-compose.prod.yml`), the AI assistant can remain on pending text (`...`) and fail to return content. Local compose still works. Evidence reported by the user indicates that the production web image contains the latest frontend timeout code, but backend calls to `/api/ai/chat` can time out, `/api/ai/chat/stream` can produce `499` or empty `500`, backend health can become unhealthy, Hikari can reach `total=10, active=10, idle=0`, and a backend stack includes `DashScopeEmbeddingModel` failing against `dashscope.aliyuncs.com` with `java.nio.channels.UnresolvedAddressException`.

Likely causal chain:

1. User sends an AI chat request.
2. Backend enters RAG retrieval before calling the chat model.
3. RAG vector search calls DashScope embedding through `PgVectorStore.getQueryEmbedding`.
4. Production container DNS/network intermittently fails for `dashscope.aliyuncs.com`.
5. RAG/provider calls are not bounded or isolated enough.
6. Sync chat path currently holds a large transaction around RAG and provider calls.
7. Requests pile up, DB connections/request threads are consumed, health checks stall, backend becomes unhealthy.
8. Frontend sees only pending `...` or a disconnected stream without a clear terminal result.

## Goals

1. Preserve basic AI chat availability when RAG/embedding/PgVector fails.
2. Make RAG retrieval optional and degradable: failure returns empty context and continues normal chat.
3. Prevent external AI/provider/DNS stalls from holding MySQL connections.
4. Bound provider calls with explicit, testable timeouts or confirmed effective client configuration.
5. Ensure SSE always reaches a terminal `complete` or `error` path when the backend owns the connection.
6. Add frontend EOF-without-terminal fallback so proxy/backend disconnects do not look like success.
7. Add a small global AI concurrency guard to prevent external-provider incidents from exhausting Tomcat/Hikari.
8. Provide production DNS/network diagnostic commands that do not expose secrets.

## Non-Goals / Forbidden Scope

- Do not create a second AI controller, service, frontend API wrapper, SSE parser, or RAG pipeline.
- Do not rewrite AI assistant UI or change visual styling beyond necessary error display behavior.
- Do not print or log API keys, JWTs, full prompts, full model responses, full knowledge chunks, imported knowledge text, or full article bodies.
- Do not change DB schema unless implementation evidence proves a schema change is required. Current plan expects no schema change.
- Do not disable all AI chat just because RAG fails.
- Do not disable BotGuard, guest access limits, assistant settings, or auth boundaries.
- Do not tune Hikari pool size as the primary fix for provider stalls.
- Do not rely on production DNS changes as a substitute for code-level degradation, timeout, and resource isolation.
- Do not commit, push, archive, or record-session until manual acceptance is confirmed by the user.

## Cross-Layer Contract

### 1. Scope / Trigger

The change crosses backend service orchestration, external provider calls, persistence transaction boundaries, SSE payloads, frontend stream parsing, production compose/env commands, and tests.

### 2. Signatures

- Backend JSON endpoint: `POST /api/ai/chat`
- Backend SSE endpoint: `POST /api/ai/chat/stream`, `produces = text/event-stream`
- Backend service owner: `AiChatService`
- Backend RAG owner: `AiBlogRagService`
- Frontend stream entry: `streamAiChatReliable(...)` in `SanguiBlog-front/src/api.js`
- Frontend SSE parser: `consumeSseStream(...)` in `SanguiBlog-front/src/utils/aiStream.js`
- Frontend consumer: `AiAssistantWidget.jsx`
- Env/config candidates:
  - existing `AI_RAG_ENABLED`
  - existing `AI_RAG_SYNC_ON_STARTUP`
  - existing `SPRING_AI_DASHSCOPE_API_KEY`
  - existing `AI_DASHSCOPE_CHAT_MODEL`
  - candidate new keys only if implementation requires them:
    - `AI_PROVIDER_MAX_CONCURRENCY`
    - `AI_STREAM_EMITTER_TIMEOUT_MS`
    - `AI_STREAM_READER_TIMEOUT_MS`
    - `AI_RAG_RETRIEVAL_TIMEOUT_MS`
    - `AI_CHAT_SYNC_TIMEOUT_MS`
    - `AI_PROVIDER_BUSY_MESSAGE`

### 3. Payloads

Request body for both chat endpoints:

```json
{
  "message": "string",
  "sessionId": 123,
  "currentPageContext": null,
  "localHistory": []
}
```

JSON success response for `POST /api/ai/chat`:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "sessionId": 123,
    "reply": "string",
    "model": "qwen-flash",
    "mode": "DATABASE_SESSION_HISTORY",
    "references": []
  }
}
```

SSE event contract:

- `chunk`: `{ "text": "partial answer text" }`
- `complete`: `{ "reply", "sessionId", "model", "mode", "references" }`
- `error`: `{ "message": "user-facing error text" }`

RAG degradation contract:

- `AI_RAG_ENABLED=false`: skip `AiBlogRagService.retrieve(...)`, continue normal chat with `mode=DATABASE_SESSION_HISTORY`.
- `AI_RAG_ENABLED=true` and embedding/vector search fails: log a sanitized degradation warning, return `AiBlogRagContext.empty()`, continue normal chat.
- RAG degradation does not emit frontend error by itself.

Provider busy/timeout contract:

- If concurrency guard rejects a request:
  - JSON endpoint returns a clear business error, preferably HTTP `429` or an `ApiResponse.fail(...)` path controlled by `GlobalExceptionHandler`.
  - SSE endpoint emits `error` with `AI 服务繁忙，请稍后再试` and completes.
- If chat provider times out:
  - JSON endpoint returns a sanitized `BAD_GATEWAY`/timeout message.
  - SSE endpoint emits `error` and completes.

### 4. Validation / Error Matrix

| Case | Expected Result | Assertion Point |
|---|---|---|
| `AI_RAG_ENABLED=false` | Chat skips RAG and still replies | `AiBlogRagService.retrieve` not called or returns empty before provider prompt |
| RAG enabled but `VectorStore` missing | Chat continues with empty RAG context | mode `DATABASE_SESSION_HISTORY`, no references |
| RAG enabled and `similaritySearch` throws `UnresolvedAddressException` or any provider exception | Chat continues with empty context | sanitized warn log includes stage/reason/elapsed, no prompt/key/content |
| Sync `POST /api/ai/chat` provider call is slow | No MySQL transaction is held during external call | service test or transaction-template boundary assertion |
| Stream `POST /api/ai/chat/stream` RAG fails before provider stream | SSE still proceeds to provider and terminal `complete` or provider `error` | stream service test |
| Provider stream emits chunks then completes | Frontend receives chunks and terminal success | `complete` event remains terminal success |
| Provider stream errors but sync fallback succeeds | SSE emits normal `complete`; no later error overwrites answer | existing stream fallback behavior preserved |
| Provider stream times out | SSE emits `error` and completes; subscription disposed | backend test with never-ending stream |
| Frontend reader EOF occurs before any terminal event | `consumeSseStream` throws `AI 服务连接已中断，请稍后再试` | `aiStream.test.js` |
| Frontend reader receives chunk then EOF without terminal | throws same interruption error; pending text replaced with error | `aiStream.test.js` and widget catch path |
| Frontend reader receives terminal `error` | throws server message and payload | existing `aiStream.test.js` extended |
| Concurrency guard full | JSON/SSE return/emit user-facing busy message quickly | service tests |
| Production backend DNS cannot resolve DashScope | diagnostic command shows failure, code degrades/returns terminal error instead of exhausting pool | manual production smoke |

### 5. Good / Base / Bad Cases

| Case | Scenario | Expected Result |
|---|---|---|
| Good | RAG enabled, DashScope embedding works, chat provider works | Response includes RAG mode and references when documents match |
| Good | RAG enabled, embedding DNS fails, chat provider works | User receives normal chat reply, mode falls back to `DATABASE_SESSION_HISTORY`, logs show sanitized RAG degradation |
| Good | Stream provider emits chunks and complete | UI replaces `...` with final assistant answer |
| Base | RAG disabled in production using `AI_RAG_ENABLED=false` | Basic chat remains available without knowledge enhancement |
| Base | No relevant vector documents | Basic chat continues with no references |
| Base | Guest user within access limits | Guest visitor flow and session reuse continue |
| Bad | DashScope embedding call hangs or throws | Request does not hold a long MySQL transaction; chat continues or emits clear error |
| Bad | DashScope chat stream hangs | Backend timeout emits SSE `error`, frontend replaces pending text |
| Bad | Backend/proxy closes stream without terminal event | Frontend throws readable interruption error |
| Bad | Multiple concurrent AI requests exceed guard | Excess requests fail fast with busy message; backend health remains responsive |

## Implementation Plan For DeepSeek

### Phase 1: RAG Degradation and Toggle

1. Keep `AiBlogRagService` as the only RAG retrieval owner.
2. Ensure `AI_RAG_ENABLED=false` causes immediate empty context without initializing or querying vector store.
3. Ensure `AI_RAG_ENABLED=true` still catches embedding/vector search failures and returns `AiBlogRagContext.empty()`.
4. Improve RAG failure logging to include safe metadata only: stage, exception class, elapsedMs, and possibly sessionId/user/guest metadata passed from `AiChatService` if added. Do not log question text unless hard-truncated and approved; safest plan is not to log it.
5. Add tests covering vector search exception degradation.

### Phase 2: Transaction Boundary Split

1. Remove external RAG/provider calls from large `@Transactional` method bodies.
2. Current `AiChatService.chat(...)` is `@Transactional` and performs RAG and `chatModel.call(...)` inside the transaction. This must be split.
3. Use either:
   - a new focused `AiChatPersistenceService` with public transactional methods, or
   - `TransactionTemplate` inside `AiChatService`.
4. Required short-transaction units:
   - resolve/create session and save/update user message state;
   - save assistant message and update session;
   - enforce visible session limit after writes.
5. RAG retrieval and external chat/stream calls must run outside MySQL transactions.
6. Avoid private `@Transactional` self-invocation; it will not apply.

### Phase 3: Provider Timeout Boundary

1. Confirm actual Spring AI Alibaba `1.1.2.0` timeout support before relying on config.
2. Local jar inspection found:
   - `DashScopeConnectionProperties.CONFIG_PREFIX = spring.ai.dashscope`
   - it has `readTimeout`
   - `DashScopeChatAutoConfiguration` and `DashScopeEmbeddingAutoConfiguration` pass `RestClient.Builder` / `WebClient.Builder` into `DashScopeApi.builder()`
   - the inspected auto-config path did not visibly apply `readTimeout` to builders
3. Therefore implementation must verify a property such as `spring.ai.dashscope.read-timeout` actually affects calls before treating it as the fix.
4. If config cannot be proven effective, add an application-level controlled boundary:
   - for stream: existing `SseEmitter` timeout disposes the subscription; consider lowering or making configurable;
   - for sync: avoid unbounded `chatModel.call(...)` inside request thread if no HTTP client timeout exists;
   - for RAG retrieval: avoid unbounded `vectorStore.similaritySearch(...)` due to embedding DNS/provider stalls.
5. Do not use naive `CompletableFuture.supplyAsync(...).orTimeout(...)` unless the abandoned provider call is also cancellable and executor resources are bounded.

### Phase 4: SSE Terminal Event Hardening

1. Ensure exceptions before provider subscription become a returned `SseEmitter` with `error` event and `complete`, not a raw empty 500 body where practical.
2. RAG degradation should not send an SSE error; it should continue with empty context.
3. Provider timeout or busy guard should send `error` and then complete.
4. Avoid repeated writes after emitter is disconnected; keep best-effort send logging sanitized and non-noisy.
5. Preserve `complete` as terminal success; no post-complete errors.

### Phase 5: Frontend EOF-Without-Terminal Fallback

1. Extend `consumeSseStream(...)` so `done=true` without prior `complete` or `error` throws `AI 服务连接已中断，请稍后再试`.
2. Cases to test:
   - empty stream EOF without terminal;
   - chunk then EOF without terminal;
   - `error` terminal throws server message;
   - `complete` terminal resolves successfully.
3. Keep `streamCompleted` guard in `AiAssistantWidget.jsx` so post-complete transport noise cannot overwrite an answer.

### Phase 6: AI Concurrency Guard

1. Add a small global guard around AI provider work, not around normal non-AI endpoints.
2. Recommended default for production: 2 or 3 concurrent provider calls.
3. Guard should protect both sync and stream paths, and should release in all completion/error/timeout/cancel paths.
4. Do not hold a permit while doing only fast local validation if the provider path will not be called, but do protect RAG embedding and chat provider as one external AI unit.
5. Busy response:
   - SSE: `error` event `{ "message": "AI 服务繁忙，请稍后再试" }` plus `complete`.
   - JSON: preferably HTTP `429` or equivalent readable failure through project error handling.

### Phase 7: Production DNS / Network Diagnostics

Add or document secret-safe checks in `docs/docker-deploy.md` if implementation changes require runbook updates:

```bash
docker compose -f docker-compose.prod.yml exec web sh -c 'getent hosts dashscope.aliyuncs.com || nslookup dashscope.aliyuncs.com || true'
```

If backend/web image lacks network tools, use a temporary container on the same compose network:

```bash
docker run --rm --network sanguiblog_sanguiblog-net alpine:3.20 sh -c '
  apk add --no-cache bind-tools curl >/dev/null
  nslookup dashscope.aliyuncs.com
  curl -I --connect-timeout 5 https://dashscope.aliyuncs.com
'
```

If DNS is unstable, compose-level DNS tuning can be a production operations follow-up, but it must not replace application degradation, timeout, and concurrency isolation.

## Files Likely To Modify

Expected implementation files, modify only the subset needed:

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
- new backend tests under `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/` or `.../service/ai/rag/` if needed

Potential new backend helper file only if justified:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatPersistenceService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiProviderConcurrencyGuard.java`

Do not create:

- `NewAiChatController`
- `NewAiChatService`
- second frontend API wrapper
- second SSE parser
- second RAG service

## Required Tests And Assertion Points

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

Assertion points:

- RAG exception returns empty context and does not fail chat.
- Sync chat external provider call no longer executes inside a method-level transaction.
- Stream path can return a terminal SSE error for provider timeout/busy cases.
- Frontend EOF-without-terminal throws a readable error.
- Logs are sanitized: no key, prompt, reply, chunk content, JWT, or knowledge document content.
- Concurrency guard releases permit after success, error, timeout, client disconnect, and fallback.

## Production Manual Smoke Plan

Use PowerShell 5.1-safe temp JSON for public endpoint:

```powershell
$Body = @{
  message = "请用一句话回复：AI连通性测试"
  sessionId = $null
  currentPageContext = $null
  localHistory = @()
} | ConvertTo-Json -Depth 6
$Tmp = New-TemporaryFile
[System.IO.File]::WriteAllText($Tmp.FullName, $Body, [System.Text.Encoding]::UTF8)
curl.exe -N -i -X POST "http://<prod-host>:<port>/api/ai/chat/stream" `
  -H "Content-Type: application/json" `
  -H "Accept: text/event-stream" `
  --data-binary "@$($Tmp.FullName)"
Remove-Item $Tmp.FullName
```

Backend/container checks:

```powershell
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 160 backend
docker compose -f docker-compose.prod.yml exec backend sh -c 'test -n "$SPRING_AI_DASHSCOPE_API_KEY" && echo "SPRING_AI_DASHSCOPE_API_KEY is set" || echo "SPRING_AI_DASHSCOPE_API_KEY is empty"'
docker compose -f docker-compose.prod.yml exec web sh -c 'getent hosts dashscope.aliyuncs.com || nslookup dashscope.aliyuncs.com || true'
```

Direct backend stream from same Docker network:

```powershell
docker compose -f docker-compose.prod.yml exec web sh -c 'cat > /tmp/ai-smoke.json <<EOF
{"message":"请用一句话回复：AI连通性测试","sessionId":null,"currentPageContext":null,"localHistory":[]}
EOF
curl -N -i -X POST http://backend:8080/api/ai/chat/stream -H "Content-Type: application/json" -H "Accept: text/event-stream" --data-binary @/tmp/ai-smoke.json'
```

Temporary RAG-off recovery check:

```powershell
# Set AI_RAG_ENABLED=false in production env, then recreate/restart backend through the supported compose path.
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml ps
```

## Acceptance Criteria

- Basic AI chat remains available when RAG embedding/vector search fails.
- Production AI no longer gets stuck indefinitely on `...`; it either replies or shows a clear error.
- External provider/DNS stalls cannot hold MySQL transactions for the duration of the stall.
- Hikari exhaustion is mitigated by transaction split and concurrency guard, not by only increasing pool size.
- SSE terminal contract is stable.
- Frontend EOF-without-terminal is treated as an error.
- Required tests pass, or any skipped command is explicitly justified.
- Production diagnostic commands are secret-safe.
- Trellis task context includes relevant specs, code patterns, and implementation/check context.
