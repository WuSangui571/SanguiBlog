# AI Session Audit List Pagination Research

## Relevant Specs

- `.trellis/spec/frontend/index.md`: frontend work must read directory, quality, code-reuse, and task-specific component/state/type specs.
- `.trellis/spec/frontend/directory-structure.md`: API calls must go through `SanguiBlog-front/src/api.js`; active admin UI lives in `SanguiBlog-front/src/appfull/AdminPanel.jsx`.
- `.trellis/spec/frontend/quality-guidelines.md`: search/reuse first; admin changes need targeted static tests plus build; no native dialogs.
- `.trellis/spec/frontend/component-guidelines.md`: use existing admin notice/control patterns and lucide icons; avoid parallel UI systems.
- `.trellis/spec/frontend/hook-guidelines.md`: async loaders need cancellation/stale response guards when relevant; declare callbacks before effects that use them.
- `.trellis/spec/frontend/state-management.md`: admin state stays local to admin page components; no global cache library for this task.
- `.trellis/spec/frontend/type-safety.md`: normalize `res.data || res`, guard `records` arrays, and keep API field alignment explicit.
- `.trellis/spec/backend/index.md`: AI assistant/RAG/session/audit work must also read DB, error, quality, and cross-layer guidelines.
- `.trellis/spec/backend/directory-structure.md`: extend `AiChatController`/`AiChatService`/`service.ai.*` and existing admin controllers/services; do not create parallel AI pipelines.
- `.trellis/spec/backend/quality-guidelines.md`: JSON APIs use `ApiResponse<T>`, paginated responses use `PageResponse<T>`, and AI chat changes need targeted AI tests.
- `.trellis/spec/backend/database-guidelines.md`: AI session tables are existing MySQL tables; user history is user-visible soft delete; no schema-only entity changes.
- `.trellis/spec/backend/error-handling.md`: invalid request params should throw `IllegalArgumentException` for HTTP 400; not broad controller catches.
- `.trellis/spec/backend/logging-guidelines.md`: do not log prompts, full AI content, tokens, or secrets.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: reuse `src/api.js`, existing admin UI, `ApiResponse`, `PageResponse`, and `AiChatService/service.ai.*` paths.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: define exact API signatures, payloads, validation/error matrix, Good/Base/Bad cases, and tests before coding.

## Retrieval Report

- Keywords searched: `ai-management`, `AI 会话`, `adminFetchAiAuditSessions`, `AdminAiChatAuditController`, `AdminAiChatAuditService`, `AiChatSessionRepository`, `PageResponse`, `PageRequest`, `JpaSpecificationExecutor`, `sessions`, `userVisible`, `guest`.
- Candidate implementations:
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`: real `/admin/ai-management` view (`AiAdminAuditView`) and nearby admin pagination examples.
  - `SanguiBlog-front/src/api.js`: single API facade; currently exposes `adminFetchAiAuditSessions()` without params.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAiChatAuditController.java`: existing SUPER_ADMIN audit endpoint owner.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AdminAiChatAuditService.java`: existing audit DTO mapping and detail loading owner.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AiChatSessionRepository.java`: existing session repository with `@EntityGraph` for user/role.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PageResponse.java`: existing paginated response DTO.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AdminUserService.java` and `AnalyticsService.java`: existing service-side `PageRequest`, `PageResponse`, filter/spec patterns.
- Decision: modify existing paths, using server-side pagination on the existing audit list endpoint.
- Duplicate risk: no new controller, service, API wrapper, DB table, or admin page is needed; detail endpoint and user-side AI chat history remain separate.

## Code Patterns Found

### Current AI Audit List Bottleneck

- `SanguiBlog-front/src/api.js:869` defines:
  - `adminFetchAiAuditSessions = () => request("/admin/ai-chat/sessions")`
  - no pagination or filter params.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx:4511-4529`:
  - `loadSessions()` calls `adminFetchAiAuditSessions()`.
  - It treats response `data` as a raw array.
  - It stores all sessions and selects `data[0]?.id`.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx:4558-4573`:
  - `filteredSessions` is client-side filtering over the full in-memory list.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx:4668-4721`:
  - the left pane maps every `filteredSessions` row into a button, so render cost grows with all matching sessions.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAiChatAuditController.java:24-27`:
  - `GET /api/admin/ai-chat/sessions` returns `ApiResponse<List<AdminAiChatSessionDto>>`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AdminAiChatAuditService.java:27-32`:
  - `listSessions()` streams `findAllByOrderByUpdatedAtDescIdDesc()` and maps every row.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AiChatSessionRepository.java:21-22`:
  - repository eagerly loads `user` and `user.role`, but only returns a full `List`.

### Existing Pagination Patterns To Reuse

- `PageResponse<T>` is the standard shape: `records`, `total`, `page`, `size`.
- `PostService.listPublished(...)` clamps `page`/`size`, uses `PageRequest`, and returns `new PageResponse<>(...)`.
- `AdminUserService.list(...)` uses `Specification<User>`, `PageRequest`, and `PageResponse<AdminUserDto>`.
- `AnalyticsService.loadPageViews(...)` uses `JpaSpecificationExecutor`, cap size to 200, and maps `Page` to `PageResponse`.
- `AdminPanel.jsx` has existing page state and pagination item generation in the analytics view; reuse style and state concepts instead of inventing another global system.

### Existing AI Session Contracts To Preserve

- `AiChatSession` fields already support this task: `user`, `guestVisitorId`, `sessionStartIp`, `latestIp`, `ipChanged`, `userVisible`, `userHiddenAt`, `createdAt`, `updatedAt`.
- `sanguiblog_db.sql` already defines AI chat session fields. No migration is required.
- `AdminAiChatAuditService.getSessionDetail(...)` loads details by id and messages in ascending order; this is not the performance bottleneck and should remain narrow.
- User-side history has separate behavior in `AiAssistantWidget.jsx` and service visibility rules; this task must not change it.

## Files Likely To Modify

Backend:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAiChatAuditController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AdminAiChatAuditService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AiChatSessionRepository.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AdminAiChatAuditServiceTest.java`

Frontend:

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-front/src/appfull/AdminAiAuditPagination.test.js` (new targeted static/contract test)

Trellis:

- `.trellis/tasks/06-29-ai-session-audit-list-pagination/prd.md`
- `.trellis/tasks/06-29-ai-session-audit-list-pagination/research.md`
- `.trellis/tasks/06-29-ai-session-audit-list-pagination/implement.jsonl`
- `.trellis/tasks/06-29-ai-session-audit-list-pagination/check.jsonl`

## Risk / Boundary Notes

- Response shape changes from list to `PageResponse`; the known consumer is `adminFetchAiAuditSessions` in the admin audit view. Update frontend and backend together.
- Client-only filters cannot remain the source of truth after backend paging, or filter totals and pages become misleading. Send filter params to backend.
- Preserve current visibility semantics:
  - `VISIBLE` excludes guests and hidden user sessions.
  - `HIDDEN` includes guests plus hidden user sessions.
- Keep `@EntityGraph(attributePaths = {"user", "user.role"})` or equivalent eager fetch to avoid introducing N+1 role/user lookups on each page.
- Sorting must include id as a tie breaker for stable pagination.
- Do not add schema/index work in this task unless a real query plan problem is proven during implementation. Current request is about avoiding unbounded fetch/render.
- Do not run provider/RAG/chat message content through logs or new debug statements.
- Existing active Trellis task `06-07-06-07-version-2-3-2-readme-cleanup` is unrelated and assigned to DeepSeek; do not reuse it.

## Required Tests

Backend commands:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AdminAiChatAuditServiceTest" test
mvn -q -DskipTests compile
```

Frontend commands:

```bash
cd SanguiBlog-front
node src/appfull/AdminAiAuditPagination.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Repo/Trellis commands:

```bash
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-29-ai-session-audit-list-pagination
```
