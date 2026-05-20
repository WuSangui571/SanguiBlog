# Frontend Directory Structure

> SanguiBlog frontend is a React 19 + Vite SPA using Tailwind CSS 4, Framer Motion, Lucide React, and a project-specific `appfull` feature surface.

---

## Scope / Trigger

Read this spec before editing `SanguiBlog-front/`, adding views/components/hooks/utilities, or moving frontend code.

---

## Root Layout

```text
SanguiBlog-front/
|-- package.json
|-- vite.config.js
|-- eslint.config.js
|-- src/
|   |-- main.jsx
|   |-- App.jsx
|   |-- AppFull.jsx
|   |-- api.js
|   |-- index.css
|   |-- appfull/
|   |   |-- AdminPanel.jsx
|   |   |-- public/
|   |   |-- ui/
|   |   +-- *.js / *.test.js
|   |-- components/
|   |-- contexts/
|   |-- hooks/
|   |-- pages/
|   |   +-- admin/
|   |-- utils/
|   +-- legacy/
```

Build entry:

```text
src/main.jsx -> src/App.jsx -> src/AppFull.jsx
```

Do not edit old root-level prototypes or create a second app shell. `AppFull.jsx` remains the main orchestration layer, with feature pieces split into `appfull/public`, `appfull/ui`, and admin views.

---

## Directory Responsibilities

| Directory/File | Responsibility |
|----------------|----------------|
| `src/api.js` | Single frontend API facade and fetch/error/token/SSE behavior |
| `src/hooks/useBlogData.jsx` | `BlogContext` global state and public data loaders |
| `src/contexts/*` | Cross-cutting React contexts such as permissions and layout offsets |
| `src/appfull/AdminPanel.jsx` | Admin shell and many admin subviews |
| `src/appfull/public/*` | Public site views: home, hero, article detail, archive, about, login/register |
| `src/appfull/ui/*` | Shared app UI: navigation, AI assistant, toasts, overlays, markdown code blocks |
| `src/appfull/*.js` | Feature helpers that support `AppFull` flows |
| `src/pages/*` | Route wrappers and page shells |
| `src/utils/*` | Shared non-React utilities: asset URL, logger, sanitize, analytics referrer, SSE parsing |
| `src/components/*` | Older/common components still in use outside `appfull` |
| `src/legacy/*` | Deprecated retained components/resources. Do not use for new work unless intentionally maintaining legacy behavior |

---

## Module Organization Rules

- Public-facing feature components go in `src/appfull/public/`.
- Shared controls, overlays, AI assistant pieces, navigation, toasts, markdown renderers, and animation helpers go in `src/appfull/ui/`.
- API calls must be added to `src/api.js`; components should not hand-roll base URLs and token/error parsing.
- Feature helpers that are pure functions should live beside the feature and have `*.test.js` static tests where the project already uses that style.
- Deprecated implementations must be moved to `src/legacy/` and documented in `src/legacy/README.md`; do not leave duplicate active implementations.

---

## Routing / View Contract

Real routes are handled by `src/App.jsx` and page shells:

- `/`
- `/archive`
- `/about`
- `/article/:id`
- `/tools`
- `/tools/:id`
- `/games` compatibility redirect/route behavior
- `/admin/*`

Public navigation view-to-URL synchronization is maintained in `src/pages/viewNavigation.js`. If adding a public view, update that mapping rather than adding ad hoc URL changes inside random components.

When already under `/admin/*`, frontend view changes must not force users back to `/admin`.

---

## Build / Chunk Contract

`vite.config.js` manually splits:

- `admin-panel`
- `markdown`
- `motion`
- `icons`
- `vendor`

`AdminPanel.jsx` is lazy-loaded from `AppFull.jsx`. Do not reintroduce static imports that put the admin panel back into the public first bundle.

---

## Assets / Static Files

- Public/static fallback home background is `public/static/home/bg.jpg`.
- Runtime asset URLs should use `buildAssetUrl` / `ASSET_ORIGIN` patterns, not manual string concatenation.
- Uploaded game HTML is served from backend `/uploads/games/{slug}/index.html` and rendered in `/tools/:id` via iframe.
- If `site.asset-base-url` includes a path prefix, URL builders must avoid duplicated path segments.

---

## Examples to Follow

- `src/appfull/public/HomeView.jsx`: public view composition.
- `src/appfull/public/ArticleDetail.jsx`: article detail, markdown code blocks, floating controls.
- `src/appfull/ui/AiAssistantWidget.jsx`: complex stateful overlay with split helpers and static tests.
- `src/appfull/ui/GlassPopupToast.jsx`: reusable non-blocking glass toast.
- `src/hooks/useBlogData.jsx`: global data loader context.
- `src/utils/logger.js`: frontend logging facade.

---

## Anti-Patterns

- Adding a second `api` wrapper instead of extending `src/api.js`.
- Creating a second home/hero/navigation implementation when `Hero.jsx`, `homeRedesign.css`, and `Navigation.jsx` are the current real path.
- Adding new code under `legacy/` for active features.
- Static-importing admin-only code into first-load public views.
- Reimplementing overlay z-index instead of using `overlayStack.js`.

