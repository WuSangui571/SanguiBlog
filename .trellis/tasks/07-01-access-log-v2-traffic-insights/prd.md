# 访问日志 v2 + 仪表盘流量洞察 PRD

## 1. 任务范围判断

范围级别：Complex Task。

原因：
- 跨浏览器埋点 payload、后端 `detail_json` allow-list、访问质量判断、admin 详情 DTO、访问日志筛选 API、仪表盘 summary DTO、前端 admin dashboard 和访问日志 UI。
- 需要对已有 `analytics_page_views.detail_json` 继续扩展，并保证旧行、空 JSON、坏 JSON 不导致后台 500。
- 需要从“单条访问详情”和“整体流量洞察”两个层次拆开展示，不能把所有统计塞回访问日志列表。
- 涉及隐私和安全边界：禁止记录 Cookie、Authorization、Token、完整请求体，也不做 Canvas、字体、音频等强指纹。

本轮 Codex 只做规划、研究和 Trellis context 准备，不写业务实现代码。后续编码由 DeepSeek 执行。

## 2. 当前项目状态摘要

- 当前 Git 分支：`main`。
- 当前工作区：`git status --short --branch` 显示干净。
- 最新 workspace journal：`.trellis/workspace/sangui/journal-2.md` Session 32，记录了 Production RAG publish isolation closeout，commit `7fb690c`，并明确无 API payload / DB schema 变更。
- 当前仍有旧 active task：
  - `06-07-06-07-version-2-3-2-readme-cleanup`，planning，指派 `deepseek`，与本任务无关。
  - `06-30-detailed-access-log`，planning，指派 `deepseek`。代码研究显示 `main` 已包含该阶段实现：`detail_json`、详情 DTO、详情 API、前端详情弹窗和相关测试。本任务把它当作前置能力，不修改旧 task 状态。
- 本任务目录：`.trellis/tasks/07-01-access-log-v2-traffic-insights`。

## 3. Problem Statement

当前系统已有后台访问日志详情页，也已有 `/admin` 仪表盘页。上一阶段的访问日志详情已经能按请求、来源、设备、IP、行为、风控等分组查看单条访问记录，但仍缺少浏览器环境字段和统一的系统判断字段。

仪表盘当前保留 PV/UV、文章/评论、趋势图，并有一个“流量来源”区域；该区域主要展示 `analytics_traffic_sources` 实时占比，不能回答站长更关心的整体问题：这些访问来自哪里、质量如何、异常来源集中在哪些 IP/Referer/UA/地区/ASN/ISP，以及是否存在“直接访问很多但质量很低”的情况。

因此本任务需要拆成两层：
1. 访问日志页：分析单条访问记录，解释该访问更像真人、低活跃、代理/VPS、爬虫或异常探测。
2. 仪表盘页：分析当前时间范围内的整体流量来源、访客质量和异常趋势，并能跳转到访问日志页带筛选条件。

## 4. Goals

1. 访问日志详情新增浏览器环境字段：
   - `timezone`
   - `screenSize`
   - `viewportSize`
   - `devicePixelRatio`
   - `webdriver`
   - `visibilityState`
   - `referrerClient`
2. 访问日志详情新增系统判断字段：
   - `visitQuality`: `NORMAL` / `LOW_ACTIVITY` / `SUSPICIOUS` / `BOT_LIKE` / `UNKNOWN`
   - `riskReasons`: string array，例如 `NO_HEARTBEAT`、`SHORT_DURATION`、`WEBDRIVER_TRUE`、`UA_BOT_KEYWORD` 等。
   - `riskLevel`: 建议 `LOW` / `MEDIUM` / `HIGH` / `UNKNOWN`。
   - `proxySuspected`
   - `botSuspected`
   - `referrerSpoofingSuspected`
   - `riskExplanation`
3. 访问日志详情页新增“系统判断”分组，展示：
   - 访问质量
   - 风险等级
   - 风险原因
   - 是否疑似代理
   - 是否疑似机器人
   - 是否疑似 Referer 伪造
   - 解释文本
4. `/admin` 仪表盘将原“流量来源”升级为“访客来源洞察”模块，不再只展示直接访问/登录页/重定向/外部链接。
5. 仪表盘保留：
   - 累计浏览
   - 评论总数
   - 区间 PV
   - 区间 UV
   - 文章总数
   - 访客走势图
6. 仪表盘支持 7 天 / 14 天 / 30 天 / 全部 时间范围切换，所有统计跟随当前范围变化。
7. “访客来源洞察”至少展示：
   - 来源类型占比
   - 访客质量占比
   - 异常来源 Top
   - 热门入口页
   - 可疑访问摘要
8. 点击洞察项可以跳转到访问日志页并带筛选条件，例如：
   - `/admin/analytics?visitQuality=BOT_LIKE`
   - `/admin/analytics?referrerDomain=english.sjzu.edu.cn`
   - `/admin/analytics?sourceType=EXTERNAL`
9. 不影响既有 PV/UV、评论、文章统计、访问日志分页、访问日志删除权限、文章访问时长统计。

## 5. Non-Goals / 禁止越界

- 不新增强指纹：不采集 Canvas、字体、音频、WebGL、插件列表、硬件并发等高识别度指纹。
- 不记录 Cookie、Authorization、Proxy-Authorization、Token、API key、password、secret、完整请求体、验证码、JWT、AI prompt、文章正文、评论正文。
- 不为了风控判断调用远程 IP 情报、ASN、ISP、反代理或 UA 解析服务。
- 不改变 BotGuard 拦截策略、验证码策略或公共读取放行策略。
- 不新增第二套访问日志表、第二个 analytics controller、第二个前端 API wrapper。
- 不把所有详情字段塞进访问日志表格列；访问日志列表仍保持快速扫描。
- 不改变访问日志删除权限：删除仍是 `PERM_ANALYTICS_VIEW + SUPER_ADMIN`。
- 不放宽当前访问日志详情权限。当前代码要求 `PERM_ANALYTICS_VIEW + SUPER_ADMIN`，本任务默认保持该边界，因为系统判断会暴露更敏感的风险分类信息。
- 不更新站点版本、README、release notes，除非用户后续明确要求。
- 不涉及 AI/RAG、Docker DNS、上传、系统监控、登录 UX 等无关模块。

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

Spec constraints:
- JSON API 使用 `ApiResponse<T>`；分页使用 `PageResponse<T>`。
- 数据库 schema source of truth 是 `sanguiblog_db.sql`；生产不依赖 Hibernate 自动 DDL。
- 前端 API 调用必须走 `SanguiBlog-front/src/api.js`。
- Admin UI 禁止 `window.alert` / `window.confirm`。
- 跨层变更必须定义 API / payload / validation / Good-Base-Bad / tests。
- Analytics 必须复用现有 `analytics_page_views`、`AnalyticsService`、`AdminAnalyticsController`、`AdminPanel.jsx` 路径。
- `PageViewRequest.geo` 中浏览器 timezone 不能作为 IP 地理位置存储，但本任务可以把浏览器 timezone 作为独立 `detail_json.timezone` 保存。

## 7. Current Implementation Baseline

`main` 已有上一阶段访问日志详情能力：
- `analytics_page_views.detail_json` 已存在于 `sanguiblog_db.sql`。
- `docs/sql/2026-06-30-add-analytics-detail-json.sql` 已存在。
- `AnalyticsPageView.detailJson` 已映射到 `detail_json`。
- `AdminAnalyticsPageViewDetailDto` / `AdminAnalyticsPageViewDetailFieldsDto` 已存在。
- `AnalyticsRequestDetailContext` 已存在，当前字段来自服务端请求头/路径。
- `AnalyticsService.buildDetailJson(...)` 已有 allow-list：
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
- `UserAgentDetailUtils` 已有轻量 bot / device / browser / OS / IP type helper。
- `AdminAnalyticsController` 已有：
  - `GET /api/admin/analytics/summary`
  - `GET /api/admin/analytics/page-views`
  - `GET /api/admin/analytics/page-views/{id}`
  - delete endpoints
- `SanguiBlog-front/src/api.js` 已有 `adminFetchPageViewLogDetail(id)`。
- `AdminPanel.jsx` 的访问日志页已有详情按钮和详情 dialog，已有六组分组。
- Dashboard 已有 7/14/30/全部范围切换，趋势图，和旧“流量来源”卡片。

## 8. Cross-Layer Contract

### 8.1 Data Flow

```text
Browser public route/article/admin page
-> collect privacy-safe client environment fields
-> src/api.js recordPageView / startArticleVisit
-> AnalyticsController / PostController / SitemapService
-> AnalyticsService.recordPageView / recordArticleVisitStart
-> analytics_page_views.detail_json
-> AnalyticsService computes visitQuality/riskReasons on read/aggregation
-> AdminAnalyticsController summary/detail/list APIs
-> src/api.js adminFetchAnalyticsSummary / adminFetchPageViewLogs / adminFetchPageViewLogDetail
-> AdminPanel DashboardView / AnalyticsView
```

### 8.2 DB Signature

Preferred first pass:
- Do not add new table.
- Continue extending `analytics_page_views.detail_json`.
- Continue using existing `analytics_page_views` indexes for range filters.
- No mandatory SQL migration if only JSON keys are added.

Optional performance follow-up only if profiling proves the dashboard query too slow:

```sql
CREATE TABLE analytics_visit_insights_daily (
    stat_date             DATE NOT NULL,
    pv                    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    uv                    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    normal_count          BIGINT UNSIGNED NOT NULL DEFAULT 0,
    low_activity_count    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    suspicious_count      BIGINT UNSIGNED NOT NULL DEFAULT 0,
    bot_like_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
    proxy_like_count      BIGINT UNSIGNED NOT NULL DEFAULT 0,
    direct_count          BIGINT UNSIGNED NOT NULL DEFAULT 0,
    internal_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
    search_count          BIGINT UNSIGNED NOT NULL DEFAULT 0,
    external_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
    redirect_count        BIGINT UNSIGNED NOT NULL DEFAULT 0,
    unknown_count         BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (stat_date)
);
```

Do not add this table in the implementation unless the implementer first documents why live range aggregation is not acceptable. If added, update `sanguiblog_db.sql`, add a manual SQL migration under `docs/sql/`, add entity/repository/tests, and preserve all live summary semantics.

### 8.3 Public Tracking Payloads

Extend `PageViewRequest` with optional safe browser fields:

```json
{
  "postId": 1,
  "pageTitle": "home(1/16)",
  "referrer": "https://example.com/path",
  "geo": null,
  "userAgent": null,
  "clientIp": null,
  "sourceLabel": "来自重定向：sanguicode.com",
  "timezone": "Asia/Shanghai",
  "screenSize": "1920x1080",
  "viewportSize": "1440x900",
  "devicePixelRatio": 2,
  "webdriver": false,
  "visibilityState": "visible",
  "referrerClient": "https://example.com/path"
}
```

Extend `ArticleVisitStartRequest` with the same client environment subset:

```json
{
  "visitId": "sgv_...",
  "articleId": 123,
  "path": "/article/123",
  "title": "Article title",
  "referrer": "https://example.com/path",
  "timezone": "Asia/Shanghai",
  "screenSize": "1920x1080",
  "viewportSize": "1440x900",
  "devicePixelRatio": 2,
  "webdriver": false,
  "visibilityState": "visible",
  "referrerClient": "https://example.com/path"
}
```

Rules:
- All new client fields are optional.
- `timezone` is a browser environment field only; do not store it in `geo_location`.
- `screenSize` and `viewportSize` are coarse strings, not full fingerprint objects.
- `devicePixelRatio` must be numeric and clamped to a reasonable range, e.g. `0 < dpr <= 10`; invalid values become null.
- `webdriver` must be boolean or null.
- `visibilityState` allow-list: `visible`, `hidden`, `prerender`, `unloaded`, otherwise null.
- `referrerClient`, `referrer`, `path`, `entryPage`, `fromPage`, `requestUri` must drop query strings/fragments or redact sensitive params before persistence.

### 8.4 detail_json Keys

Extend existing `detail_json` with these stable keys:

| Key | Source | Default |
|-----|--------|---------|
| `timezone` | browser `Intl.DateTimeFormat().resolvedOptions().timeZone` | null |
| `screenSize` | browser `screen.width x screen.height` | null |
| `viewportSize` | browser `window.innerWidth x window.innerHeight` | null |
| `devicePixelRatio` | browser `window.devicePixelRatio` | null |
| `webdriver` | browser `navigator.webdriver` | null |
| `visibilityState` | browser `document.visibilityState` | null |
| `referrerClient` | browser `document.referrer` or analytics referrer helper | null |
| `visitQuality` | system classifier | `UNKNOWN` if not enough data |
| `riskReasons` | system classifier reason array | `[]` |
| `riskLevel` | system classifier | `UNKNOWN` |
| `proxySuspected` | system classifier | false |
| `botSuspected` | system classifier | false |
| `referrerSpoofingSuspected` | system classifier | false |
| `riskExplanation` | short safe text | null |

Recommendation:
- Store raw client environment keys in `detail_json` during writes.
- Compute system judgment from entity + parsed detail fields in one backend helper, then either:
  - persist system judgment in `detail_json` for new rows, and recompute on read for legacy rows missing judgment; or
  - compute on read only.
- Preferred for this task: persist for new rows and recompute when missing. This keeps dashboard aggregation consistent while avoiding history backfill.

### 8.5 Visit Quality Classifier

Canonical enums:

```text
VisitQuality: NORMAL | LOW_ACTIVITY | SUSPICIOUS | BOT_LIKE | UNKNOWN
RiskLevel: LOW | MEDIUM | HIGH | UNKNOWN
RiskReason:
  DATACENTER_IP
  NO_HEARTBEAT
  SHORT_DURATION
  WEBDRIVER_TRUE
  UA_BOT_KEYWORD
  GEO_TIMEZONE_MISMATCH
  REFERER_SPOOFING_SUSPECTED
  ADMIN_PATH_ACCESS
  HIGH_FREQUENCY_IP
```

Minimum rules:
- `UA_BOT_KEYWORD`: UA matches existing `UserAgentDetailUtils.isLikelyBot(...)`.
- `WEBDRIVER_TRUE`: `webdriver == true`.
- `NO_HEARTBEAT`: `heartbeatCount == 0` and the row is a visit-tracked page/article row.
- `SHORT_DURATION`: `durationSeconds` is present and below 15 seconds.
- `LOW_ACTIVITY`: `heartbeatCount == 0` and `durationSeconds` is null, or only low-activity reasons exist.
- `NORMAL`: `heartbeatCount >= 2` and `durationSeconds >= 15` and no high-severity reason.
- `BOT_LIKE`: UA bot keyword or webdriver true.
- `SUSPICIOUS`: proxy-like/datacenter-like, referer spoofing, admin path access, high frequency IP, or multiple low/medium reasons.
- `UNKNOWN`: legacy row without enough detail and no duration/heartbeat signal.

Datacenter / proxy caveat:
- Current repo has `ipType`, `asn`, and `isp` fields, but no ASN/ISP provider and no datacenter IP intelligence source.
- Do not introduce a remote lookup.
- `DATACENTER_IP` may only be set when existing/local data indicates ASN/ISP/datacenter. If `asn`/`isp` are null, leave this reason absent and explain that proxy/VPS judgment is unknown rather than guessed.

High-frequency IP:
- Compute within the current dashboard/list range by counting records per `viewerIp`.
- Suggested threshold: top IP count >= max(10, 10% of range PV) for dashboard summaries, or a documented constant in backend classifier.
- Do not use this to block requests; it is display-only.

Referer spoofing suspected:
- Do not claim certainty.
- Mark `REFERER_SPOOFING_SUSPECTED` only for clear inconsistencies, for example:
  - frontend `referrerClient` host differs from server `refererRaw` host and neither is same-site / redirect-known;
  - source label claims redirect/search but raw referer host contradicts it.
- If insufficient data, return false.

GEO timezone mismatch:
- Only compare coarse country/region signals when both `geo` and `timezone` are available.
- Avoid overfitting China timezone. If `geo` is `未知` or internal/local, skip this reason.

Admin path access:
- Set `ADMIN_PATH_ACCESS` when `requestUri`, `entryPage`, or page title indicates `/admin` and row is unauthenticated or bot-like.
- Do not treat legitimate logged-in admin views as suspicious solely because path is `/admin`.

Risk level:
- `HIGH`: `WEBDRIVER_TRUE`, `UA_BOT_KEYWORD`, or 2+ high-confidence reasons.
- `MEDIUM`: any suspicious reason such as `REFERER_SPOOFING_SUSPECTED`, `ADMIN_PATH_ACCESS`, `HIGH_FREQUENCY_IP`, `DATACENTER_IP`.
- `LOW`: only `NO_HEARTBEAT` / `SHORT_DURATION` / `LOW_ACTIVITY`.
- `UNKNOWN`: insufficient signal.

### 8.6 Admin Detail API

Existing endpoint remains:

```text
GET /api/admin/analytics/page-views/{id}
Permission: hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')
Response: ApiResponse<AdminAnalyticsPageViewDetailDto>
```

Extend response:

```json
{
  "id": 123,
  "title": "Article title",
  "ip": "203.0.113.10",
  "geo": "辽宁省沈阳市",
  "durationSeconds": 20,
  "heartbeatCount": 2,
  "visitQuality": "NORMAL",
  "riskLevel": "LOW",
  "riskReasons": [],
  "proxySuspected": false,
  "botSuspected": false,
  "referrerSpoofingSuspected": false,
  "riskExplanation": "有心跳且停留时长正常，未发现明显自动化特征。",
  "detail": {
    "timezone": "Asia/Shanghai",
    "screenSize": "1920x1080",
    "viewportSize": "1440x900",
    "devicePixelRatio": 2,
    "webdriver": false,
    "visibilityState": "visible",
    "referrerClient": "https://example.com/path"
  }
}
```

It is acceptable to put judgment fields inside `detail` or top-level DTO, but frontend must receive a stable shape. Recommendation: top-level fields for judgment, raw environment fields in `detail`.

### 8.7 Admin Summary API

Existing endpoint remains:

```text
GET /api/admin/analytics/summary?days=7|14|30|-1&top=5&recent=30
Permission: hasAuthority('PERM_ANALYTICS_VIEW')
Response: ApiResponse<AdminAnalyticsSummaryDto>
```

Extend `AdminAnalyticsSummaryDto` with `visitorSourceInsights`:

```json
{
  "visitorSourceInsights": {
    "rangeDays": 7,
    "rangeLabel": "最近7天",
    "totalVisits": 145,
    "sourceTypeShares": [
      { "type": "DIRECT", "label": "直接访问", "count": 60, "percentage": 41.4, "logsQuery": "sourceType=DIRECT" },
      { "type": "INTERNAL", "label": "站内跳转", "count": 20, "percentage": 13.8, "logsQuery": "sourceType=INTERNAL" },
      { "type": "SEARCH", "label": "搜索引擎", "count": 30, "percentage": 20.7, "logsQuery": "sourceType=SEARCH" },
      { "type": "EXTERNAL", "label": "外部链接", "count": 15, "percentage": 10.3, "logsQuery": "sourceType=EXTERNAL" },
      { "type": "REDIRECT", "label": "重定向来源", "count": 10, "percentage": 6.9, "logsQuery": "sourceType=REDIRECT" },
      { "type": "UNKNOWN", "label": "未知来源", "count": 10, "percentage": 6.9, "logsQuery": "sourceType=UNKNOWN" }
    ],
    "visitQualityShares": [
      { "quality": "NORMAL", "label": "正常访问", "count": 77, "percentage": 53.1, "logsQuery": "visitQuality=NORMAL" },
      { "quality": "LOW_ACTIVITY", "label": "低活跃访问", "count": 35, "percentage": 24.1, "logsQuery": "visitQuality=LOW_ACTIVITY" },
      { "quality": "SUSPICIOUS", "label": "疑似代理/VPS", "count": 21, "percentage": 14.5, "logsQuery": "visitQuality=SUSPICIOUS" },
      { "quality": "BOT_LIKE", "label": "疑似机器人", "count": 12, "percentage": 8.3, "logsQuery": "visitQuality=BOT_LIKE" }
    ],
    "anomalyTops": {
      "ips": [{ "value": "203.0.113.10", "count": 18, "logsQuery": "ip=203.0.113.10" }],
      "referrerDomains": [{ "value": "english.sjzu.edu.cn", "count": 3, "logsQuery": "referrerDomain=english.sjzu.edu.cn" }],
      "userAgents": [{ "value": "curl/8.0", "count": 8, "logsQuery": "userAgentKeyword=curl" }],
      "geos": [{ "value": "未知", "count": 35, "logsQuery": "geo=未知" }],
      "asns": [{ "value": "未知", "count": 0, "logsQuery": "asn=未知" }],
      "isps": [{ "value": "未知", "count": 0, "logsQuery": "isp=未知" }]
    },
    "popularEntries": [
      { "type": "HOME", "label": "首页", "path": "/", "count": 40, "logsQuery": "entryType=HOME" },
      { "type": "ARTICLE", "label": "文章页", "path": "/article/*", "count": 65, "logsQuery": "entryType=ARTICLE" },
      { "type": "LOGIN", "label": "登录页", "path": "/login", "count": 4, "logsQuery": "entryType=LOGIN" },
      { "type": "API", "label": "API 路径", "path": "/api/*", "count": 8, "logsQuery": "entryType=API" },
      { "type": "NOT_FOUND", "label": "404 路径", "path": "404", "count": 2, "logsQuery": "entryType=NOT_FOUND" }
    ],
    "suspiciousSummary": {
      "botLikeCount": 12,
      "botLikePercentage": 8.3,
      "proxyLikeCount": 21,
      "proxyLikePercentage": 14.5,
      "noHeartbeatCount": 35,
      "noHeartbeatPercentage": 24.1,
      "externalReferrerDomainCount": 3
    }
  }
}
```

`trafficSources` can remain temporarily for backward compatibility, but the dashboard should render `visitorSourceInsights` as the primary module. Do not rely on old `analytics_traffic_sources` for this module because it does not follow arbitrary 7/14/30/all ranges.

### 8.8 Access Log List API Filters

Extend existing endpoint:

```text
GET /api/admin/analytics/page-views
```

Existing params stay:
- `page`
- `size`
- `ip`
- `keyword`
- `loggedIn`
- `postId`
- `pageType`
- `excludeSystemPages`
- `start`
- `end`

New params:
- `visitQuality=NORMAL|LOW_ACTIVITY|SUSPICIOUS|BOT_LIKE|UNKNOWN`
- `riskReason=DATACENTER_IP|NO_HEARTBEAT|SHORT_DURATION|WEBDRIVER_TRUE|UA_BOT_KEYWORD|GEO_TIMEZONE_MISMATCH|REFERER_SPOOFING_SUSPECTED|ADMIN_PATH_ACCESS|HIGH_FREQUENCY_IP`
- `sourceType=DIRECT|INTERNAL|SEARCH|EXTERNAL|REDIRECT|UNKNOWN`
- `referrerDomain=english.sjzu.edu.cn`
- `entryType=HOME|ARTICLE|LOGIN|API|NOT_FOUND|ADMIN|OTHER`
- `userAgentKeyword=curl`
- `geo=未知`
- `asn=...`
- `isp=...`

Implementation rule:
- If filtering requires parsed `detail_json` and cannot be expressed safely in JPA Criteria, implement it narrowly and document performance. Prefer DB-side predicates for existing scalar fields; use service-level filtering only when the result set is already range/page bounded or add a repository projection for insight rows.
- URL query params should update `filtersDraft` on first mount of `AnalyticsView`, then call `loadLogs(1, size, parsedFilters)`.
- Dashboard click handlers should use `navigate('/admin/analytics?...')`.

### 8.9 Source Type Rules

Use raw detail field `refererRaw` first. Fallbacks:
1. `detail.referrerClient`
2. existing `referrerUrl`

Classification:
- `refererRaw` empty => `DIRECT`
- Referer host is current site domain => `INTERNAL`
- Referer host matches known search engine in `ReferrerUtils` => `SEARCH`
- Referer host is `sanguicode.com` or `www.sanguicode.com` => `REDIRECT`
- Referer host is any other valid domain => `EXTERNAL`
- Cannot parse / contradictory data => `UNKNOWN`

Keep `ReferrerUtils` as the reuse seam; extend it with source-type classification rather than creating another parser.

### 8.10 Frontend Dashboard Contract

Replace old “流量来源” card with “访客来源洞察” module.

Module contents:
- 来源类型占比
- 访客质量占比
- 异常来源 Top
- 热门入口页
- 可疑访问摘要

UI rules:
- Preserve existing dashboard metric cards and trend chart.
- Use current range selector; do not add a second independent time range state.
- Cards/panels should remain admin-dashboard dense and scannable.
- Use click targets with `button` or `a` semantics and accessible labels.
- Do not use visible tutorial text explaining how to use the module.
- Long domain/UA values must wrap/truncate safely and not overlap.

### 8.11 Frontend Access Log Detail Contract

Add a “系统判断” group to existing detail modal/drawer:
- 访问质量
- 风险等级
- 风险原因
- 是否疑似代理
- 是否疑似机器人
- 是否疑似 Referer 伪造
- 解释文本

Existing groups remain:
- 请求信息
- 来源信息
- 设备信息
- IP 信息
- 行为信息
- 风控信息

Add new browser environment fields to suitable existing groups:
- `timezone`, `screenSize`, `viewportSize`, `devicePixelRatio`, `webdriver`, `visibilityState` -> 设备信息 or 系统判断
- `referrerClient` -> 来源信息

## 9. Validation / Error Matrix

| Case | Backend Expected Result | Frontend Expected Result | Assertion Point |
|------|-------------------------|--------------------------|-----------------|
| Normal human visit with heartbeats | `visitQuality=NORMAL`, low/no risk reasons | Detail shows normal explanation; dashboard counts normal | Service classifier test + detail UI test |
| No heartbeat and no duration | `LOW_ACTIVITY`, `NO_HEARTBEAT` | Dashboard low-active count increases | Service aggregation test |
| Short duration < 15s | `LOW_ACTIVITY` or `SUSPICIOUS` depending reasons, includes `SHORT_DURATION` | Detail shows reason | Service classifier test |
| `webdriver=true` | `BOT_LIKE`, `WEBDRIVER_TRUE`, high risk | Detail shows suspected bot | Detail JSON/classifier test |
| UA contains `curl` / `python-requests` / `Go-http-client` | `BOT_LIKE`, `UA_BOT_KEYWORD` | Dashboard bot-like count and UA Top include item | UserAgent/helper + insights test |
| Legacy row without detail_json | No 500; compute from entity if possible or `UNKNOWN` | Detail renders fallback `-`; dashboard includes unknown where appropriate | Existing detail test extended |
| Malformed detail_json | No 500; empty detail + computed fallback | UI does not crash | Service parse test |
| Browser sends timezone | Stored only as `detail_json.timezone`, not `geo_location` | Detail shows timezone; geo remains backend GeoIP | AnalyticsService test |
| Request/referrer query contains token/password | Query/fragment stripped before persistence | UI cannot display secret | Detail JSON safety test |
| Cookie/Auth headers present | Not stored or logged | Not visible in detail | Safety test |
| Dashboard range changes 7/14/30/all | `visitorSourceInsights` follows range | All module counts update with range | Backend summary test + frontend static test |
| Click `疑似机器人` | URL becomes `/admin/analytics?visitQuality=BOT_LIKE` | Logs load with filter applied | Frontend static test |
| Click external domain | URL includes `referrerDomain=...` | Logs load matching domain | Controller/service + static test |
| Unauthorized user without `PERM_ANALYTICS_VIEW` | 403 | Existing auth handling | Do not loosen `@PreAuthorize` |
| Non-SUPER_ADMIN with analytics permission opens detail | Remains forbidden if current policy retained | Detail button should stay hidden or error gracefully | Authorization/static test |
| Delete access log | Existing SUPER_ADMIN-only behavior unchanged | Delete still hidden for non-SUPER_ADMIN | Existing authorization/static test |

## 10. Good / Base / Bad Cases

Good:
- A normal browser visits an article, stays visible for 30 seconds, sends at least two heartbeats, and has a sane UA/timezone/viewport. Detail shows `NORMAL`, low risk, and a clear normal explanation. Dashboard normal share increases for the selected range.

Good:
- A `curl` request hits `/api/...` or a bot UA hits `robots.txt`. The detail shows `BOT_LIKE`, `UA_BOT_KEYWORD`; dashboard shows bot-like count and high-frequency UA if repeated.

Base:
- An old row has no `detail_json`. Detail endpoint returns summary plus default/empty detail, `visitQuality=UNKNOWN` unless duration/heartbeat clearly supports another classification. UI shows `-` for missing fields.

Base:
- `asn` and `isp` are unavailable. Dashboard does not invent ASN/ISP. ASN/ISP top lists are empty or show `未知` only if useful; proxy/VPS explanation says the signal is unavailable instead of pretending certainty.

Bad:
- A request contains `Authorization: Bearer secret`, `Cookie: sg_token=...`, `?token=...`, `?password=...`, or request body. None of these values appear in DB JSON, DTOs, frontend UI, logs, or tests snapshots.

Bad:
- A direct access spike contains mostly no-heartbeat rows. Dashboard must make it visible as low-quality traffic, not just “direct access is high”.

## 11. Implementation Plan

### Phase 1: Backend detail fields and safe client payload

1. Extend `PageViewRequest` and `ArticleVisitStartRequest` with optional client environment fields.
2. Add a small DTO/record if needed, for example `AnalyticsClientEnvironment`.
3. Extend `AnalyticsRequestDetailContext` or pass client environment into `AnalyticsService.buildDetailJson(...)`.
4. Extend `AdminAnalyticsPageViewDetailFieldsDto` for new raw browser environment fields.
5. Add tests proving all new keys are present and secrets/query values are still stripped.

### Phase 2: Classifier helper

1. Add a focused helper/service-local class such as `AnalyticsVisitQualityClassifier`.
2. Input: `AnalyticsPageView`, parsed detail fields, optional range context such as high-frequency IP set.
3. Output: `visitQuality`, `riskLevel`, `riskReasons`, booleans, explanation.
4. Reuse `UserAgentDetailUtils` and `ReferrerUtils`.
5. Add Good/Base/Bad unit tests before wiring into DTO/summary.

### Phase 3: Detail API and UI system judgment

1. Extend `AdminAnalyticsPageViewDetailDto`.
2. In `AnalyticsService.toDetailDto(...)`, attach classifier result.
3. In `AdminPanel.jsx`, add “系统判断” detail group.
4. Keep detail endpoint permission unchanged unless the user explicitly asks otherwise.
5. Extend `AdminAnalyticsDetailLog.test.js`.

### Phase 4: Dashboard visitor source insights

1. Add DTO classes or nested classes under `AdminAnalyticsSummaryDto` for `visitorSourceInsights`.
2. In `AnalyticsService.loadAdminSummary(...)`, compute insight data for the same range as overview.
3. Prefer repository projection for insight rows to avoid loading full entity graphs:
   - id
   - viewedAt
   - viewerIp
   - referrerUrl
   - geoLocation
   - userAgent
   - pageTitle
   - postId
   - heartbeatCount
   - totalDurationSeconds
   - activeDurationSeconds
   - visitStatus
   - detailJson
4. Compute source type, visit quality share, anomaly top, popular entries and suspicious summary.
5. Keep existing `trafficSources` in response for compatibility, but dashboard should use `visitorSourceInsights`.

### Phase 5: Access log filters and deep links

1. Extend `AdminAnalyticsController.pageViews(...)` query params.
2. Extend `AnalyticsService.AdminPageViewQuery`.
3. Add filter support for `visitQuality`, `riskReason`, `sourceType`, `referrerDomain`, `entryType`, `userAgentKeyword`, `geo`, `asn`, `isp`.
4. Extend `SanguiBlog-front/src/api.js adminFetchPageViewLogs(...)`.
5. Parse URL search params in `AnalyticsView` initial state and load logs accordingly.
6. Dashboard click handlers navigate to `/admin/analytics?...`.

### Phase 6: Frontend dashboard module

1. Replace old “流量来源” card with “访客来源洞察”.
2. Keep current range selector and reload button.
3. Render insight sections compactly:
   - source type bars
   - quality chips/bars
   - anomaly top list
   - entry page list
   - summary counters
4. Add/extend static tests for module labels, API fields and navigation query strings.

### Phase 7: Verification and cleanup

1. Run backend focused tests and compile.
2. Run frontend static tests, lint and build.
3. Run `git diff --check`.
4. Run Trellis task validation.
5. Manually smoke dashboard range switching, detail view, and dashboard-to-log deep links.

## 12. Files Likely To Modify

Backend:
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PageViewRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/ArticleVisitStartRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AnalyticsRequestDetailContext.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsPageViewDetailFieldsDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsPageViewDetailDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- Optional new DTO/helper:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsVisitorSourceInsightsDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsVisitQualityClassifier.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsSourceTypeClassifier.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/ReferrerUtils.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/UserAgentDetailUtils.java` only if existing bot signatures need small additions.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AnalyticsPageViewRepository.java`
- `sanguiblog_db.sql` only if optional aggregate table is approved/needed.
- `docs/sql/*` only if optional aggregate table is approved/needed.

Frontend:
- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/AppFull.jsx`
- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
- `SanguiBlog-front/src/appfull/public/articleVisitTracker.js` only if visit start payload helpers are centralized there.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- Optional helper:
  - `SanguiBlog-front/src/appfull/adminAnalyticsInsights.js`

Tests:
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceDetailJsonTest.java`
- New `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsVisitQualityClassifierTest.java`
- New/updated `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceVisitorSourceInsightsTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/AnalyticsControllerVisitTrackingTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/AdminAnalyticsControllerAuthorizationTest.java`
- `SanguiBlog-front/src/appfull/AdminAnalyticsDetailLog.test.js`
- `SanguiBlog-front/src/appfull/AdminAnalyticsVisitDuration.test.js`
- New `SanguiBlog-front/src/appfull/AdminAnalyticsTrafficInsights.test.js`
- `SanguiBlog-front/src/utils/analyticsReferrer.test.js`
- `SanguiBlog-front/src/appfull/noNativeBlockingDialogs.test.js`

## 13. Risk / Boundary Notes

- `analytics_page_views.detail_json` already stores allow-listed detail. Keep that allow-list; do not copy arbitrary request headers or browser objects.
- Current detail endpoint is SUPER_ADMIN-only by test and annotation. The user did not request permission loosening; keep it.
- `analytics_traffic_sources` is a daily source-label table and should not be the primary data source for arbitrary 7/14/30/all dashboard insight ranges.
- `GeoIpService` does not provide ASN/ISP. Do not fabricate `DATACENTER_IP`, ASN, ISP, or proxy/VPS certainty.
- The term “Referer” is misspelled in HTTP, while existing detail key is `refererRaw`. Keep existing key to avoid breaking compatibility.
- Dashboard-to-log filters can be harder if classifier output is computed rather than persisted. Prefer one reusable classifier so detail, dashboard and filters agree.
- Some filtering against computed JSON fields may be expensive. Keep implementation measurable and avoid hidden full table scans when `days` is narrow.
- Existing `AnalyticsView` has a mount-only load guard; adding URL query parsing must avoid double loads and stale filter state.
- Do not break public tracking no-op behavior: analytics failures must not fail article/page reads.
- Do not broaden frontend payload with sensitive fields or high-entropy fingerprints.

## 14. Required Tests and Assertion Points

Backend required:

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceDetailJsonTest,AnalyticsVisitQualityClassifierTest,AnalyticsServiceVisitorSourceInsightsTest,AnalyticsControllerVisitTrackingTest,AdminAnalyticsControllerAuthorizationTest,AnalyticsServiceVisitDurationTest,IpUtilsTest" test
mvn -q -DskipTests compile
```

If test names differ, run the equivalent focused tests covering:
- detail_json new keys and safety.
- classifier Good/Base/Bad cases.
- dashboard insight aggregation.
- controller payload propagation.
- access log filter query contract.
- authorization boundary.
- existing visit duration behavior.

Frontend required:

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

Manual smoke after coding:
1. Visit home/article/admin pages as a normal browser and verify new rows contain safe client environment fields.
2. Open `/admin/analytics`; open a detail row; verify “系统判断” group renders.
3. Verify old row without `detail_json` still renders and does not crash.
4. Open `/admin`; switch 7/14/30/all and verify “访客来源洞察” counts change with range.
5. Click “疑似机器人” and verify route becomes `/admin/analytics?visitQuality=BOT_LIKE` and list filters apply.
6. Click an external referer domain and verify `referrerDomain` filter applies.
7. Inspect DB JSON for a row with query-string referrer and confirm no token/password/query secret is stored.
8. Confirm existing PV/UV/comment/article cards and visitor trend still render.
9. Confirm delete controls remain SUPER_ADMIN-only.

## 15. Planning Self-Check

- 验收标准已明确：见 Goals、Validation Matrix、Good/Base/Bad、Required Tests。
- 禁止修改范围已明确：见 Non-Goals / 禁止越界。
- 预计修改文件已列出：见 Files Likely To Modify。
- 必跑测试已列出：见 Required Tests。
- 已读取具体 guideline，不只是 spec index：backend/frontend/guides 的 Pre-Development Checklist 文件均已读取。
- 需求不清问题：没有阻塞问题。唯一重要假设是“不引入远程 IP 情报/ASN/ISP provider”，因此 DATACENTER_IP/ASN/ISP 只能基于已有或本地数据，不能凭空判断。
- API / DB / frontend types / DTO 字段已对齐：见 Cross-Layer Contract。

## 16. Branch Command For Later Coding

本轮不创建/切换分支。DeepSeek 后续编码请从 `main` 创建新分支，分支名不包含 `codex`：

```powershell
git checkout main
git pull --ff-only
git checkout -b feature/access-log-v2-traffic-insights
```
