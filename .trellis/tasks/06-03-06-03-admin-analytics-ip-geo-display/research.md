# Focused Code Research - Admin Analytics IP Geolocation Display

## Relevant Specs

- `.trellis/workflow.md`
- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## Project Status From Journal

- Latest workspace journal session: `2026-05-31`, guest article comment login prompt, frontend-only comment composer work.
- Most relevant prior task: `2026-05-25`, Docker analytics real visitor IP fix.
- That prior task changed `IpUtils`, `IpUtilsTest`, `docker/nginx/default.conf`, and deploy docs, but explicitly did not change admin analytics UI/API/DTO/DB.
- Current branch during planning: `main`.
- Current worktree before task files: clean.
- No active Trellis task existed before creating this task.

## Retrieval Report

### Keywords Searched

`geo`, `Geo`, `geoLocation`, `geo_location`, `getGeoHint`, `timeZone`, `Asia/Shanghai`, `UTC`, `clientIp`, `client-ip`, `page-view`, `analytics_page_views`, `RecentVisit`, `viewerIp`, `viewer_ip`, `GeoIpService`, `GeoLocationService`, `ipapi`, `ip2region`, `IpUtils`, `X-Forwarded-For`, `X-Real-IP`.

### Candidate Implementations

- `SanguiBlog-front/src/appfull/shared.js`
  - `getGeoHint()` returns browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - This directly explains `Asia/Shanghai` and `UTC` values.
- `SanguiBlog-front/src/AppFull.jsx`
  - Sends `geo: getGeoHint()` in page-view payloads.
  - Fetches `/api/analytics/client-ip` and optional public IP fallback only for `clientIp`.
- `SanguiBlog-front/src/api.js`
  - `recordPageView(payload)` calls `/analytics/page-view`.
  - `fetchClientIp()` calls `/analytics/client-ip`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
  - Resolves server IP with `IpUtils.resolveIp`.
  - Uses `PageViewRequest.clientIp` only when server IP is loopback.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
  - Persists `geo_location` via `resolveGeoLocation(normalizedIp, request.getGeo())`.
  - Calls `GeoIpService.lookup` first, then falls back to `request.geo`, then `"未知"`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoIpService.java`
  - Actual current shared GeoIP service for analytics and post fallback.
  - Calls `https://ipapi.co/{ip}/json/`; returns null on failures.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoLocationService.java`
  - Similar older/duplicate service using Caffeine and `ipapi.co`, but no business usage found by `rg`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
  - Direct analytics fallback write also calls `GeoIpService.lookup`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
  - `geoLocation` maps to `analytics_page_views.geo_location`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
  - `RecentVisit.geo` is the field used by the admin page.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - Renders `{visit.geo || '未知'}`.
- `sanguiblog_db.sql`
  - `analytics_page_views.geo_location VARCHAR(128) NULL`.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/IpUtilsTest.java`
  - Existing proxy/IP resolver coverage from the previous Docker real-IP task.

### Reuse Decision

Modify/reuse existing `GeoIpService` and `AnalyticsService.resolveGeoLocation`. Do not create a second analytics endpoint, DTO, UI field, or parallel GeoIP service. If ip2region is adopted, implement it behind the existing `GeoIpService.lookup(String ip)` public surface so `AnalyticsService` and `PostService` remain aligned.

### Duplicate Risk

High if Qwen adds `Ip2RegionService` and wires only analytics while `PostService` still uses `GeoIpService`. Low if `GeoIpService` becomes the single ip2region-backed provider and unused `GeoLocationService` is removed or confirmed harmless.

## Code Patterns Found

- Backend analytics persistence is tolerant: `recordPageView` is `REQUIRES_NEW`, frontend swallows tracking errors, and post detail has a direct DB fallback.
- Admin analytics display is a simple downstream rendering of stored `geo_location`; it does not compute geolocation in the UI.
- `request.geo` is currently browser timezone, not IP location.
- External GeoIP failures are hidden under debug logs and become timezone/unknown in stored rows.
- Existing `IpUtils` and Nginx real-IP work already cover many proxy header cases; this task should not rework that path unless runtime evidence says IP resolution regressed.
- Current Maven dependencies include Caffeine and Spring Web; no `ip2region` dependency found.

## Root Cause Assessment

Most likely: backend `GeoIpService.lookup(ip)` started returning null more often around `2026-06-01`, likely because the external `ipapi.co` dependency failed, timed out, rate-limited, or became unreachable from the deployment server. Once lookup returns null, `AnalyticsService` stores frontend `request.geo`, which is just the browser timezone (`Asia/Shanghai`, `UTC`). If both are blank, the stored value is `"未知"`.

Secondary possibility: the real-IP/proxy path still sometimes resolves private or loopback IPs, making public geolocation impossible. Validate with `/api/analytics/client-ip` and DB grouping by `viewer_ip`.

Less likely: `/admin/analytics` UI mapping regression. The UI only renders `visit.geo` from backend data.

## Files Likely To Modify

Expected:

- `SanguiBlog-server/pom.xml`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoIpService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/GeoIpServiceTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceGeoLocationTest.java`

Possible:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GeoLocationService.java`
- `SanguiBlog-front/src/appfull/shared.js`
- `SanguiBlog-front/src/AppFull.jsx`
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docs/docker-deploy.md`
- `SanguiBlog-server/src/main/resources/ip2region/ip2region.xdb` or externally mounted equivalent

Avoid unless proven necessary:

- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
- `sanguiblog_db.sql`
- `docker/nginx/default.conf`

## Risk / Boundary Notes

- Do not backfill historical bad rows without user approval.
- Do not rely on browser geolocation/timezone/public-IP services as the primary fix.
- Do not send visitor IPs to a third-party service by default if ip2region local DB is adopted.
- Confirm ip2region data file source, size, license, and update path before bundling in the repo.
- If Docker env/config changes are made, run compose config checks.
- If frontend payload changes are made, add/update a static test and run lint/build.

## Required Tests

Backend:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=GeoIpServiceTest,AnalyticsServiceGeoLocationTest" test
mvn -q "-Dtest=IpUtilsTest" test
mvn -q -DskipTests compile
```

Frontend, only if frontend files change:

```powershell
cd SanguiBlog-front
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Docker/config, only if Docker/env/config/docs change:

```powershell
docker compose config
docker compose -f docker-compose.prod.yml config --quiet
```

Manual/runtime smoke:

```powershell
curl.exe -i http://localhost/api/analytics/client-ip
```

Database inspection:

```powershell
docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT viewer_ip, geo_location, COUNT(*) c FROM analytics_page_views WHERE viewed_at >= '\''2026-06-01'\'' GROUP BY viewer_ip, geo_location ORDER BY c DESC LIMIT 30;"'
```
