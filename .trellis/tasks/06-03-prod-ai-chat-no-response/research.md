# Production AI Chat No Response Research

## Relevant Specs Read

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## Retrieval Report

- Keywords searched:
  - `AiChat`, `ai/chat`, `streamAi`, `consumeSse`, `SSE`, `EventSource`, `complete`, `chunk`, `SPRING_AI`, `DASHSCOPE`, `AI_RAG`, `ai_chat_sessions`, `ai_chat_messages`
- Candidate implementations:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`: real AI chat HTTP and SSE endpoint owner.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`: real chat/session/access/RAG/provider coordination owner.
  - `SanguiBlog-front/src/api.js`: single frontend API facade and stream request entry.
  - `SanguiBlog-front/src/utils/aiStream.js`: SSE parser and terminal event behavior.
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`: pending `...` UI state and stream callbacks.
  - `docker/nginx/default.conf`: production web proxy and exact `/api/ai/chat/stream` buffering contract.
  - `docker-compose.yml` and `docker-compose.prod.yml`: local/prod compose environment and healthcheck differences.
  - `sanguiblog_db.sql`: canonical AI chat table/schema contract.
  - `docs/docker-deploy.md`: existing AI table and AI key diagnostic runbook.
- Decision: modify existing path only after root-cause evidence. Do not create new controllers/services/API wrappers.
- Duplicate risk: high if a second AI route/parser is added; avoid by reusing `AiChatController -> AiChatService -> api.js -> aiStream.js -> AiAssistantWidget.jsx`.

## Code Patterns Found

### Backend SSE Path

- `AiChatController.streamChat` maps `POST /api/ai/chat/stream`, produces `MediaType.TEXT_EVENT_STREAM_VALUE`, delegates to `AiChatService.streamChat`, and converts only `AiAccessControlException` to an SSE `error` event.
- `AiChatService.streamChat`:
  - checks `aiAssistantSettingService.assertEnabled()`;
  - resolves guest/user access through `AiGuestAccessService`;
  - resolves session and saves the user message before provider streaming;
  - calls `chatModel.stream(new Prompt(promptMessages)).subscribe(...)`;
  - sends `chunk` for nonblank stream chunks;
  - on stream provider error, logs and tries `callSyncReply(promptMessages)` fallback;
  - sends `error` when stream/sync produce no valid content;
  - sends `complete` with reply/session/model/mode/references when successful.
- `SseEmitter` timeout is `0L`, so a provider stream that neither emits chunks nor errors nor completes can leave the client pending indefinitely.

### Frontend SSE Path

- `api.js` posts to `${API_BASE}/ai/chat/stream`, sets `Accept: text/event-stream`, and throws parsed HTTP errors before reading the stream.
- `streamAiChatReliable` currently behaves the same as `streamAiChat`; there is no extra reliability/timeout layer.
- `aiStream.js` parses `event:` and `data:` blocks; `complete` is terminal success; `error` throws a terminal error; EOF without terminal event returns without error.
- `AiAssistantWidget.jsx`:
  - inserts pending assistant content from `assistantConfig.pendingReply`, default `...`;
  - replaces pending content in `onChunk` and `onComplete`;
  - replaces pending content in catch when an error is thrown;
  - if the fetch/read promise never resolves, the pending message remains `...`.

### Docker / Production Difference

- Both local and production compose inject `SPRING_AI_DASHSCOPE_API_KEY` from `AI_DASHSCOPE_API_KEY`.
- Production compose uses GHCR images and defaults `SANGUI_IMAGE_TAG` to `main`; local compose builds from source.
- Production backend has `JAVA_TOOL_OPTIONS` memory limit defaults and `mem_limit: 768m`.
- Local MySQL healthcheck queries `SELECT 1 FROM roles LIMIT 1`.
- Production MySQL healthcheck only queries `SELECT 1`, so it does not verify schema readiness or a core table.
- `docker/nginx/default.conf` has an exact `/api/ai/chat/stream` location before `/api/`, disables buffering, and uses long timeouts.

### Schema / Runbook Pattern

- `sanguiblog_db.sql` creates `ai_chat_sessions` and `ai_chat_messages` and includes compatibility column migration for older `ai_chat_sessions`.
- Docker MySQL init does not migrate existing volumes.
- `docs/docker-deploy.md` already documents AI table missing diagnostics and a secret-safe key presence check.

## Working Hypotheses To Test In Order

1. Production public web/Nginx path holds or buffers the stream while backend direct stream works.
2. Production backend/provider stream call hangs without emitting `chunk`, `complete`, or `error`; frontend waits forever because no timeout exists.
3. Production schema drift causes backend stream to fail before an SSE error reaches the UI or creates retry/restart symptoms.
4. Production env/image drift means backend/web image or env differs from current local code.
5. Guest guard/BotGuard produces structured errors that are not reaching frontend as terminal SSE/HTTP errors.

Do not implement against any hypothesis until a command proves the failing boundary.

## Files Likely To Modify

Only modify the subset proven by diagnostics:

- `docker-compose.prod.yml`
- `docker/nginx/default.conf`
- `docs/docker-deploy.md`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/utils/aiStream.js`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
- `SanguiBlog-front/src/utils/aiStream.test.js`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`

## Risk / Boundary Notes

- `AiChatService` is the single AI chat owner. Do not bypass it.
- `complete` is terminal success; frontend must not overwrite completed answers with later network errors.
- Logs must never include secrets, full prompts, full replies, JWTs, or knowledge document content.
- AI key diagnostics must be presence-only.
- If schema drift is confirmed, use idempotent SQL from `sanguiblog_db.sql`; do not invent a separate migration source.
- If `docker-compose.prod.yml` healthcheck is changed, keep it compatible with production MySQL and avoid `down -v`.
- If frontend timeout/error handling is added, ensure it does not abort slow but healthy streams too aggressively.

## Required Tests

Backend:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiChatServiceTest,AiGuestAccessServiceTest,AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest,AiReferencedPostContextServiceTest" test
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

- `curl.exe -N -i -X POST http://<prod-host>:<port>/api/ai/chat/stream ...`
- direct backend smoke from the Docker network.
- `/api/ai/chat` sync fallback smoke.
- MySQL AI table/column inspection.
- backend logs tail around the request.

