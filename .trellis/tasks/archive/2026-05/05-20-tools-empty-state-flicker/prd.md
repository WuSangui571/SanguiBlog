# 工具页面空状态闪烁

## Goal

修复 `http://localhost/tools` 在默认没有已发布独立页面时的闪烁、持续重载和间歇提示问题。`/tools` 返回空列表是合法空状态，前端应稳定渲染页面内空状态，不应把空数组误判为加载未完成、错误或需要反复刷新。

## Task Scope Classification

- Type: Complex Task
- Reason: 涉及前端路由、API 响应归一化、loading/loaded-empty/error 状态分离、effect 依赖、提示行为和回归测试策略。
- Execution split: 本轮 Codex 只负责 PRD、计划、Trellis task/context、spec 读取、代码研究和测试计划；业务代码由 DeepSeek 端执行。

## Current Project State

- Branch: `feat/docker`
- Working tree at session start: clean
- No active Trellis task before this task.
- Previous journal entries indicate Docker Compose deployment and Docker AI chat missing-table diagnosis were completed and recorded.

## Requirements

- `/tools` 初次进入时只发起一次必要的独立页面列表加载，不因 `data: []` 进入重复加载循环。
- 明确区分以下状态：
  - `loading`: 首次请求或用户主动刷新正在进行。
  - `loaded-empty`: 请求成功且列表为空。
  - `error`: 请求失败或响应结构不可用。
- 空列表只渲染稳定页面内空状态文案，例如“还没有发布的独立页面，敬请期待。”。
- 空状态不得触发 toast、弹窗、自动重试、持续 skeleton 闪屏、路由跳转或重复 page view。
- 手动点击“刷新列表”仍可重新请求，并在请求期间显示 loading。
- 保持 `/games` 到 `/tools` 的兼容 redirect，不修改 public route contract。
- 保持工具详情 `/tools/:id` 的现有行为，不扩大到 iframe/player 重构。
- 添加或更新一个窄前端静态测试，覆盖 `/tools` 空列表“已加载为空”不会因 `gameList.length === 0` 继续自动拉取的合同。

## Non-Goals / Forbidden Scope

- 不修改后端 `GamePageController`、`GamePageService`、DTO、repository 或 SQL schema，除非实施时发现本 PRD 的接口合同与实际接口不一致且先回报。
- 不新增 `/api/tools` 或第二套 API wrapper。
- 不重命名 `games`/`tools` 的现有兼容路由和函数，避免扩大迁移范围。
- 不改 admin 独立页面上传/管理功能。
- 不改 sitemap、Docker、AI assistant、文章列表、归档或全局 toast 系统。
- 不做视觉大改；空状态可以在现有 `home-ios-card` / `home-ios-inner-card` 语言内微调。

## Existing Contract

### API / Command / Payload Fields

- Backend public list endpoint: `GET /api/games`
- Frontend API facade: `fetchGames()` in `SanguiBlog-front/src/api.js`, internally `request("/games")`
- Success response:

```json
{
  "success": true,
  "message": "ok",
  "data": []
}
```

- `data` item shape for non-empty cases:
  - `id: number`
  - `title: string`
  - `description: string | null`
  - `url: string | null`
  - `slug: string | null`
  - `status: string | null`
  - `updatedAt: string | null`
- DB/schema: no change expected. Existing source is `game_pages` through `GamePageRepository.findAllByStatusOrderBySortOrderDescUpdatedAtDesc(ACTIVE)`.
- Env/config/storage: no change expected.

### Validation / Error Matrix

| Case | Input / Backend result | Expected frontend behavior |
| --- | --- | --- |
| Good | `GET /api/games` returns one or more ACTIVE items | Render cards, no empty message, no repeated auto-load. |
| Base | `GET /api/games` returns `success=true`, `data=[]` | Render stable empty state once loading completes; no loop, no toast, no skeleton flicker. |
| Bad | Request rejects or backend returns non-OK response | Set `gameListError`; render inline error state; do not silently convert to empty. |
| Bad shape | Response has missing/invalid `data` | Normalize defensively to `[]` only for success-compatible shapes; avoid throwing during render. |
| Manual refresh | User clicks “刷新列表” while empty | Trigger one explicit reload, show loading during request, settle back to loaded-empty if still empty. |

### Good / Base / Bad Cases

- Good: Published tool pages exist; `/tools` loads once and displays sorted cards.
- Base: No ACTIVE pages exist; `/tools` displays the stable empty text without repeated network requests or repeated transient prompt.
- Bad: `/api/games` fails; `/tools` shows inline error and lets user manually retry.

## Acceptance Criteria

- [ ] Visiting `/tools` with `GET /api/games` returning `data: []` does not continuously call `fetchGames()`.
- [ ] The loading skeleton appears only for the actual loading period, not in a repeating cycle after an empty success.
- [ ] The empty text is rendered in-page and remains stable after refresh.
- [ ] No repeated toast/popup is triggered by the empty list path.
- [ ] Manual “刷新列表” still works.
- [ ] Existing `/tools/:id`, `/games`, and `/games/:id` compatibility routes remain intact.
- [ ] A focused static test documents the empty-loaded guard.
- [ ] Required frontend checks pass.

## Implementation Plan For DeepSeek

1. In `SanguiBlog-front/src/AppFull.jsx`, add explicit list-load completion state for tools, for example `gameListLoaded` or an equivalent status enum.
2. Set the completion state only after `fetchGames()` succeeds; keep errors distinct from empty success.
3. Change the `/tools` auto-load effect from `gameList.length === 0` to a loaded/status guard, so empty success is not treated as “not loaded”.
4. Keep manual refresh able to call `loadGameList()` regardless of loaded state.
5. Keep empty state as page content. Do not turn it into `GlassPopupToast`.
6. Add a static regression test such as `SanguiBlog-front/src/appfull/AppFullToolsEmptyState.test.js` that asserts:
   - tools state has a loaded/status guard;
   - the `view === 'games'` effect uses that guard instead of only `gameList.length === 0`;
   - the empty text remains in render;
   - no empty-state path opens `GlassPopupToast` or similar transient prompt.

## Expected Files To Modify

- `SanguiBlog-front/src/AppFull.jsx`: tools list loading/loaded-empty/error state fix.
- `SanguiBlog-front/src/appfull/AppFullToolsEmptyState.test.js`: new focused static regression test.

## Required Tests

Run from `SanguiBlog-front`:

```bash
node src/appfull/AppFullToolsEmptyState.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

Recommended manual verification if frontend/backend are running:

```bash
curl http://localhost/api/games
```

Then open `http://localhost/tools`, refresh once, and verify no repeated loading flash, no repeated toast, and no continuous `/api/games` calls in Network.

## Retrieval Report

- Keywords searched:
  - `tools`, `games`, `fetchGames`, `fetchGameDetail`, `GamePage`, `独立页面`, `还没有发布的独立页面`, `GlassPopupToast`, `toast`
- Candidate implementations:
  - `SanguiBlog-front/src/App.jsx`: real `/tools`, `/tools/:id`, `/games` compatibility routes.
  - `SanguiBlog-front/src/pages/Games.jsx`: `/tools` page shell passes `initialView="games"` into `AppFull`.
  - `SanguiBlog-front/src/AppFull.jsx`: owns `gameList`, `gameListLoading`, `gameListError`, `loadGameList()`, `/tools` auto-load effect, and empty UI.
  - `SanguiBlog-front/src/api.js`: existing `fetchGames()` / `fetchGameDetail()` API facade.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/GamePageController.java`: public backend list/detail endpoints.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/GamePageService.java`: active page list and DTO mapping.
- Decision: modify existing frontend owner `AppFull.jsx`; add one focused test. Do not create a new route, new API wrapper, or backend endpoint.
- Duplicate risk: low if the implementation keeps using `fetchGames()` and existing `/tools` route, and only adds an explicit loaded/status guard around the current state.
