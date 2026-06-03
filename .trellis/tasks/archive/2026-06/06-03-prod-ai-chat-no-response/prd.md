# Production AI Chat No Response PRD

## Task Scope Judgment

- Classification: Complex Task.
- Reason: production-only AI chat regression spans Docker production compose, Nginx SSE proxying, Spring AI DashScope streaming, AI chat persistence tables, frontend SSE state handling, and operational diagnostics.
- Codex role for this round: planning/research/context only. Do not modify business implementation files in this round.
- Implementation owner for next round: DeepSeek.

## Problem Statement

In the production Docker deployment (`docker-compose.prod.yml`), the public AI assistant accepts a user message but remains on the pending reply text (`...`). It does not stream visible content and does not show an error notice. Local Docker compose can still chat. The user reports the configured key is valid and production AI chat previously worked.

The task is to identify the failing boundary first, then apply a narrow fix only after evidence confirms root cause.

## Goals

1. Reproduce or diagnose production-only AI chat no-response behavior without exposing secrets.
2. Determine whether the break is at frontend fetch/SSE parsing, Nginx proxy buffering/routing, backend SSE emitter, DashScope stream/sync call, AI assistant setting/guest guard, schema drift, or production image/config drift.
3. Implement only the minimal fix required by the confirmed boundary in the next coding round.
4. Preserve local compose behavior and existing AI assistant contracts.

## Non-Goals / Forbidden Scope

- Do not rewrite the AI chat pipeline.
- Do not create a second AI controller, service, frontend API wrapper, or SSE parser.
- Do not log or print full API keys, JWTs, full prompts, full model responses, or knowledge document content.
- Do not change DB schema unless live production/schema evidence proves AI chat table or column drift.
- Do not change RAG behavior unless evidence shows RAG retrieval is the failing boundary.
- Do not change UI visuals beyond a narrow error/timeout/diagnostic handling fix if frontend evidence requires it.
- Do not disable BotGuard or guest limits globally to make the symptom disappear.
- Do not commit, push, archive, or record-session until manual acceptance is confirmed.

## Current Cross-Layer Contract

### API / Command Signatures

- Frontend stream call:
  - `POST /api/ai/chat/stream`
  - Source: `SanguiBlog-front/src/api.js`
  - Request body:
    ```json
    {
      "message": "string",
      "sessionId": 123,
      "currentPageContext": null,
      "localHistory": []
    }
    ```
  - Headers:
    - `Content-Type: application/json`
    - `Accept: text/event-stream`
    - optional `Authorization: Bearer <token>` for logged-in user

- Backend stream endpoint:
  - `AiChatController.streamChat(...)`
  - Path: `POST /api/ai/chat/stream`
  - Produces: `text/event-stream`
  - Delegates to `AiChatService.streamChat(...)`

- Backend sync fallback endpoint:
  - `POST /api/ai/chat`
  - Same request body as stream endpoint.
  - Response: `ApiResponse<AiChatResponse>`.

- Nginx production proxy:
  - `docker/nginx/default.conf`
  - Exact location `location = /api/ai/chat/stream`
  - Must proxy to `http://backend:8080/api/ai/chat/stream`
  - Must keep `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 3600s`, `proxy_send_timeout 3600s`, and `X-Accel-Buffering no`.

- Production compose:
  - `docker-compose.prod.yml`
  - Injects `SPRING_AI_DASHSCOPE_API_KEY` from `AI_DASHSCOPE_API_KEY`.
  - Uses production images from `${SANGUI_IMAGE_REGISTRY}/sanguiblog-backend:${SANGUI_IMAGE_TAG:-main}` and `sanguiblog-web:${SANGUI_IMAGE_TAG:-main}`.

### SSE Payload Fields

- `chunk` event:
  ```json
  { "text": "partial answer text" }
  ```
- `complete` event:
  ```json
  {
    "reply": "full answer text",
    "sessionId": 123,
    "model": "qwen-flash",
    "mode": "DATABASE_SESSION_HISTORY",
    "references": []
  }
  ```
- `error` event:
  ```json
  { "message": "user-facing error text" }
  ```

### Frontend State Contract

- `AiAssistantWidget.jsx` inserts a pending assistant message using `assistantConfig.pendingReply`, currently `...`.
- `onChunk` replaces pending content with accumulated streamed text.
- `onComplete` is terminal success and must not be overwritten by later reader/network errors.
- `onError` or thrown fetch/SSE errors must replace the pending message with a readable user-facing error.
- A request that receives no `chunk`, `complete`, or `error` leaves the UI on `...`; this is the symptom to diagnose.

### DB / Schema Contract

Main MySQL AI chat persistence tables:

- `ai_chat_sessions`
- `ai_chat_messages`

Expected compatibility columns on `ai_chat_sessions` include:

- `guest_visitor_id`
- `session_start_ip`
- `latest_ip`
- `ip_changed`
- `ip_changed_at`
- `user_visible`
- `user_hidden_at`

Production Docker MySQL init only runs on an empty volume. Existing volumes can drift from `sanguiblog_db.sql`.

### Env / Config Fields

Secret-safe fields to verify by presence only:

- `AI_DASHSCOPE_API_KEY`
- `SPRING_AI_DASHSCOPE_API_KEY`
- `AI_RAG_ENABLED`
- `AI_RAG_SYNC_ON_STARTUP`
- `AI_DASHSCOPE_CHAT_MODEL`
- `SPRING_PROFILES_ACTIVE`
- `SANGUI_IMAGE_TAG`

Do not print secret values.

## Validation / Error Matrix

| Boundary | Evidence Command / Check | Expected Good Result | Bad Result / Meaning |
|---|---|---|---|
| Frontend receives SSE | Browser Network or `curl.exe -N` against `/api/ai/chat/stream` | `event: chunk` then `event: complete`, or immediate `event: error` | Connection stays open with no event: backend/model/proxy hanging |
| Nginx stream proxy | `curl.exe -N http://host:port/api/ai/chat/stream ...` through web container | Streaming events arrive unbuffered | No event through web but works direct backend: Nginx route/proxy issue |
| Direct backend stream | `docker compose -f docker-compose.prod.yml exec backend ... curl -N http://localhost:8080/api/ai/chat/stream ...` | Events arrive | Direct backend hangs or errors: backend/model/schema issue |
| Sync fallback endpoint | `POST /api/ai/chat` same payload | JSON `success=true` with `data.reply` | Fails/hangs: model/schema/settings/guard issue, not just SSE |
| AI key injection | `test -n "$SPRING_AI_DASHSCOPE_API_KEY"` inside backend | Prints only `SET`/presence | Empty: prod env injection/restart issue |
| AI assistant setting | `/api/site/meta` and admin setting | `aiAssistant.enabled` true | Disabled should hide launcher or reject, not hang |
| Guest guard/BotGuard | SSE `error` event or HTTP 403/429 structured data | UI shows captcha/notice | If guard response is swallowed, frontend error handling/proxy mismatch |
| MySQL AI tables | `SHOW TABLES LIKE 'ai_%'; SHOW COLUMNS FROM ai_chat_sessions;` | Required tables/columns present | Missing table/columns: production schema drift |
| Image/config drift | `docker compose -f docker-compose.prod.yml images`, env `SANGUI_IMAGE_TAG` | backend/web tags match intended release | Old image may miss latest SSE/schema handling |
| Provider stream | backend logs around `AiChatService.streamChat` | stream emits chunks or fallback sync succeeds | stream subscription never emits error/complete: provider call timeout handling likely missing |

## Good / Base / Bad Cases

| Case | Scenario | Expected Result |
|---|---|---|
| Good | Production stream endpoint receives valid user message and valid key | Pending `...` is replaced by streamed text and finalized by `complete`; session/message rows persist |
| Good | DashScope stream fails but sync fallback succeeds | UI receives normal `complete`; no later error overwrites answer |
| Base | AI assistant disabled in admin setting | Launcher hidden through `/api/site/meta`; direct chat call returns clear unavailable error |
| Base | RAG disabled (`AI_RAG_ENABLED=false`) | Chat still works with `DATABASE_SESSION_HISTORY` mode and no references |
| Base | Guest user asks within quota | Guest visitor cookie is set and stream completes |
| Bad | Missing or empty DashScope key | Backend returns/streams readable AI service error, and frontend replaces `...` |
| Bad | Missing `ai_chat_messages` table or required `ai_chat_sessions` columns | Backend logs sanitized schema error; fix applies idempotent SQL from `sanguiblog_db.sql`; frontend does not hang silently |
| Bad | Nginx buffers or misroutes `/api/ai/chat/stream` | Direct backend works but web proxy hangs; fix only Nginx/prod compose image/config |
| Bad | Provider stream call hangs without terminal event | Backend must surface timeout/error event or use bounded fallback; frontend must not stay indefinitely on `...` |

## Focused Investigation Plan

1. Confirm production deployment state without secrets:
   - active compose file: `docker-compose.prod.yml`
   - image tag: `SANGUI_IMAGE_TAG`
   - backend/web image ids
   - backend env key presence, not value
2. Run a direct SSE smoke through the production public port.
3. If public SSE hangs, run the same payload direct against backend from inside the Docker network.
4. If backend direct succeeds but public port fails, inspect `docker/nginx/default.conf` in the running web image/container and fix proxy/config/image drift.
5. If backend direct also hangs/fails, compare `/api/ai/chat` sync endpoint.
6. If both stream and sync fail, inspect backend logs and MySQL AI tables/columns before changing Java.
7. If stream hangs but sync succeeds, investigate Spring AI streaming provider timeout/error completion and frontend pending timeout handling.
8. If schema drift is confirmed, apply idempotent AI table/column migration extracted from `sanguiblog_db.sql`; do not change Java unless schema is already correct.
9. If prod compose healthcheck drift contributes to early backend start/schema readiness, align `docker-compose.prod.yml` MySQL healthcheck with local `SELECT 1 FROM roles LIMIT 1` or another stable core table check.
10. Add/adjust tests for the confirmed root cause.

## Production Diagnostic Commands

Use PowerShell 5.1-safe temp JSON files. Replace host/port as needed. Do not paste secrets.

```powershell
$Body = @{
  message = "请用一句话回复：AI连通性测试"
  sessionId = $null
  currentPageContext = $null
  localHistory = @()
} | ConvertTo-Json -Depth 6
$Tmp = New-TemporaryFile
[System.IO.File]::WriteAllText($Tmp.FullName, $Body, [System.Text.Encoding]::UTF8)
curl.exe -N -i -X POST "http://localhost:8090/api/ai/chat/stream" `
  -H "Content-Type: application/json" `
  -H "Accept: text/event-stream" `
  --data-binary "@$($Tmp.FullName)"
Remove-Item $Tmp.FullName
```

```powershell
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 120 backend
docker compose -f docker-compose.prod.yml exec backend sh -c 'test -n "$SPRING_AI_DASHSCOPE_API_KEY" && echo "SPRING_AI_DASHSCOPE_API_KEY is set" || echo "SPRING_AI_DASHSCOPE_API_KEY is empty"'
docker compose -f docker-compose.prod.yml exec backend sh -c 'printf "%s\n" "$SPRING_PROFILES_ACTIVE"'
docker compose -f docker-compose.prod.yml exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '\''ai_%'\''; SHOW COLUMNS FROM ai_chat_sessions;"'
```

Direct backend stream from inside the web/backend network:

```powershell
docker compose -f docker-compose.prod.yml exec web sh -c 'cat > /tmp/ai-smoke.json <<EOF
{"message":"请用一句话回复：AI连通性测试","sessionId":null,"currentPageContext":null,"localHistory":[]}
EOF
curl -N -i -X POST http://backend:8080/api/ai/chat/stream -H "Content-Type: application/json" -H "Accept: text/event-stream" --data-binary @/tmp/ai-smoke.json'
```

Sync endpoint fallback probe:

```powershell
docker compose -f docker-compose.prod.yml exec web sh -c 'curl -sS -i -X POST http://backend:8080/api/ai/chat -H "Content-Type: application/json" --data-binary @/tmp/ai-smoke.json'
```

## Files Likely To Modify After Root Cause Is Confirmed

Modify only the subset proven by diagnostics:

- `docker-compose.prod.yml`
  - likely if MySQL healthcheck/image/env production drift is root cause.
- `docker/nginx/default.conf`
  - likely if public `/api/ai/chat/stream` hangs but direct backend stream works.
- `docs/docker-deploy.md`
  - likely if diagnostic/production runbook needs updated AI no-response guidance.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
  - only if provider stream can hang without terminal event and backend needs bounded timeout/fallback/error event.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`
  - only if controller-level SSE exception conversion is incomplete.
- `SanguiBlog-front/src/api.js`
  - only if fetch/SSE failure is not normalized into a UI error.
- `SanguiBlog-front/src/utils/aiStream.js`
  - only if stream parser terminal/no-terminal behavior is root cause.
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - only if pending UI can remain forever after a reader/network hang and a narrow timeout/error notice is required.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
  - update/add for stream error/fallback/timeout behavior.
- `SanguiBlog-front/src/utils/aiStream.test.js`
  - update/add for terminal error/no-terminal stream behavior.
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
  - update/add static assertion for pending replacement/error handling if changed.

## Required Tests / Verification

Before commit in the coding round:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiChatServiceTest,AiGuestAccessServiceTest,AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest,AiReferencedPostContextServiceTest" test
mvn -q -DskipTests compile
```

```powershell
cd SanguiBlog-front
node src/utils/aiStream.test.js
node src/appfull/ui/AiAssistantWidget.test.js
node src/appfull/ui/AiAssistantMobileViewport.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
```

Manual acceptance:

- Production public URL stream smoke returns at least one SSE terminal path (`chunk` + `complete`, or `error`) within a bounded time.
- AI widget no longer stays indefinitely on `...`.
- Local compose chat still works.
- Backend logs contain no secrets, full prompts, or full replies.

## Acceptance Criteria

- Root cause is identified with command evidence at the failing boundary.
- Any fix is narrow and tied to the confirmed boundary.
- Production AI chat either streams a reply or surfaces a readable error; it must not remain stuck on `...`.
- Existing local compose AI chat behavior is preserved.
- Tests listed above pass or skipped tests are explicitly justified.
- Trellis task context includes relevant specs and code patterns for implement/check agents.

