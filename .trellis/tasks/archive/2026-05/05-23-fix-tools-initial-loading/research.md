# Research: 修复 /tools 首次进入列表一直加载

## Current Project Status

- Branch: `feat/docker`
- Working directory before this planning task: clean
- No active Trellis task before creation.
- Previous completed work from `.trellis/workspace/sangui/journal-1.md`:
  - Docker uploads restore write-permission fix completed.
  - Upload tool page CSP and Docker Maven build fix completed.
  - `/tools` first-load issue was recorded as a next independent task.

## Task Classification

- Classification: Simple Task, with cross-layer/API investigation risk.
- Reasoning: The user-facing bug is specific and acceptance criteria are clear. Primary implementation should be limited to frontend `AppFull.jsx` and/or `api.js`. Backend is only diagnostic if `GET /api/games` is proven abnormal.

## Retrieval Report

- Keywords searched:
  - `tools`
  - `games`
  - `/api/games`
  - `fetchGames`
  - `loadGameList`
  - `gamesLoading`
  - `刷新列表`
  - `iframe`
  - `GamePageController`
  - `GamePageService`
  - `RETRY_NO_AUTH_ON_401_PATHS`
  - `shouldRetryNoAuthOn401`
- Candidate implementations:
  - `SanguiBlog-front/src/AppFull.jsx`: owns public `/tools` list loader, cache, loading/error/loaded state, refresh button, and game iframe rendering.
  - `SanguiBlog-front/src/api.js`: owns `fetchGames`, `fetchGameDetail`, central request/error/token handling, and public GET stale-token retry behavior.
  - `SanguiBlog-front/src/appfull/AppFullToolsEmptyState.test.js`: existing static regression test for tools empty-state/loading guard behavior.
  - `SanguiBlog-front/src/App.jsx`: route mapping for `/tools`, `/tools/:id`, `/games` redirects.
  - `SanguiBlog-front/src/pages/viewNavigation.js`: view-to-route mapping for `games` and `game`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/GamePageController.java`: backend `GET /api/games` and `GET /api/games/{id}` contract.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GamePageService.java`: backend active game list and detail service.
- Decision: modify existing implementation only.
- Duplicate risk avoided by:
  - Reusing `loadGameList`.
  - Reusing `fetchGames`.
  - Reusing/updating `AppFullToolsEmptyState.test.js` or adding a narrow adjacent static test.
  - Not creating another API facade, route, controller, or game list state owner.

## Relevant Specs

- `.trellis/spec/frontend/directory-structure.md`
  - `src/api.js` is the single frontend API facade.
  - `/tools` and `/tools/:id` are real public routes.
  - Uploaded game HTML renders through `/tools/:id` iframe from `/uploads/games/{slug}/index.html`.
- `.trellis/spec/frontend/hook-guidelines.md`
  - Loader functions should use `useCallback`.
  - Effects must depend on callbacks/guards explicitly.
  - Async effects/loaders should avoid stale state updates where route switches can race.
  - Callbacks must be declared before effects that use them.
- `.trellis/spec/frontend/state-management.md`
  - Feature-local server state belongs in component state unless needed globally.
  - URL state is owned by React Router and `viewNavigation.js`.
  - Lists should normalize server response shape defensively.
- `.trellis/spec/frontend/type-safety.md`
  - API responses should be guarded: `const data = res.data || res`.
  - Avoid blind assumptions about `res.data`.
  - Do not add direct `fetch` calls with bespoke error parsing.
- `.trellis/spec/frontend/quality-guidelines.md`
  - Regression fixes should add/update narrow static tests.
  - Run targeted static tests and `npm run build`.
- `.trellis/spec/frontend/component-guidelines.md`
  - Preserve existing UI patterns and avoid native blocking dialogs.
  - Keep UI changes scoped.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
  - Search first and modify existing paths before creating new code.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Because `api.js` and `GET /api/games` are involved, define signatures, payloads, Good/Base/Bad cases, and tests.
- `.trellis/spec/backend/directory-structure.md`
  - Backend controller/service ownership if backend inspection is required.
- `.trellis/spec/backend/error-handling.md`
  - JSON API response uses `ApiResponse<T>` and `message` for errors.
- `.trellis/spec/backend/quality-guidelines.md`
  - Backend changes, if any, require retrieve-first and targeted Maven verification.
- `.trellis/spec/backend/database-guidelines.md`
  - `GamePageService.listActive()` reads existing persisted game pages; no schema change expected.

## Code Patterns Found

- Public tools list loader:
  - `SanguiBlog-front/src/AppFull.jsx`
  - `loadGameList` is already a `useCallback`, uses a module-level `gameListCache`, coalesces in-flight requests through `gameListCache.promise`, normalizes `res?.data || res`, sorts list entries, records error, and clears loading in `finally`.
- Public tools auto-load effect:
  - `SanguiBlog-front/src/AppFull.jsx`
  - `view === 'games'` branch calls `loadGameList()` when `!gameListLoading && !gameListLoadAttempted && !gameListLoaded`.
- Refresh button reuse:
  - `SanguiBlog-front/src/AppFull.jsx`
  - The “刷新列表” button calls `loadGameList` directly.
- Existing regression test:
  - `SanguiBlog-front/src/appfull/AppFullToolsEmptyState.test.js`
  - Already asserts cache, loaded state, in-flight coalescing, explicit load guards, and loaded-empty state. It does not currently appear to assert stale-token public retry for `/games`.
- Central API public GET retry:
  - `SanguiBlog-front/src/api.js`
  - `RETRY_NO_AUTH_ON_401_PATHS` permits one no-auth retry for public GET paths after stale token 401.
  - Current whitelist includes `/site`, `/posts`, `/categories`, `/tags`, `/about`, `/comments`, but not `/games`.
- Backend public route:
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
  - `/api/games/**` is configured as `permitAll`.
- Backend API shape:
  - `GamePageController.list()` returns `ApiResponse<List<GamePageDto>>`.
  - `GamePageDto` fields: `id`, `title`, `description`, `url`, `slug`, `status`, `updatedAt`.
  - `GamePageDetailDto` fields: `id`, `title`, `description`, `url`, `slug`, `status`, `createdAt`, `updatedAt`.

## High-Probability Root Cause

The strongest code-level hypothesis is stale/invalid auth token handling for public `/api/games`:

- Browser has an old `sg_token`.
- First direct open of `/tools` calls `fetchGames()` -> `request("/games")`.
- Backend route is public, but Spring Security/JWT filter can still reject malformed/expired Authorization before the permit-all endpoint is reached.
- `api.js` clears stale token on 401, but `shouldRetryNoAuthOn401("/games")` is currently false because `/games` is not in `RETRY_NO_AUTH_ON_401_PATHS`.
- The first load fails; after token is cleared, the user clicks “刷新列表” and the second request succeeds as guest.
- This exactly matches “first entry does not show list; manual refresh shows tools.”

DeepSeek should still verify whether the observed UI is truly an infinite spinner or a failed-first-load state. If loading is actually stuck, inspect `gameListCache.promise`, `gameListCache.loading`, and state sync after rejected/never-resolving requests.

## Files Likely To Modify

- `SanguiBlog-front/src/api.js`
  - Likely add `/games` to public GET stale-token retry whitelist and/or improve tests around `fetchGames`.
- `SanguiBlog-front/src/AppFull.jsx`
  - Only if research confirms loading state/effect guard still fails independently of stale-token retry.
  - Candidate checks: first-load effect guard, cache sync, `finally` convergence, route switch behavior, refresh button disable/loading text if desired.
- `SanguiBlog-front/src/appfull/AppFullToolsEmptyState.test.js`
  - Likely update to assert `/games` is included in the public no-auth retry path, or add a narrow adjacent static test if that file's scope should remain only AppFull.
- `SanguiBlog-front/src/App.jsx`
  - Reference only; do not modify unless route mapping is proven wrong.
- `SanguiBlog-front/src/pages/viewNavigation.js`
  - Reference only; do not modify unless route switching is proven wrong.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/GamePageController.java`
  - Reference only; modify only if backend response is proven abnormal.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GamePageService.java`
  - Reference only; modify only if backend service response is proven abnormal.

## Risk / Boundary Notes

- Do not change `/api/games` response shape unless unavoidable.
- Do not change DB schema or `GamePage` entity.
- Do not change uploaded-game CSP or iframe security headers.
- Do not create another tools/game API wrapper.
- Do not bypass `api.js` from `AppFull.jsx`.
- Keep `/tools/:id` iframe behavior stable.
- If adding `/games` to no-auth retry, ensure admin `/admin/games` is not accidentally treated as public; the path check uses frontend request path such as `/games`, not `/api/games`.
- If modifying `loadGameList`, make sure error, empty, success, and coalesced in-flight request paths all call state sync after cache mutation and clear loading.
- If route switches while a request is in flight, avoid stale updates that leave a newly mounted `/tools` page reading `gameListCache.loading = true` forever.

## Required Tests

Frontend required:

- `cd SanguiBlog-front`
- `node src/appfull/AppFullToolsEmptyState.test.js`
- `node src/appfull/noNativeBlockingDialogs.test.js`
- `npm run build`

Recommended if `api.js` retry whitelist changes:

- Add/update a narrow static test proving `/games` is in the public no-auth retry allowlist and `/admin/games` is not made public by mistake.
- Run targeted eslint or `npm run lint` if practical.

Manual verification:

- Clear or set a stale/invalid `sg_token`, then open `http://localhost/tools` directly.
- Verify the list appears without clicking “刷新列表”.
- Click “刷新列表” and verify list reloads.
- Open `/tools/:id` directly and verify iframe still loads.
- Navigate `/tools/:id -> /tools` and verify list is not stuck.
- Stop or break backend temporarily if practical and verify loading stops on failure.

Backend only if changed:

- `cd SanguiBlog-server`
- `mvn -q -DskipTests compile`
- Add/run targeted controller/service tests only if backend behavior changes.

## Planning Self-Check

- Acceptance criteria明确：是，见 PRD `Acceptance Criteria`。
- 禁止修改范围明确：是，见 PRD `Explicit Non-Goals / 禁止越界`。
- 预计修改文件明确：是，本文件 `Files Likely To Modify`。
- 必跑测试明确：是，本文件 `Required Tests`。
- 已读取具体 guideline，不只是 index：是，已读取 frontend directory/quality/hook/state/type/component，backend directory/quality/error/database，guides code-reuse/cross-layer。
- 是否存在需求不清：当前不需要用户确认；实现前只需 DeepSeek 验证根因。
- API / DB / frontend DTO 字段对齐：已确认 `GET /api/games` 返回 `ApiResponse<List<GamePageDto>>`，无 DB/schema 变更预期。
