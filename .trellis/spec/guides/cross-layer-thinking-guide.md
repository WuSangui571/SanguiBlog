# Cross-Layer Thinking Guide

> Purpose: define executable contracts before changing data that crosses backend, database, frontend, browser storage, SSE, upload, or AI boundaries.

---

## When This Is Mandatory

Use this guide for any change involving:

- New or changed API path, method, request field, response field, or status.
- Database schema/entity/repository changes.
- Frontend `api.js` changes.
- Backend DTO consumed by frontend.
- Upload path/size/content-type behavior.
- Auth, permissions, BotGuard, guest AI access.
- SSE stream events or AI chat payloads.
- Site meta, sitemap, robots, analytics, system monitor.
- RAG/vector-store synchronization.

---

## Contract Template

Before implementation, write a short contract:

```markdown
## Cross-Layer Contract

### 1. Scope / Trigger
<what changes and why it crosses layers>

### 2. Signatures
- Backend: <HTTP method path or service method>
- Frontend: <api.js function and consumer>
- DB: <table/columns if changed>
- Env/config: <keys if changed>

### 3. Payloads
Request:
Response:
SSE event / upload form / storage key:

### 4. Validation & Error Matrix
| Case | Expected status/result |

### 5. Good / Base / Bad Cases

### 6. Tests Required
<backend tests, frontend node tests, build/compile>
```

---

## Data Flow Map

Map the complete path:

```text
UI state -> src/api.js -> Controller -> Service -> Repository/DB
        -> Service DTO mapping -> ApiResponse -> src/api.js parsing -> Component rendering
```

For AI chat:

```text
AiAssistantWidget -> api.js streamAiChatReliable
-> AiChatController -> AiChatService
-> access/session/context/RAG/capability services
-> ChatModel/SSE -> api.js consumeSseStream -> UI messages
```

For uploads:

```text
Form state -> upload function in api.js -> UploadController multipart validation
-> StoragePathResolver/PostAssetService/AvatarStorageService
-> returned URL/path -> component save/publish payload
```

---

## Project API Contracts

### JSON APIs

Standard response:

```json
{ "success": true, "message": "ok", "data": {} }
```

Frontend parsing:

```js
const data = res.data || res;
```

Errors must put user-facing text in `message`.

### Pagination

Backend response is 1-based:

```json
{ "records": [], "total": 0, "page": 1, "size": 10 }
```

Frontend clamps page/size before request and normalizes response.

### SSE AI Chat

Events:

- `chunk`: `{ "text": "..." }`
- `complete`: `{ "reply", "sessionId", "model", "mode", "references" }`
- `error`: `{ "message": "..." }`

`complete` is terminal success. Frontend must not replace a completed message with a later network error.

### Uploads

Multipart endpoints do not use JSON request body. They still return JSON `ApiResponse`.

Current limits:

- cover: 10 MB
- article asset single: 20 MB
- article asset total: 50 MB
- article asset count: 10
- Spring multipart: 60 MB

### Custom Headers

Chinese analytics labels are URL-encoded in frontend headers and decoded in `PostController`.

Do not put raw non-ISO-8859-1 strings into `fetch` headers.

---

## Validation & Error Matrix Example

| Case | Backend | Frontend |
|------|---------|----------|
| Missing post | `NotFoundException` -> 404 | article state `not_found` |
| Invalid archive month | 400 | show load error/fallback |
| Stale token on public GET | 401 then retry without auth | user can still see public content |
| AI assistant disabled | access exception / unavailable | launcher hidden from site meta; backend still rejects calls |
| Guest AI throttled | 403/429 with structured data | captcha/notice flow |
| Upload too large | 400/413 depending layer | show readable message and prevent save while uploading |

---

## Good / Base / Bad Cases

Every cross-layer change should include:

- Good: normal successful path.
- Base: empty/null/default path.
- Bad: invalid input, unauthorized access, missing entity, provider failure, or stale schema.

Example for site meta field:

- Good: backend returns configured `homeBackgroundUrl`; frontend renders it.
- Base: field missing/null; frontend falls back to `/static/home/bg.jpg`.
- Bad: asset origin has path prefix; URL builder avoids duplicate segments.

---

## Tests Required

| Layer Changed | Test |
|---------------|------|
| Backend service only | targeted Maven service test |
| Controller/security | targeted controller/security test |
| Entity/schema/repository | repository/service test plus SQL review |
| Frontend helper | sibling `node *.test.js` |
| Frontend component | targeted static test plus build |
| Backend + frontend | backend targeted tests, frontend static tests/build, field alignment review |
| AI/SSE | AI service tests plus `aiStream`/AI widget tests where relevant |

If a test is skipped, say so and document residual risk.

