# Focused Research: BUG #2 Guest Comment Login Prompt

## Relevant Specs

- `.trellis/spec/frontend/index.md`: frontend pre-development checklist and verification commands.
- `.trellis/spec/frontend/directory-structure.md`: active public feature components belong under `src/appfull/public` or existing component paths; API calls stay in `src/api.js`.
- `.trellis/spec/frontend/component-guidelines.md`: reuse existing UI patterns, no native blocking dialogs, use existing component structure.
- `.trellis/spec/frontend/hook-guidelines.md`: auth state comes from `useBlogData.jsx`; do not create a second global context.
- `.trellis/spec/frontend/state-management.md`: `currentUser` belongs to global blog state; composer state remains local to the comments component.
- `.trellis/spec/frontend/type-safety.md`: preserve API wrapper contracts and runtime guards.
- `.trellis/spec/frontend/quality-guidelines.md`: search first, small reversible change, add narrow static regression test, run lint/build.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: reuse existing comment component/API path rather than adding duplicates.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: confirms no API/DB/DTO change is needed; existing backend auth remains defense in depth.
- `.trellis/spec/backend/quality-guidelines.md`: backend security and API contracts should remain stable.
- `.trellis/spec/backend/error-handling.md`: existing API wrapper consumes backend `message`; no backend error change required.

## Retrieval Report

- Keywords searched:
  - `comment|comments|发表评论|登录|login|currentUser|user`
  - `addComment|fetchComments|comments|/comments|Comment`
  - `GlassPopupToast|toast|notice|show.*Toast`
  - `disabled=|aria-disabled|readOnly|请先登录|前往登录`
- Candidate implementations:
  - `SanguiBlog-front/src/components/comments/CommentsSection.jsx`: active comment composer and comment list; already receives `currentUser` and `setView`.
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`: article page integration; passes `currentUser`, `setView`, and comment callbacks into `CommentsSection`.
  - `SanguiBlog-front/src/hooks/useBlogData.jsx`: owns `comments`, `user`, `submitComment`, and comment reloads.
  - `SanguiBlog-front/src/api.js`: owns `createComment(postId, payload)` and auth/error behavior.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/CommentController.java`: backend `POST /api/posts/{postId}/comments` requires `isAuthenticated()`.
  - `SanguiBlog-front/src/appfull/ui/GlassPopupToast.jsx`: reusable public toast if option 1 were chosen, but option 2 does not need a popup.
- Decision: modify existing `CommentsSection.jsx` and add a sibling static test.
- Duplicate risk: low. The plan does not add another comment component, API wrapper, auth context, or backend endpoint.

## Code Patterns Found

- `CommentsSection.jsx` already has the correct data boundary:
  - `currentUser` determines whether reply/edit/delete actions are available.
  - `setView('login')` is already wired to the guest "前往登录" action.
  - The issue is limited to the main textarea/button not enforcing the same guest boundary.
- `ArticleDetail.jsx` delegates comments to `CommentsSection`:
  - `handleCommentSubmit` is a thin passthrough to `onSubmitComment`.
  - No article-level state is needed for this fix if `CommentsSection` owns the disabled composer.
- `useBlogData.jsx` keeps comment mutation/reload behavior centralized:
  - `submitComment` calls `createComment`, then reloads post comments and recent comments.
  - This should remain unchanged.
- `api.js` centralizes auth and error handling:
  - No direct fetch should be added.
  - `POST /posts/{postId}/comments` should remain the create-comment path.
- Backend already enforces auth:
  - `CommentController#create` uses `@PreAuthorize("isAuthenticated()")`.
  - `SecurityConfig` permits public `GET /api/posts/**` but not unauthenticated `POST /api/posts/{id}/comments`.

## Files Likely To Modify

- `SanguiBlog-front/src/components/comments/CommentsSection.jsx`
  - Add guest composer boolean.
  - Guard `handleSubmit` and likely `handleReplySubmit`.
  - Disable/read-only main textarea for guests.
  - Disable publish button for guests and probably empty content.
  - Add clear login-required placeholder/copy.
- `SanguiBlog-front/src/components/comments/CommentsSectionGuestLogin.test.js`
  - Static regression test confirming the disabled guest composer, submit guard, and login action remain present.

## Files To Inspect But Avoid Modifying

- `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - Only modify if `setView` or current user wiring is found broken. Current research says it is already correct.
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
  - Do not change unless authenticated submission behavior is broken.
- `SanguiBlog-front/src/api.js`
  - Do not change for this issue.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/CommentController.java`
  - Do not change; existing auth contract is correct.

## Risk / Boundary Notes

- The root bug is not backend auth; it is frontend UX and premature draft clearing.
- If only disabling the button is implemented without guarding `handleSubmit`, tests should fail because a programmatic submit could still clear content.
- If the textarea is disabled but no login copy appears inside/near the composer, the issue is only partially addressed.
- If a popup is added with `window.alert`, it violates frontend quality specs and `noNativeBlockingDialogs`.
- Avoid encoding churn in existing mojibake text. Keep edits tightly scoped and avoid mass reformatting.
- Do not modify legacy `SanguiBlog-front/src/legacy/components/CommentsSection.jsx`; it is not the active path.

## Required Tests

From `SanguiBlog-front`:

```bash
node src/components/comments/CommentsSectionGuestLogin.test.js
node src/appfull/noNativeBlockingDialogs.test.js
npm run lint
npm run build
```

If `ArticleDetail.jsx` is modified:

```bash
node src/appfull/public/ArticleDetailShareToast.test.js
```

Backend compile is only required if a backend file is changed, which this task should avoid.
