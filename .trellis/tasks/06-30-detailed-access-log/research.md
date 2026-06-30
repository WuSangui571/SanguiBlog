# 访问日志详细日志 Research

## Task Summary

Add detailed access-log support to the existing admin analytics page-view log system. The implementation should extend `analytics_page_views` with `detail_json`, preserve the compact list UI, add a per-row detail action, and render grouped request/source/device/IP/behavior/risk fields without persisting sensitive request data.

## Scope Classification

Complex Task.

Reasons:
- DB schema + manual migration.
- Backend entity/service/controller/DTO changes.
- Existing analytics, article view tracking and sitemap/robots access-log paths share the same table.
- Frontend admin UI + API facade + tests.
- Sensitive data allow-list/deny-list boundary.

## Current Project / Journal State

- `get_context.py --mode default` reported:
  - branch: `main`
  - working directory: clean
  - current task: none
  - active task unrelated to this work: `06-07-06-07-version-2-3-2-readme-cleanup/ (planning) @deepseek`
  - active journal file: `.trellis/workspace/sangui/journal-2.md`
- `journal-2.md` latest session:
  - Session 32: Production RAG publish isolation closeout.
  - Recorded commit: `7fb690c`.
  - No API payloads or DB schema were changed in that previous task.
- New task path:
  - `.trellis/tasks/06-30-detailed-access-log`

## Relevant Specs Read

Backend:
- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`

Frontend:
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`

Guides:
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

Spec conclusions:
- Use existing analytics path; do not create duplicate controller/service/table.
- Update `sanguiblog_db.sql` for schema changes; production does not use Hibernate auto-DDL.
- Add explicit manual SQL under `docs/sql/`.
- All API responses should use `ApiResponse<T>`.
- Frontend API access should go through `src/api.js`.
- Admin UI should avoid native dialogs and use existing custom admin patterns.
- Cross-layer payload, validation matrix, Good/Base/Bad cases and tests must be explicit.
- Do not log or persist secrets/tokens/cookies/full request bodies.

## Searches Performed

Commands/queries used:

```text
rg -n "access log|访问日志|analytics|page view|pageView|PageView|visit|detail_json|detailJson|userAgent|refererRaw|xForwarded|xRealIp|botDetected|visitorId|sessionId|entryPage|fromPage|isp|asn|ipType" SanguiBlog-server SanguiBlog-front .trellis/tasks .trellis/spec
rg -n "adminFetchAnalytics|adminFetchPageViews|page-views|RecentVisit|访问|visitStatus|formatVisitDurationFromRecord|Analytics" SanguiBlog-front/src/api.js SanguiBlog-front/src/appfull/AdminPanel.jsx ...
rg --files SanguiBlog-server/src/test/java | rg "Analytics|GeoIp|IpUtils|BotGuard|PageView"
rg --files SanguiBlog-front/src | rg "Analytics|analytics|articleVisit|noNativeBlockingDialogs|Admin"
rg -n "recordPageView\\(|recordArticleVisitStart\\(|AnalyticsPageView\\(|new AnalyticsPageView|analyticsPageViewRepository\\.save" SanguiBlog-server/src/main/java SanguiBlog-server/src/test/java
rg -n "ObjectMapper|JsonNode|writeValueAsString|readValue|JsonProcessingException" SanguiBlog-server/src/main/java/com/sangui/sanguiblog SanguiBlog-server/src/test/java
rg -n "columnDefinition|LONGTEXT|MEDIUMTEXT|TEXT|json|JSON" SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity sanguiblog_db.sql docs/sql SanguiBlog-server/src/test/resources SanguiBlog-server/src/main/resources
```

## Code Patterns Found

### Existing access-log backend owner

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
  - `GET /api/admin/analytics/page-views`
  - permission: `hasAuthority('PERM_ANALYTICS_VIEW')`
  - returns `ApiResponse<PageResponse<AdminAnalyticsSummaryDto.RecentVisit>>`
  - existing deletes:
    - `DELETE /api/admin/analytics/page-views/me`
    - `DELETE /api/admin/analytics/page-views/{id}`
    - `DELETE /api/admin/analytics/page-views?ids=...`
  - delete requires `PERM_ANALYTICS_VIEW` and `SUPER_ADMIN`.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
  - Owns `recordPageView(...)`.
  - Owns admin `loadPageViews(...)`.
  - Maps entity rows to `AdminAnalyticsSummaryDto.RecentVisit` through `toRecentVisit(...)`.
  - Handles visit duration lifecycle:
    - `recordArticleVisitStart`
    - `recordArticleVisitHeartbeat`
    - `recordArticleVisitEnd`
  - Existing page size cap for admin page-views is 200.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
  - Existing fields:
    - `id`
    - `visitId`
    - `post`
    - `postId`
    - `pageTitle`
    - `viewerIp`
    - `user`
    - `referrerUrl`
    - `geoLocation`
    - `userAgent`
    - `viewedAt`
    - `enterTime`
    - `leaveTime`
    - `lastActiveTime`
    - `totalDurationSeconds`
    - `activeDurationSeconds`
    - `heartbeatCount`
    - `visitStatus`
    - `updatedAt`

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AnalyticsPageViewRepository.java`
  - Extends `JpaRepository` and `JpaSpecificationExecutor`.
  - Uses `@EntityGraph(attributePaths = {"post", "user", "user.role"})` for list queries.
  - Existing `findByVisitId`, dedupe and aggregation methods.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
  - Nested `RecentVisit` currently carries list fields and visit duration fields.
  - `displayName` also has `@JsonProperty("display_name")`.

### Existing access-log write paths

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
  - `POST /api/analytics/page-view`
  - Gets resolved IP via `IpUtils.resolveIp(request)`.
  - Reads `User-Agent`.
  - Reads `X-SG-Visit-Id`.
  - Calls `AnalyticsService.recordPageView(...)`.
  - `visit/start`, `visit/heartbeat`, `visit/end` swallow tracking failures to avoid breaking article reads.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/PostController.java`
  - `GET /api/posts/{id}` and `/api/posts/slug/{slug}` read:
    - servlet request,
    - `X-SG-Referrer`,
    - `X-SG-Source-Label`,
    - `X-SG-Visit-Id`,
    - `User-Agent`,
    - principal id.
  - Delegates to `PostService.getPublishedDetail...`.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
  - `incrementViews(...)` updates `posts.views_count` and records analytics.
  - Visit-id path dedupes by `visit_<visitId>`.
  - Non-visit path dedupes by `ip + postId` and DB existence fallback.
  - `recordAnalyticsPageView(...)` builds `PageViewRequest` and calls `AnalyticsService.recordPageView(...)`.
  - `persistAnalyticsPageView(...)` directly writes a fallback row if `AnalyticsService` fails.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SitemapService.java`
  - `recordSystemPageView(...)` writes `robots.txt` / `sitemap.xml` access logs through `AnalyticsService.recordPageView(...)`.
  - Uses a limiter to avoid robots/sitemap row explosion.

### Existing frontend owner

- `SanguiBlog-front/src/api.js`
  - Existing `adminFetchAnalyticsSummary(params)`.
  - Existing `adminFetchPageViewLogs(params)`.
  - Existing delete helpers.
  - Existing `recordPageView(payload, options = {})`.
  - Existing `X-SG-Visit-Id` header support.
  - Existing analytics referrer headers are URL-encoded.

- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `AnalyticsView` local state starts around line 1068.
  - Loads logs with `adminFetchPageViewLogs(...)`.
  - Current table columns:
    - 时间
    - 文章
    - 访客 IP
    - 用户
    - 来源
    - 地理
    - 浏览时长
    - 操作 for SUPER_ADMIN delete
  - Uses custom `useAdminConfirmDialog`; no native confirm/alert.
  - `renderReferrer`, `renderUserBadge`, `handleCopyIp`, delete flow already exist.

- `SanguiBlog-front/src/AppFull.jsx`
  - `sendPageView(...)` sends page view body through `recordPageView`.
  - `sendTrackedPageView(...)` creates `visitId` for non-article pages and sends heartbeat/end through article visit helpers.
  - Article route creates `visitId` and passes it to `loadArticle`.

- `SanguiBlog-front/src/appfull/public/articleVisitTracker.js`
  - Existing `createVisitId`, duration helpers, `createActiveDurationTracker`.
  - Existing admin duration formatting helper.

### Existing tests

Backend:
- `AnalyticsServiceVisitDurationTest`
  - Existing unit tests for duration, visit lifecycle, visit id normalization and updated_at DB ownership.
- `AnalyticsControllerVisitTrackingTest`
  - Existing controller-unit tests for page-view `X-SG-Visit-Id`, visit start parsing, sendBeacon text/plain support and no-op failure behavior.
- `AnalyticsServiceGeoLocationTest`
  - Existing GeoIP fallback tests.
- `IpUtilsTest`
  - Existing proxy header precedence and normalization tests.

Frontend:
- `AdminAnalyticsVisitDuration.test.js`
  - Static test checks AdminPanel duration column and API/visit helper contracts.
- `articleVisitTracker.test.js`
  - Pure helper tests.
- `noNativeBlockingDialogs.test.js`
  - Ensures no `window.alert` / `window.confirm` in `AdminPanel.jsx` and AI widget.

## Existing DB Schema

`sanguiblog_db.sql` current `analytics_page_views` fields include:

```sql
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
visit_id VARCHAR(64) NULL,
post_id BIGINT UNSIGNED NULL,
page_title VARCHAR(255) NULL,
viewer_ip VARCHAR(45) NOT NULL,
user_id BIGINT UNSIGNED NULL,
referrer_url VARCHAR(512) NULL,
geo_location VARCHAR(128) NULL,
user_agent VARCHAR(512) NULL,
viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
enter_time DATETIME NULL,
leave_time DATETIME NULL,
last_active_time DATETIME NULL,
total_duration_seconds INT UNSIGNED NULL,
active_duration_seconds INT UNSIGNED NULL,
heartbeat_count INT UNSIGNED NOT NULL DEFAULT 0,
visit_status VARCHAR(32) NULL,
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

Existing SQL migration directory:
- `docs/sql/2026-06-27-add-analytics-visit-duration.sql`

The new migration should follow this pattern.

## Design Decision

Use the existing admin analytics page-view resource:

- Keep list:
  - `GET /api/admin/analytics/page-views`
- Add detail:
  - `GET /api/admin/analytics/page-views/{id}`
- Keep delete:
  - `DELETE /api/admin/analytics/page-views/{id}`

This gives a clean detail endpoint without duplicating controller/service/table.

## Files Likely To Modify

Backend:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- Optional new DTOs under `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/PostController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SitemapService.java`
- Optional helper under `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/`
- `sanguiblog_db.sql`
- `docs/sql/2026-06-30-add-analytics-detail-json.sql`

Frontend:
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- Optional helper under `SanguiBlog-front/src/appfull/`

Tests:
- Backend new/updated analytics detail JSON tests.
- Frontend static detail UI test.

## Risk / Boundary Notes

- Do not change `IpUtils.resolveIp` precedence. Store raw proxy headers separately in `detail_json`.
- `GeoIpService` does not expose ASN or ISP. Keep `asn` and `isp` null unless future task adds a provider.
- `BotGuardEngine` has private UA scoring, but no public bot parser. A minimal local helper can detect known bot/curl/wget UAs; do not alter BotGuard behavior.
- Existing tracking endpoints intentionally swallow failures; do not make article/page reads fail because detail JSON construction fails.
- Frontend list must stay compact; do not add detail columns to the table.
- `PostService.persistAnalyticsPageView(...)` fallback writes entity directly; do not remove fallback behavior.
- H2 test profile uses `ddl-auto=create-drop`; verify entity column definition does not break H2.
- Avoid broad formatting of `AdminPanel.jsx`; it is a large file with many unrelated admin views.

## Required Tests

Backend targeted:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceVisitDurationTest,AnalyticsControllerVisitTrackingTest,AnalyticsServiceGeoLocationTest,IpUtilsTest" test
mvn -q -DskipTests compile
```

If new detail tests are added:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceDetailJsonTest,AnalyticsControllerVisitTrackingTest,IpUtilsTest" test
```

Frontend:

```bash
cd SanguiBlog-front
node src/appfull/AdminAnalyticsVisitDuration.test.js
node src/appfull/AdminAnalyticsDetailLog.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Repo/Trellis:

```bash
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-30-detailed-access-log
```

Manual:
- Create a new public page/article visit.
- Open `/admin/analytics`.
- Confirm list columns stay compact.
- Open detail drawer/modal.
- Verify all six groups render.
- Verify missing fields render `-`.
- Inspect DB JSON to confirm no Cookie/Auth/token/body values are persisted.
