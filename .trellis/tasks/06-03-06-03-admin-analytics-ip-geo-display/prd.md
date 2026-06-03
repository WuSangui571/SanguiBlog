# Admin Analytics IP Geolocation Display Regression PRD

## Session Start / Project Status

This planning session ran the Trellis start/context read before writing the PRD:

- Current branch: `main`
- Git status from `.trellis/scripts/get_context.py`: clean
- Active task before this session: none
- Workspace journal: `.trellis/workspace/sangui/journal-1.md`, 18 recorded sessions, last active `2026-05-31`

Relevant recent journal state:

- Session 15, `2026-05-25`, fixed Docker analytics real visitor IP.
  - Updated `IpUtils`, `IpUtilsTest`, `docker/nginx/default.conf`, and Docker deploy docs.
  - Kept admin analytics UI/API/DTO/DB schema unchanged.
  - Explicitly kept one shared `IpUtils.resolveIp` path for analytics, BotGuard, auth, sitemap analytics, AI guest access, and post view tracking.
- Session 18, `2026-05-31`, fixed guest article comment login prompt.
  - Frontend-only comments change; no analytics/IP/geo implementation changes.

Current repository history check:

- Relevant commits after `2026-05-24`: `11aa5cd` Docker visitor IP fix, V2.3.0 docs, cleanup, and guest comment frontend fix.
- No current active task exists.
- No code commit in the current local history on/after `2026-06-01` directly changes the analytics geo implementation. If production behavior changed around `2026-06-01`, the most likely causes are runtime/deployment/external provider behavior rather than a direct repo edit to this module.

## Task Scope

Task type: Complex Task.

Reason: the issue crosses frontend analytics payloads, backend analytics persistence, external GeoIP lookup behavior, Docker/proxy IP correctness, DB stored fields, admin analytics display, docs/config, and verification. This planning round must not write business code. It prepares a Qwen implementation handoff only.

## Problem Statement

`/admin/analytics` access logs show IP geolocation values such as:

- `Asia/Shanghai`
- `UTC`
- `未知`

These are not real IP geolocations for the corresponding IPs. The user observed that records before about `2026-06-01` looked normal, while records after that date often show these fallback values.

Focused code research shows the current data flow:

```text
Browser route/page-view event
-> AppFull.jsx sends PageViewRequest.geo = getGeoHint()
-> getGeoHint() returns Intl.DateTimeFormat().resolvedOptions().timeZone
-> POST /api/analytics/page-view
-> AnalyticsController resolves viewer IP with IpUtils.resolveIp()
-> AnalyticsService.resolveGeoLocation(ip, request.geo)
   1. geoIpService.lookup(ip)
   2. if blank, use request.geo
   3. if still blank, use "未知"
-> analytics_page_views.geo_location
-> AdminAnalyticsSummaryDto.RecentVisit.geo
-> /admin/analytics table renders visit.geo || "未知"
```

So `Asia/Shanghai` and `UTC` are not produced by an IP geolocation provider. They are frontend browser timezone fallback values. Backend writes them only when `GeoIpService.lookup(ip)` returns blank/null. `未知` means both the backend lookup and usable frontend fallback were blank or the fallback path wrote unknown.

Current backend GeoIP provider:

- `GeoIpService` is the real service used by `AnalyticsService` and `PostService`.
- It calls `https://ipapi.co/{ip}/json/`.
- It uses `country_name`, `region`, and `city`, and returns null on remote failure.
- Failures are logged only at debug level, so production can silently degrade.
- A separate `GeoLocationService` also exists but appears unused in current business paths; do not create a third path or keep duplicate active services.

Most likely root cause candidates:

1. `ipapi.co` remote lookup started failing, timing out, returning `error`, or rate-limiting the server around `2026-06-01`, causing fallback to frontend timezone.
2. The `2026-05-25` Docker real-IP fix may have increased valid public IP lookup volume. Before that, many requests may have been private/bridge IPs resolved locally as `内网`; after the fix, more unique public IPs require remote GeoIP calls, making rate limits/provider reachability visible.
3. If the Docker/proxy path still sometimes provides private/loopback IPs or no trusted real IP, local/remote lookup cannot recover true geolocation.
4. `/admin/analytics` display is a downstream consumer; no evidence yet that its table mapping is the primary bug.

## Goals

1. New analytics records should store an actual IP-derived location when the request IP is public and a local GeoIP database can resolve it.
2. The system should not store raw browser timezone strings such as `Asia/Shanghai` or `UTC` in `analytics_page_views.geo_location` as if they were IP geolocation.
3. Prefer replacing the remote-only `ipapi.co` dependency with a backend-local `ip2region` lookup path.
4. Keep `AnalyticsService` and `PostService` using one shared GeoIP service path.
5. Preserve existing admin analytics API shape and UI consumption unless implementation proves a contract change is necessary.
6. Keep Docker/proxy real-IP behavior from Session 15 intact.
7. Make provider failure visible enough for operations without logging secrets, full headers, or user content.

## Non-Goals / Forbidden Scope

- Do not rewrite the `/admin/analytics` page layout, filters, pagination, deletion flow, permission checks, or analytics summary charts.
- Do not change `analytics_page_views.viewer_ip` semantics.
- Do not change `AdminAnalyticsSummaryDto.RecentVisit.geo` unless absolutely necessary and documented.
- Do not trust browser-supplied `geo` as authoritative IP location.
- Do not use frontend browser public-IP or geolocation APIs as the primary solution.
- Do not add a new analytics pipeline, second admin endpoint, or second active GeoIP service.
- Do not retroactively rewrite historical rows unless the user explicitly asks for a data backfill task.
- Do not change BotGuard/auth/upload/AI behavior except for preserving existing shared IP resolver compatibility.
- Do not update site version or release docs unless the user asks.

## Recommended Direction

Use backend-local IP lookup first, with `ip2region` preferred:

- Add `ip2region` Java dependency if not already available.
- Load an XDB file from a configurable path, preferably supporting:
  - classpath resource for packaged default, if size/license is acceptable;
  - external filesystem path via env/config for Docker/production replacement without rebuilding the app.
- Resolve public IPs locally with no network call.
- Treat private, loopback, link-local, any-local, and invalid IPs as local/unknown according to existing product wording.
- Make remote `ipapi.co` fallback optional and disabled by default unless the user explicitly wants it.
- Ignore or sanitize frontend `request.geo` when it is an IANA timezone value (`Asia/Shanghai`, `UTC`, `Etc/UTC`, etc.).

Why this direction:

- It removes the silent dependency on `ipapi.co` availability and rate limits.
- It makes analytics behavior deterministic in Docker and production.
- It matches the user's recommendation of `ip2region`.
- It keeps privacy better than sending visitor IPs to a third-party API on every cache miss.

## Cross-Layer Contract

### 1. Scope / Trigger

The behavior change happens at the analytics geolocation persistence boundary. It affects:

- frontend `PageViewRequest.geo` fallback meaning,
- backend `GeoIpService` implementation,
- analytics persistence into `analytics_page_views.geo_location`,
- admin analytics display through `RecentVisit.geo`,
- Docker/config/docs if the local XDB path is configurable.

### 2. Signatures

Backend public endpoint:

- `POST /api/analytics/page-view`
  - Request body: `PageViewRequest`
  - Response: `ApiResponse<Void>`
  - Side effect: insert `analytics_page_views.geo_location`

Backend diagnostic endpoint:

- `GET /api/analytics/client-ip`
  - Existing response remains `ApiResponse<Map<String, String>>` with payload `{ "ip": "<resolved-ip>" }`
  - Do not add geo to this response unless the PRD is updated and frontend/API tests are planned.

Backend admin endpoint:

- `GET /api/admin/analytics/page-views?page=&size=&ip=&keyword=&loggedIn=&postId=&pageType=&excludeSystemPages=&start=&end=`
  - Existing response remains `ApiResponse<PageResponse<AdminAnalyticsSummaryDto.RecentVisit>>`
  - `RecentVisit.geo` remains the field displayed in `/admin/analytics`.

Service APIs:

- `GeoIpService.lookup(String ip): String | null`
  - Must remain the primary shared lookup used by `AnalyticsService` and `PostService`.
  - Should return a displayable location string or null/blank when unknown.
- `AnalyticsService.resolveGeoLocation(String normalizedIp, String requestGeo)`
  - Should prefer IP-derived GeoIP result.
  - Should not accept IANA timezone values as IP location fallback.

DB:

- Existing table/column:
  - `analytics_page_views.geo_location VARCHAR(128) NULL`
  - `analytics_page_views.viewer_ip VARCHAR(45) NOT NULL`
- No schema change expected for the base fix.

Config/env, if implementing ip2region:

- Candidate config keys:
  - `analytics.geo.provider=ip2region`
  - `analytics.geo.ip2region.xdb-path=classpath:ip2region/ip2region.xdb` or external path
  - `analytics.geo.remote-fallback-enabled=false`
- Candidate Docker env:
  - `ANALYTICS_GEO_PROVIDER`
  - `ANALYTICS_GEO_IP2REGION_XDB_PATH`
  - `ANALYTICS_GEO_REMOTE_FALLBACK_ENABLED`

Frontend:

- `recordPageView(payload)` remains in `SanguiBlog-front/src/api.js`.
- `PageViewRequest.geo` may remain for compatibility, but frontend should not be treated as authoritative IP location.
- If frontend is changed, prefer removing `geo: getGeoHint()` from page-view payloads or renaming the concept in a separate contract; do not keep sending timezones as "geo" if backend will ignore them.

### 3. Payload Fields

`PageViewRequest` current fields:

- `postId: Long | null`
- `pageTitle: string | null`
- `referrer: string | null`
- `geo: string | null`
- `userAgent: string | null`
- `clientIp: string | null`
- `sourceLabel: string | null`

Rules:

- Server-resolved IP remains authoritative for geolocation.
- `clientIp` remains only the current loopback-local fallback path. It must not override non-loopback server-resolved IPs.
- `geo` from the browser must not override a failed backend lookup with `Asia/Shanghai`, `UTC`, `Etc/*`, or other timezone-only values.
- `geo_location` output should be display-friendly and no longer misleading.

### 4. Validation / Error Matrix

| Case | Input / Environment | Expected Result |
|---|---|---|
| Good: public IPv4 resolved by ip2region | `viewer_ip=8.8.8.8` or a real public IP in XDB | `geo_location` stores a real region string from local DB, not timezone |
| Good: public IPv6 supported by selected ip2region version/data | IPv6 public IP | Stores resolved location or `未知` if data unsupported, without exception |
| Good: ip2region XDB path configured externally | Docker env points to mounted XDB | App loads DB and analytics records use it |
| Base: private Docker bridge IP | `172.29.0.1` with no forwarded public IP | Stores `内网`/`本机/内网` or `未知` per final product decision; does not claim public city |
| Base: loopback local dev | `127.0.0.1` or `::1` | Stores local/internal wording; no crash |
| Base: existing frontend still sends `Asia/Shanghai` | backend GeoIP lookup blank | Backend does not store `Asia/Shanghai` as IP geolocation |
| Base: frontend/browser timezone is `UTC` | backend GeoIP lookup blank | Backend does not store `UTC`; stores `未知` or local/internal wording |
| Bad: XDB missing/unreadable | startup or first lookup | Degrade predictably; log safe warning; do not fail analytics page-view request unless implementation intentionally fails startup and PRD is updated |
| Bad: malformed IP | `clientIp` or remote IP invalid/empty | No exception; `geo_location` becomes `未知` or local/internal fallback |
| Bad: optional remote fallback 429/errors | `ipapi.co` returns 429/error or times out | Do not store timezone fallback; log safe warning/debug according to frequency |
| Bad: duplicate service path | both `GeoIpService` and `GeoLocationService` remain active with different behavior | Not acceptable; implementation must use one shared path or remove/mark unused path |

### 5. Good / Base / Bad Cases

Good:

- New production analytics rows for public IPs show IP-derived region strings.
- New rows no longer show `Asia/Shanghai` or `UTC` solely because backend lookup failed.
- `/admin/analytics` displays the stored `RecentVisit.geo` without frontend table changes.
- `PostService` fallback analytics writes and `AnalyticsService` normal writes use equivalent GeoIP behavior.

Base:

- Historical rows remain unchanged unless a separate backfill task is approved.
- Private IPs and local dev remain safe and non-crashing.
- If XDB is absent, the app degrades to unknown/local rather than blocking public page views.

Bad:

- Relying on browser timezone as geolocation.
- Adding another external SaaS GeoIP dependency as the only fix.
- Creating `NewGeoIpService` or a separate analytics-only resolver while old services remain active.
- Changing admin analytics API/UI fields without field-alignment tests.

## Focused Research Summary

### Keywords Searched

- `geo`, `Geo`, `geoLocation`, `geo_location`
- `getGeoHint`, `timeZone`, `Asia/Shanghai`, `UTC`
- `clientIp`, `client-ip`, `page-view`
- `analytics_page_views`, `RecentVisit`, `viewerIp`, `viewer_ip`
- `GeoIpService`, `GeoLocationService`
- `ipapi`, `ip2region`
- `IpUtils`, `X-Forwarded-For`, `X-Real-IP`

### Existing Candidate Implementations

- `SanguiBlog-front/src/appfull/shared.js`
  - `getGeoHint()` returns the browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `SanguiBlog-front/src/AppFull.jsx`
  - Sends `geo: getGeoHint()` on home/archive/about/games/game/admin page-view payloads.
  - Uses `/api/analytics/client-ip` plus optional public IP fallback only for `clientIp`.
- `SanguiBlog-front/src/api.js`
  - `recordPageView(payload)` posts to `/analytics/page-view` and swallows tracking errors.
  - `fetchClientIp()` calls `/analytics/client-ip`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
  - Resolves request IP through `IpUtils.resolveIp`.
  - Only trusts `PageViewRequest.clientIp` when server-resolved IP is loopback.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
  - Persists `geo_location` via `resolveGeoLocation(normalizedIp, request.getGeo())`.
  - Maps `AnalyticsPageView.geoLocation` to `RecentVisit.geo`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoIpService.java`
  - Actual current GeoIP path. Uses `ipapi.co`; returns null on failure.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoLocationService.java`
  - Appears unused; similar role, Caffeine cache, also calls `ipapi.co`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
  - Fallback direct write path also uses `GeoIpService.lookup`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
  - `geoLocation` maps to `analytics_page_views.geo_location`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
  - `RecentVisit.geo` is the admin frontend field.
- `sanguiblog_db.sql`
  - `geo_location VARCHAR(128) NULL`.

Decision:

- Modify/reuse the existing `GeoIpService` path and `AnalyticsService.resolveGeoLocation`.
- Consolidate or remove the unused `GeoLocationService` only if Qwen confirms it has no runtime references and tests compile.
- Do not create a new analytics controller/service/UI path.

Duplicate risk:

- High if a new ip2region service is added beside `GeoIpService` without migrating callers.
- Low if `GeoIpService` becomes the local ip2region-backed implementation and all callers remain unchanged.

## Files Likely To Modify

Expected:

- `SanguiBlog-server/pom.xml`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoIpService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java` only if fallback behavior must be aligned beyond shared `GeoIpService`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/GeoIpServiceTest.java` (create)
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceGeoLocationTest.java` or a focused existing-service test (create)
- `SanguiBlog-front/src/appfull/shared.js` only if removing or redefining `getGeoHint`
- `SanguiBlog-front/src/AppFull.jsx` only if stopping `geo: getGeoHint()` payloads at source
- `SanguiBlog-front/src/appfull/shared.test.js` or analytics-focused static test if frontend changed

Possible if config/data/docs are part of implementation:

- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/docker-deploy.md`
- `README.md`
- `README.zh-CN.md`
- `SanguiBlog-server/src/main/resources/ip2region/ip2region.xdb` or an external mounted data path documented in Docker docs

Avoid unless explicitly justified:

- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
- `sanguiblog_db.sql`
- `docker/nginx/default.conf` unless real-IP verification reveals a regression in the proxy layer

## Implementation Plan For Qwen

1. Confirm root cause with runtime evidence first:
   - Query recent rows grouped by `geo_location` and `viewer_ip` around `2026-06-01`.
   - Verify whether records with `Asia/Shanghai` or `UTC` have public IPs, private Docker IPs, or loopback IPs.
   - Check backend logs for `Geo lookup failed` only if debug logging was enabled; otherwise note that current code is silent in normal production logs.
   - Use `/api/analytics/client-ip` through the real deployment path to confirm viewer IP is still correct after the 5/25 real-IP fix.

2. Add tests before implementation:
   - `GeoIpServiceTest` for local/private IP behavior, malformed IP, known public IP mapping using a test double or fixture, and missing DB degradation.
   - `AnalyticsServiceGeoLocationTest` or focused unit coverage that proves:
     - backend GeoIP result wins;
     - `Asia/Shanghai`, `UTC`, `Etc/UTC`, and timezone-like strings are not accepted as final IP geo fallback;
     - blank lookup plus blank/invalid request geo becomes `未知`;
     - non-timezone legacy geo fallback behavior is either intentionally preserved or intentionally removed.

3. Replace remote-first GeoIP lookup with local ip2region-first lookup:
   - Keep public method `GeoIpService.lookup(String ip)`.
   - Load XDB safely and cache the searcher/data according to the selected ip2region API.
   - Normalize returned region strings into a display form that fits `VARCHAR(128)`.
   - Ensure private/loopback IPs do not query remote/provider code.
   - Decide whether remote `ipapi.co` fallback remains behind a disabled-by-default config flag.

4. Remove or consolidate duplicate `GeoLocationService`:
   - If no references exist, delete it with compile verification, or leave it only if Qwen finds framework/runtime usage not visible to `rg`.
   - Do not keep two active providers with different behavior.

5. Sanitize frontend timezone fallback:
   - Preferred minimal backend-safe option: `AnalyticsService` ignores timezone-looking `request.geo`.
   - Optional frontend cleanup: remove `geo: getGeoHint()` from page-view payloads, or change helper naming if the field is no longer used.
   - If frontend is changed, add a static test so `Asia/Shanghai` is not sent/stored as geolocation by the analytics flow.

6. Config/docs:
   - If XDB is bundled, document how it is updated and verify build/package size impact.
   - If XDB is externally mounted, update Docker env/docs with path and required file.
   - Document that historical bad rows are not rewritten by this task.

7. Verification:
   - Run targeted backend tests, compile, and any frontend static/build tests if touched.
   - Run Docker compose config checks if env/compose/docs touched.
   - Manual smoke through `/admin/analytics` after deployment with known public IP examples.

## Required Tests And Assertion Points

Backend targeted tests:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=GeoIpServiceTest,AnalyticsServiceGeoLocationTest" test
```

If `AnalyticsServiceGeoLocationTest` is not the chosen class name, replace it with the actual focused test class.

Backend compile:

```powershell
cd SanguiBlog-server
mvn -q -DskipTests compile
```

Existing IP resolver regression:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=IpUtilsTest" test
```

Frontend only if frontend files change:

```powershell
cd SanguiBlog-front
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Add/run a focused frontend static test if Qwen changes `getGeoHint`, `AppFull.jsx`, or analytics payload behavior.

Docker/config only if Docker/env/docs changed:

```powershell
docker compose config
docker compose -f docker-compose.prod.yml config --quiet
```

Runtime/manual smoke:

```powershell
curl.exe -i http://localhost/api/analytics/client-ip
curl.exe -i -H "X-Forwarded-For: 8.8.8.8" http://localhost/api/analytics/client-ip
```

Database inspection examples:

```powershell
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT viewer_ip, geo_location, COUNT(*) c FROM analytics_page_views WHERE viewed_at >= '\''2026-06-01'\'' GROUP BY viewer_ip, geo_location ORDER BY c DESC LIMIT 30;"'
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, viewer_ip, geo_location, viewed_at FROM analytics_page_views WHERE geo_location IN ('\''Asia/Shanghai'\'','\''UTC'\'','\''未知'\'') ORDER BY viewed_at DESC LIMIT 30;"'
```

Assertions:

- New records for public test IPs do not store `Asia/Shanghai` or `UTC`.
- If local DB has a mapping, new rows store a region string derived from the IP.
- Missing/failed GeoIP provider stores `未知` or local/internal wording, not browser timezone.
- Existing `IpUtilsTest` remains green.
- Admin analytics table continues rendering `visit.geo` without a field contract change.

## Acceptance Criteria

1. The root cause is confirmed with code/runtime evidence: timezone strings are frontend fallback values written only after backend GeoIP lookup fails.
2. New analytics records no longer store `Asia/Shanghai`, `UTC`, or timezone-only strings as IP geolocation.
3. Public IP geolocation is resolved through a backend-local provider, preferably ip2region, without requiring outbound calls to `ipapi.co` for normal operation.
4. `AnalyticsService` and `PostService` share the same GeoIP implementation path.
5. `/admin/analytics` API response shape and table rendering remain compatible unless an explicitly documented contract change is made.
6. Docker real-IP behavior from the 5/25 task remains intact.
7. Tests cover good/base/bad cases and the old timezone fallback regression.
8. Historical rows are left unchanged unless the user approves a separate backfill.

## Planning Self-Check

- Acceptance criteria defined: yes.
- Forbidden modification scope defined: yes.
- Expected files listed: yes.
- Required tests listed: yes.
- Concrete guidelines read: yes. Backend index plus directory, quality, database, error handling, logging; frontend index plus directory, quality, component, hook, state, type safety; guides index plus code reuse and cross-layer.
- Open questions needing user confirmation before implementation:
  - Should historical bad rows after `2026-06-01` be backfilled in this task, or should this task affect only new rows?
  - Should the ip2region XDB be bundled in the application jar or mounted/configured externally in Docker?
  - Should optional `ipapi.co` fallback be removed entirely or kept behind a disabled-by-default config flag?
- API / DB / frontend DTO alignment: no expected API/DB/frontend DTO field change for the base fix. Existing `PageViewRequest.geo`, `analytics_page_views.geo_location`, `RecentVisit.geo`, and `/admin/analytics` display remain aligned.

## External References Read

- ipapi API documentation: https://ipapi.co/api/
- ip2region project / Java binding: https://github.com/lionsoul2014/ip2region
