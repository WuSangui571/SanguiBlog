# IP Ban Blacklist PRD

Status: planning-only handoff for DeepSeek implementation
Task type: Complex Task
Task path: `.trellis/tasks/07-02-ip-ban-blacklist`
Suggested branch after planning: `feature/ip-ban-blacklist`

## Current Project State

- Current branch at planning time: `main`.
- Worktree at planning time: clean.
- Current Trellis task before this task: none.
- Last recorded workspace journal entry: Session 33, Access Log V2 Traffic Insights Closeout, marked completed on 2026-07-01.
- Existing active Trellis task directories `06-07-06-07-version-2-3-2-readme-cleanup` and `06-30-detailed-access-log` are stale planning records assigned to deepseek and are not reused for this task.

## Scope Judgment

This is a Complex Task.

Reason: the feature crosses database schema, JPA entities/repositories, backend service/API/security, real client IP resolution, Nginx `auth_request`, admin analytics UI, admin settings UI, frontend API wrappers, caching, audit logging, and targeted regression tests.

## Goals

1. Allow only SUPER_ADMIN users to ban a single IPv4 or IPv6 address from `/admin/analytics` access-log rows.
2. Add a new `/admin/settings` group named `IP 封禁列表` for listing, searching, manually adding, and unbanning IPs.
3. Reject banned IPs at the Nginx entry layer for frontend pages, article pages, static SPA routes, `/api/`, comments, AI assistant, and admin entry routes.
4. Add a backend internal check endpoint for Nginx:
   - `GET /internal/security/ip-access-check`
   - returns `204 No Content` when allowed
   - returns `403 Forbidden` when banned
   - updates `hitCount` and `lastHitTime` on banned hits
5. Use a unified real-client-IP resolver with trusted-proxy boundaries. Do not unconditionally trust spoofable `X-Forwarded-For`.
6. Persist ban and unban audit records without logging cookies, authorization headers, tokens, or request bodies.
7. Use Caffeine cache to avoid database reads on every `auth_request`, with immediate invalidation after ban/unban.

## Non-Goals

- No CIDR/range bans in the first version.
- No country/ASN/user-agent based blocking.
- No automatic ban rules or bot-score integration.
- No public UI explaining why a user is banned beyond a simple `Access Denied`.
- No broad admin redesign beyond adding the required settings group and access-log action icon.
- No migration runner introduction. This repo still uses explicit SQL files and manual production SQL application.
- No commit, push, deployment, version bump, or record-session in this planning round.

## Functional Requirements

### Analytics Page

- In `/admin/analytics`, add one icon-only ban action in the existing operation column.
- The action is SUPER_ADMIN-only and should live beside the existing detail/delete icon buttons.
- Clicking the icon opens a custom confirmation dialog, not `window.confirm`.
- Confirmation content must show:
  - target IP
  - optional reason input
  - warning text: `IP 可能属于代理、VPN、公司或学校出口，封禁可能误伤共享该出口的用户`
- If the IP is already actively banned, show `已封禁` and disable the ban action.
- After successful ban, refresh the current access-log page so the row state becomes `已封禁`.

### Settings Page

- Add a settings tab/group named `IP 封禁列表`.
- The group is only available inside `/admin/settings`, which already requires SUPER_ADMIN.
- Show these fields:
  - IP
  - ban reason
  - enabled
  - ban time
  - operator
  - hit count
  - last hit time
  - action: unban
- Support:
  - search by IP
  - enabled-only filter
  - manual single-IP ban with optional reason
  - unban with optional unban reason
- Use custom admin notice/confirm UI patterns already in `AdminPanel.jsx`.

### Access Denial

- A banned IP gets HTTP 403 before seeing frontend pages, article pages, `/api/`, AI assistant, comments, admin routes, uploads, sitemap, or robots.
- Response body should be simple:

```text
Access Denied
```

- Do not expose ban IDs, ban reason, admin paths, SQL table names, or implementation details to banned visitors.

## Cross-Layer Contract

### 1. Database

Create or update `sanguiblog_db.sql` and add a manual migration under `docs/sql/`, for example:

- `docs/sql/2026-07-02-add-banned-ips.sql`

Primary table:

```sql
CREATE TABLE IF NOT EXISTS banned_ips (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip VARCHAR(45) NOT NULL,
    reason VARCHAR(512) NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    hit_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
    last_hit_time DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(6) NOT NULL,
    updated_by BIGINT UNSIGNED NULL,
    unbanned_at DATETIME(6) NULL,
    unbanned_by BIGINT UNSIGNED NULL,
    unban_reason VARCHAR(512) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_banned_ips_ip (ip),
    KEY idx_banned_ips_enabled_ip (enabled, ip),
    KEY idx_banned_ips_last_hit_time (last_hit_time),
    CONSTRAINT fk_banned_ips_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_banned_ips_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_banned_ips_unbanned_by FOREIGN KEY (unbanned_by) REFERENCES users(id) ON DELETE SET NULL
);
```

Use a global unique key on `ip` rather than multiple historical rows. If an IP was previously unbanned, re-enable/update the same row. Preserve history through audit rows.

Audit table for this feature:

```sql
CREATE TABLE IF NOT EXISTS ip_ban_audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    banned_ip_id BIGINT UNSIGNED NULL,
    action VARCHAR(32) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    reason VARCHAR(512) NULL,
    actor_id BIGINT UNSIGNED NULL,
    actor_username VARCHAR(128) NULL,
    source_page_view_id BIGINT UNSIGNED NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ip_ban_audit_ip_time (ip, created_at),
    KEY idx_ip_ban_audit_actor_time (actor_id, created_at),
    CONSTRAINT fk_ip_ban_audit_banned_ip FOREIGN KEY (banned_ip_id) REFERENCES banned_ips(id) ON DELETE SET NULL,
    CONSTRAINT fk_ip_ban_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ip_ban_audit_page_view FOREIGN KEY (source_page_view_id) REFERENCES analytics_page_views(id) ON DELETE SET NULL
);
```

The audit table is feature-scoped. Do not invent a broad generic admin audit subsystem unless the implementation remains small and fully tested.

### 2. Backend Entities and Repositories

Expected new backend types:

- `model/entity/BannedIp.java`
- `model/entity/IpBanAuditLog.java`
- `model/repository/BannedIpRepository.java`
- `model/repository/IpBanAuditLogRepository.java`

Expected DTO/request types:

- `AdminBannedIpDto`
- `AdminCreateIpBanRequest`
- `AdminUnbanIpRequest`
- Optional `AdminBannedIpListQuery` or service record for internal query handling.

`BannedIpRepository` should support:

- lookup by normalized IP
- lookup enabled ban by normalized IP
- batch lookup active IPs for analytics list rows
- paginated search by IP and enabled-only
- atomic hit update for `hit_count` and `last_hit_time`

### 3. Backend Admin API

Base path:

```text
/api/admin/security/ip-bans
```

Authorization:

```java
@PreAuthorize("hasRole('SUPER_ADMIN')")
```

List:

```http
GET /api/admin/security/ip-bans?page=1&size=20&ip=203.0.113.10&enabledOnly=true
```

Response:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "records": [
      {
        "id": 1,
        "ip": "203.0.113.10",
        "reason": "spam",
        "enabled": true,
        "hitCount": 3,
        "lastHitTime": "2026-07-02T10:15:30",
        "createdAt": "2026-07-02T10:00:00",
        "createdBy": 1,
        "createdByUsername": "admin",
        "updatedAt": "2026-07-02T10:00:00",
        "updatedBy": 1,
        "updatedByUsername": "admin",
        "unbannedAt": null,
        "unbannedBy": null,
        "unbannedByUsername": null,
        "unbanReason": null
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

Create/re-enable ban:

```http
POST /api/admin/security/ip-bans
Content-Type: application/json
```

Request:

```json
{
  "ip": "203.0.113.10",
  "reason": "malicious access pattern",
  "sourcePageViewId": 123
}
```

Response: `ApiResponse<AdminBannedIpDto>`.

Unban:

```http
POST /api/admin/security/ip-bans/{id}/unban
Content-Type: application/json
```

Request:

```json
{
  "unbanReason": "manual review passed"
}
```

Response: `ApiResponse<AdminBannedIpDto>`.

### 4. Analytics List API Extension

Extend `AdminAnalyticsSummaryDto.RecentVisit` with:

```json
{
  "ipBanned": true,
  "ipBanId": 1
}
```

`AnalyticsService.loadPageViews(...)` should batch-resolve ban state for visible page records. Do not perform one DB query per row.

### 5. Internal Nginx Auth API

Endpoint:

```http
GET /internal/security/ip-access-check
```

Status behavior:

| Condition | Status | Body |
|-----------|--------|------|
| IP not banned | 204 | empty |
| IP actively banned | 403 | optional `Access Denied` or empty |
| invalid/missing request object | 204 or 403 only if normalized IP is actively banned |

This endpoint should not use `ApiResponse`.

SecurityConfig/BotGuard notes:

- Permit this endpoint without JWT, because Nginx `auth_request` will not send an admin token.
- Explicitly skip BotGuard for this internal check or ensure BotGuard cannot return 403/429 before the ban service.
- Do not expose details in the response.
- The Docker web container does not publish backend port directly, and the Nginx location must be `internal`. If a future deployment exposes backend 8080 directly, add a shared internal header/secret or allowed-source check.

### 6. Real Client IP Resolver

Requirements:

- Prefer headers in this semantic order only when the immediate remote address is a trusted proxy:
  1. `CF-Connecting-IP`
  2. `X-Real-IP`
  3. `X-Forwarded-For`
  4. `request.getRemoteAddr()`
- If no trusted proxy configuration is present, ignore spoofable forwarding headers and use `request.getRemoteAddr()`.
- Keep IPv4 and IPv6 normalization compatible with existing tests.
- Reject CIDR input in admin ban requests.

Recommended config:

```yaml
security:
  client-ip:
    trusted-proxies: ${SECURITY_CLIENT_IP_TRUSTED_PROXIES:}
```

Docker profile may set a default suitable for the Docker web-to-backend path, while `application.yaml` keeps it empty by default.

Recommended implementation shape:

- Keep `IpUtils` as the low-level parser/normalizer and extend it with tested helpers:
  - `normalizeIp`
  - `isLoopback`
  - `isPrivateOrProtected`
  - `isValidSingleIp`
  - header parsing helpers
- Add a Spring-managed resolver such as `ClientIpResolver` with `ClientIpProperties`.
- Update existing request IP call sites to use the unified resolver where Spring injection is available. Avoid creating a second unrelated resolver.

### 7. Protected IP Validation

Admin ban creation must reject:

- `localhost`
- `127.0.0.0/8`
- `::1`
- `0.0.0.0`
- `::`
- private IPv4 ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- link-local IPv4: `169.254.0.0/16`
- Docker/private bridge ranges covered above
- IPv6 ULA `fc00::/7`
- IPv6 link-local `fe80::/10`
- multicast/reserved addresses if Java `InetAddress` marks them unsafe
- the current SUPER_ADMIN's resolved client IP
- CIDR strings such as `203.0.113.0/24`

The frontend should warn about self-ban and shared egress, but the backend must enforce the self/protected-IP block.

### 8. Nginx

Update `docker/nginx/default.conf`.

Add internal location:

```nginx
location = /internal/ip-access-check {
    internal;
    proxy_pass http://backend:8080/internal/security/ip-access-check;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Original-URI $request_uri;
}
```

Apply before serving/proxying:

```nginx
auth_request /internal/ip-access-check;
```

Locations that must be protected:

- `location = /sitemap.xml`
- `location = /robots.txt`
- `location = /api/ai/chat/stream`
- `location /api/`
- `location /uploads/games/`
- `location /uploads/`
- `location /avatar/`
- `location /`

Add a simple denial handler:

```nginx
error_page 403 = /access-denied;

location = /access-denied {
    internal;
    default_type text/plain;
    return 403 "Access Denied\n";
}
```

Do not break the existing SSE buffering settings for `/api/ai/chat/stream`, uploaded game CSP, sitemap/robots backend routing, or SPA fallback.

## Validation and Error Matrix

| Case | Expected Result |
|------|-----------------|
| SUPER_ADMIN creates ban for valid public IPv4 | 200, one `banned_ips` row enabled, cache invalidated, audit action `BAN` written |
| SUPER_ADMIN creates ban for valid public IPv6 | 200, normalized IPv6 stored, enabled |
| Same IP already enabled | no duplicate row; return existing/enabled DTO or readable 400, but never create a second enabled record |
| Same IP previously unbanned | same row re-enabled, reason/updated fields refreshed, unban fields cleared or retained consistently as documented, audit action `REBAN` or `BAN` written |
| ADMIN/USER tries to ban or unban | 403 |
| Missing/invalid IP | 400 through `GlobalExceptionHandler` and `ApiResponse.fail` |
| CIDR input | 400 |
| loopback/private/Docker/local IP | 400 |
| target equals current admin IP | 400 with readable warning |
| reason longer than 512 | 400 or truncate only if documented and tested; prefer 400 |
| unban active ban | enabled=false, unbanned fields set, cache invalidated, audit action `UNBAN` |
| unban already disabled ban | idempotent DTO or readable 400, but no data corruption |
| auth_request for unbanned IP | 204 |
| auth_request for banned IP | 403, increments hit count and last hit time |
| cache load fails during internal check | fail closed or fail open must be explicit; prefer fail open only for transient cache layer exception, not for DB lookup errors. Log safe metadata only. |
| cache invalidation fails during admin ban/unban | admin operation still succeeds after DB commit; log safe warning and keep a short TTL so stale cache self-heals |
| Nginx receives backend 403 | returns simple `Access Denied` without implementation details |

## Good / Base / Bad Cases

Good:

- SUPER_ADMIN bans a public IP from an analytics row, sees `已封禁`, and that IP receives 403 for `/`, `/article/:id`, `/api/site/meta`, `/api/posts`, `/api/ai/chat`, `/admin`, `/uploads/...`, `/sitemap.xml`, and `/robots.txt`.
- SUPER_ADMIN manually adds a public IPv6 in settings, sees it in the list, then unbans it with a reason.

Base:

- Settings list is empty and renders an empty state.
- Old analytics rows with null IP render no ban button.
- A previously unbanned IP can be re-enabled without creating a second row.
- A non-banned visitor continues to access public pages and APIs normally.

Bad:

- A user tries to ban `127.0.0.1`, `localhost`, `192.168.1.1`, `172.18.0.1`, `10.0.0.1`, `::1`, or a CIDR. Backend rejects it.
- A spoofed browser sends `X-Forwarded-For` directly to backend when no trusted proxy is configured. Resolver ignores it and uses `remoteAddr`.
- BotGuard/JWT blocks `/internal/security/ip-access-check` before the IP ban service. This is a failure.
- Nginx auth_request is accidentally omitted from `/api/ai/chat/stream` or `/uploads/`. This is a failure.

## Expected Files To Modify During Implementation

Backend:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/util/IpUtils.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/botguard/BotGuardFilter.java`
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/ClientIpProperties.java` or equivalent
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ClientIpResolver.java` or equivalent
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
- Existing IP call sites as needed: `AnalyticsController`, `PostController`, `AuthController`, `BotGuardController`, `AiGuestAccessService`, `BotGuardEngine`, `SitemapService`.
- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-server/src/main/resources/application-docker.yaml`
- `sanguiblog_db.sql`
- `docs/sql/2026-07-02-add-banned-ips.sql`

Frontend:

- `SanguiBlog-front/src/api.js`
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- new or updated static tests under `SanguiBlog-front/src/appfull/`

Infra:

- `docker/nginx/default.conf`
- optionally `.env.example` if a new trusted-proxy config env key is introduced
- optionally `docker-compose.yml` / `docker-compose.prod.yml` only if required for env propagation

Tests:

- New/updated tests under `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/...`
- New/updated Node static tests under `SanguiBlog-front/src/appfull/`

## Required Tests and Assertion Points

Backend targeted tests:

```bash
cd SanguiBlog-server
mvn -q "-Dtest=IpUtilsTest,IpBanServiceTest,InternalSecurityControllerTest,AdminIpBanControllerAuthorizationTest,AdminAnalyticsControllerAuthorizationTest" test
mvn -q "-Dtest=AnalyticsServiceIpBanStatusTest" test
mvn -q -DskipTests compile
```

If controller MVC tests are too heavy for the current test setup, use reflection authorization tests plus service tests, matching existing patterns.

Frontend targeted tests:

```bash
cd SanguiBlog-front
node src/appfull/AdminAnalyticsIpBan.test.js
node src/appfull/SystemSettingsIpBanList.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Infra checks:

```bash
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
```

Manual acceptance after implementation:

```bash
curl -i http://localhost/
curl -i http://localhost/article/1
curl -i http://localhost/api/site/meta
curl -i http://localhost/api/posts?page=1\&size=10
curl -i http://localhost/api/ai/chat
curl -i http://localhost/admin
curl -i http://localhost/sitemap.xml
curl -i http://localhost/robots.txt
```

Manual acceptance must include a way to simulate a banned client IP. If testing through Nginx locally, use a trusted-proxy setup and controlled `X-Forwarded-For` only when the immediate source is configured as trusted.

## Implementation Plan

1. Write failing backend tests for IP validation, protected address rejection, duplicate/re-enable behavior, self-IP rejection, cache invalidation, and internal access-check 204/403.
2. Add schema SQL and entities/repositories for `banned_ips` and `ip_ban_audit_logs`.
3. Implement `IpBanService` with normalized IP storage, active unique behavior, audit writes, and Caffeine cache.
4. Implement trusted-proxy IP resolver and update internal check plus existing high-risk IP call sites.
5. Add admin and internal controllers with correct authorization/status behavior.
6. Extend analytics DTO/service to batch mark active banned IP state.
7. Update frontend `api.js` with admin IP ban functions.
8. Update `AnalyticsView` operation column with icon-only ban action and custom reason confirmation UI.
9. Update `SystemSettingsView` with `IP 封禁列表` tab, list/search/enabled filter/manual add/unban reason flow.
10. Update Nginx default config with `auth_request`, internal location, and simple 403 handler.
11. Add frontend static tests for analytics action, settings group, and no native dialogs.
12. Run targeted backend/frontend/infra verification commands.

## Planning Self-Check

- Acceptance criteria are explicit and mapped to backend, frontend, and Nginx behavior.
- Forbidden scope is explicit in Non-Goals.
- Expected modification files are listed.
- Required tests and assertion points are listed.
- Backend, frontend, and guides specs were read before creating this PRD.
- API, DB, DTO, frontend fields, and Nginx contracts are aligned.
- No unresolved clarification is required before implementation.

