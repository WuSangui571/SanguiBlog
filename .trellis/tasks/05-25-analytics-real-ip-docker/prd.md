# Fix Docker Analytics Real Visitor IP PRD

## Task Scope

Task type: Complex Task.

Reason: this bug crosses Docker/Nginx reverse-proxy behavior, Spring request IP resolution, analytics persistence, admin analytics display, BotGuard/auth/AI IP consumers, and production deployment verification. The implementation must stay narrow and must not rewrite analytics or frontend UI.

## Problem Statement

After the containerized deployment update, `/admin/analytics` access logs record the visitor IP as the fixed Docker bridge address `172.29.0.1`. In the previous non-container deployment this did not happen. The expected behavior is that analytics logs store the real visitor client IP when the request passes through Docker Nginx and any upstream host/proxy layer.

Likely root cause from code research:

- Backend analytics already calls `IpUtils.resolveIp(HttpServletRequest)` before persisting `analytics_page_views.viewer_ip`.
- Docker backend profile already has `server.forward-headers-strategy: native`.
- Docker Nginx forwards `X-Real-IP` and `X-Forwarded-For`, but sets `X-Real-IP` to `$remote_addr`. When the web container is reached through a host-level proxy or Docker bridge NAT, `$remote_addr` can be `172.29.0.1`.
- If the upstream proxy does not pass `X-Forwarded-For`, or Docker Nginx does not consume trusted upstream real-IP headers before proxying to backend, backend receives only the Docker bridge address and analytics stores it.
- Existing frontend public-IP fallback only overrides loopback backend IPs, not private Docker bridge IPs. Do not rely on browser public-IP services as the primary fix.

## Goals

1. `/api/analytics/client-ip` returns the real visitor IP behind containerized deployment when trusted proxy headers are present.
2. `POST /api/analytics/page-view` stores the same real visitor IP into `analytics_page_views.viewer_ip`.
3. Existing consumers of `IpUtils.resolveIp` keep a single shared resolver path: analytics, BotGuard, auth login attempts, sitemap/robots analytics, AI guest access, post view tracking.
4. Docker Nginx keeps forwarding required proxy headers for `/api/`, `/api/ai/chat/stream`, `/sitemap.xml`, and `/robots.txt`.
5. The fix does not add a second analytics pipeline, does not add a second IP resolver, and does not change the `/admin/analytics` DTO/UI contract unless research proves it is necessary.

## Non-Goals / Forbidden Scope

- Do not rewrite analytics aggregation, filters, pagination, delete behavior, or frontend analytics table rendering.
- Do not change `analytics_page_views` schema unless absolutely necessary; current `viewer_ip varchar(45)` is already sufficient.
- Do not add a new frontend API wrapper or a new analytics endpoint.
- Do not make the frontend browser call an external IP service the primary production solution.
- Do not relax BotGuard, auth, admin permissions, or upload/security behavior.
- Do not log secrets, JWTs, full headers, or full user-agent data beyond existing safe diagnostic needs.
- Do not update site version or release docs unless the user explicitly asks.

## Cross-Layer Contract

### 1. Scope / Trigger

The behavior changes at the reverse proxy and request IP resolution boundary. The stored analytics value and admin display are downstream consumers of the resolved request IP.

### 2. Signatures

Backend public endpoints:

- `GET /api/analytics/client-ip`
  - Request: no body.
  - Response: `ApiResponse<Map<String, String>>`
  - Payload: `{ "ip": "<resolved-ip>" }`

- `POST /api/analytics/page-view`
  - Request body: `PageViewRequest`
  - Response: `ApiResponse<Void>`
  - Side effect: insert `analytics_page_views.viewer_ip = <resolved-ip>`

Backend admin endpoint:

- `GET /api/admin/analytics/page-views?page=&size=&ip=&keyword=&loggedIn=&postId=&pageType=&excludeSystemPages=&start=&end=`
  - Existing response remains `ApiResponse<PageResponse<AdminAnalyticsSummaryDto.RecentVisit>>`
  - `RecentVisit.ip` remains the field consumed by `/admin/analytics`.

Backend resolver:

- `IpUtils.resolveIp(HttpServletRequest request)`
  - Must remain the single resolver.
  - Must prefer trusted proxy headers over `request.getRemoteAddr()`.
  - Must normalize loopback and IPv4-mapped IPv6.
  - Should parse common `Forwarded: for=...;proto=...` if implementation touches this area.

Docker/Nginx:

- `docker/nginx/default.conf`
  - Must preserve proxy headers for backend-proxied routes:
    - `Host`
    - `X-Forwarded-Host` where already present or needed
    - `X-Real-IP`
    - `X-Forwarded-For`
    - `X-Forwarded-Proto`
  - If using Nginx realip, configure trusted upstream ranges narrowly enough for the deployment model and document the assumptions.

Spring config:

- `SanguiBlog-server/src/main/resources/application-docker.yaml`
  - Keep `server.forward-headers-strategy: native`.
  - Add only narrowly scoped proxy/trusted-header config if needed.

DB:

- No schema change expected.
- Existing column: `analytics_page_views.viewer_ip varchar(45) not null`.

Frontend:

- No frontend contract change expected.
- `/admin/analytics` continues reading `RecentVisit.ip`.
- Optional frontend test only if implementation changes fallback behavior in `AppFull.jsx` or `shared.js`.

### 3. Payload Fields

`PageViewRequest` fields:

- `postId: Long | null`
- `pageTitle: string | null`
- `referrer: string | null`
- `geo: string | null`
- `userAgent: string | null`
- `clientIp: string | null`
- `sourceLabel: string | null`

Rules:

- Server-resolved IP from trusted request headers is authoritative.
- `clientIp` may remain only as the current fallback for loopback local dev behavior.
- Do not trust arbitrary client-provided `clientIp` over a non-loopback server-resolved private bridge IP unless the risk and validation are explicitly handled. Prefer fixing proxy headers.

### 4. Validation / Error Matrix

| Case | Input / Environment | Expected Result |
|---|---|---|
| Good: upstream proxy provides `X-Forwarded-For: 203.0.113.10` and Docker web sees remote `172.29.0.1` | `GET /api/analytics/client-ip` through Docker web | Response `data.ip = 203.0.113.10`; page-view stores `203.0.113.10` |
| Good: upstream proxy provides `X-Real-IP: 203.0.113.20` only | Docker web/backend path | Response and stored IP use `203.0.113.20` if this is the trusted configured path |
| Good: Cloudflare-style `CF-Connecting-IP: 203.0.113.30` reaches backend | Request headers include CF header | Resolver can use `203.0.113.30` without breaking existing XFF priority |
| Base: local dev direct request has no proxy headers | `remoteAddr=127.0.0.1` or `::1` | Response remains normalized loopback `127.0.0.1`; no crash |
| Base: Docker request has no forwarded headers and source is `172.29.0.1` | No upstream header exists | Resolver falls back to `172.29.0.1`; document that true IP is unrecoverable without upstream header/proxy protocol/host networking |
| Bad: `X-Forwarded-For` contains `unknown, 172.29.0.1` | Malformed/placeholder header | Resolver skips unusable entries where possible and falls back safely |
| Bad: `Forwarded: for=203.0.113.40;proto=https` | RFC 7239 header only | Resolver returns clean IP `203.0.113.40`, not the raw `for=...` token |
| Bad: malicious public client sends arbitrary XFF directly to published port | No trusted upstream boundary | Do not silently expand trust beyond deployment assumptions; document limits and prefer trusted proxy configuration |
| Bad: analytics persistence fails | DB problem | Existing behavior: error should not break main page read where analytics is secondary; direct analytics endpoint should still follow existing exception handling |

### 5. Good / Base / Bad Cases

Good:

- Production request path with a correctly configured upstream reverse proxy and Docker Nginx stores the real public visitor IP in `analytics_page_views.viewer_ip`.
- `/admin/analytics` shows different visitor IPs instead of the fixed `172.29.0.1`.
- BotGuard/auth/AI guest access continue to use the same resolved IP as analytics.

Base:

- Local Docker or direct LAN testing without forwarded headers may still show a local/private IP; the system must not fail, and this limitation must be documented.
- Existing records already stored as `172.29.0.1` are not retroactively rewritten.

Bad:

- Creating a second resolver for analytics only.
- Trusting `PageViewRequest.clientIp` blindly from the browser for all environments.
- Breaking public first-screen APIs, sitemap/robots, AI SSE buffering, or uploaded game CSP while editing Nginx.

## Focused Research Summary

### Keywords Searched

- `resolveIp`
- `client-ip`
- `PageViewRequest`
- `AnalyticsService`
- `analytics_page_views`
- `viewerIp`
- `X-Forwarded-For`
- `X-Real-IP`
- `CF-Connecting-IP`
- `Forwarded`
- `proxy_set_header`
- `forward-headers-strategy`
- `getRemoteAddr`
- `172.29.0.1`

### Existing Candidate Implementations

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`: existing shared IP resolver. Reuse/modify this, do not create another resolver.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`: public analytics record and client-IP endpoints. Keep endpoint contract; may need only targeted tests.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`: persists `viewer_ip`, maps admin `RecentVisit.ip`, and filters by IP. No schema/UI contract change expected.
- `docker/nginx/default.conf`: Docker reverse proxy header forwarding. Likely implementation hotspot for preserving/realizing upstream real IP.
- `SanguiBlog-server/src/main/resources/application-docker.yaml`: Docker Spring forwarded-header strategy already set to `native`; preserve and only adjust if necessary.
- `.kilo/worktrees/record-feat-docker/SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/IpUtilsTest.java`: prior useful test coverage exists in preserved worktree but is absent from current root. Use it as a reference to add root-side focused tests.

Decision: modify existing `IpUtils` and/or Docker Nginx config, plus add targeted tests. Do not add new controller/service/component paths.

Duplicate risk: low if implementation keeps all callers on `IpUtils.resolveIp` and changes only proxy/header parsing behavior.

## Files Likely To Modify

Expected:

- `docker/nginx/default.conf`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/IpUtilsTest.java` (create in root if still absent)

Possible only if implementation proves necessary:

- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/docker-deploy.md`
- `README.md`
- `README.zh-CN.md`

Avoid unless there is a demonstrated contract change:

- `SanguiBlog-front/src/AppFull.jsx`
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `sanguiblog_db.sql`
- `AnalyticsService.java`
- `AdminAnalyticsController.java`
- `AdminAnalyticsSummaryDto.java`

## Implementation Plan For DeepSeek

1. Confirm the current production request topology:
   - Is there a host-level Nginx/Caddy/Cloudflare layer in front of Docker `web`?
   - Does that layer send `X-Forwarded-For` or `X-Real-IP` to Docker `web`?
   - If no upstream forwarded header exists, note that application code cannot reconstruct the public IP from `172.29.0.1`.

2. Add/restore focused backend tests first:
   - Create `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/IpUtilsTest.java` if absent.
   - Cover XFF chain, X-Real-IP fallback, CF header, RFC `Forwarded`, unknown entries, IPv4-mapped IPv6, loopback fallback, and Docker no-header fallback.

3. Improve `IpUtils` only if tests reveal gaps:
   - Keep existing priority compatible: `X-Forwarded-For`, `X-Real-IP`, `X-Client-IP`, `CF-Connecting-IP`, `Forwarded`.
   - For `X-Forwarded-For`, pick the first usable non-empty, non-`unknown` token.
   - For `Forwarded`, parse `for=<ip>` cleanly, stripping quotes/brackets/port where appropriate.
   - Preserve length cap and loopback normalization.

4. Update Docker Nginx real-IP handling if production topology has an upstream proxy:
   - Add `real_ip_header` / `real_ip_recursive` and trusted `set_real_ip_from` entries appropriate for the host/proxy path.
   - Ensure after realip resolution, backend-proxied locations pass real client IP via `X-Real-IP` and append the correct `X-Forwarded-For`.
   - Preserve `/api/ai/chat/stream` buffering settings and `/uploads/games/` CSP.

5. Document deployment assumptions if Nginx/proxy config changes:
   - Update `docs/docker-deploy.md` or README only with narrow guidance:
     - upstream proxy must pass `X-Forwarded-For` / `X-Real-IP`;
     - if direct Docker port still reports `172.29.0.1`, this indicates missing upstream header or source NAT that app code cannot undo;
     - how to verify with `/api/analytics/client-ip`.

6. Do not touch frontend unless backend/proxy cannot solve it and the user approves browser-public-IP fallback expansion.

## Required Tests And Assertion Points

Backend unit tests:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=IpUtilsTest" test
```

Assertions:

- `X-Forwarded-For: 203.0.113.10, 172.29.0.1` resolves to `203.0.113.10`.
- `X-Real-IP: 203.0.113.20` resolves to `203.0.113.20` when XFF is absent/unusable.
- `CF-Connecting-IP: 203.0.113.30` resolves to `203.0.113.30`.
- `Forwarded: for=203.0.113.40;proto=https` resolves to `203.0.113.40`.
- no headers plus `remoteAddr=172.29.0.1` falls back to `172.29.0.1` and does not pretend to know the real IP.
- loopback and IPv4-mapped IPv6 normalization remains unchanged.

Backend compile:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
```

Infra config:

```bash
docker compose config
docker compose -f docker-compose.prod.yml config --quiet
```

Runtime verification when Docker/proxy is available:

```bash
curl -i http://localhost/api/analytics/client-ip
curl -i -H "X-Forwarded-For: 203.0.113.10" http://localhost/api/analytics/client-ip
curl -i -H "X-Real-IP: 203.0.113.20" http://localhost/api/analytics/client-ip
```

Expected:

- Header-based requests return the supplied test public IP when they traverse the trusted proxy path.
- A real browser page-view after deployment inserts `analytics_page_views.viewer_ip` as the public client IP, not `172.29.0.1`.
- `/admin/analytics` displays the stored public IP.

Frontend only if frontend files change:

```bash
cd SanguiBlog-front
npm run build
```

## Acceptance Criteria

1. New analytics records in Docker deployment no longer all show `172.29.0.1` when real client IP headers are available from the trusted upstream path.
2. `/api/analytics/client-ip` can be used as a diagnostic endpoint and returns the same resolved IP that page-view recording uses.
3. `IpUtils.resolveIp` remains the single shared resolver and has targeted unit coverage for proxy-header and Docker fallback cases.
4. Docker Nginx continues to route `/api/`, `/api/ai/chat/stream`, `/sitemap.xml`, `/robots.txt`, and uploads without breaking existing SSE/CSP/static-file contracts.
5. No DB schema, analytics DTO, admin UI, permissions, or BotGuard behavior is changed beyond the shared resolved-IP correction.

## Planning Self-Check

- Acceptance criteria defined: yes.
- Forbidden modification scope defined: yes.
- Expected files listed: yes.
- Required tests listed: yes.
- Concrete guidelines read: backend/frontend/guides indexes plus backend directory, quality, database, error, logging, frontend directory, quality, component, hook, state, type-safety, code-reuse, cross-layer.
- Open questions: production topology should be confirmed before final Nginx trust ranges are chosen.
- API / DB / frontend DTO alignment: no expected API/DB/frontend field changes; existing `RecentVisit.ip` remains aligned to `analytics_page_views.viewer_ip`.
