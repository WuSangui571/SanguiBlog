# Frontend Quality Guidelines

> Frontend changes should preserve existing visual systems, avoid duplicate implementations, and pass targeted static tests/build checks.

---

## Scope / Trigger

Use this spec before finishing frontend code changes, especially UI, API, AI assistant, admin panels, routing, uploads, Markdown, or visual redesign.

---

## Required Workflow

Follow the migrated `.ai` rules under Trellis:

1. Search first.
2. Reuse existing component/helper/API paths.
3. Make the smallest reversible change.
4. Avoid unrelated formatting/refactors.
5. Add/update static tests when a regression was fixed or a behavior contract is introduced.
6. State what was and was not verified.

Search report should include keywords, candidates, reuse decision, and duplicate-implementation risk.

---

## Lint / Build

Package scripts:

```bash
npm run lint
npm run build
```

ESLint is configured for JS/JSX and React hooks. Important local relaxations:

- `react-hooks/purity`: off
- `react-hooks/set-state-in-effect`: off
- `react-refresh/only-export-components`: off
- `no-unused-vars` ignores `motion` and uppercase constants/args

Do not rely on these relaxations to leave dead imports or unused variables.

---

## Static Regression Tests

This repo uses many plain Node static tests:

```bash
node src/appfull/ui/AiAssistantWidget.test.js
node src/appfull/ui/AiAssistantMobileViewport.test.js
node src/appfull/ui/MarkdownCodeBlock.test.js
node src/appfull/noNativeBlockingDialogs.test.js
```

When fixing a regression, add or update a narrow test that would have failed before the fix. This pattern is already used throughout `src/appfull/**/*.test.js` and `src/utils/**/*.test.js`.

---

## Visual / Interaction Contracts

### Home

- The real home hero is `appfull/public/Hero.jsx` plus `homeRedesign.css`.
- The hero background uses `/api/site/meta.homeBackgroundUrl` first and falls back to `public/static/home/bg.jpg`.
- Navigation is still `appfull/ui/Navigation.jsx`; do not create a second navigation for the home redesign.
- Hero transparent/overlay behavior depends on `--home-header-offset`, `.home-hero` negative offset, and `Navigation.jsx` `heroMode`.

### Archive

- Archive summary loads first from `/api/posts/archive/summary`.
- Month article lists lazy-load from `/api/posts/archive/month`.
- Loaded months are cached until refresh.
- Category/tag display order must remain stable.

### Article Detail

- Article code blocks may have custom UI separate from AI code blocks. Do not confuse `ArticleDetail.jsx` code blocks with `MarkdownCodeBlock.jsx`.
- Article floating buttons and directory use measured layout/track logic. Avoid independent fixed-position overlays that overlap the AI assistant or navigation panels.

### Admin

- Admin shell uses glass styling in `AdminPanel.jsx`.
- `/admin/settings` remains the real settings entry; system monitor is a settings group, not a separate backend/admin page.
- Use admin notice/confirm patterns instead of native dialogs.

---

## AI Assistant Quality Contracts

Must preserve:

- Markdown rendering with sanitization.
- Code block copy fallback and visible feedback.
- Message text selection on first drag.
- `complete` event terminal success.
- Mobile full-screen and keyboard `visualViewport` behavior.
- Guest access notice/captcha behavior.
- Recent 10 visible sessions and user-side soft-delete semantics from backend.
- No AI launcher in admin pages.
- Disabled AI setting hides launcher through `/api/site/meta.aiAssistant.enabled`.

Run targeted tests for any change in this area.

---

## Forbidden Patterns

- `window.alert` or `window.confirm` in active UI.
- A second API wrapper or direct fetch with different auth/error behavior.
- A second toast/overlay/z-index manager.
- Removing `rehype-sanitize`.
- Large palette/visual overhaul when asked for local behavior fix.
- Letting text overflow buttons/cards on mobile.
- Reintroducing static admin imports into public first bundle.
- Removing AI message selectability markers.

---

## Accessibility Checklist

- [ ] Icon buttons have labels/tooltips.
- [ ] Modal/dialog has `role="dialog"` and `aria-modal`.
- [ ] Status/copy feedback uses `aria-live` when appropriate.
- [ ] Keyboard/mobile behavior is not blocked by overlay scroll locks.
- [ ] Text remains readable in light and dark modes.

---

## Verification Matrix

| Change Type | Minimum Verification |
|-------------|----------------------|
| Pure helper | sibling `node *.test.js` |
| JSX component | targeted static test plus `npm run build` |
| AI assistant | relevant `AiAssistant*.test.js` set |
| API field change | consuming component tests plus backend/frontend field alignment |
| CSS/visual change | inspect affected light/dark/mobile code paths; run build |
| Native dialog removal | `node src/appfull/noNativeBlockingDialogs.test.js` |

