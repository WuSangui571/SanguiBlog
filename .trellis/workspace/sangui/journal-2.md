# Journal - sangui (Part 2)

> Continuation from `journal-1.md` (archived at ~2000 lines)
> Started: 2026-06-30

---



## Session 32: Production RAG publish isolation closeout

**Date**: 2026-06-30
**Task**: Production RAG publish isolation closeout
**Branch**: `fix/prod-rag-publish-isolation`

### Summary

Archived the production RAG publish isolation task after manual acceptance and recorded commit 7fb690c.

### Main Changes

Summary:
- Closed the P0/P1 production RAG publish isolation task after manual acceptance and commit 7fb690c.
- The publish/update/delete post path now saves MySQL state and marks sitemap dirty, then schedules blog RAG sync/remove through after-commit events and a bounded executor instead of waiting for embedding provider or PgVector work on the HTTP request thread.
- RAG capability reporting now distinguishes AI_RAG_ENABLED=false from missing PgVector config, so admin/site metadata can report "RAG disabled by environment" instead of a misleading PgVector reason.
- Repository Compose files preserve the backend DNS fallback used in production, and docker deployment docs now include backend-container DNS/provider probes plus PgVector extension/vector_store checks.

Main modules:
- Backend post publishing: PostService.
- Backend RAG dispatch: AiRagSyncExecutorConfig, AiBlogKnowledgeSyncEvent, AiBlogKnowledgeSyncRemoveEvent, AiBlogKnowledgeSyncEventListener.
- Backend AI settings: AiBlogRagProperties, AiAssistantSettingService.
- Infra/docs: docker-compose.yml, docker-compose.prod.yml, docs/docker-deploy.md.
- Trellis specs: backend database/quality guidelines and cross-layer Docker/provider DNS contract.

Updated files:
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiRagSyncExecutorConfig.java
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncEvent.java
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncRemoveEvent.java
- SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncEventListener.java
- SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/AiBlogRagPropertiesTest.java
- SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/PostServiceTransactionTest.java
- SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java
- SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/rag/AiBlogKnowledgeSyncDispatcherTest.java
- docker-compose.yml
- docker-compose.prod.yml
- docs/docker-deploy.md
- .trellis/spec/backend/database-guidelines.md
- .trellis/spec/backend/quality-guidelines.md
- .trellis/spec/guides/cross-layer-thinking-guide.md
- .trellis/tasks/archive/2026-06/06-30-06-30-prod-rag-publish-isolation/*

Verification:
- mvn -q "-Dtest=PostServiceTransactionTest" test: PASS after the transactional delete fix.
- mvn -q "-Dtest=AiBlogKnowledgeSyncDispatcherTest" test: PASS after rejection handling was moved into the listener.
- mvn -q "-Dtest=AiAssistantSettingServiceTest,AiBlogKnowledgeSyncServiceTest,AiBlogKnowledgeSyncDispatcherTest,AiBlogRagPropertiesTest,PostServiceTransactionTest" test: PASS.
- mvn -q -DskipTests compile: PASS.
- docker compose config --quiet: PASS.
- docker compose -f docker-compose.prod.yml config --quiet: PASS.
- git diff --check: PASS.
- python .trellis/scripts/task.py validate .trellis/tasks/06-30-06-30-prod-rag-publish-isolation: PASS before archive.
- node src/appfull/AdminAiAssistantSettingsContract.test.js: PASS.
- node src/appfull/aiAssistantConfig.test.js: PASS.
- node src/appfull/noNativeBlockingDialogs.test.js: PASS.
- cmd /c npm run lint: PASS.
- cmd /c npm run build: PASS after rerunning outside the sandbox because the first sandboxed Vite run hit EPERM writing node_modules/.vite-temp.
- Manual acceptance: user confirmed manual testing passed before record-session.

Result and boundaries:
- Commit recorded: 7fb690c fix: isolate article publish RAG sync.
- Task archived despite task.json still saying planning, because implementation was committed and manually accepted.
- No API payloads or DB schema were changed.
- No durable RAG job table, circuit breaker, provider timeout tuning, auth UX work, or v2rayA/network investigation was included in this slice.
- Residual follow-up: if RAG sync executor rejections persist in production, open a P2 durable RAG job/retry task.


### Git Commits

| Hash | Message |
|------|---------|
| `7fb690c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 33: Access Log V2 Traffic Insights Closeout

**Date**: 2026-07-01
**Task**: Access Log V2 Traffic Insights Closeout
**Branch**: `feature/access-log-v2-traffic-insights`

### Summary

(Add summary)

### Main Changes

Summary:
- Completed Access Log V2 traffic insights for the admin analytics dashboard.
- Backend added client environment capture, visit-quality classification, visitor-source insight DTO/helper/repository query support, detail DTO fields, and admin log filters.
- Frontend consumed visitorSourceInsights in the admin dashboard, added detail modal system-judgement fields, collected safe client environment fields, and adjusted the dashboard layout so the visitor source insight panel no longer stretches the trend chart area.
- Codex follow-up fixes moved long insight details into the left dashboard column, moved visit-quality share out of the right summary panel, and added static layout regression coverage.
- Release closeout bumped visible site version metadata from V2.3.5 to V2.3.6 in application.yaml, frontend fallback displays, and root README current-version lines. These release-version edits are not committed yet and require manual commit before merge/deploy.

Updated files:
- SanguiBlog-server/src/main/resources/application.yaml
- SanguiBlog-front/src/appfull/public/HomeView.jsx
- SanguiBlog-front/src/appfull/ui/Navigation.jsx
- SanguiBlog-front/src/appfull/AdminPanel.jsx
- SanguiBlog-front/src/appfull/AdminAnalyticsTrafficInsights.test.js
- README.md
- README.zh-CN.md
- Backend analytics DTO/service/repository/controller files from commit be286a1
- Frontend analytics API/admin files from commits be286a1, cdd2480, 7b8298f

Verification:
- User manual /admin test: PASS
- node src/appfull/AdminAnalyticsTrafficInsights.test.js: PASS
- node src/appfull/noNativeBlockingDialogs.test.js: PASS
- cmd /c npm run lint: PASS
- cmd /c npm run build: PASS after sandbox EPERM rerun outside sandbox
- mvn -q -DskipTests compile: PASS
- git diff --check: PASS
- docker compose -f docker-compose.prod.yml config --quiet: PASS
- Version grep: V2.3.6 present in application.yaml, HomeView fallback, Navigation fallback, README.md, README.zh-CN.md; V2.3.5 remains only as historical SQL migration note in README files.

Result and boundaries:
- Current Trellis task is complete by code commits plus user manual acceptance, even though task.json was still planning before archive.
- No DB schema, Docker Compose, MQ, Redis, or infra contract changes were made for this closeout.
- Production deployment should happen after merging to main and confirming SANGUI_IMAGE_TAG points at an available GHCR image for the merged code.
- Codex did not run git commit or git push.


### Git Commits

| Hash | Message |
|------|---------|
| `be286a1` | (see git log) |
| `cdd2480` | (see git log) |
| `7b8298f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
