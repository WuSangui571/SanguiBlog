# PRD: Relax Guest BotGuard Public Read Limits

## Summary

Unauthenticated visitors can currently trigger BotGuard after several public site reads in a short time. Once triggered, public backend APIs such as post lists may return captcha/block errors, and the public article-list UI only shows a load failure/retry state. Because there is no site-wide public-read captcha UI for this view, normal visitors can get stuck.

Decision: implement option 2 for this task. Relax unauthenticated public-read BotGuard scoring by applying the existing Trellis public-read contract in backend BotGuard. Do not implement a new global captcha UI in this task, and do not change logged-in user handling.

## Scope Classification

Complex Task.

Rationale:
- Security/risk-control behavior changes.
- Backend filter/service behavior affects public API availability.
- Cross-layer UX contract matters because frontend article lists surface BotGuard failures as load failures.
- Requires targeted BotGuard tests and public-read Good/Base/Bad matrix.

## Goals

1. Normal unauthenticated visitors can browse first-screen public pages, post lists, archives, tags/categories, about, comments recent, client-ip, and tools/games without hitting BotGuard captcha/block solely from normal app boot and modest navigation.
2. BotGuard still protects against high-frequency scripts, scanner paths, hostile user agents, and non-GET mutations.
3. Existing logged-in behavior remains unchanged: valid JWT requests bypass BotGuard in `BotGuardFilter`, and authorization remains owned by Spring Security.
4. Existing captcha endpoints and response shape remain compatible, but public article-list flow should not depend on a new captcha UI for this task.

## Non-Goals / Do Not Modify

- Do not change AI guest access limits under `ai.chat.public-access.*`.
- Do not change logged-in user throttling or valid-JWT BotGuard bypass.
- Do not add a new global frontend captcha modal/overlay for public article lists.
- Do not change authentication, admin, upload, notification, permission, or user endpoint authorization.
- Do not change DB schema or data.
- Do not change analytics GeoIP/IP resolver behavior except preserving existing `IpUtils.resolveIp` use.
- Do not create a second BotGuard engine, IP resolver, API wrapper, or frontend global state store.

## Recommended Approach

Reuse and complete the existing backend BotGuard path:

1. Add configurable public-read relief fields to `BotGuardProperties`, aligned with the existing spec:
   - `publicReadPathPrefixes`
   - `publicReadGoodScore`
2. In `BotGuardEngine.decide(HttpServletRequest request)`, detect public-read requests:
   - Method must be `GET`.
   - Servlet/request path must start with one configured public-read prefix.
3. For public-read requests:
   - Do not increment `noCookie` and `emptyReferer` counters.
   - Subtract `publicReadGoodScore` from risk delta.
   - Continue incrementing `total` and `content`, so high-frequency loops still accumulate risk.
   - Continue scanner-path, user-agent, stable interval, C-segment, captcha, delay, and block logic.
4. Keep non-GET public-prefix requests, especially comment POSTs, on existing normal BotGuard behavior.

This intentionally follows `.trellis/spec/guides/cross-layer-thinking-guide.md` "Docker BotGuard/public-read contract", which appears to be ahead of current code.

## Cross-Layer Contract

### 1. Scope / Trigger

Change backend risk scoring for unauthenticated public GET read APIs so normal visitors are not trapped by a captcha/block state that public list views cannot satisfy.

### 2. Signatures

Backend:
- `BotGuardProperties`
  - `security.bot-guard.public-read-path-prefixes`
  - `security.bot-guard.public-read-good-score`
- `BotGuardEngine.decide(HttpServletRequest request)`
- `BotGuardFilter`
  - existing `403` captcha and `429` block responses remain unchanged.

Frontend:
- No planned frontend API signature changes.
- Existing public readers:
  - `fetchSiteMeta() -> GET /api/site/meta`
  - `fetchCategories() -> GET /api/categories/tree`
  - `fetchTags() -> GET /api/tags`
  - `fetchPosts(params) -> GET /api/posts?...`
  - `fetchArchiveSummary() -> GET /api/posts/archive/summary`
  - `fetchArchiveMonth(year, month, params) -> GET /api/posts/archive/month?...`
  - `fetchRecentComments(size) -> GET /api/comments/recent?...`
  - `fetchAbout() -> GET /api/about`
  - `fetchClientIp() -> GET /api/analytics/client-ip`
  - `fetchGames() -> GET /api/games`
  - `fetchGameDetail(id) -> GET /api/games/{id}`

DB:
- No schema or data changes.

Env/config:
- Defaults may live in `BotGuardProperties`.
- Optional configuration may be added under `security.bot-guard.*` only if needed, but do not require operators to set env vars for the fix to work.

### 3. Payloads

Request:
- Existing HTTP requests only; no new payload.
- Public-read relief applies only to `GET` requests whose path starts with configured prefixes.

Success response:
- Existing downstream controller response, usually:

```json
{ "success": true, "message": "ok", "data": {} }
```

Captcha response, unchanged:

```json
{
  "success": false,
  "message": "需要验证码",
  "data": {
    "captchaRequired": true,
    "captchaUrl": "/api/guard/captcha",
    "verifyUrl": "/api/guard/verify",
    "riskScore": 35.0
  }
}
```

Block response, unchanged:

```json
{
  "success": false,
  "message": "请求过于频繁，请稍后再试",
  "data": {
    "retryAfterSeconds": 120,
    "riskScore": 60.0
  }
}
```

Headers:
- `Retry-After` remains required for `429`.
- `X-SG-Captcha-Required` remains required for captcha responses.
- `X-SG-Guard-Score` / `X-SG-Guard-Action` remain debug-only when configured.

### 4. Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| Guest GET `/api/posts?page=1&size=10` with normal browser UA and no cookie/referrer, repeated modestly during page boot/navigation | `PASS` or at most `DELAY`; should not reach `CAPTCHA`/`BLOCK` solely because of no cookie/referrer counters |
| Guest GET `/api/site/meta`, `/api/categories/tree`, `/api/tags`, `/api/comments/recent`, `/api/about`, `/api/analytics/client-ip`, `/api/games` | Public-read relief applies |
| Guest GET `/api/posts/archive/summary` or `/api/posts/archive/month?...` | Public-read relief applies and archive reads remain usable |
| Guest POST `/api/posts/{postId}/comments` | Public-read relief does not apply; existing auth/BotGuard behavior remains |
| Logged-in request with valid JWT | Unchanged: `BotGuardFilter.hasValidJwt` bypasses BotGuard and Spring Security owns authorization |
| Scanner-like path such as `/.env` or `/wp-admin` | Scanner scoring still applies; public-read prefixes must not bypass scanner detection |
| Hostile/script UA repeatedly loops public read endpoints at high frequency | `total`, `content`, stable interval, UA, C-segment, captcha/block logic still escalate |
| Missing/empty path or disabled BotGuard | Existing pass behavior remains |

### 5. Good / Base / Bad Cases

Good:
- A normal guest opens `/`, then visits article list/archive/tools; first-screen public APIs return backend data without `403`/`429`.
- Existing public-read prefixes cover the current frontend boot requests and article-list data requests.

Base:
- Guest has no cookies and empty referrer; public-read GETs still get relief, while risk still accounts for total/content rate.
- Request has stale/invalid token and is retried unauthenticated by `api.js` on `401`; BotGuard public-read scoring should not turn that retry into a captcha.

Bad:
- A tight script loop against `/api/posts?page=1&size=10` still escalates to captcha/block after high frequency.
- Scanner-like routes and bot user agents still increase risk.
- Non-GET writes under a public prefix do not receive public-read relief.

## Code Research Notes

### Relevant Specs

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

### Code Patterns Found

- `BotGuardFilter` bypasses requests carrying a valid JWT before calling `BotGuardEngine`; this is the logged-in boundary and must remain unchanged.
- `BotGuardEngine` currently increments `total`, `noCookie`, `emptyReferer`, and `content` for public API reads before scoring.
- Current thresholds are low enough that no-cookie/no-referrer public reads can accumulate score quickly: `delayThreshold=18`, `captchaThreshold=35`, `blockThreshold=60`.
- Current captcha candidate prefixes are only `/api/posts` and `/api/comments`; current code has no `publicReadPathPrefixes`.
- `BotGuardController` and `api.js` already expose `/api/guard/captcha` and `/api/guard/verify`.
- Public article list failure UI only shows `postsError` and a retry button; it does not display or verify guard captcha.
- `api.js` has public GET stale-token retry logic for `/posts`, `/site`, `/categories`, `/tags`, `/about`, and `/comments`; this is separate from BotGuard `403/429`.
- There are no existing `BotGuardEngineTest` files in `src/test`; this task should add targeted backend coverage.

### Retrieval Report

- Keywords searched: `BotGuard`, `bot-guard`, `captcha`, `captchaRequired`, `publicRead`, `public-read`, `Retry-After`, `fetchPosts`, `postsError`, `archive/summary`.
- Candidate implementations:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardEngine.java`: owner of risk scoring, counters, delay/captcha/block action selection.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardProperties.java`: owner of configurable thresholds and captcha prefixes.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardFilter.java`: owner of valid-JWT bypass and captcha/block response shape.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/BotGuardController.java`: existing captcha generate/verify endpoint, not the primary change path.
  - `SanguiBlog-front/src/api.js`: frontend API/error parsing and existing guard captcha functions.
  - `SanguiBlog-front/src/hooks/useBlogData.jsx`: public post data loader that converts backend error into `postsError`.
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`: renders "文章加载失败" plus retry when `postsError` is set.
- Decision: modify existing `BotGuardProperties` and `BotGuardEngine`; add focused backend tests. Do not create a second guard service, second IP resolver, or global frontend captcha implementation.
- Duplicate risk: low if the change stays in the existing BotGuard engine/property path and reuses existing `IpUtils.resolveIp` and `BotGuardFilter` response contracts.

## Files Likely To Modify

Expected:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardProperties.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardEngine.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/security/botguard/BotGuardEngineTest.java`

Possible only if implementation needs config docs/default override:
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`

Avoid unless explicitly choosing a frontend UX/captcha follow-up:
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
- `SanguiBlog-front/src/appfull/public/ArticleList.jsx`

## Required Tests

Backend targeted tests:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=BotGuardEngineTest,IpUtilsTest" test
mvn -q -DskipTests compile
```

If `SecurityConfig` wiring is touched:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=SecurityConfigTest" test
```

If frontend files are touched:

```powershell
cd SanguiBlog-front
node src/appfull/public/ArticleList.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Optional manual smoke after coding, PowerShell 5.1 safe:

```powershell
curl.exe -i "http://localhost/api/site/meta"
curl.exe -i "http://localhost/api/posts?page=1&size=10"
curl.exe -i "http://localhost/api/posts/archive/summary"
curl.exe -i "http://localhost/api/comments/recent?size=5"
curl.exe -i "http://localhost/api/games"
```

Assertion points:
- Normal public GETs do not return `403` captcha or `429` block under modest repeated access.
- High-frequency/script-like behavior still escalates in `BotGuardEngineTest`.
- Non-GET public-prefix requests do not receive public-read relief.
- Valid JWT bypass behavior remains untouched.

## Planning Self-Check

- Acceptance criteria: explicit above.
- Forbidden scope: explicit above.
- Expected files: listed above.
- Required tests: listed above.
- Concrete guidelines read: backend/frontend index, detailed backend/frontend guidelines, code reuse guide, cross-layer guide.
- Open requirement questions: none. Current recommendation chooses option 2 because option 1 expands frontend UX and is unnecessary for this incident.
- API/DB/frontend field alignment: no new API path, no DB change, no DTO field change, existing BotGuard error payload remains unchanged.
