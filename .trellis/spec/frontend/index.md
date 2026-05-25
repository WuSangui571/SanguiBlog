# Frontend Development Guidelines

> SanguiBlog frontend code-specs. Read this index first, then open relevant detailed specs before implementation.

---

## Overview

Frontend stack:

- React 19.2
- Vite 7
- React Router DOM 7
- Tailwind CSS 4
- Framer Motion
- Lucide React
- React Markdown + Remark/Rehype sanitize pipeline
- Plain JS/JSX with ESLint and project-specific Node static tests

The old `.ai` workflow has been migrated into Trellis. Future AI work should use `.trellis/spec/**`, `.trellis/workflow.md`, and Trellis task context instead of `.ai`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | React/Vite source layout, `appfull` organization, routing, assets, chunks | Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, styling, overlays, AI assistant UI, Markdown/copy contracts | Filled |
| [Hook Guidelines](./hook-guidelines.md) | `useBlogData`, data loaders, effects, browser guards, auth state | Filled |
| [State Management](./state-management.md) | Context/local/URL/storage/server state ownership | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Retrieve-first workflow, lint/build/static tests, visual/AI contracts | Filled |
| [Type Safety](./type-safety.md) | JS runtime guards, API payload shape checks, sanitization, header encoding | Filled |

---

## Pre-Development Checklist

Always read:

- [Directory Structure](./directory-structure.md)
- [Quality Guidelines](./quality-guidelines.md)
- [../guides/code-reuse-thinking-guide.md](../guides/code-reuse-thinking-guide.md)

Then read task-specific specs:

| Task Touches | Also Read |
|--------------|-----------|
| React component/UI/overlay/Markdown | [Component Guidelines](./component-guidelines.md), [Type Safety](./type-safety.md) |
| Data loading/auth/site meta/API wrapper | [Hook Guidelines](./hook-guidelines.md), [State Management](./state-management.md), [Type Safety](./type-safety.md), [../guides/cross-layer-thinking-guide.md](../guides/cross-layer-thinking-guide.md) |
| AI assistant frontend | [Component Guidelines](./component-guidelines.md), [State Management](./state-management.md), [Type Safety](./type-safety.md), [../guides/cross-layer-thinking-guide.md](../guides/cross-layer-thinking-guide.md) |
| Admin panel/settings/profile | [Component Guidelines](./component-guidelines.md), [State Management](./state-management.md), [Quality Guidelines](./quality-guidelines.md) |
| Routing/navigation/public views | [Directory Structure](./directory-structure.md), [State Management](./state-management.md) |
| Sanitization/HTML/Markdown | [Type Safety](./type-safety.md), [Component Guidelines](./component-guidelines.md) |
| CSS/visual changes | [Component Guidelines](./component-guidelines.md), [Quality Guidelines](./quality-guidelines.md) |

---

## Verification Commands

Use targeted static tests plus build:

```bash
cd SanguiBlog-front
node src/appfull/ui/AiAssistantWidget.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run build
```

If you do not run tests/build, state that explicitly.

---

## Language

Project-facing Trellis specs are written in Simplified Chinese or English as needed. Preserve exact code identifiers, paths, API names, CSS classes, and config keys.

