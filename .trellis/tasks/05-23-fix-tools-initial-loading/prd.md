# 修复 /tools 首次进入列表一直加载

## 背景

上一轮上传工具页 CSP 与 Docker 构建修复已完成并记录在 `.trellis/workspace/sangui/journal-1.md`。当前遗留问题是首次进入 `http://localhost/tools` 时工具列表一直显示加载动画，必须点击“刷新列表”后才显示。该现象说明 `/tools` 首次加载的数据请求、loading 状态收敛、错误兜底或 effect 触发条件中存在缺陷。

该任务与上传 HTML CSP 修复属于同一用户路径，但不是同一问题。本任务应独立处理。

## 范围判断

- 类型：Simple Task，带跨层/API 排查风险。
- 主要范围：Frontend bugfix。
- 后端范围：仅当确认 `GET /api/games` 首次响应异常、响应 shape 不稳定或接口状态码异常时，才检查 `GamePageController` / `GamePageService`。不预设后端改动。

## Goal

首次打开 `/tools` 时自动拉取并显示工具列表，不需要用户点击“刷新列表”。loading 状态必须在成功、空列表、失败三种路径下稳定收敛；刷新按钮继续复用同一加载函数；`/tools/:id` iframe 行为保持不回退。

## Requirements

- `/tools` 首次进入时必须自动触发工具列表加载。
- 首次加载与“刷新列表”按钮必须复用同一个加载函数，避免出现两套列表请求逻辑。
- games/tools loading 状态必须在 `finally` 或等价保护下收敛。
- 成功响应必须渲染列表。
- 空列表响应必须停止 loading 并显示既有空状态或合理空状态。
- 失败响应必须停止 loading 并显示既有错误兜底或可刷新状态，不允许无限 spinner。
- 路由从 `/tools/:id` 回到 `/tools` 时，列表页应能使用已有列表或重新加载，但不应卡 loading。
- 路由从 `/tools` 进入 `/tools/:id` 时，iframe 加载和已上传 game/tool 页面展示行为不能回退。
- API 调用必须继续通过 `SanguiBlog-front/src/api.js`，不得在组件中新增绕过 `api.js` 的 direct fetch。

## Explicit Non-Goals / 禁止越界

- 不修改上传 HTML CSP、安全头、Nginx CSP、Docker Maven 构建或 uploads 权限逻辑。
- 不新增第二套 games/tools API wrapper。
- 不新增后端 endpoint，不改变 `GET /api/games` 的 path/method/status/DTO 字段，除非研究证明当前后端首次响应本身错误且必须修复。
- 不改数据库 schema、实体字段、迁移 SQL。
- 不重构 `AppFull.jsx` 大型结构，不做视觉重设计。
- 不改变 `/tools/:id` iframe 的 URL 生成、CSP 假设或 frame 行为。

## Acceptance Criteria

- [ ] 首次打开 `http://localhost/tools` 能自动显示工具列表。
- [ ] 不需要点击“刷新列表”。
- [ ] 成功响应后 loading 关闭。
- [ ] 空列表响应后 loading 关闭，并显示空状态。
- [ ] 失败响应后 loading 关闭，并显示错误/刷新兜底。
- [ ] 点击“刷新列表”仍会重新拉取列表并正确收敛 loading。
- [ ] `/tools` 与 `/tools/:id` 路由切换不会导致列表页无限 loading。
- [ ] `/tools/:id` iframe 行为保持现状，不回退。
- [ ] 没有新增 direct fetch 或第二套 API wrapper。
- [ ] 通过必跑前端测试与 build。

## Cross-Layer Contract

### 1. Scope / Trigger

本任务主要修复 frontend 首次列表加载行为。因为涉及 `SanguiBlog-front/src/api.js` 的 `GET /api/games` 封装和前端消费，因此按跨层合同记录接口形状。默认不改变后端合同。

### 2. Signatures

- Backend: `GET /api/games`
- Frontend API facade: `SanguiBlog-front/src/api.js` 中现有 games/tools 列表请求函数
- Frontend consumer: `SanguiBlog-front/src/AppFull.jsx` 中 `/tools` 列表加载、刷新按钮和 `/tools/:id` 路由相关逻辑
- DB: 无 schema 变更
- Env/config: 无 env/config 变更

### 3. Payloads

Request:

- Method: `GET`
- Path: `/api/games`
- Query: 保持现有实现，不新增 required query 参数
- Auth: 保持现有 `api.js` 行为；公共读取不应依赖手写 token 逻辑

Expected Response:

```json
{
  "success": true,
  "message": "ok",
  "data": [
    {
      "id": 1,
      "title": "Tool name",
      "slug": "tool-slug",
      "url": "/uploads/games/tool-slug/index.html"
    }
  ]
}
```

Notes:

- 字段示例以现有代码/后端 DTO 为准，实施前必须确认真实 `GamePage` DTO 字段。
- Frontend 必须兼容 `res.data` 包装和直接数组两种形态：`const data = res.data || res; const list = Array.isArray(data) ? data : [];`
- 若后端实际返回分页结构或不同字段，不得猜测，应先读取 `GamePageController` / `GamePageService` / DTO 并对齐现有消费。

### 4. Validation & Error Matrix

| Case | API result | Frontend expected result |
|------|------------|--------------------------|
| Successful list | HTTP 200, list in `data` or direct array | Store normalized array, render list, set loading false, clear stale error |
| Empty list | HTTP 200, `data: []` or direct `[]` | Store `[]`, render empty state, set loading false |
| API failure | non-2xx or `api.js` throws normalized error | Store/readable error state, set loading false, keep refresh button usable |
| Malformed payload | HTTP 200 but payload not array after normalization | Treat as empty list or readable error per existing pattern, set loading false |
| Stale route response | User navigates before request resolves | Do not set state on stale/unmounted route if current code pattern supports cancellation |
| `/tools/:id` direct open | Tool iframe route loads according to existing behavior | Do not force list page fallback or break iframe |

### 5. Good / Base / Bad Cases

- Good: Open `/tools` with existing tools in DB; first render shows loading briefly, then list appears automatically.
- Base: Open `/tools` when no tools exist; loading stops and empty state appears.
- Bad: `GET /api/games` fails or returns unexpected payload; loading stops and refresh/error fallback appears. The user can click refresh and retry.

### 6. Required Tests and Assertion Points

Frontend:

- Add or update a narrow static regression test if there is an existing pattern suitable for `AppFull.jsx`/tools route loading. The test should assert initial load invokes the same loader used by refresh and that failure path clears loading. If direct static testing of `AppFull.jsx` is impractical, document why and add the smallest helper-level test if logic is extracted.
- Run `node src/appfull/noNativeBlockingDialogs.test.js`.
- Run `npm run build`.
- Run targeted eslint/build if files changed and lint is available: `npm run lint` or a targeted eslint command.

Manual/browser verification:

- Start frontend/backend as appropriate.
- Visit `http://localhost/tools` directly in a fresh tab; verify list appears without clicking refresh.
- Click “刷新列表”; verify it re-fetches and does not stick loading.
- Visit `http://localhost/tools/{id-or-slug}`; verify iframe still loads.
- Navigate `/tools/:id -> /tools`; verify list page is not stuck.
- Simulate or observe failure path if practical; verify loading stops.

Backend only if changed:

- `cd SanguiBlog-server`
- `mvn -q -DskipTests compile`
- Add/run targeted `GamePageController` or `GamePageService` test only if backend behavior changes.

## Research Keywords

- `games`
- `tools`
- `/api/games`
- `fetchGames`
- `loadGames`
- `gamesLoading`
- `refresh`
- `iframe`
- `GamePageController`
- `GamePageService`

## Implementation Notes for DeepSeek

- Start by reading `SanguiBlog-front/src/AppFull.jsx` and `SanguiBlog-front/src/api.js`.
- Identify whether initial `useEffect` is missing, has wrong dependencies, calls a callback before declaration, is gated by route state incorrectly, or leaves loading true on error.
- Prefer modifying the existing list loader rather than adding a new one.
- Ensure loader is declared before any effect that depends on it.
- Use a cancellation flag or stale-request guard if the loader updates state across route transitions.
- Normalize API response defensively before setting list state.
- Keep `/tools/:id` iframe logic untouched unless the route switch bug requires a minimal guard.
