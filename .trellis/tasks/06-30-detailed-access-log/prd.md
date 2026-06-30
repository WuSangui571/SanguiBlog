# 访问日志详细日志 PRD

## 1. 任务范围判断

范围级别：Complex Task。

原因：
- 涉及数据库 schema：`analytics_page_views.detail_json` 新字段和既有 `sanguiblog_db.sql` / 手工 SQL 迁移文件。
- 涉及后端持久化、DTO/API、公共访问埋点、文章详情访问埋点、系统页访问埋点。
- 涉及前端 admin 访问日志 UI、API facade、详情弹窗/抽屉和静态测试。
- 涉及敏感信息边界：必须白名单保存请求详情，禁止保存 Cookie、Authorization、Token、完整请求体等敏感内容。

本轮 Codex 只做规划、研究和 Trellis context 准备，不写业务实现代码。后续编码由 DeepSeek 执行。

## 2. 当前项目状态摘要

- 当前 Git 分支应保持 `main`，本任务开始时工作区干净。
- 最近 journal 记录的 Session 32 是生产 RAG 发布隔离 closeout，已归档并记录 commit `7fb690c`。
- 当前 Trellis 无正在执行的当前任务；active 列表中仍有一个旧的 `06-07-06-07-version-2-3-2-readme-cleanup` planning task，指派给 deepseek，但与本任务无关。
- 本任务新建目录：`.trellis/tasks/06-30-detailed-access-log`。

## 3. Problem Statement

后台访问日志列表当前以 `analytics_page_views` 为数据源，列表展示时间、文章/页面、访客 IP、用户、来源、地理位置、浏览时长和删除操作。该列表适合快速扫描，但无法查看某一次访问的完整请求上下文，例如原始 UA、代理 IP 头、请求 URI、语言、设备/浏览器/系统、风控识别等。

需要在不增加列表字段复杂度的前提下，为每条访问日志提供“查看详情”能力。后端用一个可扩展 JSON 字段保存详情，避免每次新增扩展字段都改表。

## 4. Goals

1. 访问日志列表保持简洁，只展示现有字段；不得新增多列详情字段。
2. 每条日志新增“查看详情”按钮。
3. 点击后用弹窗或抽屉展示该访问的完整请求信息。
4. `analytics_page_views` 新增 `detail_json` 字段，用 JSON 保存扩展字段。
5. `detail_json` 至少包含以下字段键，即使暂时无法获取也要以 `null`、空字符串或 `false` 形式稳定返回：
   - `userAgent`
   - `refererRaw`
   - `method`
   - `requestUri`
   - `status`
   - `durationMs`
   - `ip`
   - `xForwardedFor`
   - `xRealIp`
   - `acceptLanguage`
   - `visitorId`
   - `sessionId`
   - `entryPage`
   - `fromPage`
   - `isFirstVisit`
   - `botDetected`
   - `botName`
   - `deviceType`
   - `browser`
   - `os`
   - `asn`
   - `isp`
   - `ipType`
6. 详情 UI 按六组展示：请求信息 / 来源信息 / 设备信息 / IP 信息 / 行为信息 / 风控信息。
7. 旧历史行没有 `detail_json` 时前端正常展示，字段值显示 `-` 或“暂无”。
8. 敏感信息不得进入 DB、日志、DTO 或前端详情：
   - 不保存 `Cookie`
   - 不保存 `Authorization`
   - 不保存任何 Token/API key/password/secret
   - 不保存完整请求体
   - 不保存验证码、JWT、AI prompt、文章正文、评论正文等内容

## 5. Non-Goals / 禁止越界

- 不新增第二张访问日志表。
- 不重写访问统计、浏览时长、GeoIP、BotGuard 或文章浏览计数逻辑。
- 不改变访问日志列表已有列的含义、筛选条件、分页行为或删除权限。
- 不改变后台删除访问日志权限：查看仍为 `PERM_ANALYTICS_VIEW`，删除仍要求 `PERM_ANALYTICS_VIEW` + `SUPER_ADMIN`。
- 不引入外部 UA 解析、ASN/ISP 查询、远程 IP 情报或第三方风控依赖。暂时拿不到的字段允许为空。
- 不记录 request body，不为了详情能力扩大前端埋点 payload 到包含敏感数据。
- 不做历史数据回填；旧行 detail 为空即可。
- 不更新站点版本、README、release notes，除非用户后续明确要求。
- 不涉及 AI/RAG、Docker DNS、登录 UX、系统监控、上传等无关模块。

## 6. Relevant Specs

已读取：
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
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

Spec constraints that apply:
- Schema source of truth is `sanguiblog_db.sql`; Hibernate `ddl-auto` is not a production migration path.
- Schema changes require entity, SQL, DTO/service mapping, frontend API/UI and tests to move together.
- JSON APIs return `ApiResponse<T>`; paginated responses use `PageResponse<T>`.
- Frontend API calls must go through `SanguiBlog-front/src/api.js`.
- Admin overlays should use existing admin modal/notice patterns, not `window.alert` or `window.confirm`.
- Cross-layer work must define API/payload/validation/errors/good-base-bad/tests before implementation.
- Safe logging and persisted details must not include secrets, tokens, cookies, full user content, full request bodies, or raw exception internals.

## 7. Retrieval Report

Keywords searched:
- `access log`, `访问日志`, `analytics`, `page view`, `PageView`, `visit`, `detail_json`, `detailJson`
- `userAgent`, `refererRaw`, `xForwardedFor`, `xRealIp`, `botDetected`, `visitorId`, `entryPage`, `fromPage`, `asn`, `isp`, `ipType`
- `adminFetchPageViewLogs`, `AdminAnalyticsVisitDuration`, `analytics_page_views`, `RecentVisit`
- `ObjectMapper`, `JsonNode`, `columnDefinition`, `TEXT`, `JSON`

Candidate implementations:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`: existing entity for `analytics_page_views`; extend here.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`: existing owner of page view persistence, admin page-view list, DTO mapping and visit duration logic; extend here.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`: existing `/api/analytics/page-view` and visit lifecycle request context boundary.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/PostController.java` and `PostService.java`: existing article detail analytics path; must preserve view count and 10-minute/visit dedupe behavior.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SitemapService.java`: existing `robots.txt` / `sitemap.xml` access log path; must not be skipped.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`: existing IP resolver and proxy header precedence; reuse, do not create a second resolver.
- `SanguiBlog-front/src/api.js`: existing admin access log API facade; add detail fetch here.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`: existing `AnalyticsView` list UI; add button and modal/drawer here or extract a local helper only if needed.
- `SanguiBlog-front/src/appfull/AdminAnalyticsVisitDuration.test.js`: existing static test pattern for access log UI contracts.

Decision:
- Modify existing analytics path. Extend `analytics_page_views`, `AnalyticsPageView`, `AnalyticsService`, `AdminAnalyticsController`, `AdminAnalyticsSummaryDto` or a new analytics DTO, `api.js`, and `AdminPanel.jsx`.
- Create only narrowly scoped DTO/helper classes if needed to keep JSON detail parsing and UI grouping readable. Do not create a second access-log service/controller/page.

Duplicate risk:
- A new `/api/admin/analytics/page-views/{id}` GET detail endpoint is acceptable because it extends the existing admin analytics controller and the same resource path already has DELETE by method. It does not duplicate list behavior.
- Do not add a parallel `/api/admin/access-logs` controller or a second `access_logs` table.

## 8. Cross-Layer Contract

### 8.1 Data flow

```text
Browser page/route event or article detail GET
-> src/api.js / AppFull / ArticleDetail existing tracking helpers
-> AnalyticsController or PostController / SitemapService
-> AnalyticsService.recordPageView / recordArticleVisitStart
-> AnalyticsPageView.detailJson
-> AdminAnalyticsController GET /api/admin/analytics/page-views/{id}
-> ApiResponse<AdminPageViewDetailDto>
-> src/api.js adminFetchPageViewLogDetail
-> AdminPanel AnalyticsView detail modal/drawer
```

### 8.2 DB signature

Table:

```sql
analytics_page_views.detail_json JSON NULL
```

Required SQL updates:
- Update `sanguiblog_db.sql` fresh-install schema.
- Add a manual migration file under `docs/sql/`, suggested name:
  - `docs/sql/2026-06-30-add-analytics-detail-json.sql`

Migration should be explicit and operator-safe:

```sql
ALTER TABLE analytics_page_views
  ADD COLUMN detail_json JSON NULL AFTER visit_status;
```

If MySQL version or repeated execution is a concern, document that operators should run `SHOW COLUMNS FROM analytics_page_views LIKE 'detail_json';` before applying. This repo has no migration runner.

Entity mapping:
- Add `detailJson` to `AnalyticsPageView`.
- Prefer a `String` field storing serialized JSON.
- Keep tests compatible with H2 `ddl-auto=create-drop`; if `columnDefinition = "JSON"` breaks H2, use an entity column definition that keeps tests running while production SQL remains JSON.

### 8.3 Backend API signatures

Existing list endpoint remains:

```text
GET /api/admin/analytics/page-views?page=&size=&ip=&keyword=&loggedIn=&postId=&pageType=&excludeSystemPages=&start=&end=
Authorization: Bearer <admin JWT>
Permission: hasAuthority('PERM_ANALYTICS_VIEW')
Response: ApiResponse<PageResponse<AdminAnalyticsSummaryDto.RecentVisit>>
```

List response should remain compact. Do not add grouped detail fields to the table UI. It is acceptable either to omit `detailJson` from list DTO entirely or expose only a boolean such as `hasDetail` if the UI needs it. The simpler contract is: list DTO unchanged.

New detail endpoint:

```text
GET /api/admin/analytics/page-views/{id}
Authorization: Bearer <admin JWT>
Permission: hasAuthority('PERM_ANALYTICS_VIEW')
Response: ApiResponse<AdminPageViewDetailDto>
```

Path can coexist with existing:

```text
DELETE /api/admin/analytics/page-views/{id}
Permission: hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')
```

Suggested DTO shape:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "id": 123,
    "title": "Article title",
    "postId": 45,
    "slug": "article-slug",
    "time": "2026-06-30 19:30:00",
    "referrer": "Google",
    "geo": "Shanghai",
    "loggedIn": false,
    "userId": null,
    "username": null,
    "display_name": null,
    "visitId": "v-...",
    "enterTime": "...",
    "leaveTime": "...",
    "lastActiveTime": "...",
    "durationSeconds": 12,
    "detail": {
      "userAgent": "Mozilla/5.0 ...",
      "refererRaw": "https://example.com/path",
      "method": "GET",
      "requestUri": "/article/45",
      "status": 200,
      "durationMs": null,
      "ip": "203.0.113.10",
      "xForwardedFor": "203.0.113.10, 172.18.0.1",
      "xRealIp": "203.0.113.10",
      "acceptLanguage": "zh-CN,zh;q=0.9",
      "visitorId": null,
      "sessionId": "v-...",
      "entryPage": "/article/45",
      "fromPage": "/",
      "isFirstVisit": null,
      "botDetected": false,
      "botName": null,
      "deviceType": "desktop",
      "browser": "Chrome",
      "os": "Windows",
      "asn": null,
      "isp": null,
      "ipType": "public"
    }
  }
}
```

DTO can be implemented as:
- `AdminAnalyticsSummaryDto.RecentVisit` plus nested detail DTO, or
- new `AdminAnalyticsPageViewDetailDto` and `AdminAnalyticsPageViewDetailFieldsDto`.

Recommendation: create new DTO classes if nested `AdminAnalyticsSummaryDto` becomes too large. Keep them under `model/dto`, not a new feature module.

### 8.4 Public/internal write signatures

The implementation should extend existing methods rather than add parallel paths.

Potential backend context object:

```java
public record AnalyticsRequestDetailContext(
    String method,
    String requestUri,
    Integer status,
    Long durationMs,
    String refererRaw,
    String xForwardedFor,
    String xRealIp,
    String acceptLanguage,
    String entryPage,
    String fromPage,
    String visitorId,
    String sessionId
) {}
```

Exact class name is flexible. The key requirement is a whitelist-only detail builder and one serialization path, not scattered maps in controllers.

Existing methods likely to gain an overload/context parameter:

```java
AnalyticsService.recordPageView(PageViewRequest request, String ip, String userAgent, Long userId, String visitId, AnalyticsRequestDetailContext detailContext)
AnalyticsService.recordArticleVisitStart(ArticleVisitStartRequest request, String ip, String userAgent, Long userId, AnalyticsRequestDetailContext detailContext)
```

The old overloads should remain or delegate to preserve call sites while the migration is incremental.

### 8.5 Frontend API signature

Add to `SanguiBlog-front/src/api.js`:

```js
export const adminFetchPageViewLogDetail = (id) =>
  request(`/admin/analytics/page-views/${id}`);
```

No direct fetch in `AdminPanel.jsx`.

### 8.6 Frontend detail UI contract

In `AnalyticsView`:
- Keep the table columns as they are.
- Add a small “查看详情” action button per row.
- For SUPER_ADMIN, the operation cell may contain both “查看详情” and “删除”.
- For non-SUPER_ADMIN users with `PERM_ANALYTICS_VIEW`, still show “查看详情”; delete remains hidden.
- Clicking “查看详情”:
  - loads detail through `adminFetchPageViewLogDetail(id)`,
  - shows loading state,
  - opens a modal or right drawer,
  - groups fields into:
    - 请求信息
    - 来源信息
    - 设备信息
    - IP 信息
    - 行为信息
    - 风控信息
  - displays missing values as `-` or “暂无”.
- Dialog/drawer requirements:
  - `role="dialog"` and `aria-modal="true"`.
  - Close button with `aria-label`.
  - No native `alert` / `confirm`.
  - Do not put this in a nested card inside another card; use a top-level overlay/panel.
  - Keep text wrapping safe for long UA, referrer and XFF values.

Suggested grouping:

请求信息:
- `method`
- `requestUri`
- `status`
- `durationMs`
- `userAgent`
- `acceptLanguage`

来源信息:
- `refererRaw`
- `referrer`
- `entryPage`
- `fromPage`

设备信息:
- `deviceType`
- `browser`
- `os`

IP 信息:
- `ip`
- `xForwardedFor`
- `xRealIp`
- `geo`
- `asn`
- `isp`
- `ipType`

行为信息:
- `visitorId`
- `sessionId`
- `visitId`
- `isFirstVisit`
- `enterTime`
- `leaveTime`
- `lastActiveTime`
- `durationSeconds`
- `heartbeatCount`
- `visitStatus`

风控信息:
- `botDetected`
- `botName`

## 9. detail_json Field Semantics

Required keys and expected source:

| Key | Source / Rule | May Be Empty |
|-----|---------------|--------------|
| `userAgent` | `HttpServletRequest.getHeader("User-Agent")`, trimmed max 512 or existing `user_agent` | No, unless header absent |
| `refererRaw` | Raw `Referer` header or decoded `X-SG-Referrer` / `PageViewRequest.referrer` before display-label normalization | Yes |
| `method` | HTTP method from servlet request, or `"GET"` for article detail success if context is propagated | Yes |
| `requestUri` | Prefer frontend route/path for SPA visit if safely supplied; otherwise backend `request.getRequestURI()`; do not include sensitive query | Yes |
| `status` | `200` for successful analytics rows; null for unknown legacy/fallback rows | Yes |
| `durationMs` | Null unless the implementation can measure safe elapsed time without restructuring request flow | Yes |
| `ip` | Resolved IP from `IpUtils.resolveIp`, same as `viewer_ip` | No |
| `xForwardedFor` | Raw `X-Forwarded-For` header, trimmed max 512 | Yes |
| `xRealIp` | Raw `X-Real-IP` header, trimmed max 128 | Yes |
| `acceptLanguage` | Raw `Accept-Language` header, trimmed max 255 | Yes |
| `visitorId` | Reserved for future visitor id; null unless already available | Yes |
| `sessionId` | Existing `visit_id`/visit session id where applicable; otherwise null | Yes |
| `entryPage` | Current page route/path if safely supplied; else request URI or page title fallback | Yes |
| `fromPage` | Previous SPA page/referrer path if safely supplied; else raw referrer/display referrer | Yes |
| `isFirstVisit` | Null unless implementer has a reliable local/session marker | Yes |
| `botDetected` | Minimal UA-based heuristic or false; do not call external service | Yes |
| `botName` | Derived only from known UA strings such as Googlebot/Bingbot/curl/wget; else null | Yes |
| `deviceType` | Optional lightweight UA helper: `mobile`, `tablet`, `desktop`, `bot`, `unknown` | Yes |
| `browser` | Optional lightweight UA helper; null/unknown is allowed | Yes |
| `os` | Optional lightweight UA helper; null/unknown is allowed | Yes |
| `asn` | Null; no external lookup in this task | Yes |
| `isp` | Null; no external lookup in this task | Yes |
| `ipType` | Lightweight local/private/loopback/public classification from resolved IP | Yes |

Safety rules:
- Use an allow-list builder for the JSON object. Never copy all request headers.
- Never save `Cookie`, `Authorization`, `Proxy-Authorization`, `X-Auth-Token`, `X-CSRF-Token`, `Set-Cookie`, `token`, `password`, `secret`, `apiKey`, request body, or raw query strings containing secrets.
- If `requestUri`, `entryPage`, or `fromPage` includes query parameters, either drop query entirely or redact sensitive parameter names before saving.
- Keep `detail_json` bounded. Long string fields should be trimmed:
  - `userAgent`: 512
  - `refererRaw`, `xForwardedFor`, `entryPage`, `fromPage`, `requestUri`: 512
  - `acceptLanguage`: 255
  - `xRealIp`, `browser`, `os`, `deviceType`, `ipType`, `botName`: 128 or less

## 10. Validation / Error Matrix

| Case | Backend Expected Result | Frontend Expected Result | Assertion Point |
|------|-------------------------|--------------------------|-----------------|
| Admin with `PERM_ANALYTICS_VIEW` fetches existing detail id | 200 `ApiResponse.ok(detailDto)` | Modal/drawer shows grouped detail | Controller/service test + static UI test |
| Admin without `PERM_ANALYTICS_VIEW` fetches detail | 403 through Spring Security | Existing auth/error UI behavior | Do not loosen `@PreAuthorize` |
| SUPER_ADMIN deletes row | Existing DELETE behavior unchanged | Delete still available | Existing UI path unaffected |
| Non-SUPER_ADMIN views list | Can see list and detail button | No delete button | Static test can assert button/delete split |
| Detail id missing | 404 via `NotFoundException` or equivalent project handler | Shows readable load error in modal/drawer | Service/controller test |
| `detail_json` null on old row | Detail endpoint returns summary plus detail keys with null/default values | UI renders `-`/“暂无”, no crash | Service + frontend static test |
| `detail_json` malformed | Backend does not 500; returns defaults and maybe safe warning | UI still renders fallback | Service test |
| Request has Cookie/Auth headers | Those values are not serialized into `detail_json` | UI cannot display them | Backend unit test asserts serialized JSON lacks forbidden strings |
| XFF/X-Real-IP present | Raw headers stored in detail and resolved IP still follows `IpUtils` | IP group displays raw proxy headers | Backend unit test |
| Bot/scanner UA | `botDetected=true` and `botName` set when lightweight helper recognizes it | 风控信息 group shows bot label | Helper/service test |
| Normal browser UA | Device/browser/os best-effort set or null; no exception | 设备信息 group renders | Helper/service test |
| Existing list endpoint | Response remains paginated and table columns unchanged | List stays compact | Frontend static test |
| Analytics write fails in optional tracking path | Article/public page user flow still succeeds where current code already swallows tracking failures | No reader-visible error | Preserve existing try/catch/no-op behavior |

## 11. Good / Base / Bad Cases

Good:
- A normal browser visits an article with `X-Forwarded-For`, `X-Real-IP`, `Accept-Language`, `User-Agent`, `X-SG-Visit-Id` and referrer headers. One `analytics_page_views` row is created or updated with `detail_json` containing safe request, source, IP, device, behavior and risk fields. Admin clicks “查看详情” and sees all groups.

Base:
- A legacy row has no `detail_json`. Admin opens details and sees existing summary fields plus grouped detail rows showing `-`; no frontend crash and no backend parse exception.

Bad:
- A request contains `Authorization: Bearer secret`, `Cookie: sg_token=...`, or query `?token=...`. The persisted JSON must not contain those values. Detail endpoint and UI must not expose them.

Bad:
- A bot-like UA (`Googlebot`, `curl`, `wget`, `python-requests`) is logged. The lightweight helper flags it as bot where possible, but BotGuard scoring behavior itself is not changed.

Base:
- `asn`, `isp`, `durationMs`, `visitorId`, `isFirstVisit` cannot be reliably produced in this slice. They remain present in the detail payload as null/default values and render safely.

## 12. Files Likely To Modify

Backend:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- Optional new DTO:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsPageViewDetailDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsPageViewDetailFieldsDto.java`
- Optional new helper/context:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AnalyticsRequestDetailContext.java` or service-local record
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/UserAgentDetailUtils.java` if lightweight UA parsing is extracted
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/PostController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SitemapService.java`
- `sanguiblog_db.sql`
- `docs/sql/2026-06-30-add-analytics-detail-json.sql`

Backend tests:
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceVisitDurationTest.java` or a new focused `AnalyticsServiceDetailJsonTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/AnalyticsControllerVisitTrackingTest.java`
- Optional `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/UserAgentDetailUtilsTest.java`
- Existing `IpUtilsTest` only if IP classification helper is added there.

Frontend:
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- Optional helper:
  - `SanguiBlog-front/src/appfull/adminAnalyticsDetail.js` if grouping/formatting becomes too large for `AdminPanel.jsx`

Frontend tests:
- Existing or new:
  - `SanguiBlog-front/src/appfull/AdminAnalyticsVisitDuration.test.js`
  - `SanguiBlog-front/src/appfull/AdminAnalyticsDetailLog.test.js`
  - `SanguiBlog-front/src/appfull/noNativeBlockingDialogs.test.js`

Trellis/spec:
- This task context.
- Only update `.trellis/spec/**` if implementation introduces a reusable analytics detail contract that future work should know. A small spec note under `.trellis/spec/guides/cross-layer-thinking-guide.md` or backend database guidelines may be appropriate after implementation, but avoid broad spec churn.

## 13. Implementation Plan

### Phase 1: Backend data model and SQL

1. Add `detail_json` to `sanguiblog_db.sql` in `analytics_page_views`.
2. Add `docs/sql/2026-06-30-add-analytics-detail-json.sql`.
3. Add `detailJson` field to `AnalyticsPageView`.
4. Add a reflection or focused test that verifies the entity has a `detailJson` column mapping.

### Phase 2: Safe detail builder

1. Add one backend builder path for detail JSON.
2. Builder input should use:
   - request headers from `HttpServletRequest`,
   - resolved IP from existing `IpUtils`,
   - safe frontend analytics fields from `PageViewRequest`,
   - visit id/session id,
   - existing display data from `AnalyticsPageView`.
3. Builder output must include all required keys.
4. Add tests proving:
   - all keys exist,
   - long strings are trimmed,
   - forbidden headers/body/token-like values are absent,
   - malformed existing JSON is tolerated when reading detail.

### Phase 3: Write detail_json on all existing access-log paths

Extend existing call paths without changing their semantics:

1. `/api/analytics/page-view`:
   - Build detail context in `AnalyticsController.record(...)`.
   - Keep stale token/silent tracking behavior unchanged.
2. Article detail:
   - Carry safe request details from `PostController.detail(...)` / `detailBySlug(...)` through `PostService` to `AnalyticsService.recordPageView(...)`.
   - Preserve existing view count, visit dedupe and analytics fallback behavior.
3. Article visit start:
   - Include available request detail from `AnalyticsController.visitStart(...)`.
4. System pages:
   - Extend `SitemapService.recordSystemPageView(...)` so `robots.txt` / `sitemap.xml` rows also get safe detail.
5. Fallback direct write in `PostService.persistAnalyticsPageView(...)`:
   - Either populate a minimal detail JSON or leave null if safe context is not available. Do not let fallback failure break article read.

### Phase 4: Detail read API

1. Add `GET /api/admin/analytics/page-views/{id}` to `AdminAnalyticsController`.
2. Add service method such as `loadPageViewDetail(Long id)`.
3. Load `AnalyticsPageView` by id, preferably with existing entity graph/repository path or simple `findById` if lazy fields are handled.
4. Return detail DTO with:
   - existing `RecentVisit` summary fields,
   - parsed/defaulted detail fields.
5. Missing id should be 404 via project exception handling.

### Phase 5: Frontend API and UI

1. Add `adminFetchPageViewLogDetail(id)` to `src/api.js`.
2. In `AnalyticsView`, add local state:
   - selected detail id/data,
   - loading/error,
   - modal/drawer open.
3. Add “查看详情” button per row.
4. Keep table columns unchanged except operation button composition.
5. Build grouped detail sections with defensive value formatting.
6. Ensure long UA/referrer/XFF values wrap and remain readable.
7. Ensure non-SUPER_ADMIN can view detail but not delete.
8. Preserve existing custom confirm dialogs for delete and no native dialogs.

### Phase 6: Tests and cleanup

1. Run backend targeted tests.
2. Run frontend static tests/lint/build.
3. Run `git diff --check`.
4. Validate Trellis task.
5. Perform manual smoke checks listed below.

## 14. Required Tests and Assertion Points

Backend required:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceVisitDurationTest,AnalyticsControllerVisitTrackingTest,AnalyticsServiceGeoLocationTest,IpUtilsTest" test
mvn -q -DskipTests compile
```

If new focused tests are created:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceDetailJsonTest,AnalyticsControllerVisitTrackingTest,IpUtilsTest" test
```

Backend assertions:
- `AnalyticsPageView.detailJson` maps to `detail_json`.
- `sanguiblog_db.sql` contains `detail_json JSON NULL`.
- Manual SQL migration file contains `ALTER TABLE analytics_page_views ADD COLUMN detail_json`.
- New detail builder produces every required key.
- Builder excludes `Cookie`, `Authorization`, token/password/secret values and request body.
- Detail endpoint returns 404 for missing id.
- Existing list endpoint still returns `PageResponse<RecentVisit>` and does not require detail JSON.
- Existing visit duration tests still pass.

Frontend required:

```bash
cd SanguiBlog-front
node src/appfull/AdminAnalyticsVisitDuration.test.js
node src/appfull/AdminAnalyticsDetailLog.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

If the implementer extends the existing `AdminAnalyticsVisitDuration.test.js` instead of creating `AdminAnalyticsDetailLog.test.js`, run that updated file.

Frontend assertions:
- `api.js` exports `adminFetchPageViewLogDetail`.
- `AdminPanel.jsx` table still contains only existing list columns.
- Each row has a “查看详情” action.
- Detail UI contains group labels：请求信息 / 来源信息 / 设备信息 / IP 信息 / 行为信息 / 风控信息.
- Detail UI uses `role="dialog"` and `aria-modal`.
- Missing detail fields render fallback text and do not throw.
- No `window.alert` / `window.confirm`.

Repo/Trellis required:

```bash
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-30-detailed-access-log
```

Manual smoke after coding:
1. Open public home/archive/about/tool page and verify a page-view row appears.
2. Open article detail and keep it open long enough for heartbeat/end to run.
3. Open `/admin/analytics`, confirm the list columns remain compact.
4. Click “查看详情” on a new row and verify grouped fields render.
5. Click “查看详情” on an old row without `detail_json` and verify fallback display.
6. Confirm SUPER_ADMIN still sees delete controls and non-SUPER_ADMIN does not.
7. Confirm detail JSON in DB does not contain `Cookie`, `Authorization`, `Bearer`, `sg_token`, request body, password, token or secret-like values.

## 15. Risk / Boundary Notes

- `analytics_page_views` is shared by article views, normal page views, robots/sitemap access, admin list and visit duration tracking. Any schema/entity change must preserve all of these paths.
- `PostService` has a fallback `persistAnalyticsPageView(...)` that writes `AnalyticsPageView` directly if `AnalyticsService.recordPageView(...)` fails. Do not remove this fallback unless a safer equivalent exists.
- `AnalyticsService.recordPageView(...)` merges existing visit rows by `visit_id`; detail updates must not create duplicate rows.
- `IpUtils.resolveIp(...)` already owns proxy header precedence. Store raw XFF/X-Real-IP for detail, but do not change resolved IP semantics.
- `GeoIpService` only returns display region; it does not provide ASN/ISP. Leave `asn` and `isp` null in this task.
- Browser UA parsing should be best-effort and local. A few common UA recognizers are enough; do not add a dependency for full UA parsing without user approval.
- `durationMs` is not reliably available in the current tracking pipeline. It may remain null unless the implementation can capture elapsed time narrowly without restructuring service flow.
- The frontend source contains mojibake in comments/strings due display encoding, but files are still usable. Avoid broad re-encoding or formatting churn.

## 16. Open Questions

No blocking question found for planning.

Assumptions:
- `visitorId / sessionId` can be represented by existing `visit_id` for `sessionId` where available, while `visitorId` remains null until a durable visitor identity exists.
- `durationMs`, `asn`, and `isp` may be null because the requirements explicitly allow unavailable fields to be empty.
- A modal or drawer is acceptable; choose the one that best fits existing admin UI without adding a new overlay system.

## 17. Branch Command For Later Coding

Do not create/switch branch in this planning round. After this planning task is accepted, start implementation from `main` with:

```powershell
git checkout main
git pull --ff-only
git checkout -b feature/detailed-access-log
```
