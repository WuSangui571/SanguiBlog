# Frontend Component Guidelines

> Components are React function components written in JS/JSX. Prefer existing UI helpers and visual systems over adding parallel components.

---

## Scope / Trigger

Use this spec when building or changing React components, UI overlays, public pages, admin panels, markdown rendering, upload UI, or AI assistant UI.

---

## Component Structure

Existing component files use:

```jsx
import React, { useMemo, useState } from 'react';

function LocalHelper({ value }) {
    return <span>{value}</span>;
}

export default function FeatureComponent({ propA, propB }) {
    const derived = useMemo(() => compute(propA), [propA]);

    return (
        <section>
            ...
        </section>
    );
}
```

Keep helper functions in the same file when they are only meaningful for that component. Extract to a sibling `*.js` when the logic is complex, needs tests, or is shared by multiple components.

---

## Props and Data Shape

- This project is JavaScript/JSX, not TypeScript. There is no runtime prop validation library.
- Keep prop names explicit and aligned to backend DTO fields where possible.
- Normalize server responses at API/context boundaries before deeply passing them into UI.
- For optional fields, use defensive defaults in components (`[]`, `null`, empty string) rather than assuming backend data is complete.

Example:

```jsx
const list = Array.isArray(response?.data) ? response.data : [];
setSessions(list);
```

---

## Styling Pattern

The project primarily uses Tailwind utility classes, global CSS in `index.css`, and feature CSS such as `appfull/public/homeRedesign.css`.

Use existing visual language:

- Glass UI cards: `home-ios-card`, `home-ios-inner-card`, and modifiers such as `home-ios-card--static`.
- Icons: `lucide-react`.
- Animations/overlays: `framer-motion` + `AnimatePresence`.
- Toasts: `GlassPopupToast` for public non-blocking glass popups.
- Admin notices: `AdminNoticeBar` / `useTimedNotice` patterns inside `AdminPanel.jsx`.
- AI assistant dialogs/notices: reuse existing helpers in `appfull/ui`.

Do not use browser-native `alert()` or `window.confirm()` in active frontend code.

---

## Overlay and Portal Contract

Floating overlays that must escape local stacking contexts should use `createPortal(document.body)`.

Existing contracts:

- AI assistant uses a portal and `overlayStack.js`.
- Navigation notification/settings panels use portal and shared z-index claiming.
- "Who opened/interacted last is on top" is implemented through `claimOverlayStackBase()`.

Do not hard-code a new giant `z-index` for a new overlay without checking `overlayStack.js`.

---

## AI Assistant Component Contracts

The AI assistant is high-risk because it has many regression tests and cross-layer contracts.

Key constraints:

- `/admin` and admin subpages hide the frontend AI launcher.
- Guest users can see the launcher when enabled, but guest/chat behavior must follow `aiAssistantAccess.js` and backend guest limits.
- Logged-out state after logged-in state must clear local messages/sessions.
- Default open state is blank new chat; do not auto-restore the previous conversation.
- Stream `complete` is terminal success.
- History popover locks the main chat scroll while open.
- Desktop floating mode is temporary; closing or reopening returns to docked default.
- Mobile AI panel is full-screen and follows `window.visualViewport`; mobile does not support floating mode.
- Floating drag is only through the title bar.
- Resizing applies only while in temporary floating mode.
- Header toolbar uses icon buttons for new chat, history, floating, close.
- "New chat" is disabled on idle blank session.
- Disclaimer text lives near the input area, not appended to every assistant response.

Before changing `AiAssistantWidget.jsx`, search the related helper/test files:

- `aiFloatingPanel.js`
- `aiHistoryOverlay.js`
- `aiSelectionGuard.js`
- `aiSessionToolbar.js`
- `aiSessionDeleteDialog.js`
- `aiWelcomeIntro.js`
- `AiAssistant*.test.js`

---

## Markdown / Copy / Selection Contract

AI assistant Markdown rendering uses:

- `AiMessageMarkdown.js`
- `MarkdownCodeBlock.jsx`
- `clipboardCopy.js`
- `rehype-sanitize`
- `remark-gfm`

Do not write another Markdown code-copy implementation. `MarkdownCodeBlock.jsx` must reuse `copyTextWithFallback(...)`, which tries `navigator.clipboard.writeText` and falls back to hidden `textarea + execCommand('copy')`.

Assistant message text selection depends on:

- `.sg-ai-message-text`
- `data-ai-message-selectable="true"`
- `aiSelectionGuard.js`

Do not remove those markers or broad `user-select: text` rules; they protect first-drag selection/copy behavior.

---

## Accessibility

Required patterns:

- Icon-only buttons need `aria-label` or visible title/tooltip when meaning is not obvious.
- Dialogs use `role="dialog"` and `aria-modal="true"`.
- Status toasts and copy feedback use `role="status"` or `aria-live="polite"`.
- Buttons that trigger dangerous actions must use custom confirmation UI, not `window.confirm`.

---

## Common Mistakes

### Mistake: Using Native Blocking Dialogs

Wrong:

```js
if (window.confirm('Delete?')) { ... }
alert('Saved');
```

Correct:

```jsx
<AdminConfirmDialog ... />
<GlassPopupToast open={copied} ... />
```

### Mistake: New UI for an Existing Pattern

Wrong: add a second toast system for one page.

Correct: use `GlassPopupToast` for public transient glass notifications or admin notice patterns for admin screens.

### Mistake: Breaking Selection with Pointer State Updates

Wrong: raising the AI overlay on every `pointerdown`.

Correct: skip overlay raise when right-clicking, when text is selected, or when the pointer target is selectable AI message text.

---

## Tests Required

For component changes, prefer existing static/behavior tests:

- `node src/appfull/ui/AiAssistantWidget.test.js`
- `node src/appfull/ui/AiAssistantMobileViewport.test.js`
- `node src/appfull/ui/AiAssistantSelection*.test.js`
- `node src/appfull/ui/MarkdownCodeBlock.test.js`
- `node src/appfull/noNativeBlockingDialogs.test.js`
- feature-specific tests next to changed files

Run `npm run build` for broad frontend build verification when component syntax/imports change.

