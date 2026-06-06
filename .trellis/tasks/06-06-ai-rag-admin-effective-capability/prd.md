# PRD: Admin RAG Switch and AI Capability Validation

## 1. Task Classification

- Scope judgment: Complex Task.
- Reason: this changes backend AI settings state, capability validation, public site meta DTO fields, admin API payloads, admin settings UI state, and RAG execution gating. It spans backend, frontend, configuration, AI/RAG runtime behavior, and cross-layer response fields.
- Current branch confirmed by Codex before planning: `feature/openai-compatible-ai-provider-config`.
- Codex phase limit for this round: planning/research/context only. Do not implement business code in this round.

## 2. Goal

Add separate admin control and capability-aware effective state for AI chat and RAG:

- `aiChatAdminEnabled`: admin-persisted AI chat switch.
- `aiRagAdminEnabled`: admin-persisted RAG switch.
- `aiChatEffectiveEnabled = chatCapability && aiChatAdminEnabled`.
- `aiRagEffectiveEnabled = aiChatEffectiveEnabled && ragCapability && aiRagAdminEnabled`.

The backend must reject attempts to enable unavailable capabilities, and RAG retrieval must use effective RAG state, not only `.env` / `ai.rag.enabled`.

## 3. In Scope

- Extend existing admin AI settings endpoint, DTO, and service.
- Add capability checks for chat and RAG configuration.
- Extend `GET /api/site/meta` `aiAssistant` payload with chat/RAG capability and disabled-reason fields.
- Update admin settings UI under `/admin/settings` -> AI assistant tab to show separate AI chat and RAG switches.
- Disable corresponding frontend controls when capability is missing, with user-visible reason.
- Gate RAG retrieval by effective RAG state.
- Add focused backend/frontend tests for Good/Base/Bad cases.

## 4. Out of Scope / Do Not Modify

- Do not create a new AI chat controller, new chat pipeline, or second admin settings page.
- Do not change AI chat request/response/SSE payload shape except any planned RAG mode behavior naturally resulting from retrieval being gated.
- Do not change database schema unless the implementer proves `site_settings` cannot safely store the new key. The expected implementation stores new admin switches in `site_settings`.
- Do not redesign PgVector schema, knowledge ingestion, embeddings, or vector table format.
- Do not change provider dependencies, OpenAI-compatible endpoint migration, or Docker architecture unless directly required for capability detection.
- Do not log API keys, prompts, full article content, custom knowledge content, or provider payloads.
- Do not auto-commit or push.

## 5. Existing Ownership / Reuse Decision

Reuse and extend existing paths:

- Admin API: `AdminAiAssistantSettingsController`.
- Settings service: `AiAssistantSettingService`.
- Settings persistence: `site_settings` via `SiteSettingRepository`.
- Site meta: `SiteService.meta()` and `SiteMetaDto.AiAssistantDto`.
- Chat execution: `AiChatService`.
- RAG retrieval: `AiBlogRagService` and `AiBlogRagProperties`.
- Frontend API: `SanguiBlog-front/src/api.js`.
- Admin UI: `SystemSettingsView` inside `SanguiBlog-front/src/appfull/AdminPanel.jsx`.
- Frontend site meta consumption: `useBlogData.jsx`, `AppFull.jsx`, and `aiAssistantConfig.js`.

Duplicate implementation risk: creating parallel services/controllers/components would bypass the existing AI access controls, session persistence, SSE behavior, admin setting ownership, and site meta contract. This task must extend the current ownership chain.

## 6. Cross-Layer Contract

### 6.1 Backend API Signatures

Existing path remains:

- `GET /api/admin/ai-assistant-settings`
- `PUT /api/admin/ai-assistant-settings`
- Security: existing `@PreAuthorize("hasRole('SUPER_ADMIN')")` remains.
- Response wrapper: `ApiResponse<AiAssistantAdminSettingsDto>`.

Existing public meta path remains:

- `GET /api/site/meta`
- Response wrapper: `ApiResponse<SiteMetaDto>`.

No new public chat endpoint is expected.

### 6.2 Admin Settings Response Payload

Expected `data` shape for `GET /api/admin/ai-assistant-settings` and successful `PUT`:

```json
{
  "aiChatAdminEnabled": true,
  "aiRagAdminEnabled": false,
  "aiChatCapable": true,
  "aiRagCapable": false,
  "aiChatEffectiveEnabled": true,
  "aiRagEffectiveEnabled": false,
  "aiChatDisabledReason": null,
  "aiRagDisabledReason": "embedding model not configured",
  "enabled": true
}
```

Notes:

- Keep `enabled` as a backward-compatible alias for `aiChatEffectiveEnabled` or the existing frontend may regress during rollout.
- Do not expose raw config values or secrets.
- Reasons should be stable, human-readable, and safe. English is acceptable for config reasons; Chinese is acceptable if consistent with existing UI. Avoid leaking actual URLs, keys, or full exception text.

### 6.3 Admin Settings Update Payload

Preferred new request:

```json
{
  "aiChatAdminEnabled": true,
  "aiRagAdminEnabled": false
}
```

Compatibility:

- Existing `{ "enabled": true }` should continue to update chat admin state unless the implementer confirms no caller can still send it.
- If only one new field is present, update only that field and preserve the other stored admin switch.
- If both old `enabled` and new `aiChatAdminEnabled` are present, `aiChatAdminEnabled` should win.

### 6.4 Public Site Meta Payload

Extend `SiteMetaDto.AiAssistantDto` under `data.aiAssistant`:

```json
{
  "enabled": true,
  "capable": true,
  "ragEnabled": false,
  "ragCapable": false,
  "disabledReason": null,
  "ragDisabledReason": "embedding model not configured",
  "assistantName": "...",
  "title": "...",
  "welcomeMessage": "...",
  "inputPlaceholder": "...",
  "pendingReply": "..."
}
```

Semantics:

- `enabled` means effective chat enabled, not merely admin switch.
- `capable` means chat capability is satisfied.
- `ragEnabled` means effective RAG enabled.
- `ragCapable` means RAG capability is satisfied.
- `disabledReason` explains why chat is not effectively available when disabled by capability; admin-off may use `null` or a safe admin-disabled reason, but frontend launcher should still hide when `enabled === false`.
- `ragDisabledReason` explains why RAG is unavailable or ineffective. If chat is effectively disabled, reason should make that dependency clear, for example `AI chat is disabled`.

### 6.5 Config / Capability Inputs

Chat capability must require all of:

- configured OpenAI-compatible API key: `spring.ai.openai.api-key` / `AI_OPENAI_API_KEY`, excluding empty and `__unset__`;
- configured base URL: `spring.ai.openai.base-url` / `AI_OPENAI_BASE_URL`;
- configured chat model: `spring.ai.openai.chat.options.model` / `AI_OPENAI_CHAT_MODEL`.

RAG capability must require:

- chat effective enabled as a parent dependency when computing effective RAG state;
- configured embedding model: `spring.ai.openai.embedding.options.model` / `AI_OPENAI_EMBEDDING_MODEL`;
- configured embedding API key, using dedicated embedding key if present and otherwise common API key, excluding empty and `__unset__`;
- complete PgVector/RAG config: `ai.rag.enabled == true`, `ai.rag.pgvector.url`, `username`, `password`, and usable schema/table names;
- available `EmbeddingModel` and `VectorStore` where runtime bean availability can be checked without failing startup.

Important open configuration point:

- Current `application.yaml` defaults `AI_OPENAI_BASE_URL` to `https://api.openai.com`. If the product requirement is that base URL must be explicitly set by operators, the implementation must first change that default to blank and update docs/compose. If not, the default should count as configured. Do not change this default without user confirmation.

### 6.6 Effective State Formulas

```text
aiChatEffectiveEnabled = aiChatCapable && aiChatAdminEnabled
aiRagEffectiveEnabled = aiChatEffectiveEnabled && aiRagCapable && aiRagAdminEnabled
```

RAG retrieval must use `aiRagEffectiveEnabled`. Environment `AI_RAG_ENABLED` remains a low-level capability/config requirement, not the final user-facing effective switch.

## 7. Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| Missing API key, admin tries to enable chat | `PUT /api/admin/ai-assistant-settings` returns HTTP 400 through `GlobalExceptionHandler`; response message says AI chat capability is missing; `site_settings` must not persist chat enabled. |
| Missing base URL, admin tries to enable chat | HTTP 400; no persistence of enabled chat; reason appears in admin `GET` and site meta. |
| Missing chat model, admin tries to enable chat | HTTP 400; no persistence of enabled chat; reason appears in admin `GET` and site meta. |
| Chat admin disabled | Site meta `aiAssistant.enabled=false`; chat endpoints still reject through `assertEnabled`; RAG effective false even if RAG admin is true. |
| Missing embedding model, admin tries to enable RAG | HTTP 400; no persistence of enabled RAG; admin response and site meta expose safe `ragDisabledReason`. |
| PgVector config incomplete, admin tries to enable RAG | HTTP 400; no persistence of enabled RAG; no startup crash just from viewing settings. |
| Chat effective false and admin tries to enable RAG | HTTP 400 or forced effective false with a clear message; preferred behavior is reject enabling RAG while chat is unavailable. |
| AI chat enabled and RAG admin disabled | Chat works normally with `DATABASE_SESSION_HISTORY`; no vector retrieval call should be required for normal chat. |
| AI chat enabled, RAG enabled, embedding and PgVector healthy | RAG retrieval participates; response `mode` can become `SITE_KNOWLEDGE_RAG_PGVECTOR` when documents are found; references are preserved. |
| RAG retrieval provider/vector error at runtime | Existing graceful degradation may remain: log safe warning and return empty RAG context, unless capability check can detect the condition earlier. |
| Frontend receives older payload only containing `enabled` | UI should not crash; default missing RAG fields to safe disabled/unavailable states. |

## 8. Good / Base / Bad Cases

Good:

- All chat and RAG config present. Admin enables chat and RAG. Public meta returns `enabled=true`, `capable=true`, `ragEnabled=true`, `ragCapable=true`. Chat with matching knowledge retrieves RAG references.

Base:

- Chat config present, embedding/PgVector config absent. Admin can enable chat but cannot enable RAG. Public AI launcher shows and chat works without RAG.

Bad:

- Chat model missing. Admin cannot enable chat; public meta hides AI launcher; backend chat endpoints reject; RAG effective remains false even if RAG admin setting is true.

Bad:

- Embedding model missing. Admin cannot enable RAG; chat remains usable if chat capability is present.

Bad:

- `AI_RAG_ENABLED=true` but PgVector credentials missing. Backend should not mark RAG capable; admin cannot turn RAG on; normal non-RAG chat should not be blocked by vector-store initialization side effects.

## 9. Implementation Plan

### Backend

1. Add or refactor a capability helper inside the existing AI settings ownership path.
   - Preferred: extend `AiAssistantSettingService` or add a small package-local collaborator if constructor complexity becomes high.
   - Inputs: `Environment` or `@Value` config fields, `AiBlogRagProperties`, optional `EmbeddingModel`/`VectorStore` providers.
   - Output: chat/rag capability booleans and safe reason strings.

2. Extend persisted settings.
   - Keep existing `ai.chat.enabled` as chat admin switch.
   - Add `ai.rag.enabled` or another clear `site_settings` key for RAG admin switch. Avoid collision confusion with config key `ai.rag.enabled`; if using same literal in `site_settings`, document clearly that it is DB admin state, not Spring property. Preferred key: `ai.rag.admin_enabled`.

3. Extend DTOs.
   - `AiAssistantAdminSettingsDto`: admin booleans, capability booleans, effective booleans, reason strings, backward-compatible `enabled`.
   - `AiAssistantAdminSettingsUpdateRequest`: nullable `Boolean aiChatAdminEnabled`, nullable `Boolean aiRagAdminEnabled`, nullable legacy `Boolean enabled`.
   - `SiteMetaDto.AiAssistantDto`: `capable`, `ragEnabled`, `ragCapable`, `disabledReason`, `ragDisabledReason`.

4. Update admin update validation.
   - Reject enabling chat when chat capability is false.
   - Reject enabling RAG when RAG capability is false or chat effective state would be false.
   - Preserve existing settings on failed validation.

5. Update chat enforcement.
   - Replace or extend `assertEnabled()` so chat endpoint availability follows `aiChatEffectiveEnabled`.
   - Preserve existing service-unavailable style for disabled assistant.

6. Update RAG retrieval gating.
   - `AiBlogRagService.retrieve(...)` should return empty unless effective RAG is true.
   - Avoid circular dependencies. If injecting `AiAssistantSettingService` into `AiBlogRagService` creates a cycle, extract a small read-only `AiAssistantAvailabilityService` or pass a capability/effective-state provider with no dependency on chat service.

7. Review vector-store startup behavior.
   - Today `AiBlogVectorStoreConfig` throws on missing embedding config when `ai.rag.enabled=true`. That is correct for low-level env-on startup, but the new requirement expects admin switch and capability validation. If missing embedding config should not crash core chat/site startup, consider whether vector-store bean creation should be conditional on both environment capability and config completeness or should expose reason without throwing during settings reads.
   - Keep this change narrow; do not redesign vector storage.

### Frontend

1. Extend `api.js` calls only if needed for payload normalization; do not add a second API wrapper.
2. Update `SystemSettingsView` AI assistant state.
   - Separate chat and RAG state.
   - Store admin booleans, effective booleans, capability booleans, reason strings.
   - Disable toggles when capability is missing or parent chat effective state blocks RAG.
3. Update admin UI copy.
   - Show "AI chat" switch and status.
   - Show "RAG retrieval" switch and status.
   - Show safe disabled reason near each disabled switch.
4. Update public AI config normalization if needed.
   - `aiAssistantConfig.js` should preserve current fields and tolerate new optional fields.
   - `AppFull.jsx` can continue using `meta.aiAssistant.enabled` for launcher visibility because backend now defines it as effective chat enabled.
5. Ensure `useBlogData.jsx` site meta cache remains safe with missing old/new fields.

## 10. Required Tests and Assertion Points

Backend targeted tests:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogVectorStoreConfigTest,AiChatServiceTest" test
mvn -q -DskipTests compile
```

Add or update assertions:

- default/missing DB settings produce chat admin default and RAG admin default;
- missing API key/base URL/chat model makes chat incapable and rejects enabling chat;
- missing embedding model makes RAG incapable and rejects enabling RAG;
- chat admin disabled makes chat effective false and RAG effective false;
- chat enabled plus RAG disabled leaves normal chat mode available without RAG references;
- RAG enabled and capable allows `AiBlogRagService.retrieve(...)` to call vector store;
- `SiteMetaDto.AiAssistantDto` maps `enabled/capable/ragEnabled/ragCapable/*Reason` correctly.

Frontend targeted tests:

```bash
cd SanguiBlog-front
node src/appfull/aiAssistantConfig.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

Add or update assertions:

- `resolveAiAssistantConfig` tolerates and preserves new effective/capability fields or at least ignores them safely without crashing;
- admin settings UI source/test covers separate chat/RAG labels, disabled states, and request payload field names;
- no native `alert`/`confirm` introduced.

Cross-layer/static verification:

```bash
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-06-ai-rag-admin-effective-capability
```

Optional runtime/manual acceptance:

- No chat model: admin cannot enable AI chat.
- No embedding model: admin cannot enable RAG.
- AI chat disabled: RAG is not effective and retrieval does not participate.
- AI chat enabled, RAG disabled: normal chat succeeds.
- AI chat enabled, RAG enabled, embedding/PgVector normal: RAG retrieval participates and references/mode show RAG when matches exist.

## 11. Planning Self-Check Inputs

- Acceptance criteria are explicit in Sections 7, 8, and 10.
- Expected modification files are listed in `research.md`.
- Forbidden scope is listed in Section 4.
- Required tests are listed in Section 10.
- Concrete Trellis specs read are recorded in `research.md`.
- Known open question: whether `AI_OPENAI_BASE_URL` default `https://api.openai.com` should count as configured or whether the default should be changed to blank. Do not change this default without user confirmation.
