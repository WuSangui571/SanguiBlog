# OpenAI-compatible AI Provider 配置 Research

## Relevant Specs

Spec indexes read:

- `.trellis/spec/backend/index.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/guides/index.md`

Concrete guideline files read:

- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

Important spec constraints:

- Backend AI assistant work must not bypass `AiChatService`.
- External provider/RAG calls must not run inside broad MySQL transactions.
- AI provider capacity guard and SSE terminal behavior must remain intact.
- Logs must not contain secrets, full prompts, full knowledge documents, JWTs, or API keys.
- RAG uses MySQL metadata plus PgVector embeddings; changing embedding model requires re-sync/rebuild.
- Frontend AI assistant contract is high-risk; do not touch unless payload/SSE contract changes.
- Docker Compose config is an infra/cross-layer contract and must keep no-AI base case valid.

## Retrieval Report

Keywords searched:

- `DashScope`
- `dashscope`
- `DASHSCOPE`
- `spring.ai`
- `ChatModel`
- `EmbeddingModel`
- `AI_RAG_ENABLED`
- `AI_PROVIDER`
- `ai.rag`
- `openai`
- `OPENAI`

Candidate implementations / files:

- `SanguiBlog-server/pom.xml`: owns backend Spring AI dependency and BOM setup.
- `SanguiBlog-server/src/main/resources/application.yaml`: owns base provider config, chat model, embedding model, RAG default.
- `SanguiBlog-server/src/main/resources/application-docker.yaml`: owns Docker profile datasource/storage/RAG defaults.
- `docker-compose.yml`: local Docker env injection contract.
- `docker-compose.prod.yml`: production Docker env injection contract.
- `.env.example`: operator env template and no-secret default contract.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`: existing AI chat pipeline using `ChatModel`; also reports configured model.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfig.java`: existing PgVector `VectorStore` bean using `EmbeddingModel`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogRagProperties.java`: existing `ai.rag.*` property owner.
- `README.md`, `README.zh-CN.md`, `docs/docker-deploy.md`, `docs/docker-data-sync.md`: user/operator docs with active DashScope wording.
- `SanguiBlog-front/src/utils/aiStream.js`, `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`: existing frontend AI/SSE consumers; likely no code changes unless backend payload changes.

Decision:

- Modify existing provider/config/docs surfaces.
- Reuse existing `AiChatService`, `AiBlogVectorStoreConfig`, `AiBlogRagProperties`, Compose files, and docs.
- Do not create a new AI provider service or frontend AI path.

Duplicate risk:

- Low if implementation only rewires Spring AI provider and config keys behind existing `ChatModel` / `EmbeddingModel` injection.
- High if implementation creates a parallel chat service, provider wrapper, or frontend stream path; PRD forbids this.

## Code Patterns Found

Current backend provider/dependency:

- `SanguiBlog-server/pom.xml` currently imports Spring AI BOM `1.1.2` and Alibaba Spring AI BOM `1.1.2.0`.
- `SanguiBlog-server/pom.xml` currently depends on `com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`.
- It also depends on `org.springframework.ai:spring-ai-pgvector-store`.

Current provider config:

- `application.yaml` uses:
  - `spring.ai.dashscope.api-key`
  - `spring.ai.dashscope.chat.options.model`
  - `spring.ai.dashscope.chat.options.temperature`
  - `spring.ai.dashscope.embedding.options.model`
- `AiChatService` reads `@Value("${spring.ai.dashscope.chat.options.model:qwen-flash}")` into `configuredModel`.
- `AiBlogVectorStoreConfig` injects `ObjectProvider<EmbeddingModel>` and throws a DashScope-specific missing-model message.

Current Docker/env config:

- `.env.example` exposes only `AI_DASHSCOPE_API_KEY` for provider credentials.
- `docker-compose.yml` and `docker-compose.prod.yml` inject `SPRING_AI_DASHSCOPE_API_KEY: "${AI_DASHSCOPE_API_KEY:-}"`.
- `AI_RAG_ENABLED` defaults to `false`; production compose also sets `AI_RAG_SYNC_ON_STARTUP=false`.
- PgVector env keys are independent and should remain.

Current docs:

- README files say AI assistant requires `AI_DASHSCOPE_API_KEY`.
- `docs/docker-deploy.md` contains DashScope DNS/key diagnostics and RAG stopgap guidance.
- `docs/docker-data-sync.md` lists DashScope key as sensitive server-local config and says no DashScope key means AI/RAG disabled base case.

Spring AI OpenAI reference notes:

- OpenAI starter dependency is `org.springframework.ai:spring-ai-starter-model-openai`.
- Common OpenAI connection properties use `spring.ai.openai.api-key` and `spring.ai.openai.base-url`.
- Chat options include `spring.ai.openai.chat.options.model`; chat auto-config can be controlled with `spring.ai.model.chat`.
- Embedding options include `spring.ai.openai.embedding.options.model`; embedding auto-config can be controlled with `spring.ai.model.embedding`.
- Chat and embedding can override common base URL/API key separately, but this task should keep one common API key/base URL unless a real split-endpoint need is proven.

## Files Likely To Modify

Backend implementation:

- `SanguiBlog-server/pom.xml`
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml` only if Docker profile needs provider-specific overrides beyond base `application.yaml`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiBlogVectorStoreConfig.java`

Infra/docs:

- `.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `README.md`
- `README.zh-CN.md`
- `docs/docker-deploy.md`
- `docs/docker-data-sync.md`

Tests likely to add/update:

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
- New focused backend config test if useful, e.g. `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/AiProviderConfigurationTest.java`
- New/updated vector config test if current test coverage does not assert provider-neutral missing-embedding behavior.

Files likely not to modify:

- `SanguiBlog-front/src/utils/aiStream.js`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `sanguiblog_db.sql`
- RAG entity/repository schema files
- `docker/nginx/default.conf`

## Risk / Boundary Notes

- No-key startup is the highest implementation risk. Verify whether Spring AI OpenAI starter creates a usable `ChatModel` bean with blank key, or whether app startup fails. Fix narrowly.
- Do not assume OpenAI-compatible chat support means embedding support. Many compatible endpoints support chat but not embeddings, or use separate embedding model names.
- If embedding model changes, existing vector embeddings may become incompatible; docs must require re-sync/rebuild before relying on RAG quality.
- Removing DashScope starter may remove classes/auto-config silently relied on by tests or runtime; compile and context tests are required.
- Provider error text and logs should become provider-neutral. Avoid "DashScope" in runtime errors after migration.
- Compose must not fail because AI vars are blank. Required secret checks should remain only for JWT/DB passwords.
- Docker data sync docs include sensitive config wording. Update names without expanding secret collection or printing real values.
- Frontend AI assistant should not change because HTTP/SSE payloads stay unchanged.

## Required Tests

Minimum automated verification after implementation:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiChatServiceTest,AiProviderConcurrencyGuardTest,AiGuestAccessServiceTest,AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest,AiReferencedPostContextServiceTest" test
mvn -q "-Dtest=AiBlogKnowledgeOverviewTest,AiBlogKnowledgeSyncServiceTest,AiCustomKnowledgeSyncServiceTest" test
mvn -q -DskipTests compile
```

Add targeted config tests if possible:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AiProviderConfigurationTest,AiBlogVectorStoreConfigTest" test
```

Compose/docs:

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
git diff --check
python .\.trellis\scripts\task.py validate .trellis\tasks\06-06-openai-compatible-ai-provider-config
```

Frontend only if touched:

```powershell
cd SanguiBlog-front
node src/utils/aiStream.test.js
node src/appfull/ui/AiAssistantWidget.test.js
node src/appfull/ui/AiAssistantMobileViewport.test.js
node src/appfull/noNativeBlockingDialogs.test.js
cmd /c npm run lint
cmd /c npm run build
```

Manual acceptance with real provider credentials:

- Start Docker with `AI_OPENAI_API_KEY`, `AI_OPENAI_BASE_URL`, `AI_OPENAI_CHAT_MODEL`, `AI_RAG_ENABLED=false`.
- Verify `/api/site/meta` works.
- Verify AI chat through UI or authenticated API path.
- If testing RAG, set `AI_OPENAI_EMBEDDING_MODEL`, keep PgVector configured, re-sync/rebuild vectors, then test a post-knowledge question.

