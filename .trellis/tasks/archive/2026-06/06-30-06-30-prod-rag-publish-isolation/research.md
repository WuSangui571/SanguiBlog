# Focused Code Research: Production Article Publish 504 RAG Isolation

## Relevant Specs

Read during Codex planning:

- `.trellis/workflow.md`
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
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

Key spec implications:

- Backend post logic must extend `PostService`; do not add parallel post/RAG entry points.
- RAG/vector operations are optional AI behavior and must not hold core MySQL/request flow hostage.
- Logs for AI/RAG failures must include safe metadata only: ids, exception class, elapsed, safe host/stage. Do not log keys, prompts, article bodies, or knowledge text.
- Cross-layer work must define API/env/command signatures, validation/error matrix, Good/Base/Bad cases, and tests.
- Frontend API behavior should keep using `src/api.js`; admin settings UI should stay in existing `/admin/settings` path.

## Code Patterns Found

### Synchronous Publish-to-RAG Coupling

`SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`

- `saveOrUpdate(...)` currently does:
  - `postRepository.save(post)`
  - `sitemapService.markDirty()`
  - `aiBlogKnowledgeSyncService.syncPostKnowledge(saved.getId())`
  - return post detail
- `updateMeta(...)` currently does:
  - `postRepository.save(post)`
  - `sitemapService.markDirty()`
  - `aiBlogKnowledgeSyncService.syncPostKnowledge(saved.getId())`
  - return admin post DTO
- `delete(...)` currently calls `aiBlogKnowledgeSyncService.removePostKnowledge(id)` before deleting and marking sitemap dirty.

This is the P0 coupling. Both create/update and metadata publish can wait on vector store / embedding provider.

### Existing RAG Sync Worker

`SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncService.java`

- Startup sync uses `@EventListener(ApplicationReadyEvent.class)`.
- `syncPostKnowledge(Long postId)` and `removePostKnowledge(Long postId)` are `@Transactional`.
- Worker already catches exceptions around vector delete/add and marks `AiBlogKnowledgeDocument.syncStatus=FAILED` with `lastError`.
- Worker uses `isOperational()`:
  - `ragProperties.isConfigured() && vectorStoreProvider.getIfAvailable() != null`
- `vectorStore().add(...)` and `vectorStore().delete(...)` are the likely blocking external-call points because Spring AI/PgVector may call embeddings.

Reuse this worker. Do not duplicate vector document/chunk persistence.

### RAG Config Semantics Are Currently Conflated

`SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`

- `isConfigured()` currently requires:
  - `enabled == true`
  - PgVector URL
  - username
  - password
  - schema
  - table

This makes `AI_RAG_ENABLED=false` look identical to missing PgVector config to callers.

### Admin/Site RAG Status Owner

`SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`

- `isRagCapable()` currently checks embedding key, embedding model, `ragProperties.isConfigured()`, `EmbeddingModel`, and `VectorStore`.
- `buildRagDisabledReason(...)` currently returns `"PgVector not configured"` when `ragProperties.isConfigured()` is false.
- This is where `AI_RAG_ENABLED=false` becomes misleading admin/site copy.

### Existing Admin RAG UI

`SanguiBlog-front/src/appfull/AdminPanel.jsx`

- `SystemSettingsView` already stores:
  - `aiRagAdminEnabled`
  - `aiRagCapable`
  - `aiRagEffectiveEnabled`
  - `aiRagDisabledReason`
- It loads them from `adminFetchAiAssistantSettings()` and displays `不可用原因：{aiRagDisabledReason}`.
- Prefer fixing backend reason strings first. Only adjust frontend if a generic status label still misleads.

### Auth/Token Behavior Is Mostly Already Scoped

`SanguiBlog-front/src/api.js`

- `request(...)` removes `sg_token` on local JWT expiry and on backend `401`.
- It does not remove token on `500/502/504`.
- It notifies `forbidden_no_token` on `403` only when no token is stored.

`SanguiBlog-front/src/hooks/useBlogData.jsx`

- `checkAuth()` removes `sg_token` only when `fetchCurrentUser()` fails with `401` or `403`.

This makes P2 login/session UX a separate follow-up, not part of P0/P1.

### Compose DNS Gap

`docker-compose.prod.yml`

- Backend service currently has no `dns:` block in the repository version.
- Production hotfix added DNS servers manually:
  - `223.5.5.5`
  - `119.29.29.29`
  - `8.8.8.8`

`docker-compose.yml`

- Local backend service also has no `dns:` block.

### Deployment Docs Gap

`docs/docker-deploy.md`

- Section 6.2 has AI provider network diagnostics, but the DNS example checks the `web` container or a temporary Alpine container.
- The incident failure occurred inside `backend`, which performs Spring AI embedding calls.
- Existing docs already discuss `AI_RAG_ENABLED=false` as emergency mitigation and include PgVector/RAG sections; update those rather than adding a separate guide.

## Files Likely To Modify

Backend implementation:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`
- New dispatcher/event/executor files under one of:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/`

Backend tests:

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java`
- New tests as needed:
  - `AiBlogKnowledgeSyncDispatcherTest`
  - `AiBlogRagPropertiesTest`
  - possibly `PostService` unit test if feasible.

Frontend implementation/tests, only if backend reason strings are not enough:

- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-front/src/appfull/AdminAiAssistantSettingsContract.test.js`
- `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`

Infra/docs:

- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docs/docker-deploy.md`
- Possibly `.env.example` only if a new executor/env property is introduced.

## Risk / Boundary Notes

- Do not create a durable job table in this slice unless needed. In-memory after-commit async dispatch is enough to isolate the request path from provider failures.
- If async execution is added with `@Async`, the app currently lacks `@EnableAsync`; add it and use a named bounded executor. An explicit `TaskExecutor` submitted by listener/dispatcher may be simpler and safer.
- Prefer after-commit dispatch so RAG sync reads committed post state and cannot poison the post transaction.
- Keep `sitemapService.markDirty()` in the core post transaction/request path.
- Consider decoupling `removePostKnowledge(id)` in `PostService.delete(...)` too, because vector delete can also call provider/vector store and block.
- Existing worker status fields can store failure state; do not add schema unless the implementation proves current fields cannot support the required status.
- DNS in Compose reduces recurrence risk but must not be treated as the only fix.
- Use safe logging. Never include API keys, authorization headers, full article text, full knowledge text, full prompts, or raw provider payloads.
- Version bump/release docs are out of scope unless the user asks.

## Required Tests

Backend:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogKnowledgeSyncServiceTest" test
mvn -q -DskipTests compile
```

If new dispatcher/property tests are added:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogKnowledgeSyncServiceTest,AiBlogKnowledgeSyncDispatcherTest,AiBlogRagPropertiesTest" test
```

Frontend, only if frontend files change:

```bash
cd SanguiBlog-front
node src/appfull/AdminAiAssistantSettingsContract.test.js
node src/appfull/aiAssistantConfig.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

Infra/docs:

```bash
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-30-06-30-prod-rag-publish-isolation
```

Manual production/container smoke:

```bash
docker compose -f docker-compose.prod.yml exec backend sh -lc 'getent hosts dashscope.aliyuncs.com'
docker compose -f docker-compose.prod.yml exec backend sh -lc 'wget -S --spider -T 5 https://dashscope.aliyuncs.com/compatible-mode/v1/models || true'
docker compose -f docker-compose.prod.yml exec pgvector sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT to_regclass('\''public.vector_store'\'');"'
```
