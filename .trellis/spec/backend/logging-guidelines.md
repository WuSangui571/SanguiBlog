# Backend Logging Guidelines

> Backend logging uses SLF4J through Spring Boot. Logs should aid operations without exposing secrets, tokens, AI prompts beyond what is needed, or full user content.

---

## Scope / Trigger

Use this spec when adding backend logs, exception handling, scheduled jobs, AI/RAG work, uploads, analytics, sitemap, bot guard, or system monitor behavior.

---

## Logger Pattern

Existing code uses explicit SLF4J loggers:

```java
private static final Logger log = LoggerFactory.getLogger(SystemMonitorService.class);
```

This is the preferred style in existing services/controllers. Lombok `@Slf4j` is available but less common in this codebase; do not introduce a mixed style in a file that already uses `LoggerFactory`.

---

## Log Levels

| Level | Use For | Examples |
|-------|---------|----------|
| `debug` | Optional diagnostic detail guarded by `log.isDebugEnabled()` for noisy data | site meta broadcast dump |
| `info` | Important admin actions or lifecycle events, with summarized metadata | system broadcast update, startup sync summary |
| `warn` | Recoverable failure or fallback path | analytics write fallback, system monitor history table unavailable |
| `error` | Unexpected failure that prevents the requested operation or external integration call | AI provider failure, unhandled exception |

Do not log routine successful public requests at `info`; access logs/analytics should stay in the analytics tables or infrastructure logs.

---

## Structured Message Style

Use SLF4J placeholders:

```java
log.warn("system monitor history query unavailable, fallback to uptime counters only: {}", ex.getMessage());
log.warn("record sitemap analytics failed, pageTitle={}, ip={}", pageTitle, ip, ex);
```

Prefer stable key names such as `postId`, `sessionId`, `userId`, `ip`, `event`, `size`. Put the exception object as the last argument when stack trace is useful.

---

## What to Log

- Admin mutation summary: what changed, who requested it, and safe counts/ids.
- Recoverable fallbacks: why the service fell back and what data may be degraded.
- External provider failures: AI model call, PgVector sync, file IO failure.
- Background/scheduled job failures.
- Security/risk events only as summarized metadata; do not log captcha answers or JWT tokens.

Good:

```java
log.info("updated broadcast: active={}, style={}, contentLen={}, userId={}",
        active, style, contentLen, uid);
```

This logs content length instead of the full broadcast content.

---

## What Not to Log

Never log:

- JWT tokens or `Authorization` header values.
- Passwords, captcha answers, invite codes in full, or API keys.
- Full AI prompts/responses unless explicitly needed for a local debug task and removed before commit.
- Full article bodies, uploaded file bytes, custom knowledge document content, or user private profile fields.
- Raw stack traces for expected validation failures.

If logging user text is necessary, log length, hash, or a short safe preview with a hard limit.

---

## AI / RAG Logging

AI failures should log operational failures, not sensitive prompt content.

Correct:

```java
log.error("failed to call AI chat API", ex);
throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 服务调用失败，请稍后再试");
```

Wrong:

```java
log.error("prompt={}, history={}, apiKey={}", prompt, history, apiKey, ex);
```

Knowledge sync can log document ids, post ids, chunk counts, and status. Do not log full imported knowledge text.

---

## Upload Logging

Upload failures can log filename, sanitized path, file size, and user id. Do not log raw file content. Always sanitize path data before logging if it comes from user input.

---

## Error Response Relationship

Logging and client response are separate:

- `log.error(...)` can include stack trace for maintainers.
- API response should remain sanitized by `GlobalExceptionHandler`.

Do not use `ex.toString()` as the client-facing message for unexpected exceptions.

---

## Tests / Review Points

Review every new log statement for:

- No tokens/secrets/full prompts/full file contents.
- Placeholder count matches arguments.
- Log level matches severity.
- Recoverable fallbacks are `warn`, not `error`, unless they break the request.
