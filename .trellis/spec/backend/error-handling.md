# Backend Error Handling

> All JSON API errors should be returned through `ApiResponse` and `GlobalExceptionHandler`, with stable HTTP status semantics.

---

## Scope / Trigger

Use this spec when adding exceptions, validation, controller endpoints, upload errors, AI chat failures, security failures, or cross-layer API contracts.

---

## API Response Contract

JSON APIs return:

```java
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
}
```

Success:

```json
{ "success": true, "message": "ok", "data": { } }
```

Failure:

```json
{ "success": false, "message": "message for user", "data": null }
```

Failure with structured data:

```json
{
  "success": false,
  "message": "需要验证码",
  "data": {
    "captchaRequired": true,
    "captchaUrl": "/api/guard/captcha",
    "verifyUrl": "/api/guard/verify",
    "riskScore": 80
  }
}
```

Do not return raw maps for normal JSON errors when `ApiResponse.fail(...)` is applicable.

---

## Exception Mapping

`GlobalExceptionHandler` owns standard mapping:

| Exception | HTTP | Body |
|-----------|------|------|
| `IllegalArgumentException` | 400 | `ApiResponse.fail(ex.getMessage())` |
| `IllegalStateException` | 400 | `ApiResponse.fail(ex.getMessage())` |
| `MethodArgumentNotValidException` | 400 | first field error |
| `NotFoundException` | 404 | message |
| `ResponseStatusException` | status from exception | reason or sanitized fallback |
| `SecurityException` | 403 | message |
| `LoginChallengeException` | 400 | captcha-required data |
| `AiAccessControlException` | custom status | structured access-control data |
| other `Exception` | 500 | sanitized message except dev/local |

Production must not expose internal exception details. Only `dev` or `local` profiles may expose raw exception messages for 500-class failures.

---

## When to Throw What

| Situation | Throw |
|-----------|-------|
| Request parameter is invalid | `IllegalArgumentException` |
| Entity does not exist or is not visible to this endpoint | `NotFoundException` |
| Current state cannot accept the operation | `IllegalStateException` |
| Need a precise HTTP status such as 401/502 | `ResponseStatusException` |
| Authenticated user lacks permission | `SecurityException` or `@PreAuthorize` |
| AI feature disabled, guest throttled, captcha/block needed | `AiAccessControlException` |

---

## Controller Rules

Controllers should avoid broad `try/catch`. Let `GlobalExceptionHandler` translate service exceptions.

Good:

```java
@DeleteMapping("/{id}")
@PreAuthorize("hasAuthority('PERM_POST_DELETE')")
public ApiResponse<Void> delete(@PathVariable Long id) {
    postService.delete(id);
    return ApiResponse.ok();
}
```

Bad:

```java
try {
    postService.delete(id);
    return ApiResponse.ok();
} catch (Exception ex) {
    return ApiResponse.fail(ex.toString());
}
```

Why: this loses status codes and may leak internals.

---

## Upload Errors

Upload validation should fail early with `IllegalArgumentException`:

- Empty file
- Unsupported extension
- Unsupported `Content-Type`
- File too large
- Too many files
- Total request too large

Current limits:

| Upload Type | Limit |
|-------------|-------|
| Article asset single file | 20 MB |
| Article asset batch total | 50 MB |
| Article asset count | 10 |
| Post cover | 10 MB |
| Spring multipart global max | 60 MB |

Deployment Nginx `client_max_body_size` should be at least `60m`; otherwise users may get 413 before Spring can return the project JSON error.

---

## AI Chat Errors

AI chat has special boundary behavior:

- `AiAssistantSettingService.assertEnabled()` must run before user-side chat work. Disabled assistant returns unavailable rather than silently calling the model.
- Guest access is resolved through `AiGuestAccessService`; captcha/block responses carry structured data using `AiAccessControlException`.
- Empty user message throws `IllegalArgumentException`.
- Upstream model failures become `ResponseStatusException(HttpStatus.BAD_GATEWAY, "...")`.
- AI provider concurrency saturation becomes a fast user-facing busy response: JSON should use HTTP `429`; SSE should send an `error` event and complete.
- SSE stream errors should send an `error` event if possible and complete the emitter.
- Provider streams that stop producing `chunk`, `complete`, or `error` must be bounded by a server-side timeout; on timeout, dispose the provider subscription, send an SSE `error` event if possible, and complete the emitter.
- If streaming fails but a sync fallback succeeds, complete with normal `complete` event.

SSE completion payload contract:

```json
{
  "reply": "...",
  "sessionId": 1,
  "model": "gpt-4o-mini",
  "mode": "DATABASE_SESSION_HISTORY",
  "references": []
}
```

The frontend treats `complete` as terminal success; do not emit a later error that overwrites the completed message.

---

## BotGuard Responses

BotGuard is a risk-control filter, not authentication. Keep these contracts:

| Scenario | HTTP | Body |
|----------|------|------|
| Captcha required | 403 | `ApiResponse.fail("需要验证码", data)` |
| Temporarily blocked | 429 | `ApiResponse.fail("请求过于频繁，请稍后再试", data)` plus `Retry-After` |
| Admin/upload/authenticated paths | Should generally bypass BotGuard 403/429 and let Spring Security decide |

Static resources and page entries should not be broken by BotGuard short blocking; API protection is the primary target.

---

## Frontend Compatibility Contract

The frontend API wrapper in `SanguiBlog-front/src/api.js` reads `payload.message || payload.msg || rawText`. Backend JSON errors should put user-facing text in `message`.

For public GET APIs, the frontend may retry without a stale token after 401. Do not rely on 401 side effects for public read endpoints.

---

## Good / Base / Bad Cases

| Case | Expected Result |
|------|-----------------|
| Good | Invalid archive month throws `IllegalArgumentException`; client receives HTTP 400 and readable message |
| Base | Missing post throws `NotFoundException`; client receives HTTP 404 |
| Bad | Catching all exceptions in a controller and returning HTTP 200 with `success=false` |

---

## Tests Required

- For new exception types: test `GlobalExceptionHandler` mapping or the service/controller status.
- For upload/security errors: test both status and response data shape.
- For AI/SSE changes: test direct answer, stream complete, error path, and no post-complete overwrite.
