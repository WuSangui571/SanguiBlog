# 超级管理员可配置首页微信二维码

## Task Classification

Complex Task.

Reason: this feature crosses backend API, authorization, upload/storage, existing user profile data, `/api/site/meta`, frontend public home rendering, and `/admin/profile` UI. Codex planning pass must not modify business implementation files.

## Current Project Status

- Branch: `feat/docker`.
- Working tree was clean before this task was created.
- No active/current Trellis task existed before this task.
- Recent recorded work in `.trellis/workspace/sangui/journal-1.md`:
  - Docker public page BotGuard false-positive fix completed and committed.
  - V2.3.0 Docker deployment documentation update completed and committed.

## Goal

Allow only SUPER_ADMIN to configure the WeChat QR image shown on the public home author card. The home page should display the configured image when valid, show no broken image when absent/failed, and allow SUPER_ADMIN to upload/replace/delete the QR from `/admin/profile`.

## Non-Goals / Forbidden Scope

- Do not add a new parallel site configuration system.
- Do not add a new DB field/table for the QR unless research proves existing `users.wechat_qr_url` cannot satisfy the contract.
- Do not replace the existing `StoragePathResolver`, upload path handling, `buildAssetUrl`, `api.js`, `useBlogData`, or admin shell.
- Do not redesign the home page, admin navigation, or profile page outside the QR module.
- Do not change AI assistant, BotGuard scoring, Docker compose, Nginx routes, sitemap, analytics, posts, comments, or unrelated permissions.
- Do not expose QR write capability to ADMIN/USER, even if they can update their own profile.
- Do not delete or move the existing `SanguiBlog-front/public/contact/wechat.jpg` fallback during this task.

## Data Ownership Decision

Use the existing super-admin user profile field as the source of truth:

- DB: `users.wechat_qr_url` already exists in `sanguiblog_db.sql`.
- Entity: `User.wechatQrUrl` already exists.
- DTO: `UserProfileDto.wechatQr` already exists.
- Public meta: `SiteService.meta()` already selects a SUPER_ADMIN author and returns `author = authService.toProfile(author)`.

This makes the QR part of the public author/profile data already consumed by home/sidebar UI, while keeping it maintained only by SUPER_ADMIN. No `site_settings` key or new table should be introduced for this task.

## Requirements

- Locate and remove/replace the current hardcoded public QR path `/contact/wechat.jpg` in the active home/article-list author card.
- Public home author card uses `meta.author.wechatQr` first, normalized through `buildAssetUrl`.
- Backward compatibility: if no DB-configured QR exists, the public home should default to the legacy path `/contact/wechat.jpg` when that file is available. Current repository state includes `SanguiBlog-front/public/contact/wechat.jpg`; keep it usable as the initial fallback.
- If `meta.author.wechatQr` is blank/null/missing, render an empty state text such as `超级管理员暂未设置微信二维码` instead of an `<img>` with a bad `src`.
- If image loading fails, hide the broken image and show the same empty/failure-safe state.
- SUPER_ADMIN sees a WeChat QR management block inside `/admin/profile`.
- ADMIN/USER do not see the QR management block.
- Backend rejects QR upload/replace/delete for non-SUPER_ADMIN.
- Backend must also prevent non-SUPER_ADMIN from changing `wechatQrUrl` through the existing generic profile update payload.
- QR upload/replace/delete reuses `StoragePathResolver` and existing `/uploads/...` static serving semantics.
- Docker deployments must keep uploaded QR accessible under `/uploads/...` using the existing uploaded-assets rules and `buildAssetUrl`.

## Cross-Layer Contract

### 1. Scope / Trigger

This changes a public author image field and an admin-only upload mutation:

```text
/admin/profile UI -> src/api.js admin QR upload/delete functions
    -> backend admin controller/service with @PreAuthorize("hasRole('SUPER_ADMIN')")
    -> StoragePathResolver + users.wechat_qr_url
    -> /api/site/meta author.wechatQr
    -> useBlogData meta cache -> ArticleList author QR rendering
```

### 2. Signatures

Recommended backend API paths:

- `GET /api/site/meta`
  - Existing public endpoint.
  - Response should continue returning `data.author.wechatQr`.
  - No new endpoint is needed for public home reads unless implementation discovers `SiteService.meta()` cannot provide the field.
- `POST /api/admin/site/wechat-qr`
  - Consumes `multipart/form-data`.
  - Field: `file`.
  - Authorization: `@PreAuthorize("hasRole('SUPER_ADMIN')")`.
  - Stores image under existing storage root, recommended relative path: `uploads/site/wechat/{uuid}.{ext}`.
  - Updates the selected SUPER_ADMIN user `wechat_qr_url`.
- `DELETE /api/admin/site/wechat-qr`
  - Authorization: `@PreAuthorize("hasRole('SUPER_ADMIN')")`.
  - Clears selected SUPER_ADMIN user `wechat_qr_url`.
  - Deletes the local QR file if it is an owned local upload under the configured storage root; ignore external/legacy URLs.

Recommended response DTO:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "url": "/uploads/site/wechat/<uuid>.png"
  }
}
```

Existing profile endpoint hardening:

- `PUT /api/users/me`
  - Existing payload field `wechatQrUrl`.
  - If `wechatQrUrl` is present and current user is not SUPER_ADMIN, reject with 403 (`SecurityException`) or equivalent Spring Security response through `GlobalExceptionHandler`.
  - Prefer not to use this generic endpoint for the QR upload UI; use the dedicated admin endpoint above.

Frontend API:

- `adminUploadWechatQr(file)` -> `POST /api/admin/site/wechat-qr` multipart.
- `adminDeleteWechatQr()` -> `DELETE /api/admin/site/wechat-qr`.
- Public consumer continues using `fetchSiteMeta()` -> `meta.author.wechatQr`.
- Admin profile should update local preview and trigger `loadMeta`/`onProfileChanged` style refresh if available, or at minimum update after page refresh.

DB:

- Expected no schema change.
- Existing column: `users.wechat_qr_url VARCHAR(512) NULL`.
- If implementation proves the existing column is missing in a deployment/test entity mismatch, align `User`, DTO mapping, and `sanguiblog_db.sql` together.

Env/config:

- No new env key.
- Existing `storage.base-path` and `site.asset-base-url`/`assetBaseUrl` behavior remain authoritative.

### 3. Payload Fields

Public `GET /api/site/meta` response:

- `data.author.wechatQr`: `string | null`; may be absolute URL, `/uploads/...`, or legacy `/contact/...`.
- `data.assetBaseUrl`: unchanged; frontend `buildAssetUrl(author.wechatQr)` resolves final URL.
- Frontend fallback: when `data.author.wechatQr` is absent, attempt `/contact/wechat.jpg` as the legacy default image. If that image fails to load, show the empty-state text.

Admin upload form:

- `file`: image `MultipartFile`.

Admin upload/delete response:

- `url`: `string | null`; uploaded local URL on upload, null/absent after delete.

### 4. Validation / Error Matrix

| Case | Backend Expected Result | Frontend Expected Result |
|------|--------------------------|--------------------------|
| SUPER_ADMIN uploads png/jpg/jpeg/webp/gif/avif within size limit | 200 `ApiResponse.ok({url})`, user `wechat_qr_url` updated | Preview updates, profile shows success, home uses new QR after meta refresh or page refresh |
| SUPER_ADMIN replaces QR | 200, new URL saved, old owned local QR file deleted or safely ignored if not owned/local | New preview replaces old preview |
| SUPER_ADMIN deletes QR | 200, `wechat_qr_url = null`, owned local file deleted or safely ignored | Preview clears, home shows empty state |
| ADMIN/USER calls upload/delete | 403 | Error notice; module not visible in UI |
| ADMIN/USER sends `wechatQrUrl` to `PUT /api/users/me` | 403 or rejected by service | No QR mutation |
| Missing file | 400 via `IllegalArgumentException` | Error notice |
| Empty file | 400 | Error notice |
| Unsupported extension/content type | 400 | Error notice |
| File too large | 400/413 depending layer | Error notice |
| No SUPER_ADMIN user can be resolved | 404 or 400 with sanitized message | Error notice; no partial file reference saved |
| Public meta has null/blank QR and `/contact/wechat.jpg` exists | 200 meta, `wechatQr` null/blank | Home shows legacy `/contact/wechat.jpg` |
| Public meta has null/blank QR and `/contact/wechat.jpg` fails | 200 meta, `wechatQr` null/blank | Home shows `超级管理员暂未设置微信二维码`, no broken image |
| Public image URL 404/fails loading | Static request fails independently | Home hides broken image and shows safe state |

### 5. Good / Base / Bad Cases

- Good: SUPER_ADMIN uploads a QR image, `/api/site/meta.data.author.wechatQr` returns `/uploads/site/wechat/...`, the home author card shows the QR, and Docker same-origin asset resolution works.
- Base: No DB QR configured; public home renders legacy `/contact/wechat.jpg` if available, otherwise renders empty-state text and no broken image.
- Bad: ADMIN/USER attempts upload/delete or generic profile `wechatQrUrl` mutation; backend rejects and frontend never shows the module.

### 6. Required Tests And Assertion Points

Backend:

- Add/update authorization tests:
  - QR upload/delete controller methods have `@PreAuthorize("hasRole('SUPER_ADMIN')")`.
  - Existing `/api/users/me` cannot be used by non-SUPER_ADMIN to change `wechatQrUrl`.
- Add/update service tests:
  - SUPER_ADMIN upload stores file under storage root and saves `/uploads/site/wechat/...`.
  - Replace clears/deletes previous owned local upload safely.
  - Delete sets `wechatQrUrl` null and ignores external URL deletion.
  - Unsupported type/too-large/missing file throws `IllegalArgumentException`.
- Existing compile:
  - `cd SanguiBlog-server; mvn -q -DskipTests compile`.
- Targeted tests:
  - `cd SanguiBlog-server; mvn -q "-Dtest=AuthServiceTest,UploadControllerAuthorizationTest,StoragePathResolverTest" test`.
  - Add the new service/controller test class to this command once named.

Frontend:

- Add/update static tests:
  - Home/ArticleList no longer hardcodes `/contact/wechat.jpg` for active QR rendering.
  - Home/ArticleList uses `author.wechatQr` with `buildAssetUrl`.
  - Home/ArticleList uses `/contact/wechat.jpg` only as a legacy fallback when `author.wechatQr` is missing.
  - Home/ArticleList has load-error/empty-state fallback and no unconditional broken QR `<img>`.
  - `/admin/profile` QR management block is gated by `currentUser.role === "SUPER_ADMIN"`.
  - No native `alert`/`confirm` introduced.
- Existing checks:
  - `cd SanguiBlog-front; node src/appfull/noNativeBlockingDialogs.test.js`.
  - `cd SanguiBlog-front; node src/appfull/public/HomeViewDeferredArticles.test.js` if unchanged but home/public code touched.
  - Add new static test command once created.
  - `cd SanguiBlog-front; npm run build`.

Cross-layer / final:

- `git diff --check`.
- Manual browser check if feasible after DeepSeek implementation:
  - SUPER_ADMIN upload/replace/delete in `/admin/profile`.
  - Normal admin/user profile page hides QR module.
  - Home page with configured QR, deleted QR, and broken URL cases.
  - Docker or same-origin upload URL resolves through `/uploads/...`.

## Retrieval Report

Keywords searched:

- `微信|wechat|WeChat|wx|二维码|qrcode|qr-code|qrCode|weixin`
- `github|GitHub|profile|Profile|site_settings|SiteMeta|SiteService|HomeBackground|homeBackground|assetBaseUrl|footer|stats`
- `UploadController|PostAssetService|AvatarStorageService|StoragePathResolver|MultipartFile|/uploads|avatar|cover|covers|posts`
- `Site|Profile|Upload|Storage|Home|AdminPanel|api|useBlogData|Permission|Security|User|Setting|Background`

Candidate implementations:

- `sanguiblog_db.sql`: `users.wechat_qr_url` already exists and seed data currently has a QR URL.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/User.java`: existing `wechatQrUrl` field.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/UserProfileDto.java`: existing public `wechatQr` field.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AuthService.java`: maps `User.wechatQrUrl` into `UserProfileDto.wechatQr`; generic profile update currently accepts `wechatQrUrl`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`: `meta()` selects SUPER_ADMIN author and exposes `authService.toProfile(author)`.
- `SanguiBlog-front/src/hooks/useBlogData.jsx`: public `fetchSiteMeta()` cache and `assetBaseUrl` application.
- `SanguiBlog-front/src/appfull/public/ArticleList.jsx`: active hardcoded QR source `buildMediaUrl("/contact/wechat.jpg")`.
- `SanguiBlog-front/src/appfull/shared.js`: mock fallback includes `MOCK_USER.social.wechatQr = "/contact/wechat.jpg"`.
- `SanguiBlog-front/public/contact/wechat.jpg`: existing legacy QR image exists and must remain usable as fallback.
- `SanguiBlog-front/public/static/contact/README.md`: mentions placing `wechat.jpg` under `public/static/contact`, but the active existing file is under `public/contact/wechat.jpg`; do not rely on README path without verifying runtime route.
- `SanguiBlog-front/src/pages/admin/Profile.jsx`: current active `/admin/profile` implementation; handles avatar upload and profile save but not QR module.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`: existing multipart image validation and upload patterns.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/HomeBackgroundAdminService.java`: existing admin image upload/list/delete pattern under storage root.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`: storage root/path traversal guard and Docker upload path ownership.
- `SanguiBlog-front/src/api.js`: single API facade and existing `authFormRequest` helper for admin multipart upload.
- `SanguiBlog-front/src/utils/asset.js`: `buildAssetUrl` must be reused for `/uploads/...` and Docker asset-base handling.
- `SanguiBlog-front/src/appfull/AdminPanel.jsx`: profile route and tab permission/role gating patterns.

Decision:

- Modify existing profile/site-meta/upload paths.
- Reuse existing `users.wechat_qr_url` and `SiteService.meta().author.wechatQr`.
- Add only the minimal dedicated SUPER_ADMIN admin QR mutation endpoint/service if needed for upload/delete; do not add a new site settings table/key.

Duplicate risk:

- Avoids a second public site-meta endpoint by using existing `/api/site/meta`.
- Avoids a second storage mechanism by using `StoragePathResolver` and `/uploads/...`.
- Avoids a parallel profile model by reusing `User.wechatQrUrl` and `UserProfileDto.wechatQr`.

## Files Likely To Modify

Backend likely:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/SiteController.java` or new narrowly scoped admin controller under existing admin/site area for QR upload/delete.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java` or a narrowly scoped service that reuses `UserRepository` + `StoragePathResolver`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AuthService.java` to harden generic profile `wechatQrUrl` mutation for non-SUPER_ADMIN and ensure URL normalization if needed.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteWechatQrDto.java` if a small response DTO is preferred over a raw map.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AuthServiceTest.java`.
- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/UploadControllerAuthorizationTest.java` or a new admin QR authorization test.
- New backend test class for QR upload/delete service.

Frontend likely:

- `SanguiBlog-front/src/api.js` for `adminUploadWechatQr` and `adminDeleteWechatQr`.
- `SanguiBlog-front/src/pages/admin/Profile.jsx` for the SUPER_ADMIN-only QR management module.
- `SanguiBlog-front/src/appfull/public/ArticleList.jsx` for public QR display/empty state/load failure.
- `SanguiBlog-front/src/appfull/shared.js` only if fallback mock needs to stop driving the active QR path.
- New or updated static tests under `SanguiBlog-front/src/appfull/public/` and/or `SanguiBlog-front/src/appfull/`.

Likely no change:

- `sanguiblog_db.sql`, unless implementation finds the existing `wechat_qr_url` schema is not aligned.
- Docker/Nginx config, because `/uploads/**` is already served and covered by existing asset rules.

## Implementation Plan For DeepSeek

1. Confirm existing `users.wechat_qr_url` is present and do not add schema unless a mismatch appears.
2. Implement a minimal SUPER_ADMIN-only backend QR upload/delete path using `StoragePathResolver`.
3. Reuse existing image validation rules from `HomeBackgroundAdminService`/`UploadController`, with a reasonable QR size cap; record the cap in code/tests.
4. Harden `AuthService.updateProfile` so non-SUPER_ADMIN cannot mutate `wechatQrUrl` through `/api/users/me`.
5. Add backend tests for authorization, storage path/save/delete behavior, validation, and non-super-admin rejection.
6. Add `api.js` multipart/delete functions through existing request/auth helpers.
7. Update `/admin/profile` with a SUPER_ADMIN-only QR block: preview, upload/replace, delete, status/error display, no native dialogs.
8. Update the home author card to use `displayAuthor.wechatQr` first, then legacy `/contact/wechat.jpg` as fallback, then empty-state text on load failure; remove `/contact/wechat.jpg` as the unconditional active source.
9. Add frontend static tests for the new contract.
10. Run targeted backend/frontend tests and build commands listed above.

## Open Questions

No user-blocking question identified. The existing schema already models this as a user/profile field, so the plan treats the QR as public SUPER_ADMIN author profile data surfaced through site meta rather than a separate `site_settings` value.
