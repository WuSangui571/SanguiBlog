# AI Reply Latency and Production Pending Animation Research

## Relevant Specs Read

Backend:

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`

Frontend:

- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`

Guides:

- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

Key spec constraints:

- Do not bypass `AiChatService`.
- AI provider/RAG work must not be held inside broad MySQL transactions.
- AI/SSE streams must end with `chunk`, `complete`, or `error`, and no stream may leave UI pending forever.
- Frontend AI assistant changes must reuse `AiAssistantWidget.jsx`, `src/api.js`, `src/utils/aiStream.js`, and sibling helpers/tests.
- Docker Nginx `/api/ai/chat/stream` must keep buffering disabled.

## Retrieval Report

Keywords searched:

- Backend: `AiChatService`, `streamChat`, `SseEmitter`, `ChatModel`, `retrieve`, `AiBlogRagService`, `similaritySearch`, `AiProviderConcurrencyGuard`, `timeout`
- Frontend: `streamAiChatReliable`, `consumeSseStream`, `pendingReply`, `buildAiPendingReplyText`, `AI_PENDING_REPLY_INTERVAL_MS`, `...`, `chunk`, `complete`, `error`
- Infra: `/api/ai/chat/stream`, `proxy_buffering`, `X-Accel-Buffering`, `text/event-stream`, `nginx`
- Trellis/history: `openai`, `AI chat`, `pending`, `stream`, `latency`

Candidate implementations:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`
  - Owns `POST /api/ai/chat` and `POST /api/ai/chat/stream`; keep controller thin.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
  - Main AI orchestration path: access, session, current-page context, referenced-post advice, RAG, persistence, ChatModel, SSE events, fallback, timeout.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`
  - Chat-time RAG retrieval path; calls `VectorStore.similaritySearch(...)` and logs elapsed time.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatPersistenceService.java`
  - Short transaction helper for session/message writes; should remain the persistence owner.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiProviderConcurrencyGuard.java`
  - Existing provider capacity guard; do not replace with a second limiter.
- `SanguiBlog-front/src/api.js`
  - Existing frontend API/SSE entry; `streamAiChatReliable` consumes `/api/ai/chat/stream`.
- `SanguiBlog-front/src/utils/aiStream.js`
  - Existing SSE parser/timeout behavior; do not create another stream parser.
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - Existing pending message owner and stream consumer.
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
  - Existing pending text animation helper.
- `docker/nginx/default.conf`
  - Existing Docker SSE proxy config.

Decision:

- Modify/reuse existing AI chat and pending animation paths only.
- Do not create new endpoints, widgets, stream parsers, services, or provider wrappers unless evidence proves a narrow helper is necessary.

Duplicate risk:

- High if a new AI stream path is introduced. The safe path is to instrument and modify the existing `AiChatService`/`AiAssistantWidget` flow.

## Code Patterns Found

### Backend Stream Path

`AiChatController.streamChat(...)` returns `aiChatService.streamChat(...)` and produces `MediaType.TEXT_EVENT_STREAM_VALUE`.

`AiChatService.streamChat(...)` currently performs several synchronous steps before creating the `SseEmitter`:

1. `resolveAccess(...)`
2. `resolveSession(...)`
3. `normalizeMessage(...)`
4. capability direct answer check
5. provider config check
6. `loadContextMessageTexts(...)`
7. referenced-post advice
8. provider concurrency guard acquisition
9. `aiBlogRagService.retrieve(ragQuery)` unless referenced-post context is preferred
10. current-page advice
11. prompt construction
12. `persistenceService.saveUserMessageAndUpdateSession(...)`
13. `new SseEmitter(...)`
14. `chatModel.stream(...).subscribe(...)`

This is the most important finding: if `aiBlogRagService.retrieve(...)` or any pre-emitter step takes 2-4 seconds, the browser cannot receive SSE response data until after that delay.

### RAG Retrieval Path

`AiBlogRagService.retrieve(...)`:

- skips when RAG effective state is false,
- skips when RAG properties are not configured or the question is blank,
- gets a `VectorStore`,
- builds a `SearchRequest`,
- calls `vectorStore.similaritySearch(request)`,
- logs elapsed time for hit/miss/degrade,
- catches exceptions and degrades to empty context.

Because Spring AI vector search often performs query embedding before vector lookup, this path can include an external embedding provider call. That makes it a plausible regression after OpenAI-compatible embedding/provider migration.

### Frontend Stream / Pending Path

`streamAiChatReliable(...)` in `src/api.js`:

- posts to `${API_BASE}/ai/chat/stream`,
- sends `Accept: text/event-stream`,
- passes `res.body.getReader()` to `consumeSseStream(...)`,
- uses a 300000 ms read timeout.

`consumeSseStream(...)`:

- parses SSE blocks,
- handles `chunk`, `complete`, and `error`,
- cancels reader on timeout,
- treats `complete` as terminal success.

`AiAssistantWidget.jsx`:

- creates a pending assistant message before awaiting `streamAiChatReliable(...)`,
- sets `isSending=true`,
- stores pending message id in `pendingReplyMessageIdRef`,
- uses `setInterval(..., AI_PENDING_REPLY_INTERVAL_MS)` while `isSending` is true,
- replaces pending text using `buildAiPendingReplyText(...)`,
- clears pending id on first chunk, complete, error, or final cleanup.

`aiPendingReply.js`:

- exports `AI_PENDING_REPLY_INTERVAL_MS = 420`,
- cycles `...` as `.`, `..`, `...`.

Existing tests already assert the helper and widget references:

- `AiAssistantWidget.test.js`
- `aiPendingReply.test.js`
- `aiStream.test.js`

This means if production shows static `...`, likely causes include stale deployed frontend assets/image, browser cache, old container, or a production-only runtime path where the current bundle is not loaded.

### Docker / Nginx SSE Path

`docker/nginx/default.conf` already has a dedicated exact location:

- `location = /api/ai/chat/stream`
- `proxy_http_version 1.1`
- `proxy_set_header Connection ""`
- `proxy_buffering off`
- `proxy_cache off`
- `chunked_transfer_encoding on`
- `proxy_read_timeout 3600s`
- `proxy_send_timeout 3600s`
- `add_header X-Accel-Buffering no`

Current config does not obviously explain production static `...` by SSE buffering alone. Still verify the deployed server is actually using this config and was rebuilt.

## Likely Root-Cause Hypotheses To Verify

Do not implement fixes until one of these is verified with timing evidence.

1. RAG retrieval blocks stream start.
   - Evidence already supports this as high probability because `retrieve(...)` runs before `SseEmitter` creation.
   - Verify with test/log timings: compare RAG enabled vs disabled/effective false; record pre-emitter elapsed time.

2. OpenAI-compatible embedding/vector search is slower than the previous provider.
   - Verify by timing `AiBlogRagService.retrieve(...)`, not by logging query content.
   - Compare production/local env values only by presence and safe model/base-url host metadata; never print API keys.

3. Chat provider first-token latency is the dominant cost.
   - Verify time from `chatModel.stream(...).subscribe(...)` to first `chunk`.
   - If this is the root cause, the fix is primarily perceived-progress UI and provider configuration review, not RAG restructuring.

4. First new-window question has extra session/history/RAG work.
   - Verify stage timings for new session vs existing session follow-up.
   - Check whether first question always uses broad RAG query and no referenced-post skip.

5. Production pending animation is stale deployment/cache.
   - Verify production bundle/image contains the current pending animation helper.
   - Compare deployed image build time/commit with git commit containing `aiPendingReply.js`.

6. Production Nginx config differs from repo.
   - Verify running container config, not only repo file.
   - Confirm exact `/api/ai/chat/stream` location is active before generic `/api/`.

## Files Likely To Modify

Backend likely:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagServiceTest.java`

Frontend likely:

- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.test.js`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
- `SanguiBlog-front/src/utils/aiStream.js`
- `SanguiBlog-front/src/utils/aiStream.test.js`

Infra only if proven:

- `docker/nginx/default.conf`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `SanguiBlog-front/Dockerfile`
- `.env.example`
- `SanguiBlog-server/src/main/resources/application.yaml`

## Risk / Boundary Notes

- RAG quality vs latency is a product tradeoff. If the fix requires skipping or timing out RAG, make the timeout/config explicit and ask before changing default behavior aggressively.
- Sending a new SSE event type is a cross-layer contract change. Prefer preserving `chunk/complete/error`; if adding heartbeat/progress, update `aiStream.js` tests and PRD/spec context.
- Creating the `SseEmitter` earlier can improve response start/perceived liveness, but does not reduce provider first-token latency by itself.
- If expensive pre-model work moves async, ensure provider concurrency permits are released exactly once across success, timeout, provider error, client disconnect, and pre-emitter/pre-subscription exceptions.
- Do not hold MySQL transactions while waiting for embedding/vector/provider calls.
- Logs must stay safe: elapsedMs and safe ids/counts only; no prompts/replies/provider payloads/secrets.
- Production animation mismatch may require deployment verification rather than code changes. Do not duplicate the animation implementation just because production is stale.

## Required Tests and Assertion Points

Backend:

- `AiChatServiceTest`
  - stream returns or begins promptly when RAG is slow/bounded, depending on chosen design.
  - stream still emits `complete` with references when RAG completes in budget.
  - stream degrades safely when RAG times out/fails if timeout behavior is added.
  - provider busy/error/empty stream paths still emit `error` or fallback complete.
- `AiBlogRagServiceTest`
  - retrieval logs/degrades safely on vector failure.
  - optional timeout/budget behavior if implemented.
- `AiProviderConcurrencyGuardTest`
  - existing guard semantics remain.
- `AiAssistantSettingServiceTest`, `AiGuestAccessServiceTest`, `AiCurrentPageContextServiceTest`, `AiReferencedPostContextServiceTest`
  - existing cross-service behavior remains intact.

Frontend:

- `aiPendingReply.test.js`
  - frames cycle `.`, `..`, `...` and interval stays 420 ms unless intentionally changed.
- `AiAssistantWidget.test.js`
  - widget imports/uses `buildAiPendingReplyText` and interval while sending.
  - pending id clears on chunk/complete/error/finally.
- `aiStream.test.js`
  - terminal complete remains success.
  - timeout cancels reader and throws readable error.
  - empty/chunk-without-terminal streams fail safely.
- `noNativeBlockingDialogs.test.js`
  - no native dialogs introduced.

Build/static:

- backend Maven targeted tests and compile.
- frontend node tests, lint, and build.
- `docker compose config --quiet`
- `docker compose -f docker-compose.prod.yml config --quiet`
- `git diff --check`
- `python .trellis\scripts\task.py validate .trellis\tasks\06-07-ai-reply-latency-pending-animation`

## Suggested Branch Command For Implementation

```powershell
git switch -c fix/ai-reply-latency-pending-animation
```

