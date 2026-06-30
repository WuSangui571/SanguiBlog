# Production Article Publish 504 RAG Dependency Isolation PRD

## 1. Task Classification

- Scope judgment: Complex Task.
- Reason: the production incident spans backend post publishing, optional AI/RAG knowledge synchronization, Spring AI embedding/provider calls, PgVector capability reporting, Docker Compose DNS/runtime configuration, deployment smoke checks, admin status UI copy, and regression tests.
- Current branch at planning start: `main`.
- Working tree at planning start: clean.
- Codex phase limit for this round: planning, Trellis context, spec reading, focused code research, and test plan only. Do not implement business code in this round.
- Implementation owner for next round: DeepSeek.

## 2. Current Project State From Workspace Journal

The workspace journal records 31 sessions. The latest recorded session is:

- Session 31, `2026-06-29`, "AI audit session pagination closeout".
- Branch: `feature/ai-session-audit-list-pagination`.
- Main commits: `7bd2e2a` and `f55ed03`, followed by current `main` commits including `ea460de chore:归档AI会话审计分页任务`.
- Status: completed and manually accepted.
- Follow-up from that record: Trellis archive/journal metadata was to be committed/pushed, then merged/deployed as V2.3.4. Current `main` already includes recent closeout commits.

Current Trellis context:

- Current task before this PRD: none.
- Active unrelated task: `.trellis/tasks/06-07-06-07-version-2-3-2-readme-cleanup` in `planning` for `deepseek`.
- New task created for this work: `.trellis/tasks/06-30-06-30-prod-rag-publish-isolation`.

## 3. Production Incident Summary

After the `2026-06-29` production update, uploading article images succeeded, but publishing an article returned Nginx `504 Gateway Time-out`. The public article list/detail remained mostly usable. The backend login experience also temporarily looked like an internal server error or token loss.

Evidence supplied by the user:

- MySQL, PgVector, web, and backend containers were running.
- PgVector extension existed: `vector 0.8.2`.
- `public.vector_store` existed.
- The actual failure was backend-container DNS failure resolving the external embedding provider domain.
- Logs included:
  - `I/O error on POST request for "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings"`
  - `Caused by: java.nio.channels.UnresolvedAddressException`
- Before the production DNS fix:
  - `getent hosts dashscope.aliyuncs.com` returned no output inside backend.
  - `wget -S --spider -T 5 https://dashscope.aliyuncs.com/compatible-mode/v1/models` failed with `bad address`.
- After the production DNS fix:
  - backend could resolve `dashscope.aliyuncs.com`.
  - provider probe quickly returned `401 Unauthorized`, which is the expected unauthenticated network-reachability signal.

Root cause:

```text
Article publish/update request
-> PostService saves post in the core publish path
-> PostService synchronously calls aiBlogKnowledgeSyncService.syncPostKnowledge(...)
-> RAG sync calls Spring AI / PgVectorStore embedding provider
-> backend container DNS cannot resolve provider host
-> Spring AI/provider call retries or blocks
-> HTTP request exceeds frontend/Nginx wait time
-> user sees 504 even though the post may already be saved
```

The root flaw is not PgVector itself. The flaw is that optional AI/RAG synchronization is coupled synchronously to the core blog publish flow.

## 4. Scope For This Trellis Task

This task intentionally covers the P0/P1 stabilization slice only.

### In Scope

1. P0: Decouple article publish/update from RAG knowledge sync.
2. P1: Fix misleading RAG disabled/capability copy so `AI_RAG_ENABLED=false` is not reported as "PgVector not configured".
3. P1: Sync the production `backend.dns` Compose fix back into repository Compose files.
4. P1: Add deployment/smoke-check documentation for backend-container AI provider DNS/reachability and PgVector `vector_store`.
5. Add focused backend/frontend/static/docs tests or assertions for the changed contracts.

### Out Of Scope For This Task

- Do not implement a durable DB-backed RAG job table in this slice unless the implementer proves the event/executor approach cannot meet acceptance criteria.
- Do not add full circuit breaker / retry budget state in this slice. That is a P2 follow-up.
- Do not tune Spring AI HTTP client internals or add provider timeout properties in this slice unless needed for compile-safe async decoupling.
- Do not redesign AI chat, SSE, guest access, or AI provider selection.
- Do not change PgVector table schema or vector document ID format.
- Do not change post create/update API payloads.
- Do not change the public article list/detail behavior.
- Do not implement the P2 frontend auth/token UX task in this slice.
- Do not perform production v2rayA / iptables / nftables investigation in this slice.
- Do not create a new admin page for RAG. Reuse the existing `/admin/settings` AI assistant settings section.
- Do not log API keys, JWTs, prompts, full article content, full knowledge text, or raw provider payloads.

## 5. Goals

1. Publishing or updating an article must return success after the post is saved even when RAG/embedding provider DNS fails, returns `401/403`, times out, or PgVector/vector store is unavailable.
2. RAG sync failures must be logged and reflected through existing safe status surfaces, not thrown into the publish HTTP request.
3. Existing MySQL post write, sitemap dirty mark, and response DTO behavior must stay intact.
4. Admin AI/RAG status must distinguish:
   - RAG disabled by environment (`AI_RAG_ENABLED=false`);
   - RAG disabled by administrator;
   - PgVector config missing;
   - embedding model missing;
   - embedding model bean unavailable;
   - vector store unavailable.
5. Repository Compose files must preserve the production DNS fix so future deploys do not regress.
6. Docker deployment docs must include backend-container DNS/provider smoke checks and PgVector table checks.

## 6. Existing Ownership / Reuse Decision

### Retrieval Report

- Keywords searched:
  - `syncPostKnowledge`, `AiBlogKnowledgeSyncService`, `markDirty`, `PostService`, `AiBlogRagProperties`, `isConfigured`, `ragDisabledReason`, `aiRagCapable`, `sg_token`, `fetchCurrentUser`, `dns:`, `dashscope`, `vector_store`, `getent`, `wget`, `@Async`, `ApplicationEventPublisher`, `TaskExecutor`.
- Candidate implementations:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`: current post create/update owner; directly calls `syncPostKnowledge` after `postRepository.save(...)`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncService.java`: current blog RAG knowledge sync worker; already catches vector add/delete failures and writes `syncStatus=FAILED` / `lastError`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiCustomKnowledgeSyncService.java`: similar RAG sync pattern for custom docs; useful for shared status/capability decisions.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`: current `isConfigured()` incorrectly includes `enabled`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`: owns admin/site meta AI/RAG capability and disabled reason strings.
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`: existing admin AI chat/RAG settings UI already reads and displays `aiRagDisabledReason`.
  - `docker-compose.prod.yml` and `docker-compose.yml`: existing backend service definitions where DNS must be added.
  - `docs/docker-deploy.md`: existing Docker deployment guide with AI provider diagnostics, but currently focuses on `web`/temporary container diagnostics rather than the backend container that performs embeddings.
- Decision:
  - Modify existing ownership paths.
  - Add a small async/event dispatch boundary only around existing `AiBlogKnowledgeSyncService` if needed.
  - Do not create a parallel post service, RAG service, admin settings page, or API wrapper.
- Duplicate risk:
  - Creating a second RAG sync path would bypass existing knowledge document/chunk persistence, flush ordering, status fields, and tests.
  - Creating a second AI settings endpoint/UI would duplicate `AiAssistantSettingService` capability semantics.
  - Creating a second frontend API wrapper would bypass token/error normalization in `src/api.js`.

## 7. Cross-Layer Contract

### 7.1 Core Publish API Signatures

No API path or payload changes are expected.

Existing article create path:

```text
POST /api/posts
Authorization: PERM_POST_CREATE
Request: SavePostRequest
Response: ApiResponse<PostDetailDto>
```

Existing article update path:

```text
PUT /api/posts/{id}
Authorization: PERM_POST_EDIT
Request: SavePostRequest
Response: ApiResponse<PostDetailDto>
```

Existing admin metadata/publish path:

```text
PUT /api/admin/posts/{id}
Authorization: PERM_POST_EDIT
Request: AdminPostUpdateRequest
Response: ApiResponse<PostAdminDto>
```

`SavePostRequest` fields remain:

```json
{
  "id": 123,
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "coverImage": "string",
  "contentMd": "string",
  "contentHtml": "string",
  "themeColor": "string",
  "categoryId": 1,
  "tagIds": [1, 2],
  "status": "PUBLISHED"
}
```

`AdminPostUpdateRequest` fields remain:

```json
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "coverImage": "string",
  "status": "PUBLISHED",
  "themeColor": "string",
  "categoryId": 1,
  "tagIds": [1, 2]
}
```

### 7.2 Required Publish Side Effects

For successful post create/update:

```text
validate request
-> save post in MySQL
-> mark sitemap dirty
-> schedule/enqueue RAG sync request without waiting for embedding/vector provider
-> return ApiResponse success
```

The HTTP response must not wait on:

- `VectorStore.add(...)`;
- `VectorStore.delete(...)`;
- PgVector similarity/vector operations;
- Spring AI embedding API calls;
- external provider DNS/connect/read/retry behavior.

If RAG scheduling itself fails unexpectedly, the post API should still succeed after the post is saved and sitemap is marked dirty, while logging a sanitized warning.

### 7.3 RAG Sync Execution Contract

Preferred minimal architecture:

```text
PostService
-> publishes/records a post knowledge sync request after the post save
-> transaction commits
-> after-commit listener submits sync work to a bounded executor
-> existing AiBlogKnowledgeSyncService.syncPostKnowledge(postId) runs off the request thread
```

Implementation options that satisfy the contract:

- `ApplicationEventPublisher` + `@TransactionalEventListener(phase = AFTER_COMMIT)` + bounded `TaskExecutor`.
- Direct after-commit registration using Spring transaction synchronization + bounded `TaskExecutor`.
- A narrow in-memory queue/dispatcher service if the implementation keeps bounded concurrency and does not wait in the request path.

Do not use unbounded async execution. If `@Async` is used, add explicit `@EnableAsync` and a named bounded executor.

Minimum executor contract:

- small bounded worker count, for example one or two RAG sync workers;
- bounded queue capacity;
- rejected tasks are logged safely and do not fail the publish request;
- thread names identify RAG sync work;
- no API key or content leakage in logs.

### 7.4 RAG Status / Capability Payloads

Existing admin settings API remains:

```text
GET /api/admin/ai-assistant-settings
PUT /api/admin/ai-assistant-settings
Response: ApiResponse<AiAssistantAdminSettingsDto>
```

Existing public site meta remains:

```text
GET /api/site/meta
Response: ApiResponse<SiteMetaDto>
```

`AiAssistantAdminSettingsDto` already includes:

```json
{
  "aiChatAdminEnabled": true,
  "aiRagAdminEnabled": false,
  "aiChatCapable": true,
  "aiRagCapable": false,
  "aiChatEffectiveEnabled": true,
  "aiRagEffectiveEnabled": false,
  "aiChatDisabledReason": null,
  "aiRagDisabledReason": "RAG disabled by environment",
  "enabled": true
}
```

`SiteMetaDto.AiAssistantDto` already includes:

```json
{
  "enabled": true,
  "capable": true,
  "ragEnabled": false,
  "ragCapable": false,
  "disabledReason": null,
  "ragDisabledReason": "RAG disabled by environment",
  "assistantName": "...",
  "title": "...",
  "welcomeMessage": "...",
  "inputPlaceholder": "...",
  "pendingReply": "..."
}
```

Required semantic correction:

- `AI_RAG_ENABLED=false` must produce a reason equivalent to "RAG disabled by environment", not "PgVector not configured".
- `ai.rag.pgvector.url/username/password/schema/table` missing must produce "PgVector not configured".
- missing embedding model must produce "embedding model not configured".
- missing `EmbeddingModel` bean must produce "embedding model not available".
- missing `VectorStore` bean must produce "vector store not available".
- RAG admin switch off while all capability conditions pass must produce "RAG is disabled by administrator".

`AiBlogRagProperties.isConfigured()` should no longer mean "environment enabled and PgVector configured". Split capability concepts, for example:

```text
isRagEnvironmentEnabled()
isPgVectorConfigured()
isRagCapableConfig()
```

The exact method names can differ, but the semantics must be separated.

### 7.5 Compose DNS Contract

`docker-compose.prod.yml` backend service must include repository-backed DNS configuration matching the production hotfix:

```yaml
backend:
  dns:
    - 223.5.5.5
    - 119.29.29.29
    - 8.8.8.8
```

Also add to `docker-compose.yml` unless implementation documents why local compose should intentionally differ.

### 7.6 Deployment Smoke Commands

Document backend-container checks because backend, not web, performs embedding calls:

```bash
docker compose -f docker-compose.prod.yml exec backend sh -lc 'getent hosts dashscope.aliyuncs.com'
docker compose -f docker-compose.prod.yml exec backend sh -lc 'wget -S --spider -T 5 https://dashscope.aliyuncs.com/compatible-mode/v1/models || true'
docker compose -f docker-compose.prod.yml exec pgvector sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT to_regclass('\''public.vector_store'\'');"'
```

Acceptance semantics:

- provider `401` or `403` from `/models` is a successful network/DNS smoke signal when no API key is sent.
- `bad address`, DNS failure, connect timeout, or read timeout means provider network is unavailable.
- missing `vector_store` should prompt setting `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=true` temporarily for initialization.
- Smoke checks must not print API key values.

## 8. Validation / Error Matrix

| Case | Expected Result | Assertion Point |
|---|---|---|
| RAG disabled by env, create post with `status=PUBLISHED` | Post save returns success; no vector store/provider lookup is required | backend unit test; no direct `syncPostKnowledge` wait |
| RAG enabled, vector/embedding call throws `UnresolvedAddressException` or wrapped provider exception | Publish/update API still returns success after saving post | mocked async dispatcher / sync worker test |
| RAG enabled, provider returns `401/403` during embedding | Publish/update API still returns success; RAG document status becomes `FAILED` or safe failure is logged | `AiBlogKnowledgeSyncServiceTest` with vector add exception |
| RAG enabled, provider blocks until executor thread is occupied | HTTP request thread does not wait on provider | `PostService` calls dispatcher only; no direct vector call |
| RAG sync task rejected due bounded queue full | Post API still succeeds; sanitized warning includes `postId` and reason | dispatcher test |
| `AI_RAG_ENABLED=false` | admin/site meta reason is "RAG disabled by environment" | `AiAssistantSettingServiceTest` |
| PgVector URL/user/password/schema/table missing and env enabled | reason is "PgVector not configured" | `AiAssistantSettingServiceTest` / property test |
| embedding model missing | reason is "embedding model not configured" | existing/updated setting service test |
| `EmbeddingModel` unavailable | reason is "embedding model not available" | existing/updated setting service test |
| `VectorStore` unavailable | reason is "vector store not available" | existing/updated setting service test |
| RAG admin disabled while capability exists | reason is "RAG is disabled by administrator" | setting service test |
| Compose config rendered | Compose validates and backend contains DNS entries | `docker compose config --quiet`, `docker compose -f docker-compose.prod.yml config --quiet` |
| docs smoke check | deployment guide contains backend `getent hosts`, provider probe, PgVector `to_regclass` | static grep/manual review |

## 9. Good / Base / Bad Cases

| Case | Scenario | Expected Result |
|---|---|---|
| Good | Published article save/update succeeds, RAG provider reachable | HTTP success returns post DTO; RAG worker updates knowledge chunks asynchronously |
| Good | Published article save/update succeeds, provider DNS fails | HTTP success returns post DTO; RAG worker records/logs failure; user sees no 504 |
| Good | Existing published post updated to draft | HTTP success; RAG removal/sync request is scheduled without blocking request |
| Base | `AI_RAG_ENABLED=false` | Core blog/admin/upload flows remain usable; admin status clearly says environment disabled |
| Base | PgVector healthy but vector_store missing | status says vector store not available or PgVector table missing according to implementation detail; docs point to initialization flag |
| Bad | Embedding API returns `401/403` | RAG status/log shows failure; API key is not printed; post publish still succeeds |
| Bad | Executor queue saturated | publish still succeeds; RAG task may be skipped or logged as delayed/rejected; no request 500/504 |
| Bad | Compose DNS omitted in repository | validation must fail review; this is the production regression vector |

## 10. Files Likely To Modify In Implementation

Backend:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncService.java`
- New or modified dispatcher/event files under `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/`, for example:
  - `AiBlogKnowledgeSyncRequest.java`
  - `AiBlogKnowledgeSyncDispatcher.java`
  - `AiBlogKnowledgeSyncEventListener.java`
- New or modified config under `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/`, for example:
  - `AiRagSyncExecutorConfig.java`
  - or an existing config class if one clearly owns async execution.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`
- Possibly `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`
- Possibly `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiCustomKnowledgeSyncService.java` if property method names change.

Backend tests:

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncServiceTest.java`
- New `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncDispatcherTest.java` or equivalent.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java`
- New `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/AiBlogRagPropertiesTest.java` if property semantics are easier to isolate there.
- Possibly a new `PostService` unit test if existing constructor dependencies are manageable.

Frontend:

- `SanguiBlog-front/src/appfull/AdminPanel.jsx` only if copy/status labels need adjustment beyond backend reason strings.
- `SanguiBlog-front/src/appfull/AdminAiAssistantSettingsContract.test.js`
- `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js` only if public meta reason behavior needs coverage.

Infra/docs:

- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/docker-deploy.md`
- Possibly `.env.example` and `README.md` / `README.zh-CN.md` if the implementation adds or documents new env keys. Avoid version bump unless the user asks for release docs.

Trellis:

- `.trellis/tasks/06-30-06-30-prod-rag-publish-isolation/*`

## 11. Implementation Plan For DeepSeek

### Phase 1: Write Failing Backend Tests

1. Add or update tests proving `AI_RAG_ENABLED=false` is reported as environment-disabled, not PgVector-missing.
2. Add or update tests proving missing PgVector config is only reported when RAG env is enabled.
3. Add a test proving RAG sync worker failure marks/logs failure without throwing beyond the worker boundary.
4. Add a dispatcher/request-path test proving publish code does not call `syncPostKnowledge` synchronously.

### Phase 2: Split RAG Configuration Semantics

1. Refactor `AiBlogRagProperties.isConfigured()` semantics or add new methods so env enabled and PgVector configured are separate.
2. Update `AiAssistantSettingService.isRagCapable()` and `buildRagDisabledReason(...)` to use the separated methods.
3. Update `AiBlogKnowledgeSyncService`, `AiCustomKnowledgeSyncService`, and `AiBlogRagService` to use the correct operational/capability checks.
4. Keep all reason strings safe and stable.

### Phase 3: Add Async/After-Commit RAG Sync Dispatch

1. Replace direct `aiBlogKnowledgeSyncService.syncPostKnowledge(saved.getId())` calls in `PostService.saveOrUpdate(...)` and `PostService.updateMeta(...)` with the new dispatcher/request method.
2. Evaluate `PostService.delete(...)` too. Deleting post knowledge can hit vector store; it should also be decoupled or explicitly justified if left synchronous.
3. Ensure the dispatch occurs after commit or cannot run vector sync before the saved post transaction is durable.
4. Ensure dispatcher errors/rejections do not fail the post request.
5. Keep `sitemapService.markDirty()` on the core request path.

### Phase 4: Preserve Existing RAG Worker Persistence

1. Keep `AiBlogKnowledgeSyncService` as the worker that updates `ai_blog_knowledge_documents` and chunks.
2. Ensure worker catches provider/vector exceptions and stores `FAILED` / `lastError` safely.
3. Improve error classification only as far as needed for safe logs/status in this slice.
4. Do not store or log API keys, article body, or full provider payloads.

### Phase 5: Compose DNS and Deployment Smoke Docs

1. Add backend DNS entries to `docker-compose.prod.yml`.
2. Add the same DNS entries to `docker-compose.yml` unless intentionally documented otherwise.
3. Update `docs/docker-deploy.md` section 6.2 to run provider DNS/reachability checks from `backend`, not only `web` or temporary Alpine.
4. Update deployment verification checklist to include backend provider DNS, provider reachability, PgVector extension, and `vector_store`.
5. Explain that provider `401/403` from `/models` is network-reachable, while `bad address`/timeout is not.

### Phase 6: Frontend/Admin Status Copy If Needed

1. Prefer backend reason strings to drive UI.
2. If current UI would still show generic "能力不可用" without the specific reason, adjust only the existing AI/RAG settings block in `AdminPanel.jsx`.
3. Keep `/admin/settings` as the only UI entry.
4. Update `AdminAiAssistantSettingsContract.test.js` if fields or copy assertions change.

## 12. Required Tests And Commands

Backend targeted tests:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogKnowledgeSyncServiceTest" test
mvn -q -DskipTests compile
```

If a new dispatcher/property test is added:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogKnowledgeSyncServiceTest,AiBlogKnowledgeSyncDispatcherTest,AiBlogRagPropertiesTest" test
```

Frontend tests if `AdminPanel.jsx` or AI settings frontend tests change:

```bash
cd SanguiBlog-front
node src/appfull/AdminAiAssistantSettingsContract.test.js
node src/appfull/aiAssistantConfig.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

Infra/docs validation:

```bash
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-30-06-30-prod-rag-publish-isolation
```

Manual/container smoke, when Docker is available:

```bash
docker compose -f docker-compose.prod.yml exec backend sh -lc 'getent hosts dashscope.aliyuncs.com'
docker compose -f docker-compose.prod.yml exec backend sh -lc 'wget -S --spider -T 5 https://dashscope.aliyuncs.com/compatible-mode/v1/models || true'
docker compose -f docker-compose.prod.yml exec pgvector sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname, extversion FROM pg_extension WHERE extname = '\''vector'\'';"'
docker compose -f docker-compose.prod.yml exec pgvector sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT to_regclass('\''public.vector_store'\'');"'
```

Manual acceptance scenario:

1. Simulate provider DNS/provider failure or configure embedding provider to return a fast failure.
2. Publish a new article through the admin UI.
3. Expected: image upload succeeds, publish request returns success, article appears in public list/detail, no Nginx 504.
4. Check backend logs for sanitized RAG sync failure.
5. Check admin AI/RAG status reason is specific and not misleading.

## 13. Risk / Boundary Notes

- Existing `AiBlogKnowledgeSyncService.syncPostKnowledge(...)` catches provider/vector exceptions internally, but the call is currently synchronous and inside the publish request path. Moving the call off the request path is the essential P0 fix.
- `@TransactionalEventListener(AFTER_COMMIT)` is preferred so RAG sync sees committed post state and cannot poison the post transaction.
- A simple in-memory async dispatcher is acceptable for this P0 incident because the goal is failure isolation, not guaranteed durable indexing. Missed/skipped RAG sync can be handled by startup sync or a later durable queue task.
- If RAG sync starts after commit and fails, existing `ai_blog_knowledge_documents.sync_status` / `last_error` should remain the first status surface. Avoid adding schema for this slice.
- Adding DNS servers to Compose is an infra safety net, not the architectural fix. The publish path must still be safe when DNS fails again.
- Frontend token-clearing behavior is mostly already 401/403-scoped in `api.js` / `useBlogData`. Do not expand this task into P2 auth UX unless the user explicitly asks.

## 14. Planning Self-Check

- Acceptance criteria explicit: yes, see sections 5, 8, 9, and 12.
- Forbidden scope explicit: yes, see section 4.
- Expected modified files listed: yes, see section 10.
- Required tests listed: yes, see section 12.
- Specific guidelines read, not only indexes: yes.
  - Backend: directory structure, quality, database, error handling, logging.
  - Frontend: directory structure, quality, component, hook, state, type safety.
  - Shared: code reuse thinking guide, cross-layer thinking guide.
- API / command / payload fields aligned: yes, see section 7.
- Validation / error matrix present: yes, see section 8.
- Good / Base / Bad cases present: yes, see section 9.
- Open question for user: none blocking this scoped P0/P1 plan.

## 15. Follow-Up Tasks Not Included In This Slice

1. P2 RAG circuit breaker, explicit provider timeout/retry budgets, failure cooldown, and admin-visible breaker state.
2. P2 frontend auth/session UX refinement so 5xx/HTML 504 never looks like account expiry, including login page error sanitization.
3. P3 v2rayA / Docker DNS correlation investigation with `docker info`, systemd Docker proxy env, iptables, and nftables checks.
4. Optional durable RAG sync job table and retry/compensation worker if in-memory async dispatch proves insufficient.
