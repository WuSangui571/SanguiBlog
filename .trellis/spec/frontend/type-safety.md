# Frontend Type and Runtime Safety

> The frontend is JavaScript/JSX, so type safety is achieved through explicit runtime guards, response normalization, small pure helpers, and static tests rather than TypeScript.

---

## Scope / Trigger

Use this spec when changing API payload handling, DTO fields, runtime validation, helper functions, storage parsing, Markdown sanitization, or frontend/backend field contracts.

---

## Current Type System

- Source files are `.js` and `.jsx`.
- Vite/React compiler catches syntax/module errors.
- ESLint catches unused variables and hooks issues.
- There is no Zod/Yup/io-ts runtime validation dependency.
- Static regression tests are plain Node scripts placed beside feature files.

Do not add TypeScript or a validation dependency without a clear migration plan and user approval.

---

## API Response Guards

`src/api.js` centralizes response parsing and error normalization.

Rules:

- Parse error JSON and prefer `message` / `msg`.
- Attach `error.status` and `error.payload` when available.
- Remove invalid stored token values: `"null"` and `"undefined"`.
- Decode JWT expiration defensively.
- Retry public GET reads without stale auth after a 401 where configured.

Feature code should still guard shape:

```js
const data = res.data || res;
const records = Array.isArray(data?.records) ? data.records : [];
```

---

## Cross-Layer Field Contract

When backend DTO fields change, update all of:

1. Backend DTO class under `model/dto`.
2. Service mapping.
3. Controller endpoint contract if path/status changes.
4. `src/api.js` export or payload.
5. Consuming React component/helper.
6. Static tests.
7. Trellis spec if this is a reusable contract.

Examples of important field contracts:

- `PostSummaryDto`: `views`, `comments`, `tags`, `parentCategory`, `coverImage`, `slug`.
- `SiteMetaDto`: `homeBackgroundUrl`, `assetBaseUrl`, `footer`, `stats`, `aiAssistant`.
- `AiChatResponse`: `sessionId`, `reply`, `model`, `mode`, `references`.
- SSE complete event: same shape as AI response plus terminal stream semantics.
- BotGuard data: `captchaRequired`, `captchaUrl`, `verifyUrl`, `riskScore`, `retryAfterSeconds`.

---

## Runtime Validation Patterns

Use small helpers for repeated validation:

- `registerValidation.js`
- `aiAssistantAccess.js`
- `aiCurrentPageContext.js`
- `aiFloatingPanel.js`
- `aiHistoryOverlay.js`
- `aiSelectionGuard.js`
- `clipboardCopy.js`
- `analyticsReferrer.js`

Add tests beside helpers when adding rules:

```text
helper.js
helper.test.js
```

---

## Sanitization Contracts

Markdown/HTML rendering is a security-sensitive boundary:

- AI assistant Markdown uses `react-markdown`, `remark-gfm`, `rehype-sanitize`, and `MarkdownCodeBlock`.
- Shared sanitize utilities live in `src/utils/sanitize.js` and `src/utils/rehypeSanitizeSchema.js`.
- Do not use `dangerouslySetInnerHTML` for user-controlled content unless the source and sanitization contract are explicit.
- The author bio/home profile HTML is a known trusted admin-managed exception. Do not generalize that exception to comments or AI responses.

---

## Header Encoding Contract

Browser `fetch` header values are ByteString-limited. `api.js` URL-encodes Chinese analytics referrer/source labels before putting them in `X-SG-Referrer` and `X-SG-Source-Label`; backend decodes them in `PostController`.

Do not put raw non-ISO-8859-1 text directly into custom headers.

---

## Asset URL Safety

Use `buildAssetUrl` and `ASSET_ORIGIN` behavior instead of manual string concatenation. This prevents duplicated prefixes when backend `site.asset-base-url` contains a path.

---

## Forbidden Patterns

- Blind `res.data.records.map(...)` without checking `records` is an array.
- Treating `localStorage.getItem("sg_token")` as always valid.
- New direct `fetch` calls with bespoke error parsing.
- Removing `rehype-sanitize` from AI/user Markdown.
- Header values containing raw Chinese text.
- Adding `dangerouslySetInnerHTML` outside the known admin-controlled content path.

---

## Tests Required

Run or add static tests for pure contracts:

- `node src/utils/aiStream.test.js`
- `node src/utils/analyticsReferrer.test.js`
- `node src/appfull/ui/clipboardCopy.test.js`
- feature helper tests beside changed logic

Run `npm run build` after JSX/API import changes.

