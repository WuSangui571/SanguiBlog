# 访问日志 v2 + 仪表盘流量洞察 Research

## Task Summary

Prepare a planning-only handoff for:
- access log v2 single-visit judgment fields,
- safe browser environment fields in `detail_json`,
- dashboard visitor source insight module,
- dashboard-to-log deep-link filters.

This task should build on the current detailed access log implementation and should not create a second analytics subsystem.

## Scope Classification

Complex Task.

Reasons:
- Full-stack analytics behavior across browser payloads, backend DTOs, detail JSON, classifier logic, range aggregation, admin dashboard UI, and list filters.
- Must preserve existing PV/UV/comments/articles/trends and visit-duration tracking.
- Must maintain strict privacy boundary and avoid strong fingerprinting.

## Current Project / Journal State

`get_context.py --mode default` reported:
- Branch: `main`
- Working directory: clean
- Current task before this run: `.trellis/tasks/06-30-detailed-access-log`
- Active journal file: `.trellis/workspace/sangui/journal-2.md`

Latest journal:
- Session 32: Production RAG publish isolation closeout.
- Commit: `7fb690c`.
- Explicitly no API payload or DB schema changed in that previous session.

Current task:
- `.trellis/tasks/07-01-access-log-v2-traffic-insights`

Important discovered baseline:
- `main` already contains the access-log detail implementation planned in `06-30-detailed-access-log`.
- That older task remains active/planning in Trellis, but the code is present. This v2 task should reference it as prerequisite context and should not mutate the old task state.

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

Key spec conclusions:
- Reuse existing `AnalyticsService`, `AdminAnalyticsController`, `AnalyticsController`, `AdminPanel.jsx`, and `src/api.js`.
- Continue using `ApiResponse<T>` and `PageResponse<T>`.
- Do not rely on Hibernate DDL for schema.
- Do not duplicate access-log tables/controllers/services/API wrappers.
- Do not persist/log secrets, tokens, cookies, request bodies, prompts, full content, or raw exception internals.
- `PageViewRequest.geo` must not store browser timezone as geolocation; v2 can store timezone separately in `detail_json.timezone`.

## Searches Performed

Representative searches:

```text
rg -n "analytics|page-views|PageView|RecentVisit|AnalyticsSummary|traffic|referrer|访问日志|流量来源|访客|dashboard|仪表盘|visitQuality|riskReasons|detail_json|detailJson" SanguiBlog-server/src/main/java SanguiBlog-server/src/test/java SanguiBlog-front/src sanguiblog_db.sql docs .trellis/tasks
rg --files SanguiBlog-server/src/main/java/com/sangui/sanguiblog | rg "Analytics|analytics|PageView|GeoIp|IpUtils|BotGuard|Admin"
rg --files SanguiBlog-server/src/test/java/com/sangui/sanguiblog | rg "Analytics|analytics|PageView|GeoIp|IpUtils|BotGuard|Admin"
rg --files SanguiBlog-front/src | rg "Admin|Analytics|analytics|Dashboard|dashboard|Visit|Referrer|articleVisit"
rg -n "adminFetchAnalyticsSummary|adminFetchPageViewLogs|page-views|AdminAnalytics|formatVisitDuration|source|referrer|来源" SanguiBlog-front/src/api.js SanguiBlog-front/src/appfull/AdminPanel.jsx SanguiBlog-front/src/AppFull.jsx SanguiBlog-front/src/appfull/public SanguiBlog-front/src/utils
rg -n "DATACENTER|ASN|ISP|visitQuality|riskReasons|webdriver|timezone|screenSize|viewportSize|devicePixelRatio|visibilityState|referrerClient|HIGH_FREQUENCY|NO_HEARTBEAT|LOW_ACTIVITY|SUSPICIOUS|BOT_LIKE" SanguiBlog-server SanguiBlog-front .trellis/spec .trellis/tasks
```

## Code Patterns Found

### Backend analytics owner

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
  - Owns `recordPageView(...)`, `recordArticleVisitStart(...)`, heartbeats/end, summary loading, page-view list loading, detail loading, and detail JSON build/parse.
  - Existing `loadAdminSummary(int days, int topLimit, int recentLimit)` computes overview/trend/top posts/traffic sources/recent visits.
  - Existing `loadPageViews(...)` uses `AdminPageViewQuery` and JPA `Specification`.
  - Existing `buildDetailJson(...)` allow-lists detail keys and strips query/fragment from URL-like fields.
  - Existing `parseDetailJson(...)` degrades malformed JSON to empty detail.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
  - `GET /api/admin/analytics/summary` with `PERM_ANALYTICS_VIEW`.
  - `GET /api/admin/analytics/page-views` with `PERM_ANALYTICS_VIEW`.
  - `GET /api/admin/analytics/page-views/{id}` currently with `PERM_ANALYTICS_VIEW + SUPER_ADMIN`.
  - Delete endpoints are SUPER_ADMIN-only.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
  - Public page-view and visit lifecycle endpoints.
  - Builds `AnalyticsRequestDetailContext` from safe request headers and request URI.
  - Visit endpoints intentionally no-op on parsing/service failure.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
  - Maps `analytics_page_views`.
  - Has `detailJson` with `@Column(name = "detail_json", columnDefinition = "LONGTEXT")`.

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AnalyticsPageViewRepository.java`
  - Existing range aggregation, distinct visitor count, top posts, page list, visit-id lookup, and entity graph list queries.
  - Likely needs a projection query for insight rows to avoid loading full entity graph for dashboard insights.

### Existing detail DTO/helper

- `AdminAnalyticsPageViewDetailDto`
  - Carries summary fields plus `detail`.
  - Needs top-level risk/judgment fields or a nested judgment DTO.

- `AdminAnalyticsPageViewDetailFieldsDto`
  - Carries current raw detail fields.
  - Needs `timezone`, `screenSize`, `viewportSize`, `devicePixelRatio`, `webdriver`, `visibilityState`, `referrerClient`.

- `AnalyticsRequestDetailContext`
  - Current server request context:
    - method
    - requestUri
    - refererRaw
    - xForwardedFor
    - xRealIp
    - acceptLanguage
    - entryPage/fromPage
    - visitorId/sessionId
  - Needs client environment fields or a companion DTO.

- `UserAgentDetailUtils`
  - Existing bot signatures include `bot`, `crawler`, `spider`, `curl`, `python-requests`, `go-http-client`, etc.
  - Existing helpers resolve bot name, device type, browser, OS and ipType.
  - Reuse this helper for `UA_BOT_KEYWORD`, do not add a second UA parser.

- `ReferrerUtils`
  - Existing search engine detection and display/source labels.
  - Reuse/extend this for source type classification and referer domain extraction.

### DB

- `sanguiblog_db.sql`
  - `analytics_page_views.detail_json JSON NULL` already exists.
  - `analytics_traffic_sources` exists but stores daily source labels and percentages.
  - `analytics_page_view_daily_stats` exists for PV/UV daily archive.

- `docs/sql/2026-06-30-add-analytics-detail-json.sql`
  - Existing manual migration for detail JSON.

Decision:
- No mandatory DB schema change for v2 if storing new fields inside `detail_json`.
- Do not use `analytics_traffic_sources` as the main source for the new dashboard module because it is not tied to arbitrary range filters.
- Optional aggregate table is a later performance optimization only.

### Frontend admin/dashboard owner

- `SanguiBlog-front/src/api.js`
  - Existing `adminFetchAnalyticsSummary(params)`.
  - Existing `adminFetchPageViewLogs(params)`.
  - Existing `adminFetchPageViewLogDetail(id)`.
  - Existing public tracking helpers and `X-SG-Visit-Id`.

- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `DashboardView` renders overview cards, trend chart, range selector, and old “流量来源”.
  - `AnalyticsView` renders access-log list, filters, detail dialog, delete actions.
  - Access log detail action is currently hidden with the same `isSuperAdmin` operation guard as delete.
  - Detail dialog already uses `role="dialog"` / `aria-modal`.
  - Existing detail groups: 请求信息 / 来源信息 / 设备信息 / IP 信息 / 行为信息 / 风控信息.
  - Needs new “系统判断” group and dashboard insight module.

- `SanguiBlog-front/src/AppFull.jsx`
  - `sendPageView(...)` and `sendTrackedPageView(...)` are non-article page-view owners.
  - Already uses active duration tracker and visit id for non-article pages.
  - Needs privacy-safe browser environment payload collection.

- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - Starts/heartbeat/ends article visit tracking.
  - Needs safe environment fields in visit start payload if not already sent through article detail request.

- `SanguiBlog-front/src/appfull/public/articleVisitTracker.js`
  - Existing active-duration helper and admin duration formatting helper.
  - May host a small environment helper only if it avoids duplication; otherwise use a local helper in `AppFull.jsx`.

### Existing tests

Backend:
- `AnalyticsServiceDetailJsonTest`
  - Current coverage for detail_json mapping, required keys, trimming, bot detection, safety, query stripping, malformed JSON.
  - Must be extended for new fields and classifier results.
- `AnalyticsServiceVisitDurationTest`
  - Existing duration/lifecycle contract.
- `AnalyticsControllerVisitTrackingTest`
  - Existing request context propagation and no-op visit endpoint behavior.
- `AdminAnalyticsControllerAuthorizationTest`
  - Current test asserts detail and delete require `PERM_ANALYTICS_VIEW + SUPER_ADMIN`.
- `IpUtilsTest`
  - Existing IP resolver/classification baseline.

Frontend:
- `AdminAnalyticsDetailLog.test.js`
  - Current static test for detail API export, detail button, role dialog, six groups, no native dialogs.
  - Must be extended for system judgment group and new fields.
- `AdminAnalyticsVisitDuration.test.js`
  - Current static/format test for duration and visit tracking.
- `noNativeBlockingDialogs.test.js`
  - Must keep passing.
- `analyticsReferrer.test.js` and `analyticsReferrerIntegration.test.js`
  - Existing redirect/source helper tests; likely extend if frontend referrer source classification changes.

## Reuse / Modify Decision

Decision: modify existing analytics implementation.

Reuse/modify:
- `AnalyticsService` for writes, detail DTO mapping, summary insights and list filters.
- `AdminAnalyticsController` for summary/detail/list API.
- `AnalyticsController` and existing tracking calls for client environment payloads.
- `ReferrerUtils` for source-type/domain logic.
- `UserAgentDetailUtils` for bot/UA/IP helper logic.
- `AdminPanel.jsx` for dashboard and access-log admin UI.
- `src/api.js` for all frontend API calls.

Do not create:
- A second access-log table.
- A second analytics controller/service.
- A second frontend API wrapper.
- A separate dashboard page.
- A remote IP intelligence provider.

## Files Likely To Modify

Backend:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PageViewRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/ArticleVisitStartRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AnalyticsRequestDetailContext.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsPageViewDetailFieldsDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsPageViewDetailDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- Optional `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsVisitQualityClassifier.java`
- Optional `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsVisitorSourceInsightsDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AnalyticsPageViewRepository.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/ReferrerUtils.java`

Frontend:
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/AppFull.jsx`
- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
- `SanguiBlog-front/src/appfull/public/articleVisitTracker.js` if a helper is extracted there.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- Optional `SanguiBlog-front/src/appfull/adminAnalyticsInsights.js`

Tests:
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceDetailJsonTest.java`
- New backend classifier/insights tests.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/AnalyticsControllerVisitTrackingTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/AdminAnalyticsControllerAuthorizationTest.java`
- `SanguiBlog-front/src/appfull/AdminAnalyticsDetailLog.test.js`
- New `SanguiBlog-front/src/appfull/AdminAnalyticsTrafficInsights.test.js`
- `SanguiBlog-front/src/appfull/AdminAnalyticsVisitDuration.test.js`
- `SanguiBlog-front/src/utils/analyticsReferrer.test.js`
- `SanguiBlog-front/src/appfull/noNativeBlockingDialogs.test.js`

## Risk / Boundary Notes

- The new browser fields are privacy-sensitive even though they are not strong fingerprints. Keep them coarse, optional and bounded.
- Do not add canvas/font/audio/WebGL/plugin/hardware fingerprinting.
- `timezone` can be stored in `detail_json`, but must not reintroduce the old regression where timezone is stored as `geo_location`.
- `DATACENTER_IP`, ASN and ISP cannot be reliable without a provider. Do not invent these values.
- Existing detail endpoint is SUPER_ADMIN-only. Keep this unless the user explicitly changes the permission boundary.
- Dashboard insight counts and list filters must share the same classifier logic, otherwise click-through results will not match dashboard counts.
- If filter-by-computed-detail requires Java-side filtering, be explicit about range and pagination semantics. Prefer reusable projection and classifier over ad hoc JSON string matching.
- `AnalyticsView` currently initializes logs once through `initLoadedRef`; query-param filters must be wired carefully so deep links load once with applied filters.
- Old rows with null/malformed detail_json must not 500 and must not disappear from summaries.
- Existing analytics tracking failures are intentionally no-op for public reads; keep that contract.

## Required Tests

Backend:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceDetailJsonTest,AnalyticsVisitQualityClassifierTest,AnalyticsServiceVisitorSourceInsightsTest,AnalyticsControllerVisitTrackingTest,AdminAnalyticsControllerAuthorizationTest,AnalyticsServiceVisitDurationTest,IpUtilsTest" test
mvn -q -DskipTests compile
```

Frontend:

```powershell
cd SanguiBlog-front
node src/appfull/AdminAnalyticsDetailLog.test.js
node src/appfull/AdminAnalyticsTrafficInsights.test.js
node src/appfull/AdminAnalyticsVisitDuration.test.js
node src/utils/analyticsReferrer.test.js
node src/utils/analyticsReferrerIntegration.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Repo/Trellis:

```powershell
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/07-01-access-log-v2-traffic-insights
```

Manual:
- Public page/article visit creates safe v2 detail JSON.
- Admin detail shows “系统判断”.
- Dashboard range changes affect all insight sections.
- Dashboard click-through filters load corresponding access logs.
- Existing PV/UV/comment/article cards and trend chart are unchanged.
