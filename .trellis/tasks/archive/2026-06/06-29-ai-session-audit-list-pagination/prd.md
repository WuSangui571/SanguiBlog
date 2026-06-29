# AI Session Audit List Pagination PRD

## 1. Task Classification

- Range: Complex Task.
- Reason: The slow loading issue spans the admin React page, `src/api.js`, backend admin API response shape, service/repository pagination, and AI session audit DTO contracts.
- Coding owner: DeepSeek later.
- Codex scope in this round: planning, PRD, spec/context prep, code research, test plan only.

## 2. Problem

`/admin/ai-management` loads the AI session audit page. The left session list currently requests every audit session through `GET /api/admin/ai-chat/sessions`, stores all rows in `AdminPanel.jsx`, filters them in memory, and renders all matching buttons. When `ai_chat_sessions` grows, initial page load and rendering time grow with total historical sessions.

## 3. Goal

Make the admin AI session list load only a bounded page on first entry and on navigation/filter changes, while preserving the existing detail panel behavior and all AI chat/session persistence contracts.

Preferred implementation: server-side pagination, not infinite scroll, because this repo already uses `PageResponse<T>` and admin pagination controls in nearby admin views.

## 4. Non-Goals / Forbidden Scope

- Do not change public/user-side AI assistant history behavior in `AiAssistantWidget.jsx`.
- Do not change chat send, SSE stream, RAG retrieval, provider calls, guest access limits, captcha, or session persistence writes.
- Do not add or change DB schema for this task.
- Do not add a new duplicate AI audit controller/service/page. Extend the existing `AdminAiChatAuditController`, `AdminAiChatAuditService`, `AiChatSessionRepository`, `src/api.js`, and `AiAdminAuditView` path.
- Do not change authorization semantics: AI audit remains SUPER_ADMIN-only.
- Do not introduce React Query/SWR/Redux or a new API wrapper.
- Do not bundle unrelated admin page redesign, AI settings, analytics, user-side delete, or README/version changes.

## 5. Acceptance Criteria

1. First visit to `/admin/ai-management` calls the session list API with bounded pagination, defaulting to page `1` and size `20` or another documented small default.
2. The backend returns `ApiResponse<PageResponse<AdminAiChatSessionDto>>` with `records`, `total`, `page`, and `size`.
3. The page renders only the current page of session rows and provides clear page navigation or equivalent lazy-load controls.
4. Existing filters keep their semantics over the full audit dataset, not only the current client page:
   - visibility `ALL`: all sessions.
   - visibility `VISIBLE`: logged-in user sessions where `userVisible` is not false.
   - visibility `HIDDEN`: logged-in hidden sessions plus guest sessions, matching current UI semantics where guests are not user history.
   - identity `ALL`: all identities.
   - identity `LOGGED_IN`: sessions with `user_id` present.
   - identity `GUEST`: sessions with `user_id` absent.
5. Changing visibility or identity filter resets to page `1`, reloads from the backend, updates `total`, and selects a valid first row when the previous active session is not on the new page.
6. Selecting a row still loads only that session detail through `GET /api/admin/ai-chat/sessions/{sessionId}`.
7. Empty, error, and loading states remain readable; no native `alert` or `confirm` is introduced.
8. Backend sorting remains newest first: `updatedAt DESC, id DESC`.
9. No schema migration is required.

## 6. Cross-Layer Contract

### 6.1 Signatures

Backend list endpoint:

```text
GET /api/admin/ai-chat/sessions?page=1&size=20&visibility=ALL&identity=ALL
Authorization: SUPER_ADMIN-only, unchanged
```

Backend detail endpoint:

```text
GET /api/admin/ai-chat/sessions/{sessionId}
```

Frontend API facade:

```js
adminFetchAiAuditSessions({ page = 1, size = 20, visibility = 'ALL', identity = 'ALL' })
adminFetchAiAuditSessionDetail(sessionId)
```

DB:

- Reuse existing `ai_chat_sessions` columns: `id`, `user_id`, `user_visible`, `updated_at`, `guest_visitor_id`, `session_start_ip`, `latest_ip`, `ip_changed`, `ip_changed_at`, `user_hidden_at`.
- No new column, table, index, or SQL migration is required for this task.

### 6.2 Request Fields

| Field | Type | Default | Validation | Meaning |
|---|---:|---:|---|---|
| `page` | integer | `1` | clamp values `< 1` to `1` | 1-based page number |
| `size` | integer | `20` | clamp to `1..50` unless implementation documents a repo-consistent cap | page size |
| `visibility` | string enum | `ALL` | one of `ALL`, `VISIBLE`, `HIDDEN` | session visibility filter |
| `identity` | string enum | `ALL` | one of `ALL`, `LOGGED_IN`, `GUEST` | logged-in vs guest filter |

Invalid enum values should fail with HTTP 400 through `IllegalArgumentException` and `GlobalExceptionHandler`, not silently return a misleading dataset.

### 6.3 Response Fields

Success body:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "records": [
      {
        "id": 12,
        "title": "RAG debug",
        "lastMessagePreview": "...",
        "createdAt": "2026-03-18T06:00:00Z",
        "updatedAt": "2026-03-18T06:30:00Z",
        "userId": 8,
        "username": "alice",
        "displayName": "Alice",
        "userTitle": "",
        "roleCode": "SUPER_ADMIN",
        "roleName": "Super Admin",
        "guest": false,
        "guestVisitorId": null,
        "sessionStartIp": null,
        "latestIp": null,
        "ipChanged": false,
        "ipChangedAt": null,
        "userVisible": true,
        "userHiddenAt": null
      }
    ],
    "total": 124,
    "page": 1,
    "size": 20
  }
}
```

### 6.4 Validation / Error Matrix

| Case | Expected result |
|---|---|
| Missing query params | HTTP 200, page 1, default size, no filters |
| `page=0` or negative | HTTP 200, treated as page 1 |
| `size=0` or negative | HTTP 200, treated as minimum size 1 or default; document exact choice in tests |
| `size` above cap | HTTP 200, cap to max, response `size` reports actual backend size |
| invalid `visibility` | HTTP 400, `ApiResponse.fail(message)` |
| invalid `identity` | HTTP 400, `ApiResponse.fail(message)` |
| no matching sessions | HTTP 200, `records=[]`, `total=0`, page metadata present |
| non-SUPER_ADMIN request | unchanged 403/security behavior |
| detail id missing | unchanged 404 `ResponseStatusException` path |

### 6.5 Good / Base / Bad Cases

Good:

- Many sessions exist. `/admin/ai-management` initially loads only page 1, displays current page records, total count, and page controls. Clicking next loads page 2 without fetching all sessions.
- Applying `identity=GUEST` returns only guest rows and a correct filtered total.

Base:

- Exactly zero AI sessions exist. The page shows the current empty state and no detail panel crash.
- Current active detail disappears after filter/page change. The UI selects the first available record or clears the detail panel.

Bad:

- Invalid filter values return 400 and a readable error.
- A session is deleted/hidden between list and detail requests. The list remains usable and detail error is shown only in the detail panel.
- Large datasets do not cause `AdminPanel.jsx` to render every historical session.

## 7. Expected Implementation Plan

1. Backend repository/service:
   - Extend `AiChatSessionRepository` to support pageable audit queries with user/role eagerly loaded, using either `JpaSpecificationExecutor<AiChatSession>` plus an `@EntityGraph` override or an explicit pageable JPQL query.
   - Keep sort `updatedAt DESC, id DESC`.
   - Add a paginated `AdminAiChatAuditService.listSessions(page, size, visibility, identity)` returning `PageResponse<AdminAiChatSessionDto>`.
   - Keep `getSessionDetail(sessionId)` unchanged except for imports if needed.

2. Backend controller:
   - Change `AdminAiChatAuditController.sessions(...)` to accept `page`, `size`, `visibility`, and `identity`.
   - Return `ApiResponse<PageResponse<AdminAiChatSessionDto>>`.
   - Preserve class-level `@PreAuthorize("hasRole('SUPER_ADMIN')")`.

3. Frontend API:
   - Change `adminFetchAiAuditSessions()` in `SanguiBlog-front/src/api.js` to accept params and append `page`, `size`, `visibility`, `identity` through `URLSearchParams`.
   - Do not add a second API wrapper.

4. Frontend admin UI:
   - In `AiAdminAuditView` inside `AdminPanel.jsx`, replace all-sessions state with paginated state: `sessions`, `page`, `size`, `total`, filters, loading/error.
   - Remove client-only full-list filtering as the source of truth; use backend filters for list requests.
   - Reset page to 1 on filter changes.
   - Add page controls similar to existing admin analytics/users/posts controls, scoped to the left list.
   - Preserve detail loading by active session id.

5. Tests:
   - Update backend service tests for PageResponse metadata, clamped paging, sorting/pageable, DTO mapping, guest metadata, hidden/user-visible semantics, and invalid enum values.
   - Add/update frontend static tests to assert `adminFetchAiAuditSessions` accepts pagination/filter params and `AiAdminAuditView` no longer maps unbounded `filteredSessions` from all records.
   - Run targeted backend/frontend commands listed below.

## 8. Required Tests And Assertion Points

Backend:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AdminAiChatAuditServiceTest" test
mvn -q -DskipTests compile
```

Backend assertion points:

- `listSessions` returns `PageResponse` with `records`, `total`, `page`, `size`.
- `PageRequest` is 0-based internally but response page is 1-based.
- Size is capped.
- Sorting includes `updatedAt DESC` then `id DESC`.
- DTO mapping still includes user role fields, guest IP fields, `userVisible`, and `userHiddenAt`.
- Invalid `visibility`/`identity` throws `IllegalArgumentException`.
- Detail 404 behavior remains covered.

Frontend:

```bash
cd SanguiBlog-front
node src/appfull/AdminAiAuditPagination.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Frontend assertion points:

- `adminFetchAiAuditSessions({ page, size, visibility, identity })` produces `/admin/ai-chat/sessions?...`.
- The AI audit view calls the API with current page/size/filter state.
- Filter changes reset to page 1.
- The rendered list maps only current `sessions` records returned by the backend.
- No native dialogs are introduced.

Repository-wide:

```bash
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-29-ai-session-audit-list-pagination
```

## 9. Open Questions

No user confirmation is required before coding if the chosen implementation is server-side pagination with page controls. Infinite scroll is acceptable only if it still uses the same paginated backend contract and does not require fetching all sessions.
