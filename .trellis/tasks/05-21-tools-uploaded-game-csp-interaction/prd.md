# Fix Tools Uploaded Game CSP Interaction

## Background

`/tools` can open uploaded standalone HTML tools, for example:

- `http://localhost/uploads/games/2048/index.html`
- `http://localhost/uploads/games/timer/index.html`

The page layout/style renders, but interaction does not work. Browser console shows CSP violations:

- `Loading the script 'https://cdn.jsdelivr.net/npm/chart.js' violates ... "script-src 'self'".`
- `Executing inline script violates ... "script-src 'self'".`

Focused inspection confirms uploaded game pages are not script-free:

- `uploads/games/2048/index.html` contains inline `<script>`, `onclick="..."`, `localStorage`, and event listeners.
- `uploads/games/timer/index.html` contains `https://cdn.jsdelivr.net/npm/chart.js`, inline `<script>`, many `onclick="..."` handlers, `localStorage`, and event listeners.

Current serving layers:

- Docker Nginx `docker/nginx/default.conf` has a special `/uploads/games/` location with CSP allowing same-origin iframe, but `script-src 'self'` still blocks inline scripts and CDN scripts.
- Spring Security `SecurityConfig` has a special `/uploads/games/**` filter chain that only changes `frame-ancestors` to `self`; it inherits `script-src 'self'`.
- Frontend `/tools` opens `game.url` in a new tab via `window.open(buildAssetUrl(game.url), ...)`, and `/tools/:id` can render the same URL in an iframe.

## Scope Classification

Simple Task.

Reason: the goal and root cause are clear, and the likely implementation is limited to static-resource CSP/header policy for `/uploads/games/**` plus narrow regression tests/docs if needed. It is still cross-layer/infra-sensitive because the same route can be served by Docker Nginx and Spring Boot static resource handling, and the page may be opened directly or embedded from `/tools/:id`.

## Goal

Allow uploaded standalone HTML tools under `/uploads/games/**` to execute their expected client-side JavaScript while preserving the existing iframe and static-resource security boundary as narrowly as practical.

## Requirements

- `/uploads/games/**` pages must be allowed to run inline scripts used by uploaded single-file tools.
- `/uploads/games/**` pages must be able to load `https://cdn.jsdelivr.net/npm/chart.js` for existing `timer/index.html`.
- `/uploads/games/**` pages must remain embeddable only by same-origin `/tools/:id` or opened directly from the same site.
- Non-game routes must keep the stricter default CSP, including `frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- Docker deployment and local Spring Boot static serving must be aligned; fixing only one serving path is insufficient.
- The frontend `/tools` list/open behavior should not be rewritten unless research proves it is directly responsible for the regression.
- Do not modify uploaded game HTML files to work around CSP unless explicitly requested later; the platform serving policy should support already-uploaded standalone HTML tools.

## Acceptance Criteria

- [ ] Direct navigation to `http://localhost/uploads/games/timer/index.html` no longer logs CSP violations for inline script execution.
- [ ] Direct navigation to `http://localhost/uploads/games/timer/index.html` no longer logs CSP violation for `https://cdn.jsdelivr.net/npm/chart.js`.
- [ ] Timer page controls respond: tab switching, start button, category/stat interactions.
- [ ] Direct navigation to `http://localhost/uploads/games/2048/index.html` no longer logs CSP violations for inline script execution.
- [ ] 2048 page controls respond: restart/undo/sound controls and keyboard/touch movement where applicable.
- [ ] `/tools` still lists active game/tool pages from `/api/games`.
- [ ] `/tools` "进入" still opens the uploaded page URL in a new tab.
- [ ] `/tools/:id` iframe still renders the uploaded page when using the detail route.
- [ ] Non-game public/API routes keep the existing default CSP and frame restrictions.
- [ ] Docker Nginx and Spring Security CSP definitions stay consistent for `/uploads/games/**`.

## Cross-Layer Contract

### 1. Scope / Trigger

The changed contract is the HTTP response headers for uploaded standalone HTML tools under `/uploads/games/**`.

This crosses layers because:

- In Docker, `/uploads/games/**` is served by Nginx from `/data/uploads/games/`.
- In local/backend serving, `/uploads/games/**` passes through Spring Security and Spring MVC static resource handlers.
- Frontend `/tools` consumes `/api/games` URLs and either opens them in a new tab or embeds them in an iframe.

### 2. Signatures

- Backend static route: `GET /uploads/games/{slug}/index.html`
- Docker static route: `location /uploads/games/` in `docker/nginx/default.conf`
- Frontend consumers:
  - `SanguiBlog-front/src/AppFull.jsx` `handleOpenGame(game)`
  - `SanguiBlog-front/src/AppFull.jsx` `renderGamePlayer()`
  - `SanguiBlog-front/src/utils/asset.js` `buildAssetUrl(path)`
- API metadata source remains unchanged:
  - `GET /api/games`
  - `GET /api/games/{id}`
  - DTO field `url`

### 3. Payloads / Headers

No JSON payload, DTO, DB schema, or request body changes are expected.

Expected response header contract for `/uploads/games/**`:

- `Content-Security-Policy` must allow:
  - same-origin resources;
  - same-origin frame embedding via `frame-ancestors 'self'`;
  - inline scripts required by existing single-file uploaded HTML tools;
  - `https://cdn.jsdelivr.net` scripts required by the existing timer tool.
- `X-Frame-Options` should remain `SAMEORIGIN` for `/uploads/games/**`.

Default non-game header contract remains:

- `Content-Security-Policy` keeps `frame-ancestors 'none'`.
- `X-Frame-Options` remains `DENY`.

### 4. Validation & Error Matrix

| Case | Expected result |
|------|-----------------|
| `/uploads/games/timer/index.html` with inline scripts | Browser executes inline script; no `script-src 'self'` inline-block CSP error |
| `/uploads/games/timer/index.html` loading Chart.js from jsDelivr | Browser loads `https://cdn.jsdelivr.net/npm/chart.js`; no CDN script CSP error |
| `/uploads/games/2048/index.html` with inline handlers | Browser executes inline script and event handlers; controls respond |
| `/tools/:id` iframe embeds `/uploads/games/**` | Same-origin iframe is allowed |
| Non-game uploaded asset `/uploads/posts/...` | Does not inherit permissive game CSP unexpectedly |
| Normal SPA/API route | Keeps default strict CSP and frame denial |
| Missing uploaded game file | Existing static 404 behavior remains; do not convert to SPA HTML fallback |

### 5. Good / Base / Bad Cases

- Good: same-origin direct open and iframe use of uploaded tools works; existing timer CDN script and inline scripts execute; other routes remain protected.
- Base: uploaded tool has no external scripts; it still works with the game CSP.
- Bad: default application CSP is loosened globally, `/uploads/posts/**` gains permissive script execution, or `/uploads/games/**` can be framed by arbitrary external origins.

### 6. Required Tests and Assertion Points

Minimum automated/static checks:

- Add/update backend test asserting `/uploads/games/**` CSP includes the intended game-specific script allowances and `frame-ancestors 'self'`.
- Add/update backend test asserting a non-game route/default CSP does not include the game-specific loosened script allowances.
- Add/update static check for `docker/nginx/default.conf` asserting `/uploads/games/` CSP is aligned with Spring Security game CSP intent.
- Run backend compile or targeted security/header test.
- Run frontend static tests only if frontend files change.

Manual/browser checks:

- Visit `http://localhost/uploads/games/timer/index.html`.
- Visit `http://localhost/uploads/games/2048/index.html`.
- Verify console is free of CSP errors mentioned in Background.
- Verify visible controls have actual effects, not only click styles.
- Verify `/tools` and `/tools/:id` still open/render the tool page.

## Relevant Specs

- `.trellis/spec/frontend/directory-structure.md`: uploaded game HTML is served from `/uploads/games/{slug}/index.html` and rendered by `/tools/:id` via iframe.
- `.trellis/spec/frontend/quality-guidelines.md`: retrieve-first workflow, small reversible changes, targeted tests/build.
- `.trellis/spec/frontend/component-guidelines.md`: active UI should avoid native dialog changes and stay within existing components.
- `.trellis/spec/frontend/hook-guidelines.md`: data loading should go through existing API paths if frontend is touched.
- `.trellis/spec/frontend/state-management.md`: `/tools` state should remain local/route-driven.
- `.trellis/spec/frontend/type-safety.md`: use `buildAssetUrl` for runtime asset URLs, avoid ad hoc URL building.
- `.trellis/spec/backend/directory-structure.md`: static upload path rules belong in centralized config, not scattered handlers.
- `.trellis/spec/backend/quality-guidelines.md`: `/uploads/games/**` is special; same-origin iframe is allowed while other routes remain strict.
- `.trellis/spec/backend/error-handling.md`: static/upload error behavior should stay stable; do not wrap static files in JSON.
- `.trellis/spec/backend/logging-guidelines.md`: no new logging expected; if added, avoid sensitive content.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: reuse existing `SecurityConfig`, Nginx route, and `buildAssetUrl` paths.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: Docker Nginx routes and `/uploads/games/` are cross-layer infra contracts.

## Code Patterns Found

Retrieval keywords:

- `uploads/games`
- `/tools`
- `Content-Security-Policy`
- `script-src`
- `frame-ancestors`
- `X-Frame-Options`
- `buildAssetUrl`
- `GamePageService`
- `iframe`
- `cdn.jsdelivr`

Candidate implementations:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`: owns default CSP and special `/uploads/games/**` security filter chain.
- `docker/nginx/default.conf`: owns Docker static serving for `/uploads/games/` and currently has separate CSP headers.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/WebConfig.java`: maps `/uploads/**` and `/avatar/**` static resources for backend serving.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GamePageService.java`: stores uploaded HTML and exposes `url` as `/uploads/games/{slug}/index.html`.
- `SanguiBlog-front/src/AppFull.jsx`: `/tools` list opens `game.url` in a new tab and `/tools/:id` embeds it in an iframe.
- `SanguiBlog-front/src/utils/asset.js`: canonical runtime asset URL builder.

Decision:

- Modify existing CSP/header definitions for the special `/uploads/games/**` boundary.
- Do not create a second static-file controller, API, route, or frontend opener.

Duplicate implementation risk:

- Avoided by keeping the existing static serving paths and game-page API unchanged.
- No new frontend URL builder or duplicate `/tools` implementation should be added.

## Files Likely To Modify

Expected implementation files:

- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
  - Add/adjust game-specific CSP directives for `/uploads/games/**`.
- `docker/nginx/default.conf`
  - Align Docker `/uploads/games/` CSP with backend game-specific policy.

Expected tests/docs if needed:

- `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/SecurityConfigTest.java` or an existing security/header test location
  - Assert game route CSP and default route CSP separation.
- `SanguiBlog-front/src/appfull/*.test.js` only if frontend behavior is changed.
- `docs/docker-deploy.md` and/or `.trellis/spec/guides/cross-layer-thinking-guide.md` only if the CSP contract is considered a lasting deployment contract.

Files not expected to modify:

- Uploaded HTML files under `uploads/games/**`.
- `GamePageService` / DTO / repository / schema unless implementation research proves the URL itself is wrong.
- `SanguiBlog-front/src/AppFull.jsx` unless the open/iframe flow is proven to be part of the bug.
- DB schema files.
- AI assistant, posts, auth, upload limits, or unrelated admin UI.

## Required Verification Commands

Backend:

```powershell
cd SanguiBlog-server
mvn -q -DskipTests compile
mvn -q "-Dtest=<targeted-security-or-header-test>" test
```

Docker/static config:

```powershell
docker compose config
```

Frontend, only if frontend files change:

```powershell
cd SanguiBlog-front
node src/appfull/AppFullToolsEmptyState.test.js
node src/appfull/AdminPanelGameListScope.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

Manual browser checks:

```text
http://localhost/uploads/games/timer/index.html
http://localhost/uploads/games/2048/index.html
http://localhost/tools
http://localhost/tools/<id>
```

## Planning Self-Check

- Acceptance criteria defined: yes.
- Forbidden modification range defined: yes.
- Expected files to modify listed: yes.
- Required tests listed: yes.
- Specific guideline files read, not only indexes: yes.
- User clarification needed before implementation: no, root cause is confirmed by CSP console errors.
- API / DB / frontend types / DTO alignment: no DTO/DB/API payload change expected.
