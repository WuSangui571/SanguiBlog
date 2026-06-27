# 增加文章浏览时长 / 活跃浏览时长统计 PRD

## 当前项目状态

- 当前分支：`main`。
- `git status --short --branch`：工作树干净。
- Trellis 当前任务：无 Codex 负责的 current task。
- Trellis active task 中仍有一个旧任务：`.trellis/tasks/06-07-06-07-version-2-3-2-readme-cleanup/`，状态为 `planning @deepseek`，内容是 V2.3.2 README 清理，和本任务无关，不复用、不修改。
- Workspace journal 最新记录是 Session 29：`AI reply latency stream cleanup accepted`，对应提交 `dfbc2b2`，结论是 AI 流式响应清理已完成并归档，剩余首包延迟属于模型/供应商 TTFT，不是 RAG 或本地应用缺陷。

## 任务范围判断

Complex Task。

原因：

- 跨越数据库 schema、JPA entity/repository、后端 controller/service/DTO、安全放行、前端 API facade、文章详情页生命周期埋点、后台访问日志列表展示。
- 新增 API 和 payload 字段，要求 `navigator.sendBeacon` 的 `text/plain;charset=UTF-8` JSON 字符串兼容。
- 新增持久化字段必须同步 `sanguiblog_db.sql`，且现有 Docker/生产数据库不会自动迁移，需要提供独立 SQL。
- 必须避免破坏现有文章访问计数、`analytics_page_views` 后台列表、10 分钟 IP+文章去重、BotGuard 正常访客体验和后台删除访问日志功能。

## 目标

第一阶段只完成以下功能：

1. 在文章详情访问链路上生成一次页面 visit 的唯一 `visitId`。
2. 用现有 `analytics_page_views` 表记录 visit start / heartbeat / end 状态和浏览时长。
3. 支持总停留时长 `totalDurationSeconds` 和可见状态活跃时长 `activeDurationSeconds`。
4. 文章详情页前端只在 `/article/:id` 真实文章详情启用埋点。
5. 后台访问日志新增“浏览时长”列，优先显示活跃时长，缺失时按总时长或 `last_active_time - enter_time` 兜底。
6. 接口失败不能影响文章浏览，前端 tracking 请求必须静默失败。

## 非目标 / 禁止越界

- 不实现 PV / UV / 平均阅读时长统计面板。
- 不实现按文章平均浏览时长排行。
- 不把最大时长做成新配置项，第一阶段用代码常量。
- 不重构整个 analytics 模块。
- 不新增第二套访问日志表，除非实现阶段证明 `analytics_page_views` 无法兼容；当前代码研究结论是应扩展原表。
- 不改变后台访问日志删除权限：查看仍为 `PERM_ANALYTICS_VIEW`，删除仍要求 `PERM_ANALYTICS_VIEW` + `SUPER_ADMIN`。
- 不改变文章详情的公开读取权限。
- 不让 `start`/`heartbeat`/`end` 抛 500 或阻塞文章浏览。
- 不在控制台或后端日志打印高频 heartbeat 成功日志。
- 不改 AI、上传、评论、分类、系统监控、Docker 拓扑或发布文档。

## 已读取规范

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## 代码研究结论

### Retrieval Report

- Keywords searched:
  - `Analytics`, `PageView`, `analytics_page_views`, `recordPageView`, `AdminAnalytics`, `page-views`
  - `ArticleDetail`, `fetchPostDetail`, `loadArticle`, `/article`, `recordPageView`
  - `sendBeacon`, `visibilityState`, `document.hidden`, `pagehide`, `heartbeat`, `visitId`
  - `BotGuard`, `publicReadPathPrefixes`, `X-SG-Referrer`, `IpUtils`, `ReferrerUtils`
- Candidate implementations:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`: existing owner for page-view create, admin list query, DTO mapping, traffic source update.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`: existing JPA entity for `analytics_page_views`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AnalyticsPageViewRepository.java`: existing repository with admin list entity graph and aggregation queries.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`: existing public analytics endpoint `/api/analytics/page-view`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`: existing admin access log endpoint `/api/admin/analytics/page-views`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`: article detail view count and fallback analytics insert owner.
  - `SanguiBlog-front/src/api.js`: single frontend API facade and current `recordPageView` owner.
  - `SanguiBlog-front/src/AppFull.jsx`: current route-level page-view sender and article detail loader orchestration.
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`: real article detail component where route unload/pagehide cleanup can be mounted.
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`: current admin AnalyticsView table.
- Decision:
  - Modify existing analytics path. Extend `analytics_page_views`, `AnalyticsService`, `AnalyticsController`, `AdminAnalyticsController`, `AdminAnalyticsSummaryDto.RecentVisit`, `api.js`, `AppFull.jsx`, `ArticleDetail.jsx`, and `AdminPanel.jsx`.
  - Create a small frontend helper/hook only for browser lifecycle tracking because no reusable sendBeacon / visibilityState tracker exists.
- Duplicate risk:
  - Do not create `page_visit_log` in phase one.
  - Do not add a second API wrapper.
  - Do not create a second admin analytics page.
  - Do not create a parallel article detail fetching path.

## 现有行为约束

- `analytics_page_views` 当前字段：`id`, `post_id`, `page_title`, `viewer_ip`, `user_id`, `referrer_url`, `geo_location`, `user_agent`, `viewed_at`。
- `GET /api/posts/{id}` 和 `GET /api/posts/slug/{slug}` 当前会在 `PostService.incrementViews(...)` 内：
  - 对同一 `ip + postId` 做 10 分钟去重。
  - 增加 `posts.views_count`。
  - 调用 `AnalyticsService.recordPageView(...)` 写 `analytics_page_views`。
  - 如果 AnalyticsService 失败，会直接写库兜底。
- `POST /api/analytics/page-view` 当前用于首页、归档、关于、工具、后台等非文章页的 page-view。
- 后台日志列表从 `GET /api/admin/analytics/page-views` 读取 `AdminAnalyticsSummaryDto.RecentVisit`。
- `SanguiBlog-front/src/api.js` 已把 analytics page-view 加入 silent auth paths，并吞掉 `recordPageView` 错误。
- BotGuard 的 public-read relief 只适用于 GET；新增 POST heartbeat 可能增加少量 risk 计数，必须验证正常 15 秒心跳不会误伤访客。

## 推荐总体方案

使用现有 `analytics_page_views` 作为文章 visit 记录表。

前端在进入文章详情路由时生成 `visitId`，并把它贯穿到文章详情请求和后续 start / heartbeat / end 请求：

```text
Article route id
-> generate visitId
-> fetchPostDetail(id, { visitId }) sends X-SG-Visit-Id
-> PostController.detail(..., visitId)
-> PostService.getPublishedDetail(..., visitId)
-> AnalyticsService.recordPageView(..., visitId) writes the normal PV row with visit_id + enter_time
-> ArticleDetail/useArticleVisitTracker start/heartbeat/end update the same row by visit_id
-> AdminAnalyticsController.pageViews returns duration fields
-> AdminPanel AnalyticsView formats and renders 浏览时长
```

关键原则：

- 一次文章页面 visit 对应 `analytics_page_views.visit_id` 唯一的一行。
- `visit/start` 如果发现相同 `visitId` 已存在，只更新缺失的 start 字段，不重复插入。
- `visit/heartbeat` 和 `visit/end` 都按绝对秒数更新，不能把 duration 当 delta 叠加。
- 如果 `visit/start` 先于文章详情 GET 到达，后续详情计数逻辑必须仍能正确增加 `posts.views_count`，不能因为同 visitId 的 OPEN 行存在就错误抑制文章浏览计数。
- 如果文章详情 GET 已写入 visit row，`visit/start` 只做幂等补齐。

## 数据库设计

扩展 `analytics_page_views`。

新增字段：

```sql
visit_id VARCHAR(64) NULL,
enter_time DATETIME NULL,
leave_time DATETIME NULL,
last_active_time DATETIME NULL,
total_duration_seconds INT UNSIGNED NULL,
active_duration_seconds INT UNSIGNED NULL,
heartbeat_count INT UNSIGNED NOT NULL DEFAULT 0,
visit_status VARCHAR(32) NULL,
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

新增索引：

```sql
UNIQUE KEY uk_apv_visit_id (visit_id),
KEY idx_apv_visit_status_time (visit_status, updated_at),
KEY idx_apv_enter_time (enter_time)
```

实施要求：

- 更新 `sanguiblog_db.sql` 的建表语句。
- 提供独立 SQL 文件给现有数据库使用，建议路径：
  - `docs/sql/2026-06-27-add-analytics-visit-duration.sql`
- 现有数据兼容：
  - 旧行 `visit_id` 为空。
  - 旧行 `enter_time` 可为空；后台展示 fallback 可使用 `viewed_at` 或显示 `-`，但不要强制回填。
  - 新代码写入时 `enter_time` 应等于进入文章页时间；没有前端 start 时间时使用后端当前时间。

建议独立 SQL 形态：

```sql
ALTER TABLE analytics_page_views
  ADD COLUMN visit_id VARCHAR(64) NULL AFTER id,
  ADD COLUMN enter_time DATETIME NULL AFTER viewed_at,
  ADD COLUMN leave_time DATETIME NULL AFTER enter_time,
  ADD COLUMN last_active_time DATETIME NULL AFTER leave_time,
  ADD COLUMN total_duration_seconds INT UNSIGNED NULL AFTER last_active_time,
  ADD COLUMN active_duration_seconds INT UNSIGNED NULL AFTER total_duration_seconds,
  ADD COLUMN heartbeat_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER active_duration_seconds,
  ADD COLUMN visit_status VARCHAR(32) NULL AFTER heartbeat_count,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER visit_status,
  ADD UNIQUE KEY uk_apv_visit_id (visit_id),
  ADD KEY idx_apv_visit_status_time (visit_status, updated_at),
  ADD KEY idx_apv_enter_time (enter_time);
```

如果目标 MySQL 版本不支持一次性 `ADD COLUMN IF NOT EXISTS`，不要在主 SQL 中依赖它；可在运维说明里提示重复执行前先 `SHOW COLUMNS`。

## 后端 API 契约

采用现有 analytics 命名空间：

### 1. 文章 visit start

`POST /api/analytics/visit/start`

JSON body:

```json
{
  "visitId": "uuid-or-random",
  "articleId": 123,
  "path": "/article/123",
  "title": "文章标题",
  "referrer": "来源"
}
```

Response:

```json
{ "success": true, "message": "ok", "data": null }
```

处理规则：

- `visitId` 缺失或空白：返回 ok no-op，不抛 500。
- `articleId` 缺失或无效：返回 ok no-op 或安全 400，优先 no-op 以保护前端静默埋点。
- `visitId` 已存在：幂等更新缺失字段，不能插入第二行。
- `visitId` 不存在：创建 OPEN 行，复用现有 IP、User-Agent、用户、GeoIP、Referrer 逻辑。
- `enter_time = now`，`viewed_at` 仍保留为创建时间，`visit_status = OPEN`。

### 2. 文章 visit heartbeat

`POST /api/analytics/visit/heartbeat`

JSON body:

```json
{
  "visitId": "uuid-or-random",
  "activeDurationSeconds": 30
}
```

处理规则：

- `visitId` 缺失或不存在：返回 ok no-op，不抛 500。
- `last_active_time = now`。
- `heartbeat_count = heartbeat_count + 1`。
- `active_duration_seconds` 存绝对秒数，建议取 `max(existing, sanitizedIncoming)`，避免乱序心跳回退。
- `activeDurationSeconds` 小于 0 归零，大于上限截断。

### 3. 文章 visit end

`POST /api/analytics/visit/end`

JSON body:

```json
{
  "visitId": "uuid-or-random",
  "totalDurationSeconds": 75,
  "activeDurationSeconds": 63
}
```

处理规则：

- 兼容 `Content-Type: application/json`。
- 兼容 `navigator.sendBeacon` 常见的 `text/plain;charset=UTF-8` JSON 字符串。
- `visitId` 缺失或不存在：返回 ok no-op，不抛 500。
- `leave_time = now`。
- `total_duration_seconds` 和 `active_duration_seconds` 存绝对秒数，不累加。
- 如果重复 end 到达，不能把时长翻倍；可保持现有值或保存更大的合法绝对值。
- `visit_status = CLOSED`。

### 4. 文章详情请求 visitId 头

新增请求头：

```text
X-SG-Visit-Id: uuid-or-random
```

适用：

- `GET /api/posts/{id}`
- `GET /api/posts/slug/{slug}`

用途：

- 让现有文章详情访问记录和后续 heartbeat/end 指向同一 `analytics_page_views` 行。
- 避免 start endpoint 创建第二条文章访问日志。
- 保持原有文章 views_count 增加逻辑不丢失。

## 后端实现计划

1. DTO
   - 新增 `ArticleVisitStartRequest`、`ArticleVisitHeartbeatRequest`、`ArticleVisitEndRequest`，或按现有命名选择 `AnalyticsVisit*Request`。
   - 不复用 `PageViewRequest` 承载 heartbeat/end，避免 DTO 语义混乱。
2. Entity
   - 扩展 `AnalyticsPageView` 映射新增字段。
3. Repository
   - 添加 `Optional<AnalyticsPageView> findByVisitId(String visitId)`。
   - 添加 `boolean existsByVisitId(String visitId)` 如有需要。
4. Service
   - 在 `AnalyticsService` 内扩展：
     - `recordArticleVisitStart(...)`
     - `recordArticleVisitHeartbeat(...)`
     - `recordArticleVisitEnd(...)`
     - `resolveDisplayDurationSeconds(AnalyticsPageView view)`
     - `sanitizeDurationSeconds(Integer/Long seconds)`
   - 建议常量：
     - `MAX_VISIT_DURATION_SECONDS = 7200`。
   - 修改 `recordPageView(...)` 支持可选 `visitId`，或者增加 overload，供 `PostService` 传入。
   - `toRecentVisit(...)` 映射新增 duration 字段。
5. Controller
   - `AnalyticsController` 新增 start / heartbeat / end endpoints。
   - 对 sendBeacon `text/plain` 可用以下方式之一：
     - endpoint 接收 `@RequestBody String rawBody`，由 `ObjectMapper` 解析；
     - 或为 end endpoint 额外加 `consumes = { MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE }` 并安全解析。
   - 避免 broad `catch (Exception)` 返回 200；解析失败可 no-op 或抛安全 `IllegalArgumentException`，但埋点接口推荐 no-op ok。
6. PostController / PostService
   - `PostController.detail` 和 `detailBySlug` 读取 `X-SG-Visit-Id`。
   - `PostService.getPublishedDetail(...)` 和 `getPublishedDetailBySlug(...)` 增加 `visitId` 参数。
   - `incrementViews(...)` 和 `recordAnalyticsPageView(...)` 将 visitId 传给 AnalyticsService。
   - 保证同一个 visitId 不制造重复行，也不导致 `views_count` 该增加时没增加。
7. Security / BotGuard
   - `SecurityConfig` permitAll 增加：
     - `/api/analytics/visit/start`
     - `/api/analytics/visit/heartbeat`
     - `/api/analytics/visit/end`
   - 不默认绕过 BotGuard；但必须测试正常访客 15 秒心跳不触发验证码/阻断。
   - 如果测试证明误伤，再做最小范围 BotGuard relief，不要把所有 analytics POST 全放进 bypass。

## 前端实现计划

1. `src/api.js`
   - `fetchPostDetail(id, options)` 支持 `options.visitId` 并发送 `X-SG-Visit-Id`。
   - 新增：
     - `startArticleVisit(payload)`
     - `heartbeatArticleVisit(payload)`
     - `endArticleVisit(payload, { beacon }?)`
   - start / heartbeat / end 和 `/analytics/page-view` 一样静默失败。
   - `endArticleVisit` 优先使用 `navigator.sendBeacon`；fallback 到 normal `request` / `fetch`。
   - 将 `/analytics/visit/` 加入 `SILENT_AUTH_PATHS`。
2. `src/appfull/articleVisitTracker.js` 或 `src/appfull/public/articleVisitTracker.js`
   - 新增纯 helper，便于 Node tests：
     - `createVisitId()`
     - `sanitizeDurationSeconds()`
     - `calculateTotalDurationSeconds(startMs, nowMs, maxSeconds)`
     - `createActiveDurationTracker(...)` 或等价小 helper
     - `formatVisitDuration(seconds)`，输出 `8秒`、`1分10秒`、`12分03秒`、`1小时05分`。
3. `src/appfull/public/ArticleDetail.jsx`
   - 启动 tracker 的 React effect 只在真实文章详情数据可用时启用。
   - 监听：
     - `visibilitychange`
     - `pagehide`
     - `beforeunload` 作为补充
   - 组件卸载 / route 切换时结束当前 visit。
   - 每 15 秒 heartbeat。
   - `activeDurationSeconds` 只累计 `document.visibilityState === 'visible'` 的时间。
4. `src/hooks/useBlogData.jsx` / `src/AppFull.jsx`
   - 需要在加载文章详情前生成 visitId，并把它传到 `loadArticle -> fetchPostDetail`，否则详情 GET 无法把 `visit_id` 写到原始 PV 行。
   - 也可以由 `AppFull.jsx` 以 `articleId` 为 key 保存当前 article visitId，并作为 prop 传给 `ArticleDetail`。
   - 处理刷新和路由切换：旧文章 visit end，新文章生成新 visitId。
5. `src/appfull/AdminPanel.jsx`
   - 后台访问日志表在“地理”前或“地理”后新增“浏览时长”列。
   - 显示字段优先级：
     - `visit.durationSeconds`
     - `visit.activeDurationSeconds`
     - `visit.totalDurationSeconds`
     - 前端仅在后端未给 `durationSeconds` 时做兜底。
   - 无可用时显示 `-`。

## Admin DTO 字段

扩展 `AdminAnalyticsSummaryDto.RecentVisit`：

```java
private String visitId;
private String enterTime;
private String leaveTime;
private String lastActiveTime;
private Integer totalDurationSeconds;
private Integer activeDurationSeconds;
private Integer durationSeconds;
private Integer heartbeatCount;
private String visitStatus;
```

命名约束：

- 后端 Java 字段用 camelCase。
- 前端消费 camelCase；为兼容旧响应可做 snake_case fallback，但不要只返回 snake_case。
- `durationSeconds` 是后台显示用 fallback 后结果。

## Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| start 正常，visitId + articleId 有效 | 创建或补齐一条 `analytics_page_views`，`visit_status=OPEN`，`enter_time` 有值 |
| start 重复上报同一 visitId | 幂等，不新增第二行，不改变原有 post/user/ip/referrer 的有效数据 |
| heartbeat 正常 | 更新 `last_active_time`，`heartbeat_count+1`，`active_duration_seconds` 保存合法绝对值 |
| heartbeat 缺失 visitId | 返回 ok no-op 或安全 400；不得 500 |
| heartbeat visitId 不存在 | 返回 ok no-op；不得 500 |
| end JSON `application/json` | 更新 `leave_time`、duration、`visit_status=CLOSED` |
| end beacon `text/plain;charset=UTF-8` | 后端正常解析 JSON 字符串并更新同一行 |
| end 重复上报 | 不叠加时长，不翻倍；保持或更新为更大合法绝对值 |
| duration < 0 | 按 0 保存 |
| duration > 7200 | 截断为 7200 |
| activeDuration > totalDuration | 保存时 active 不得超过 total，可截断为 total |
| 用户切到后台 1 分钟 | `active_duration_seconds` 不计算后台时间 |
| pagehide/beforeunload 未发出 end | 后台用 `last_active_time - enter_time` 或现有 duration fallback 显示估算值 |
| 文章不存在 / 未发布 | 不启动真实 visit；现有 404/error 体验不变 |
| tracking endpoint 失败 | 前端吞掉错误，文章正常显示 |
| BotGuard 对正常心跳 | 正常 15 秒 heartbeat 不应触发验证码或阻断 |
| 原后台日志删除 | 新字段不影响单条/批量/我的日志删除 |

## Good / Base / Bad Cases

- Good:
  - 用户打开 `/article/123`，详情 GET 写入带 `visit_id` 的 PV 行，start 幂等补齐，停留 70 秒后 end；后台显示 `1分10秒`。
- Base:
  - 用户停留 20 秒后浏览器崩溃，只收到一次 heartbeat；后台使用 `last_active_time - enter_time` 或 `active_duration_seconds` 显示估算时长。
- Base:
  - 旧历史访问日志没有 `visit_id` 和 duration 字段；后台仍显示原字段，浏览时长为 `-`。
- Bad:
  - `visitId` 为空、payload 异常、duration 为负或超大、end 重复上报、sendBeacon text/plain、未知 visitId，均不能导致 500 或前端可见错误。

## 预计修改文件

后端：

- `sanguiblog_db.sql`
- `docs/sql/2026-06-27-add-analytics-visit-duration.sql`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AnalyticsPageView.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AnalyticsPageViewRepository.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/ArticleVisitStartRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/ArticleVisitHeartbeatRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/ArticleVisitEndRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AnalyticsController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/PostController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AnalyticsServiceVisitDurationTest.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/AnalyticsControllerVisitTrackingTest.java` if controller test infrastructure is practical

前端：

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
- `SanguiBlog-front/src/AppFull.jsx`
- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
- `SanguiBlog-front/src/appfull/public/articleVisitTracker.js` or `SanguiBlog-front/src/appfull/articleVisitTracker.js`
- `SanguiBlog-front/src/appfull/public/articleVisitTracker.test.js` or sibling test
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-front/src/appfull/AdminAnalyticsVisitDuration.test.js` or similar static test

## 必跑测试

后端：

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsServiceVisitDurationTest,AnalyticsServiceGeoLocationTest" test
mvn -q "-Dtest=IpUtilsTest,BotGuardEngineTest" test
mvn -q -DskipTests compile
```

如果添加了 controller test：

```powershell
cd SanguiBlog-server
mvn -q "-Dtest=AnalyticsControllerVisitTrackingTest" test
```

前端：

```powershell
cd SanguiBlog-front
node src/appfull/public/articleVisitTracker.test.js
node src/utils/analyticsReferrer.test.js
node src/utils/analyticsReferrerIntegration.test.js
node src/appfull/AdminAnalyticsVisitDuration.test.js
node src/appfull/noNativeBlockingDialogs.test.js
cmd /c npm run lint
cmd /c npm run build
```

跨层 / 静态：

```powershell
git diff --check
python .trellis/scripts/task.py validate .trellis/tasks/06-27-article-visit-duration-stats
```

手工验收：

1. 打开一篇文章，后台访问日志新增或更新一条带 `visit_id` 的文章访问记录。
2. 停留约 10 秒关闭，后台显示约 `10秒`。
3. 停留约 70 秒，后台显示约 `1分10秒`。
4. 切到其他标签页 1 分钟再回来，`active_duration_seconds` 不把后台时间全算进去。
5. 刷新文章页，旧 visit 结束，新 visit 开始。
6. SPA 路由切换到另一篇文章，旧 visit 结束，新 visit 开始。
7. sendBeacon `text/plain` 上报能被后端解析。
8. 重复 end 不导致 duration 翻倍。
9. 后台访问日志原有时间、文章、访客 IP、用户、来源、地理、操作仍正常。
10. 未正常触发 end 时，后台仍能通过 heartbeat 估算时长。

## 规划自检

- 验收标准：已明确。
- 禁止修改范围：已明确。
- 预计修改文件：已列出。
- 必跑测试：已列出。
- 具体 guideline：已读取 backend/frontend/guides index 及 Pre-Development Checklist 指向的具体文件。
- 需求不清：当前无阻塞问题；最大统计时长采用第一阶段常量 `7200` 秒。
- API / DB / frontend DTO 字段：已对齐。
