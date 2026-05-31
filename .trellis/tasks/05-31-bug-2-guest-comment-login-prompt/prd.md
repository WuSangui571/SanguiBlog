# BUG #2 Guest Comment Login Prompt

## Source

- GitHub community issue: `BUG: 关于非登陆用户评论时不弹出登陆提醒的问题#2`
- Reported content: "如题，暂未解决。发现时间：2026年5月29日"
- Planning date: 2026-05-31

## Task Classification

Simple Task.

Reason: the requirement is clear and the expected implementation should be limited to the existing frontend article comments UI. Backend authorization already rejects unauthenticated comment creation through the existing `POST /api/posts/{postId}/comments` contract.

## Problem

On `/article/{id}`, unauthenticated visitors can type into the bottom comment textarea. When they click the publish comment button, the backend rejects the request because the user is not logged in, but the UI does not show a useful login prompt and the draft is cleared immediately.

Current result:

- Guest can type a comment.
- Guest clicks "发表评论".
- Request fails due to missing auth.
- The textarea is cleared before the failure is surfaced.
- No clear login guidance is shown at the action point.

## Goal

Prevent unauthenticated visitors from entering or submitting article comments, and make the login requirement obvious in the comment composer.

## Chosen UX Direction

Use option 2 from the issue description:

- When `currentUser` is absent, the comment composer must not allow typing.
- The publish button must be disabled and not submit.
- The input area must display copy that clearly says the user must log in before commenting.
- A login action must remain available near the composer and navigate through the existing `setView('login')` flow.

This is preferred over a submit-time popup because it prevents draft loss and makes the requirement clear before the user invests time typing.

## Requirements

- Reuse the existing active article comments component: `SanguiBlog-front/src/components/comments/CommentsSection.jsx`.
- Keep the existing article detail integration path: `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx` passes `currentUser` and `setView`.
- For unauthenticated users:
  - Main comment textarea is disabled or read-only and does not accept text input.
  - Placeholder or inline copy communicates: login is required before commenting.
  - "发表评论" button is disabled and visually communicates the disabled state.
  - The existing "前往登录" action remains visible and uses `setView('login')`.
  - `handleSubmit` must guard against guest submission even if called programmatically.
  - Existing entered content must not be cleared by a failed unauthenticated submit path.
- For authenticated users:
  - Main comment textarea behavior remains unchanged.
  - Publish behavior remains unchanged.
  - Reply/edit/delete visibility remains governed by current user and permission checks.
- Preserve existing visual language:
  - Tailwind utilities.
  - `home-ios-card` / `home-ios-inner-card`.
  - Existing `PopButton` / button classes.
  - No native `window.alert` or `window.confirm`.
- Add or update a narrow frontend static regression test for the guest composer contract.

## Non-Goals / Forbidden Scope

- Do not change backend authorization for `POST /api/posts/{postId}/comments`.
- Do not allow anonymous comment creation.
- Do not change database schema, entities, repositories, migrations, or `sanguiblog_db.sql`.
- Do not change comment API paths, methods, request fields, response fields, or status codes.
- Do not create a second comment component or a second frontend API wrapper.
- Do not modify admin comment management.
- Do not change AI assistant, analytics, Docker, Nginx, uploads, site meta, sitemap, robots, or permissions matrix.
- Do not make a broad visual redesign of the article page.

## Existing Contract Review

### API / Command / Payload

No API or payload change is intended.

Existing backend contract:

| Layer | Existing Contract |
|-------|-------------------|
| List comments | `GET /api/posts/{postId}/comments`, public read |
| Create comment | `POST /api/posts/{postId}/comments`, requires authenticated user via `@PreAuthorize("isAuthenticated()")` |
| Create payload | `CreateCommentRequest { authorName, content, parentId?, avatarUrl? }` |
| Create response | `ApiResponse<CommentDto>` |
| Frontend API | `createComment(postId, payload)` in `SanguiBlog-front/src/api.js` |
| Frontend context | `submitComment(postId, payload)` in `SanguiBlog-front/src/hooks/useBlogData.jsx` |
| Article consumer | `ArticleDetail.jsx -> CommentsSection.jsx` |

No DB, env, command, or DTO field changes are planned.

### Validation / Error Matrix

| Case | Expected Result |
|------|-----------------|
| Guest opens article detail | Comments list loads; composer shows login-required state; no typing allowed. |
| Guest clicks publish button | Button is disabled; no `onSubmit` call; no API request; textarea remains empty; login action is available. |
| Guest somehow triggers submit handler | Handler exits before calling `onSubmit`; content is not cleared as a side effect. |
| Logged-in user types non-empty comment and submits | Existing `onSubmit` flow runs; comment reload behavior remains owned by `useBlogData.jsx`. |
| Logged-in user submits empty/whitespace comment | Existing empty guard remains; no request. |
| Logged-in user replies to a comment | Existing reply flow remains available only when `currentUser` exists. |
| Backend still rejects unauthenticated POST | Existing backend security remains unchanged as defense in depth. |

### Good / Base / Bad Cases

Good:

- Logged-in user visits `/article/{id}`, types a comment, clicks "发表评论", and the existing comment submission/reload behavior still works.

Base:

- Guest visits `/article/{id}`, sees existing comments plus a disabled composer with clear login copy and a "前往登录" action.

Bad:

- Guest cannot lose typed draft because typing/submission is blocked before the action. If stale UI state or direct handler invocation happens, `handleSubmit` still refuses to submit or clear content.

## Acceptance Criteria

- [ ] On `/article/{id}` with no `currentUser`, the main comment textarea cannot be typed into.
- [ ] On `/article/{id}` with no `currentUser`, the "发表评论" button is disabled and does not call `onSubmit`.
- [ ] The disabled composer includes clear login-required copy near or inside the input area.
- [ ] The existing "前往登录" action remains visible and routes through `setView('login')`.
- [ ] Authenticated comment flow remains unchanged.
- [ ] Reply/edit/delete behavior remains unchanged.
- [ ] No native `alert` / `confirm` is introduced.
- [ ] A narrow static test covers the guest composer contract.
- [ ] Frontend lint/build and relevant static tests pass.

## Expected Files To Modify

- `SanguiBlog-front/src/components/comments/CommentsSection.jsx`
- `SanguiBlog-front/src/components/comments/CommentsSectionGuestLogin.test.js` or another narrow sibling static test

Potentially inspect but avoid modifying unless necessary:

- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
- `SanguiBlog-front/src/api.js`

## Required Tests

Run from `SanguiBlog-front`:

```bash
node src/components/comments/CommentsSectionGuestLogin.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

Optional targeted test if ArticleDetail is modified:

```bash
node src/appfull/public/ArticleDetailShareToast.test.js
```

Backend tests are not required if implementation stays frontend-only and does not change API/security contracts. If backend files are changed unexpectedly, run:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
```

## Implementation Notes For DeepSeek

- Prefer a small local boolean such as `const isGuest = !currentUser;`.
- Use the existing `setView('login')` pattern; do not introduce a new router path mechanism.
- Keep the existing login hint/header action, but make the actual composer state enforce the requirement.
- Disable or set `readOnly` on the main textarea for guests. Disabled is preferable if the disabled visual is clear; if using `readOnly`, also guard `onChange`.
- Disable the publish button for guests and empty content.
- Add a handler guard before the content-empty guard or immediately after it:
  - guest -> return without `onSubmit` and without clearing content.
  - authenticated -> existing submit behavior.
- Do not introduce a popup unless the chosen disabled-state UX is insufficient.

## Planning Self-Check

- Acceptance criteria: defined above.
- Forbidden scope: defined above.
- Expected files: listed above.
- Required tests: listed above.
- Concrete guidelines read: frontend directory, component, hook, state, type-safety, quality; backend quality/error for boundary; code-reuse and cross-layer guides.
- Open questions: none. The issue provides two acceptable options; this PRD chooses option 2 because it prevents draft loss.
- API / DB / DTO alignment: no change planned; existing backend auth remains the enforcement boundary.
