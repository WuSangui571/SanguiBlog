# Focused Code Research: Admin RAG Switch and AI Capability Validation

## Startup State Summary

- Branch: `feature/openai-compatible-ai-provider-config`.
- Working directory at `$start`: clean.
- Current active Trellis task before creation: none.
- Recent journal state: Session 26 recorded OpenAI-compatible AI provider and RAG follow-up as complete, with commits `986b7f8`, `23cb3f2`, `4149098`, `abcf96f`, and `f8c3049`.
- New task directory: `.trellis/tasks/06-06-ai-rag-admin-effective-capability`.

## Relevant Specs Read

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

## Retrieval Report

- Keywords searched:
  - `AiAssistantSetting`, `aiAssistant`, `AI_RAG_ENABLED`, `ai.rag`, `ragEnabled`, `assertEnabled`, `SiteMetaDto`, `SiteService`, `/api/site/meta`, `AdminAiAssistantSettings`, `SystemSettings`, `AI_OPENAI_CHAT_MODEL`, `AI_OPENAI_BASE_URL`, `AI_OPENAI_EMBEDDING_MODEL`, `pgvector`.
- Candidate implementations:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAiAssistantSettingsController.java`: existing admin settings endpoint.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`: existing persisted admin AI switch, site meta AI config, and `assertEnabled`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiAssistantAdminSettingsDto.java`: current admin settings response DTO.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiAssistantAdminSettingsUpdateRequest.java`: current admin settings update request.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteMetaDto.java`: public site meta `aiAssistant` DTO.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`: builds `/api/site/meta` and calls `aiAssistantSettingService.siteConfig()`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`: chat execution path and provider configured check.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`: vector retrieval path.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`: RAG config completeness currently checks env enabled plus PgVector URL/user/password.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfig.java`: vector store bean and embedding config fail-fast checks.
  - `SanguiBlog-front/src/api.js`: existing frontend API facade for admin AI settings and site meta.
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`: `SystemSettingsView` owns current AI assistant switch UI.
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.js`: public AI config normalization.
  - `SanguiBlog-front/src/hooks/useBlogData.jsx`: site meta loading/cache.
  - `SanguiBlog-front/src/AppFull.jsx`: launcher visibility uses `meta.aiAssistant.enabled`.
- Decision: modify existing paths; do not create a second AI settings service, chat pipeline, API wrapper, or admin page.
- Duplicate risk avoidance: keep all behavior in the existing AI assistant settings/site meta/chat/RAG ownership chain.

## Code Patterns Found

### Backend Settings

- `AiAssistantSettingService` stores the current AI switch in `site_settings` with key `ai.chat.enabled`.
- Current default AI switch is true: `DEFAULT_ENABLED = true`.
- `siteConfig()` returns only display config plus `enabled`.
- `adminSettings()` returns only `enabled`.
- `assertEnabled()` only checks DB admin switch and throws `ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ...)`.
- `updateEnabled(boolean enabled)` persists only `ai.chat.enabled`.

### Backend Config / Capability

- `AiChatService` checks API key only through static `isConfiguredOpenAiApiKey`; it does not currently check chat model or base URL before admin enabling.
- `AiChatService` injects:
  - `spring.ai.openai.chat.options.model`
  - `spring.ai.openai.api-key`
- `application.yaml` maps:
  - `spring.ai.openai.base-url: ${AI_OPENAI_BASE_URL:https://api.openai.com}`
  - `spring.ai.openai.chat.options.model: ${AI_OPENAI_CHAT_MODEL:}`
  - `spring.ai.openai.embedding.options.model: ${AI_OPENAI_EMBEDDING_MODEL:}`
  - `ai.rag.enabled: ${AI_RAG_ENABLED:false}`
  - `ai.rag.pgvector.*`
- `AiBlogRagProperties.isConfigured()` currently requires `enabled`, PgVector URL, username, and password.
- `AiBlogVectorStoreConfig` throws if `AI_RAG_ENABLED=true` but embedding key/model/bean is missing.

### Backend RAG

- `AiChatService.chat()` and `streamChat()` always call `aiBlogRagService.retrieve(...)` unless referenced-post context is preferred.
- `AiBlogRagService.retrieve()` returns empty if `ragProperties.isConfigured()` is false, question is blank, or vector store bean is absent.
- Runtime similarity errors are logged as safe warnings and degrade to empty RAG context.

### Frontend Settings

- `api.js` exports `adminFetchAiAssistantSettings()` and `adminUpdateAiAssistantSettings(payload)`.
- `SystemSettingsView` currently has one boolean: `aiAssistantEnabled`.
- Existing update sends `{ enabled }`.
- Existing UI labels/copy describe a single AI assistant total switch.
- `onAiAssistantChanged` reloads site meta after updating settings.

### Frontend Public Meta

- `AppFull.jsx` hides/shows launcher via `meta ? meta?.aiAssistant?.enabled !== false : false`.
- `aiAssistantConfig.js` has default fields and normalizes only the public assistant display fields.
- `useBlogData.jsx` caches site meta in `sessionStorage` and should tolerate new fields naturally as JSON object data.

## Files Likely To Modify

Backend:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiAssistantAdminSettingsDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiAssistantAdminSettingsUpdateRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteMetaDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogRagService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfig.java` only if startup/capability behavior requires adjustment.
- Possible new backend helper if needed: `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantAvailabilityService.java` or similarly scoped helper. Only create if it avoids cycles and removes real complexity.

Frontend:

- `SanguiBlog-front/src/api.js` only if payload helper/normalization changes are useful.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-front/src/appfull/aiAssistantConfig.js`
- `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`
- Possible new static test beside `AdminPanel.jsx` if implementing source-level assertions for the new settings contract.

Tests:

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfigTest.java`
- New or updated RAG service test if mocking vector store/effective state is practical.
- `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`
- New frontend admin settings static test if needed.

Docs/config, only if implementation changes contract:

- `.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `README.md`
- `README.zh-CN.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md` if a durable new contract is established.

## Risk / Boundary Notes

- Current base URL has a default. If base URL must be explicitly configured, that is a separate product/config decision.
- Current `AI_RAG_ENABLED=true` can fail startup when embedding config is missing because vector-store bean creation throws. This task may need to soften startup behavior so admin settings can report capability instead of crashing, but do not broaden into a full vector-store redesign.
- Avoid circular dependencies between settings/effective-state services and `AiBlogRagService` / `AiChatService`.
- Keep secrets out of DTOs, logs, error messages, and tests.
- RAG admin switch should not be treated as evidence that embedding provider actually works at request time; runtime provider failures may still degrade to empty RAG context.
- Frontend launcher visibility should continue to use site meta `aiAssistant.enabled`, but backend must now define that as effective chat state.
- Preserve old `{ enabled }` admin update compatibility unless verified unnecessary.

## Required Tests

Backend:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogVectorStoreConfigTest,AiChatServiceTest" test
mvn -q -DskipTests compile
```

Frontend:

```bash
cd SanguiBlog-front
node src/appfull/aiAssistantConfig.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

Cross-layer/static:

```bash
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-06-ai-rag-admin-effective-capability
```
