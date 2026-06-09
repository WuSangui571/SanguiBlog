# AI Reply Latency and Production Pending Animation PRD

## Background

Users report that after the OpenAI-compatible provider migration, AI chat feels noticeably slower:

- Normal question -> AI reply delay is about 2 seconds.
- First question in a new chat/window can take about 4 seconds.
- The local pending ellipsis animation for `...` works, but the deployed server appears to show a static `...` or otherwise does not show the expected animation.

This is a planning-only Codex handoff. Codex must not change business implementation files in this pass. DeepSeek should implement narrowly on a new branch from `main`.

## Current Project State From Trellis / Journal

- `$start` context: branch is `main`, working directory is clean.
- Current task before this task: none assigned to Codex.
- Existing active task: `06-07-06-07-version-2-3-2-readme-cleanup/` in `planning`, assigned to `deepseek`; unrelated.
- Recent OpenAI-compatible provider/RAG work has been recorded and archived in the workspace journal.
- Recent journal notes show:
  - OpenAI-compatible chat and embedding configuration was migrated.
  - RAG retrieval observability and follow-up retrieval behavior were enhanced.
  - The AI chat/SSE payload shape was not intentionally changed.
  - A previous boundary mentioned frontend AI pending-reply animation files, but the current working tree is clean and those files now exist in the repo.

## Scope Classification

Complex Task.

Reasoning:

- Cross-layer behavior spans React state/UI, frontend SSE parsing, backend SSE controller/service, Spring AI provider calls, RAG embedding/vector retrieval, Docker/Nginx SSE routing, and deployment freshness.
- The likely latency boundary is not obvious from symptoms alone and must be measured before fixes.
- The production-only animation difference may be deployment/cache/build freshness, frontend runtime state, or server/proxy behavior; these must be separated.

## Goals

1. Reduce perceived and measured time from user submit to visible assistant progress.
2. Identify whether the 2-4 second delay is caused by:
   - frontend render/state delay,
   - delayed HTTP response/SSE headers,
   - synchronous backend pre-stream work,
   - RAG embedding/vector search,
   - OpenAI-compatible chat model first-token latency,
   - persistence/session history work,
   - Docker/Nginx buffering/deployment issues.
3. Ensure production deployments show the same pending ellipsis animation behavior as local.
4. Preserve existing AI chat contracts:
   - same endpoint paths,
   - same request fields,
   - same terminal SSE semantics,
   - same session/message persistence,
   - same guest/login access behavior,
   - no secret or prompt leakage in logs.

## Non-Goals / Forbidden Scope

- Do not create a second AI chat endpoint, service, frontend stream parser, or assistant widget.
- Do not bypass `AiChatService`.
- Do not silently disable RAG globally just to make chat feel faster.
- Do not remove current-page context, referenced-post context, guest limits, session persistence, or capability direct answers.
- Do not change AI provider model/base-url/API-key contracts unless stage evidence proves a config contract bug.
- Do not introduce a new frontend API wrapper or EventSource path.
- Do not log full prompts, full replies, article bodies, API keys, JWTs, or provider payloads.
- Do not make broad visual redesigns of the AI assistant.
- Do not touch unrelated README/version/data-sync tasks.
- Do not commit, push, or create the implementation branch in this planning pass.

## Cross-Layer Contract

### 1. Scope / Trigger

The task changes AI chat streaming behavior and frontend pending state only as needed to reduce latency or make progress visible. It crosses:

- frontend UI state and pending text animation,
- frontend SSE consumption,
- backend SSE stream lifecycle,
- backend AI chat orchestration,
- RAG retrieval and provider calls,
- Docker/Nginx deployment routing.

### 2. Existing Signatures

Backend:

- `POST /api/ai/chat`
  - controller: `AiChatController.chat(...)`
  - response: `ApiResponse<AiChatResponse>`
- `POST /api/ai/chat/stream`
  - controller: `AiChatController.streamChat(...)`
  - response: `text/event-stream`
- service: `AiChatService.streamChat(...)`
- RAG service: `AiBlogRagService.retrieve(String question)`

Frontend:

- `streamAiChatReliable(...)` in `SanguiBlog-front/src/api.js`
- `consumeSseStream(...)` in `SanguiBlog-front/src/utils/aiStream.js`
- consumer: `AiAssistantWidget.jsx`
- pending helper: `aiPendingReply.js`

Docker / infra:

- `docker/nginx/default.conf`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `SanguiBlog-front/Dockerfile`

DB:

- Existing `ai_chat_sessions` and `ai_chat_messages` persistence remains unchanged unless evidence proves a persistence bottleneck.
- No schema change is expected.

Env/config:

- Existing AI provider env:
  - `AI_OPENAI_API_KEY`
  - `AI_OPENAI_BASE_URL`
  - `AI_OPENAI_CHAT_MODEL`
  - `AI_OPENAI_EMBEDDING_API_KEY`
  - `AI_OPENAI_EMBEDDING_BASE_URL`
  - `AI_OPENAI_EMBEDDING_MODEL`
  - `AI_RAG_ENABLED`
- If a RAG chat retrieval timeout/cap is introduced, it must be explicit, documented, and tested. Suggested property name only if evidence supports it:
  - `AI_RAG_CHAT_RETRIEVAL_TIMEOUT_MS`
  - mapped to `ai.rag.chat-retrieval-timeout-ms`

### 3. Existing Payloads

Request body for stream:

```json
{
  "message": "用户问题",
  "sessionId": 123,
  "currentPageContext": {
    "type": "post",
    "postId": 1,
    "title": "文章标题",
    "excerpt": "..."
  },
  "localHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

SSE events:

- `chunk`: `{ "text": "..." }`
- `complete`: `{ "reply": "...", "sessionId": 1, "model": "...", "mode": "...", "references": [] }`
- `error`: `{ "message": "..." }`

Terminal contract:

- `complete` is terminal success.
- `error` is terminal failure.
- Frontend must not replace a completed response with a later network error.
- A stream with no `chunk`, `complete`, or `error` must time out and replace pending UI with a readable error.

### 4. Latency Acceptance Targets

These are user-facing targets for implementation and verification:

| Measurement | Target |
|-------------|--------|
| Submit click/Enter -> pending assistant row visible | <= 100 ms locally and in production |
| Pending ellipsis frame update while waiting | first visible frame immediately, then cycles every ~420 ms |
| Backend stream request entry -> SSE emitter returned/response starts | should not wait for RAG/model network calls; target <= 200 ms after access/session validation |
| RAG retrieval when enabled | measured separately; should degrade or be bounded if it blocks chat start beyond agreed budget |
| First model chunk after provider subscription | measured separately; do not hide provider latency as frontend bug |
| No terminal event from backend/provider | frontend/server timeout returns readable error; no indefinite `...` |

If the provider itself needs 2+ seconds to produce the first token after subscription, do not fake a model chunk. Keep pending animation visible and report provider first-token latency clearly.

### 5. Validation / Error Matrix

| Case | Expected Result | Assertion Point |
|------|-----------------|-----------------|
| Blank message | Existing validation/error remains; no model/RAG call | backend test or existing validation path |
| AI disabled | Launcher hidden by site meta; backend still rejects chat | existing settings tests remain green |
| Missing chat API key/model | SSE emits `error` and completes; JSON path uses readable failure | `AiChatServiceTest`/capability tests |
| Provider concurrency busy | JSON returns 429; SSE emits `error` and completes | `AiProviderConcurrencyGuardTest` plus AI service test |
| RAG disabled/effective false | Chat path skips vector search and starts model stream normally | service mock verifies no `similaritySearch` |
| RAG enabled but vector search slow | Chat does not leave UI static; implementation either starts stream promptly and/or bounds RAG delay according to measured design | new targeted service test with slow fake RAG/vector provider |
| RAG provider/vector failure | Degrades to empty RAG context with safe warning; chat still proceeds where existing contract allows | `AiBlogRagServiceTest` or service test |
| Provider stream emits chunks | Frontend replaces pending text with streamed content on first chunk | `AiAssistantWidget` / `aiStream` tests |
| Provider stream completes without chunks | Existing fallback/error behavior remains; no indefinite pending | backend and frontend stream tests |
| Backend returns `complete` then network closes | Frontend keeps completed answer | `aiStream.test.js` |
| Production bundle stale | Verified by deployment artifact/version/hash; fix deployment/rebuild instructions, not business logic | production smoke notes |
| Nginx buffers SSE | `/api/ai/chat/stream` keeps buffering disabled and response is chunked | `docker/nginx/default.conf` review plus curl/browser smoke |

### 6. Good / Base / Bad Cases

Good:

- User opens a new chat, submits the first question, sees animated pending text immediately, then sees streamed chunks as soon as provider emits them.
- With RAG enabled and fast vector retrieval, references/mode still work and latency remains acceptable.
- Production Docker deployment behaves like local for pending animation and stream terminal events.

Base:

- RAG disabled or not effective: chat still works, no vector search is attempted, pending animation works.
- Provider first-token latency is naturally slower than local: pending animation continues and instrumentation makes this boundary visible.
- Existing sessions still load, recent 10 visible sessions behavior remains unchanged.

Bad:

- New-window first question waits several seconds before the SSE response can start because RAG or provider work runs before the emitter is returned.
- Production shows static `...` because an old frontend image/bundle is deployed or cached.
- Nginx/proxy buffers SSE despite app-level streaming.
- Any timeout path leaves `...` indefinitely.
- Any fix removes RAG/session history/access control to improve speed without explicit approval.

## Focused Implementation Plan For DeepSeek

1. Add failing/diagnostic tests before implementation.
   - Backend: add a targeted AI stream latency/lifecycle test that uses a slow fake RAG retrieval or fake vector/provider boundary to prove whether `streamChat` returns only after the slow pre-stream work.
   - Frontend: add/update tests proving pending animation starts immediately, cycles while `isSending` is true, and is not removed before first `chunk`/`complete`/`error`.
   - Infra/static: assert Docker Nginx SSE buffering settings remain present.

2. Add safe stage timing instrumentation if needed.
   - Use metadata only: `sessionId`, `userId` when available, booleans such as `ragEffective`, safe mode names, elapsedMs.
   - Suggested stages:
     - request entered,
     - access/session resolved,
     - local history/context loaded,
     - referenced/current-page advice finished,
     - RAG retrieval started/finished/skipped,
     - user message persisted,
     - emitter created/returned,
     - provider stream subscribed,
     - first chunk sent,
     - complete/error sent.
   - Do not log prompts, replies, API keys, raw provider payloads, or article content.

3. Fix the confirmed latency boundary narrowly.
   - If RAG retrieval before emitter creation is confirmed as the delay:
     - Prefer a design where the SSE stream is established promptly and expensive pre-model work is either bounded or performed in a way that does not block the HTTP response from starting.
     - If a timeout/degrade path is introduced for chat-time RAG retrieval, make it explicit, tested, and documented. Degrade to empty RAG context rather than failing the entire chat when RAG is optional.
     - Preserve RAG references when retrieval completes within budget.
   - If provider first-token latency is the dominant delay:
     - Do not fake model content. Keep visible pending animation and document measured provider latency.
     - Consider only safe provider/client timeout tuning with tests.
   - If persistence is the dominant delay:
     - Keep short transaction helpers; optimize the exact repository/service path only.
   - If production animation is stale bundle/deployment:
     - Fix deployment docs/scripts or rebuild path as needed; do not add redundant frontend animation code.

4. Verify production animation boundary.
   - Confirm production frontend artifact includes `aiPendingReply` logic or the equivalent compiled bundle code.
   - Confirm Docker image was rebuilt after the commit containing `aiPendingReply.js`.
   - Confirm browser is not using an old `index.html`/asset cache.
   - Confirm React interval can run while request is pending and no main-thread blocking loop exists.

5. Keep contracts stable.
   - No new public endpoint unless evidence proves it is necessary.
   - No DB schema change expected.
   - No DTO field change expected.
   - SSE `chunk` / `complete` / `error` semantics must remain compatible.

## Files Likely To Modify

Expected primary candidates:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagServiceTest.java` if a new focused RAG test is needed
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.test.js`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
- `SanguiBlog-front/src/utils/aiStream.js`
- `SanguiBlog-front/src/utils/aiStream.test.js`
- `docker/nginx/default.conf` only if verification proves deployment SSE buffering is wrong despite current config
- `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml`, and `application.yaml` only if a new explicit timeout/config contract is introduced

Files that should usually not be modified:

- No new controller/service pair for AI chat.
- No unrelated README/version docs unless a new env/deployment contract requires a small docs update.
- No database schema file unless an unexpected persistence bottleneck requires a schema/index change and is explicitly justified.

## Required Tests

Backend:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiChatServiceTest,AiBlogRagServiceTest,AiProviderConcurrencyGuardTest" test
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiGuestAccessServiceTest,AiCurrentPageContextServiceTest,AiReferencedPostContextServiceTest" test
mvn -q -DskipTests compile
```

Frontend:

```powershell
cd SanguiBlog-front
node src/appfull/ui/aiPendingReply.test.js
node src/appfull/ui/AiAssistantWidget.test.js
node src/utils/aiStream.test.js
node src/appfull/noNativeBlockingDialogs.test.js
cmd /c npm run lint
cmd /c npm run build
```

Infra / static:

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
python .trellis\scripts\task.py validate .trellis\tasks\06-07-ai-reply-latency-pending-animation
```

Runtime smoke when Docker/prod-like environment is available:

```powershell
docker compose up -d --build
curl.exe -i http://localhost/api/site/meta
curl.exe -N -H "Content-Type: application/json" -H "Accept: text/event-stream" --data-binary "@ai-chat-smoke.json" http://localhost/api/ai/chat/stream
```

Manual browser acceptance:

- New chat first question shows animated pending text immediately.
- Existing chat follow-up shows animated pending text immediately.
- First chunk replaces pending text.
- Complete event preserves final response and references.
- Error/timeout replaces pending text with a readable error.
- Production deployment after rebuild matches local pending animation.

## Planning Self-Check

- Acceptance criteria are explicit: yes.
- Forbidden modification scope is explicit: yes.
- Expected modified files are listed: yes.
- Required tests are listed: yes.
- Concrete backend/frontend/guides specs were read: yes.
- Requirements needing user confirmation: no blocking confirmation before DeepSeek starts; if implementation evidence suggests disabling RAG or changing model/provider defaults, ask user first.
- API/DB/frontend DTO alignment: no new endpoint, no DB schema change, no DTO field change expected; SSE event shape must remain stable.

