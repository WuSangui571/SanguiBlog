# Backend Quality Guidelines

> Backend work should preserve existing contracts, avoid duplicate business paths, and keep changes small enough to verify with targeted Maven tests.

---

## Scope / Trigger

Use this spec before finishing backend code changes. It captures migrated `.ai` workflow rules plus codebase-specific contracts.

---

## Retrieve-First Rule

Before adding an endpoint, service, field, utility, config key, or table, search first and record the reuse decision in your task notes/final response.

Minimum retrieval report:

- Keywords searched.
- At least 3 candidate existing implementations when available.
- Chosen reuse/modify/new path.
- Why this does not create duplicate implementation.

Priority:

```text
reuse existing > modify existing > refactor/merge > create new
```

Creating new code is allowed only when:

1. Existing responsibility does not fit and extension would make it unclear.
2. It will not create dual entry points or dual implementations.
3. There is a migration/removal plan for superseded code.
4. The reason is recorded in Trellis task notes/specs, not only in chat.

---

## Required Project Contracts

### API Contract

- JSON responses use `ApiResponse<T>`.
- Paginated responses use `PageResponse<T>`.
- Controllers remain thin; business logic lives in services.
- Errors should flow through `GlobalExceptionHandler`.

### Security Contract

- Stateless JWT auth via `JwtAuthenticationFilter`.
- Method-level authorization uses `@PreAuthorize`.
- Upload and post permissions keep existing `SUPER_ADMIN` fallback where present:

```java
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')")
```

Do not remove the role fallback when tightening permission checks.

### Site Security Headers

`SecurityConfig` defines CSP, referrer policy, frame options, HSTS, permissions policy, and content type options. `/uploads/games/**` is special: same-origin iframe is allowed and uploaded standalone HTML tools may run inline scripts plus scripts from `https://cdn.jsdelivr.net`. Other routes remain stricter: `script-src 'self'`, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`.

Required game static resource header contract:

| Route | CSP / frame contract |
|-------|----------------------|
| `/uploads/games/**` | `Content-Security-Policy` includes `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net` and `frame-ancestors 'self'`; `X-Frame-Options` is `SAMEORIGIN`. |
| Non-game routes such as `/uploads/posts/**`, SPA routes, and API routes | Must not inherit game script allowances; default CSP keeps `script-src 'self'` and `frame-ancestors 'none'`; `X-Frame-Options` is `DENY`. |

When changing `/uploads/games/**` CSP, keep the Spring Security policy in `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java` aligned with Docker Nginx `location /uploads/games/` in `docker/nginx/default.conf`.

### Swagger Contract

Swagger and API docs are disabled by default/production. Dev debugging requires `SPRING_PROFILES_ACTIVE=dev`, which loads `application-dev.yaml`.

### Version Contract

Site version lives in `application.yaml` under `site.version`. Only update it when the change is worth a release or the user asks. Version rule migrated from `.ai`:

- Patch/small release: increment third segment, e.g. `V2.1.285 -> V2.1.286`.
- Minor/large release: increment second segment and reset third, e.g. `V2.1.285 -> V2.2.0`.
- First segment changes only when explicitly requested.
- Release documents are generated only when explicitly requested.

---

## High-Risk Feature Contracts

### AI Assistant

Do not bypass `AiChatService`. It coordinates:

- assistant enabled check,
- guest access limits/captcha/blocking,
- logged-in and guest session persistence,
- current user context,
- current page article context,
- referenced-post follow-up context,
- system facts/capability direct answers,
- blog/custom knowledge RAG,
- SSE fallback and completion payloads,
- user-visible session limit and soft delete.

External AI provider work should be isolated:

- RAG retrieval, embedding calls, chat provider calls, and stream subscriptions must not run inside a broad MySQL transaction.
- Use focused short-transaction persistence helpers such as `AiChatPersistenceService` for session/message writes when splitting provider work out of `AiChatService`.
- Bound shared external-provider capacity with `AiProviderConcurrencyGuard` or the established replacement. Busy JSON requests should fail fast with HTTP `429`; busy SSE requests should emit `error` and complete.
- Stream guard permits must be released exactly once across success, timeout, provider error, client disconnect, and pre-emitter exceptions.

Any chat change must test relevant services such as `AiChatServiceTest`, `AiGuestAccessServiceTest`, `AiAssistantCapabilityServiceTest`, `AiCurrentPageContextServiceTest`, or `AiReferencedPostContextServiceTest`.

### RAG Knowledge Sync

- Published posts are the first-class blog knowledge source.
- Custom knowledge is super-admin imported `.txt/.md/.markdown`.
- MySQL metadata and PgVector embeddings are both part of the contract.
- Delete old chunk mappings and flush before recreating stable vector ids.
- Startup sync must isolate individual post/document failures.
- Structured facts such as latest article, article count, site stats, or ordering should be answered by direct MySQL-backed services, not inferred by the model.

### Uploads

- Article resource uploads: single file <= 20 MB, total <= 50 MB, max 10 files.
- Post cover upload: <= 10 MB.
- Global multipart: 60 MB.
- Always close `MultipartFile` input streams explicitly when copying.
- Frontend save/publish must be blocked while cover upload is in progress.

### Sitemap / Robots

- `GET /sitemap.xml` and `GET /robots.txt` are backend endpoints, not SPA routes.
- Nginx with SPA fallback must route them to backend before `try_files ... /index.html`.
- Sitemap includes published posts and active tool pages.
- Supports ETag/If-None-Match and sitemap index pagination when URL count exceeds `site.sitemap.max-urls-per-file`.

### System Monitor

- `GET /api/admin/system-monitor` is the only real admin system monitor backend entry.
- Use `RuntimeMXBean.getUptime()` for Java process uptime, not OSHI system uptime.
- Extend `SystemMonitorService + SystemMonitorDto`; do not add another platform-specific monitor service/controller.

---

## Forbidden Patterns

- Duplicate controller/service for an existing business capability.
- Hidden schema changes that are only entity annotations.
- Raw `catch (Exception)` in controllers returning HTTP 200 failures.
- Logging secrets, full AI prompts, full knowledge documents, JWTs, or passwords.
- New external dependency without explaining why existing stack cannot solve the problem.
- Large unrelated refactors or formatting churn.
- Rewriting AI frontend/backend flows for a visual-only or copy-only fix.

---

## Testing Requirements

The previous `.ai` workflow said the AI does not run the full test suite by default and the user may test manually. Under Trellis, use risk-based verification:

| Change Type | Minimum Verification |
|-------------|----------------------|
| Pure docs/spec | static review, grep for placeholders |
| Backend compile-risk change | `mvn -q -DskipTests compile` |
| Service logic change | targeted `mvn -q "-Dtest=...Test" test` |
| Security/upload change | targeted controller/security tests |
| Cross-layer API change | backend targeted tests plus frontend build/static tests |
| AI chat/RAG change | relevant AI service tests, including Good/Base/Bad cases |

For `/uploads/games/**` CSP changes, also run:

```bash
mvn -q "-Dtest=SecurityConfigTest" test
docker compose config
```

If tests are not run, state that explicitly and explain why.

---

## Code Review Checklist

- [ ] Retrieval report exists and no duplicate business path was introduced.
- [ ] API response shape and HTTP statuses remain compatible.
- [ ] Entity/schema/DTO/frontend fields are aligned.
- [ ] Authorization is at least as strict as before.
- [ ] Transactions wrap all writes and required side effects.
- [ ] Logs are useful and do not expose secrets/content.
- [ ] Tests or static assertions cover the changed contract.
- [ ] Trellis spec was updated for any new pattern or contract.
