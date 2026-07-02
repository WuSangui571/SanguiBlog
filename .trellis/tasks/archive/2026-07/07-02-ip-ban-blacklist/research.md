# IP Ban Blacklist Research

## Relevant Specs Read

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
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## Retrieval Report

Keywords searched:

- `IpUtils`, `resolveIp`, `X-Forwarded-For`, `CF-Connecting-IP`, `X-Real-IP`, `Forwarded`
- `AdminAnalyticsController`, `AnalyticsService`, `AnalyticsPageView`, `page-views`, `AdminPanel`, `访问日志`
- `SystemSettingsView`, `admin/settings`, `site_settings`, `AI 助理`, `系统设置`
- `Audit`, `audit`, `operation`, `AdminAiChatAudit`, `createdBy`, `updatedBy`
- `Caffeine`, `Cache`, `cache`
- `auth_request`, `/internal`, `/api/`, `proxy_pass`, `try_files`
- `banned_ips`, `blacklist`, `ban`, `unban`, `封禁`, `黑名单`

Candidate implementations:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`: existing IP normalization and forwarded-header parser. Must be reused/extended, not replaced by a second parser.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminAnalyticsController.java`: existing admin page-view list/detail/delete API owner.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`: existing analytics list/detail DTO mapping owner.
- `SanguiBlog-front/src/api.js`: existing frontend API facade. Add IP ban functions here.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`: existing analytics view, settings view, custom confirm dialog, and admin UI owner.
- `docker/nginx/default.conf`: existing Docker web entry and reverse proxy owner. Add `auth_request` here.
- `SanguiBlog-server/pom.xml`: Caffeine already exists, version `3.1.8`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`: existing route authorization and filter chain owner.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardFilter.java`: internal endpoint must bypass or avoid BotGuard interference.

Decision:

- Modify existing analytics, settings, API facade, IP utility, security, and Nginx paths.
- Create new IP ban entity/service/controller/repository because there is no existing IP ban or generic admin-operation audit subsystem.
- Add a feature-scoped audit table rather than a broad generic audit platform for v1.

Duplicate risk:

- Do not create a parallel access-log subsystem.
- Do not add a second frontend API wrapper.
- Do not add a second settings page.
- Do not add a second unrelated IP parser. Keep `IpUtils` as low-level parser/normalizer and use one Spring-managed resolver for trusted-proxy behavior.

## Code Patterns Found

### Real IP Resolver

- Existing `IpUtils.resolveIp(HttpServletRequest)` reads forwarded headers before `remoteAddr`.
- Existing order is `X-Forwarded-For`, `X-Real-IP`, `X-Client-IP`, `CF-Connecting-IP`, `Forwarded`.
- New requirement says prefer `CF-Connecting-IP`, then `X-Real-IP`, then `X-Forwarded-For`, then `remoteAddr`, but only trust headers behind configured trusted proxies.
- Existing `IpUtilsTest` heavily asserts old unconditional header trust. DeepSeek must update those tests rather than preserving unsafe behavior blindly.
- `application-docker.yaml` already has `server.forward-headers-strategy: native`, but that is not a substitute for explicit application-level trusted-proxy rules for admin ban decisions.

Likely affected call sites:

- `AnalyticsController`
- `PostController`
- `AuthController`
- `BotGuardController`
- `AiGuestAccessService`
- `BotGuardEngine`
- `SitemapService`
- new internal security check controller

### Analytics Page-View API

- `AdminAnalyticsController` owns `/api/admin/analytics/page-views` list and `/api/admin/analytics/page-views/{id}` detail.
- Detail/delete endpoints already require `hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')`.
- `AnalyticsService.loadPageViews(...)` maps page rows to `AdminAnalyticsSummaryDto.RecentVisit`.
- `AdminAnalyticsSummaryDto.RecentVisit` currently contains IP, user, visit, duration, and user-agent fields, but no ban status.
- Best fit: extend `RecentVisit` with `ipBanned` and `ipBanId`, and batch-resolve active ban state in `AnalyticsService` for the page records.

### Frontend Analytics UI

- `AnalyticsView` is inside `SanguiBlog-front/src/appfull/AdminPanel.jsx`.
- Existing state starts at line 1208 and includes `isSuperAdmin` and `useAdminConfirmDialog`.
- Operation column exists around lines 2117-2144.
- Current icon actions are detail (`FileSearch`) and delete (`Trash2`), both inside the SUPER_ADMIN operation group.
- Add one icon-only ban button in that same group. Use a lucide icon such as `Ban` or `ShieldOff`, with `aria-label` and `title`.
- Existing custom confirm helper supports text confirmation only. Ban needs a reason input, so either extend the helper safely or add a small task-local custom modal following the same accessibility pattern.

### Frontend Settings UI

- `SystemSettingsView` starts around line 6638.
- `SETTINGS_TABS` lives near lines 6640-6648.
- Permission gate at lines 7461-7462 requires `SYSTEM_CLEAN_STORAGE` and `SUPER_ADMIN`.
- Add `{ key: 'ip-bans', label: 'IP 封禁列表' }`.
- Keep state local to `SystemSettingsView`. Do not create a new route or global context.

### Frontend API Wrapper

- `SanguiBlog-front/src/api.js` owns admin analytics functions around lines 820-879.
- Settings/admin functions continue below line 922.
- Add:
  - `adminFetchIpBans({ page, size, ip, enabledOnly })`
  - `adminCreateIpBan({ ip, reason, sourcePageViewId })`
  - `adminUnbanIpBan(id, { unbanReason })`
- Do not use direct `fetch` inside `AdminPanel.jsx`.

### Backend Security

- `SecurityConfig` currently permits public site/API paths and authenticates `/api/admin/**`.
- New admin API under `/api/admin/security/ip-bans` will be authenticated by this rule plus method-level `hasRole('SUPER_ADMIN')`.
- New internal endpoint is not under `/api`; SecurityConfig must explicitly permit it.
- `BotGuardFilter` currently runs before JWT and can return 403/429 for non-JWT requests. It must skip `/internal/security/ip-access-check`.

### Nginx

- `docker/nginx/default.conf` currently has no `auth_request`.
- Existing protected locations to keep intact:
  - `/api/ai/chat/stream` with buffering disabled
  - `/api/`
  - `/uploads/games/` with special CSP
  - `/uploads/`
  - `/avatar/`
  - `/sitemap.xml`
  - `/robots.txt`
  - `/` SPA fallback
- Add `auth_request /internal/ip-access-check;` inside each relevant location.
- Add internal check location and simple 403 handler.

### Caching

- Caffeine is already available in backend `pom.xml`.
- Existing examples:
  - `PostService` view limiter
  - `AiGuestAccessService` access state caches
  - `BotGuardEngine` risk state caches
  - `SitemapService` cache usage
- Implement IP ban cache in `IpBanService`; invalidate after ban/unban.

### Audit

- No obvious generic admin operation audit service/table exists.
- Existing `AdminAiChatAuditService` is AI session audit, not admin operation audit.
- Existing services sometimes log admin mutation summaries with SLF4J, but user requirement asks for backend operation audit records.
- Use a small feature-scoped `ip_ban_audit_logs` table.

## Files Likely To Modify

Backend:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/util/IpUtilsTest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardFilter.java`
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/BannedIp.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/IpBanAuditLog.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/BannedIpRepository.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/IpBanAuditLogRepository.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminBannedIpDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminCreateIpBanRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminUnbanIpRequest.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminIpBanController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/InternalSecurityController.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/IpBanService.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAnalyticsSummaryDto.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
- `sanguiblog_db.sql`
- `docs/sql/2026-07-02-add-banned-ips.sql`

Frontend:

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- `SanguiBlog-front/src/appfull/AdminAnalyticsIpBan.test.js`
- `SanguiBlog-front/src/appfull/SystemSettingsIpBanList.test.js`

Infra:

- `docker/nginx/default.conf`
- `.env.example` if adding `SECURITY_CLIENT_IP_TRUSTED_PROXIES`
- `docker-compose.yml` / `docker-compose.prod.yml` only if env propagation is necessary

## Risk and Boundary Notes

- Nginx `internal` protects the web path, but backend direct exposure would bypass it. Current Compose only exposes `web`, not backend, but backend direct deployments should be documented.
- Do not trust `X-Forwarded-For` unless the immediate peer is trusted.
- If Docker profile trusts private proxy ranges, be clear that this is for the container network path and not the default application behavior.
- `auth_request` must not break SSE buffering behavior.
- `auth_request` must be applied to uploads and SPA fallback, not only `/api/`.
- A banned admin IP cannot reach settings to unban itself. Backend self-IP rejection is therefore mandatory.
- Unique `ip` in `banned_ips` simplifies the "no duplicate active ban" rule. Historical actions are kept in `ip_ban_audit_logs`.
- Cache stale state after invalidation failure should self-heal via short TTL and safe logging.
- Do not record cookies, authorization headers, tokens, request bodies, AI prompts, comments, or full article bodies in audit logs.

## Required Tests

Backend:

- `IpUtilsTest`: trusted proxy behavior, header priority, no-config fallback to `remoteAddr`, IPv4/IPv6 normalization, protected address detection.
- `IpBanServiceTest`: create, duplicate enabled, re-enable unbanned, reject protected/CIDR/self IP, unban, audit write, cache invalidation, hit count update.
- `InternalSecurityControllerTest`: 204 allowed, 403 banned, no `ApiResponse`, hit update called.
- `AdminIpBanControllerAuthorizationTest`: class or methods require `hasRole('SUPER_ADMIN')`.
- `AnalyticsServiceIpBanStatusTest`: page rows are marked `ipBanned` without per-row lookup.
- Existing `AdminAnalyticsControllerAuthorizationTest`: keep detail/delete boundary unchanged.

Frontend:

- `AdminAnalyticsIpBan.test.js`: imports API functions, renders/uses ban action in operation column, disables already banned rows, uses custom confirmation, no native dialog.
- `SystemSettingsIpBanList.test.js`: adds `IP 封禁列表` tab, calls list/create/unban APIs, supports IP search and enabled-only filter, captures unban reason.
- `noNativeBlockingDialogs.test.js`: must still pass.

Infra:

- Static assertions in frontend/backend tests are not enough for Nginx. Run:
  - `docker compose config --quiet`
  - `docker compose -f docker-compose.prod.yml config --quiet`
- Manually verify `auth_request` coverage in `docker/nginx/default.conf`.

## DeepSeek Implementation Notes

- Start by creating tests. Several existing `IpUtilsTest` assertions intentionally conflict with the new "do not unconditionally trust headers" requirement; update them to reflect trusted-proxy behavior.
- Keep the implementation narrow. Do not refactor the whole analytics page or split `AdminPanel.jsx` unless necessary for this feature.
- If adding a reusable client IP resolver touches many existing call sites, keep mechanical changes small and covered by tests.
- Use `ApiResponse` for admin JSON APIs. Do not use it for the internal Nginx auth endpoint.
- Prefer `POST /{id}/unban` over DELETE so unban reason can be carried in a JSON body.
- Keep UI text concise and do not expose internal rule details to public/banned users.

