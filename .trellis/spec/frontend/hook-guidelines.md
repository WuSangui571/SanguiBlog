# Frontend Hook Guidelines

> The frontend uses React hooks directly. Global site data is centralized in `useBlogData.jsx`; feature-local state usually stays inside the feature component or helper hooks.

---

## Scope / Trigger

Use this spec when changing `useBlogData.jsx`, creating a hook, adding data loaders, wiring auth state, or extracting stateful component logic.

---

## Global Data Hook

`src/hooks/useBlogData.jsx` provides:

- `BlogProvider`
- `useBlog()`
- site meta and cached meta
- categories/tags
- paginated posts
- article detail and article state
- comments/recent comments
- about page
- current user
- login/logout
- public data loaders

Pattern:

```jsx
const BlogContext = createContext(null);

export const BlogProvider = ({ children }) => {
  const value = useProvideBlog();
  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};

export const useBlog = () => useContext(BlogContext);
```

Do not create a second global blog/site context for the same data.

---

## Data Fetching Pattern

Data fetching goes through functions exported from `src/api.js`.

```jsx
const loadPosts = useCallback(async (params = {}) => {
    const page = Math.max(1, Number(params.page || 1));
    const size = Math.min(Math.max(1, Number(params.size || 10)), 50);
    try {
        setPostsLoading(true);
        setPostsError('');
        const res = await fetchPosts({ ...params, page, size });
        const data = res.data || res;
        setPostsPage({
            records: Array.isArray(data?.records) ? data.records : [],
            total: typeof data?.total === 'number' ? data.total : 0,
            page: typeof data?.page === 'number' ? data.page : page,
            size: typeof data?.size === 'number' ? data.size : size,
        });
    } finally {
        setPostsLoading(false);
    }
}, []);
```

Use `useCallback` for loader functions exposed through context or passed to effects. Use `useMemo` for context values to avoid unnecessary re-renders.

---

## Effects and Dependency Order

Follow React Hooks lint rules. A known regression occurred when a `useEffect` depended on a `useCallback` declared later, causing TDZ white screen in `SystemSettingsView`.

Rule:

- Declare callbacks before effects that use them.
- Include dependencies rather than suppressing lint.
- Use cancellation flags for async effect loaders when stale responses can update state.

Example:

```jsx
useEffect(() => {
    let cancelled = false;
    fetchAiChatSessions().then((response) => {
        if (cancelled) return;
        setSessions(response?.data || []);
    });
    return () => {
        cancelled = true;
    };
}, []);
```

---

## Local vs Shared Hooks

Create a new hook only when it removes real stateful duplication or isolates a complex browser API.

Good candidates:

- viewport/keyboard handling,
- persistent storage interaction,
- repeated async loading patterns,
- overlay/portal state shared by multiple components.

Do not extract a one-off hook just to make a component look smaller if the hook is tightly coupled to one UI and has no testable behavior.

---

## Browser API Guards

Components may render in test or non-browser contexts. Guard direct access:

```js
if (typeof window === 'undefined') return null;
```

Use this for `window`, `document`, `localStorage`, `sessionStorage`, `visualViewport`, `navigator.clipboard`, and `window.Sentry`.

---

## Auth State Contract

- Token key is `sg_token`.
- `fetchCurrentUser()` restores logged-in state.
- On 401/403, remove stale token and clear user state.
- Frontend listens for auth expiry events dispatched by `api.js`.
- AI assistant must clear local chat state when a logged-in user becomes guest/logged-out.

---

## Common Mistakes

- Creating a second context for data already in `useBlog`.
- Calling `fetch` directly in feature components when `api.js` already owns the endpoint.
- Missing cancellation guard for async state updates.
- Reading `localStorage` without `try/catch` or browser guard.
- Declaring `useEffect` before the `useCallback` it uses.

---

## Tests Required

- For pure hook/helper logic, add a sibling `*.test.js` that can run with `node`.
- For global data contracts, run frontend build and any existing tests that assert the affected behavior.

