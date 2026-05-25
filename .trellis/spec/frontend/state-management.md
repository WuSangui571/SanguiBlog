# Frontend State Management

> SanguiBlog does not use Redux, Zustand, React Query, or SWR. State is managed with React local state, Context, URL routes, and small storage caches.

---

## Scope / Trigger

Use this spec when changing global state, server data loading, URL/view state, AI assistant state, admin state, local/session storage, or cached site meta.

---

## State Categories

| Category | Owner | Examples |
|----------|-------|----------|
| Global site state | `useBlogData.jsx` | user, meta, posts page, categories, tags, article, comments, about |
| Permission state | `contexts/PermissionContext.jsx` | current user's permission matrix/flags |
| Layout offsets | `contexts/LayoutOffsetContext.jsx` | header height for floating UI and scroll offsets |
| Feature local state | Component or feature helper | admin forms, AI panel state, archive loaded months |
| URL state | React Router + `viewNavigation.js` | current route/view/article id |
| Browser storage | `localStorage` / `sessionStorage` | `sg_token`, cached site meta, AI welcome intro session flag, SPA referrer handoff |
| Server state cache | Simple in-memory/component state | no React Query cache layer |

---

## When to Use Global State

Use `useBlog` when state is needed by multiple public views or the app shell:

- current user/auth,
- site meta/config/footer/home background/AI settings,
- categories/tags,
- post list and detail,
- comments/recent comments,
- about page.

Keep state local when only one panel/view needs it:

- AI assistant open/history/floating/session draft state,
- admin filters and modals,
- archive month cache,
- article share/copy toast state,
- upload progress state.

---

## Server State Contracts

All API calls should go through `src/api.js`. Response normalization generally follows:

```js
const res = await fetchSomething();
const data = res.data || res;
```

For lists:

```js
const list = Array.isArray(data) ? data : [];
```

For paginated data:

```js
{
  records: Array.isArray(data?.records) ? data.records : [],
  total: typeof data?.total === 'number' ? data.total : 0,
  page: typeof data?.page === 'number' ? data.page : page,
  size: typeof data?.size === 'number' ? data.size : size,
}
```

Do not assume backend `data` is always present; `ApiResponse` can be absent in direct file/text endpoints or error cases.

---

## Site Meta Cache

`useBlogData.jsx` caches site meta in `sessionStorage` under `sg_site_meta_cache`.

When backend `/api/site/meta` changes:

- Update `SiteMetaDto`.
- Update `SiteService.meta()`.
- Update `fetchSiteMeta` consumers.
- Ensure cached meta still has safe defaults.
- If asset origin changes, keep `window.__SG_ASSET_ORIGIN__` in sync.

---

## AI Assistant State

AI assistant state is intentionally local to `AiAssistantWidget.jsx` and helpers:

- `isOpen`
- draft and sending state
- sessions and messages
- active session id
- history popover open/locked state
- floating mode position/size
- guard captcha prompt
- local assistant notices

Rules:

- Guest mode does not fetch logged-in session history.
- Logged-in to guest transition clears all AI local state.
- Blank new chat is the default; no automatic last-session restore.
- Guest sessions reuse returned `sessionId` only within the current temporary conversation; guest history list is not exposed.
- Mobile panel follows `visualViewport`; desktop floating state is not persisted.

---

## URL/View State

Use route changes and `viewNavigation.js` for public view navigation. Do not duplicate a separate view-to-path mapping in components.

For article detail, route id is authoritative. Public detail API increments views and records analytics referrer headers; do not fetch details with a different ad hoc endpoint unless intentionally changing analytics behavior.

---

## Admin State

Admin state mostly stays inside `AdminPanel.jsx` and admin page components. Admin operations should refresh the affected list/detail after mutation and show non-blocking notice UI.

Do not promote every admin form to global context; that would retain stale modal/form data across unrelated pages.

---

## Common Mistakes

- Duplicating server state in both context and component without clear ownership.
- Keeping stale uploaded cover state after failed upload.
- Updating AI messages after SSE `complete` with a later network error.
- Persisting temporary floating panel coordinates across close/reopen.
- Using browser storage without try/catch.

---

## Tests Required

For state changes, test the state transition:

- AI logged-in -> guest reset.
- mobile viewport resize/keyboard behavior.
- history popover scroll lock.
- upload guard blocking save while uploading.
- route/view mapping sync.

