# 修复 Docker 环境未登录公共页面误触发 BotGuard 频控

## Task Classification

Complex Task.

理由：该问题横跨 Docker Nginx 反代、Spring Boot forwarded header / remote address 识别、BotGuard 风险评分与限流策略、公共页面首屏并发接口、前端访问日志/IP 探测请求。需要先做证据采集和边界定义，不能按单文件低风险修复处理。

## Goal

未登录访客在 Docker 部署环境访问首页 `/`、归档页 `/archive`、工具页 `/tools` 时，正常首屏加载不得稳定触发 BotGuard 的 `403 captchaRequired` 或 `429 请求过于频繁`。Docker 与非 Docker 环境下，后端识别到的客户端 IP、公共 GET 读取接口限流行为、验证码/封禁触发边界应保持一致。

## Problem Summary

- 未登录访问首页、归档页、工具页时，几乎稳定出现 BotGuard 风控提示。
- 非 Docker 容器环境之前正常测试不容易出现。
- 影响公共页面首屏加载，属于访客体验和反爬策略误伤。
- 初步怀疑包括：
  - Docker/Nginx 反代后客户端 IP 识别异常，访客被归到同一容器/网关 IP。
  - `X-Forwarded-For`、`X-Real-IP`、Spring remote address 处理与非 Docker 环境不一致。
  - 首屏公共接口并发请求较多，叠加未登录 BotGuard 风险评分后误判。
  - Docker Nginx 或 Spring Boot 未正确传递/信任代理头。
  - BotGuard 对公共 GET 读取的粒度过粗，高风险写操作、AI/评论/验证码接口与静态公共读取边界需要区分。

## Evidence Collection Requirements

Implementation must start with evidence before changing behavior:

- Compare Docker vs non-Docker backend-observed values:
  - `request.getRemoteAddr()`
  - `IpUtils.resolveIp(request)`
  - `X-Forwarded-For`
  - `X-Real-IP`
  - `Forwarded`
  - request path and method
- Verify Docker Nginx `docker/nginx/default.conf` forwards real IP headers for all backend-proxied locations, especially:
  - `/api/`
  - `/api/ai/chat/stream`
  - `/sitemap.xml`
  - `/robots.txt`
- Verify Spring profile/config for forwarded headers:
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-server/src/main/resources/application-docker.yaml`
  - relevant `server.forward-headers-strategy` or equivalent.
- Count unauthenticated first-screen API calls:
  - App boot: `/api/site/meta`, `/api/categories/tree`, `/api/tags`, `/api/comments/recent?size=5`, `/api/about`, optional `/api/users/me` only if stale token exists.
  - App shell: `/api/analytics/client-ip`.
  - Home after article gate: `/api/posts?page=1&size=<size>` and `/api/analytics/page-view`.
  - Archive: `/api/posts/archive/summary` and `/api/analytics/page-view`; month expansion later calls `/api/posts/archive/month?year=&month=&page=1&size=200`.
  - Tools: `/api/games` and `/api/analytics/page-view`.

## Cross-Layer / Infra Contract

### 1. Scope / Trigger

This task may change:

- Backend BotGuard IP resolution and public GET risk scoring/bypass behavior.
- Docker Nginx proxy header forwarding.
- Spring Boot Docker profile proxy-header handling.
- Frontend public first-screen request behavior only if backend/infra changes are insufficient or if redundant analytics/IP calls are proven to amplify the false positive.
- Tests and Trellis specs documenting the new BotGuard/Docker contract.

This task must not change database schema.

### 2. Signatures

Backend existing HTTP endpoints involved:

- `GET /api/site/meta`
- `GET /api/categories/tree`
- `GET /api/tags`
- `GET /api/comments/recent?size=5`
- `GET /api/about`
- `GET /api/analytics/client-ip`
- `POST /api/analytics/page-view`
- `GET /api/posts?page=&size=&categoryId=&tagId=&keyword=`
- `GET /api/posts/archive/summary`
- `GET /api/posts/archive/month?year=&month=&page=&size=`
- `GET /api/games`
- `GET /api/games/{id}`
- `GET /api/guard/captcha`
- `POST /api/guard/verify`

Backend internal signatures likely involved:

- `IpUtils.resolveIp(HttpServletRequest request)`
- `IpUtils.normalizeIp(String ip)`
- `BotGuardEngine.decide(HttpServletRequest request)`
- `BotGuardFilter.doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)`
- `BotGuardProperties`

Frontend existing functions involved:

- `fetchSiteMeta()`
- `fetchCategories()`
- `fetchTags()`
- `fetchRecentComments(size)`
- `fetchAbout()`
- `fetchClientIp()`
- `recordPageView(payload)`
- `fetchPosts(params)`
- `fetchArchiveSummary()`
- `fetchArchiveMonth(year, month, params)`
- `fetchGames()`
- `fetchGameDetail(id)`

Infra/config files involved:

- `docker/nginx/default.conf`
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- possibly `.env.example` if a new documented env/config key is introduced.

### 3. Payload Fields

No new public business API response fields should be introduced unless strictly necessary.

Existing BotGuard error payload must remain compatible:

Captcha response:

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

Blocked response:

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

Optional diagnostic-only headers/config may be used if already supported:

- `security.bot-guard.expose-debug-headers`
- `X-SG-Guard-Score`
- `X-SG-Guard-Action`

If new diagnostic headers are added, they must be gated behind a debug/config flag and must not expose secrets, JWTs, captcha answers, full user-agent lists, or private content.

### 4. Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| Normal unauthenticated Docker visitor opens `/` once | Public data APIs complete without `403`/`429`; no captcha modal/guard error is shown. |
| Normal unauthenticated Docker visitor opens `/archive` once | `GET /api/posts/archive/summary` and page-view flow complete without BotGuard challenge/block. |
| Normal unauthenticated Docker visitor opens `/tools` once | `GET /api/games` and page-view flow complete without BotGuard challenge/block. |
| Same browser triggers homepage article gate after first screen | `GET /api/posts?page=1&size=<size>` should not require captcha solely due to normal app boot requests. |
| Docker request includes `X-Forwarded-For: 203.0.113.10, 172.18.0.1` | Backend risk key should resolve the real client part according to the chosen trusted-proxy policy, not collapse all visitors to container/gateway IP. |
| Docker request has no forwarded headers | Backend falls back to `request.getRemoteAddr()` and behaves no worse than current local/non-Docker behavior. |
| Malicious high-frequency public API loop from one IP | BotGuard still delays/challenges/blocks according to policy. |
| Scanner-like path or hostile user-agent | BotGuard risk score still increases; protection remains active. |
| Auth/admin/upload routes | Existing behavior remains: valid JWT bypasses BotGuard pre-auth challenge; admin/upload auth remains controlled by Spring Security. |
| Captcha API abuse | `/api/guard/captcha` rate protection in `BotGuardCaptchaService` remains effective. |

### 5. Good / Base / Bad Cases

Good:

- Docker behind Nginx correctly identifies distinct real client IPs.
- A normal unauthenticated visit to `/`, `/archive`, and `/tools` does not trigger BotGuard.
- Short abusive bursts still trigger delay/captcha/block on high-risk endpoints.
- Behavior is covered by targeted backend tests and Docker config assertions.

Base:

- Local/non-Docker development without proxy headers still works with `remoteAddr`.
- Missing optional forwarded headers does not crash and does not require Docker-only config to run locally.
- Public GET read endpoints remain readable under normal traffic, with analytics failures swallowed client-side as before.

Bad:

- All Docker visitors are keyed as the Docker gateway/container IP.
- Fix disables BotGuard globally or broadly bypasses all public APIs.
- Fix removes captcha/block behavior for comments, AI/chat guest abuse, scanner paths, or suspicious high-frequency requests.
- Fix adds a second IP utility, a second API wrapper, or duplicate BotGuard pipeline.
- Fix changes DB schema, DTO shape, visual UI, unrelated CSP/uploads behavior, or admin permissions.

## Requirements

- Reuse existing `IpUtils`, `BotGuardEngine`, `BotGuardFilter`, `BotGuardProperties`, `SecurityConfig`, `api.js`, and `useBlogData` paths.
- Do not create a parallel security filter, second IP resolver, or separate frontend API wrapper.
- Prefer backend/infra policy fixes over frontend request suppression if evidence shows IP/proxy/risk scoring is the root cause.
- If frontend changes are needed, keep them limited to reducing redundant normal-visitor first-screen requests without degrading public content availability.
- Preserve existing `ApiResponse` error shape and frontend error parsing.
- Keep BotGuard active for high-risk behavior.
- Add or update tests that fail on the current false-positive shape and pass with the fix.
- Update Trellis spec only if the task establishes a reusable Docker/BotGuard contract.

## Acceptance Criteria

- [ ] Evidence report documents Docker vs non-Docker IP/header observations or provides exact commands/log points to verify them.
- [ ] Normal unauthenticated first load of `/`, `/archive`, and `/tools` does not return `403`/`429` from the involved public APIs under Docker.
- [ ] Distinct clients behind Docker/Nginx are not collapsed into one BotGuard risk key when valid forwarding headers are present.
- [ ] Public GET reads used by first screen do not trigger captcha/block solely due to one normal app boot sequence.
- [ ] Malicious high-frequency access from one IP still triggers BotGuard protection.
- [ ] Auth/admin/upload behavior remains governed by JWT/Spring Security and is not weakened.
- [ ] Docker Nginx and Spring Boot Docker proxy/header config are aligned.
- [ ] Targeted backend tests cover IP resolution/proxy behavior and BotGuard public GET vs malicious burst behavior.
- [ ] Frontend static tests/build are run if `SanguiBlog-front` files are changed.

## Expected Files To Modify

Likely backend:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardEngine.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardProperties.java`
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/security/botguard/BotGuardEngineTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/IpUtilsTest.java`
- possibly `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/SecurityConfigTest.java`

Likely infra:

- `docker/nginx/default.conf`
- possibly `.env.example` if new env keys are introduced.

Likely frontend only if needed after backend/infra evidence:

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
- `SanguiBlog-front/src/AppFull.jsx`
- relevant narrow static tests under `SanguiBlog-front/src/appfull/**` or `SanguiBlog-front/src/utils/**`

## Explicit Non-Goals / Do Not Modify

- Do not change database schema or `sanguiblog_db.sql`.
- Do not redesign public UI, navigation, tools UI, archive UI, or hero behavior.
- Do not change uploaded-game CSP unless direct evidence shows it is required for this task.
- Do not change AI assistant business flow except preserving existing BotGuard/guest access semantics.
- Do not disable BotGuard globally in Docker.
- Do not bypass all `/api/**` GET requests.
- Do not add new third-party dependencies.
- Do not commit changes.

## Required Tests / Verification

Backend minimum:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
mvn -q "-Dtest=BotGuardEngineTest,IpUtilsTest,SecurityConfigTest" test
```

If tests are placed differently, run the exact targeted tests covering:

- forwarded header resolution,
- Docker/proxy IP behavior,
- normal public first-screen GET sequence,
- malicious high-frequency request sequence,
- existing CSP/Nginx alignment if `SecurityConfig` or `docker/nginx/default.conf` changes.

Infra minimum:

```bash
docker compose config
```

Manual Docker verification when Docker is available:

```bash
docker compose up -d --build
curl -i http://localhost/api/analytics/client-ip
curl -i http://localhost/api/site/meta
curl -i http://localhost/api/posts/archive/summary
curl -i http://localhost/api/games
```

If frontend files change:

```bash
cd SanguiBlog-front
node src/appfull/public/HomeViewDeferredArticles.test.js
node src/appfull/AppFullToolsEmptyState.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

If only backend/infra files change, frontend build is optional and should be reported as not run.

## Research Notes

Initial Codex research found:

- `docker/nginx/default.conf` currently forwards `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` for `/api/`, `/api/ai/chat/stream`, `/sitemap.xml`, and `/robots.txt`.
- `SanguiBlog-server/src/main/resources/application-docker.yaml` does not currently show `server.forward-headers-strategy`.
- `IpUtils.resolveIp` currently reads proxy headers directly and falls back to `request.getRemoteAddr()`.
- `BotGuardEngine.decide` keys risk state by `IpUtils.resolveIp(request)`, increments total/no-cookie/empty-referer/content counters, and only allows captcha candidates under configured prefixes.
- `BotGuardProperties.captchaPathPrefixes` defaults to `/api/posts` and `/api/comments`.
- `SecurityConfig` permits public read endpoints but still runs `BotGuardFilter` before auth.
- App boot currently calls several public read endpoints in parallel; route-specific first-screen calls add more load.

## Handoff Status

Codex prepared this PRD and Trellis context only. Business implementation must be done in the DeepSeek coding phase.
