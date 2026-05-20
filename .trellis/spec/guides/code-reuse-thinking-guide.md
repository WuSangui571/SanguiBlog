# Code Reuse Thinking Guide

> Purpose: stop duplicate implementations before they happen. This guide is the Trellis replacement for the old `.ai` retrieve-first rule.

---

## Required Retrieval Report

Before creating or heavily modifying code, search first and record:

```markdown
## Retrieval Report
- Keywords: <terms searched>
- Candidate implementations:
  - <path>: <why relevant>
  - <path>: <why relevant>
  - <path>: <why relevant>
- Decision: reuse | modify | refactor/merge | create new
- Duplicate risk: <why this will not create a second implementation>
```

Use `rg` first:

```bash
rg "keyword|EndpointName|DtoName|serviceName" SanguiBlog-server SanguiBlog-front
rg --files SanguiBlog-server/src/main/java/com/sangui/sanguiblog
rg --files SanguiBlog-front/src
```

---

## Reuse Priority

```text
reuse existing > modify existing > refactor/merge > create new
```

Creating new code is allowed only when:

- Existing implementation's responsibility does not fit.
- Extending it would create unclear or fragile code.
- It will not create dual routes, dual services, dual UI entries, or duplicate utilities.
- The old path is migrated, deleted, or clearly marked legacy where applicable.
- The reason is recorded in Trellis task/spec notes.

---

## Project-Specific Reuse Map

| Need | Search / Reuse First |
|------|----------------------|
| API call | `SanguiBlog-front/src/api.js` |
| Public site global data | `SanguiBlog-front/src/hooks/useBlogData.jsx` |
| Public view routing | `SanguiBlog-front/src/pages/viewNavigation.js` |
| Toast/popup | `GlassPopupToast.jsx`, admin notice patterns, AI assistant notice |
| Overlay z-index | `overlayStack.js` |
| AI assistant UI | `AiAssistantWidget.jsx` and sibling helpers/tests |
| Markdown code copy | `MarkdownCodeBlock.jsx`, `clipboardCopy.js` |
| Frontend logging | `src/utils/logger.js` |
| Backend API response | `ApiResponse<T>` |
| Backend post logic | `PostController`, `AdminPostController`, `PostService`, `PostRepository` |
| Upload paths | `UploadController`, `PostAssetService`, `AvatarStorageService`, `StoragePathResolver` |
| AI chat backend | `AiChatService`, `service.ai.*`, `service.ai.rag.*` |
| Site meta/settings | `SiteController`, `SiteService`, `site_settings`, `HomeBackgroundAdminService` |
| Permissions | `PermissionService`, `PermissionDefinition`, `SecurityConfig` |
| System monitor | `AdminSystemMonitorController`, `SystemMonitorService`, `SystemMonitorDto` |
| Sitemap/robots | `SitemapController`, `SitemapService` |

---

## Duplicate-Implementation Smells

- New endpoint returns same business data as an existing endpoint with a slightly different shape.
- New utility repeats token/error/API parsing already in `api.js`.
- New component is 80% similar to an `appfull/ui` component.
- New AI service bypasses existing context/advice/session/RAG flow.
- New admin page duplicates an existing `/admin/settings` group.
- New CSS recreates `home-ios-card` or glass popup patterns.
- New DB table stores data that already belongs in `site_settings` or an existing feature table.

---

## Wrong vs Correct

### Wrong

```text
Create SystemMonitorPageController + NewSystemMonitorService because settings page is large.
```

### Correct

```text
Extend AdminSystemMonitorController -> SystemMonitorService -> SystemMonitorDto
and render inside the existing SystemSettingsView group.
```

### Wrong

```text
Use navigator.clipboard.writeText directly inside a new AI code block component.
```

### Correct

```text
Reuse MarkdownCodeBlock.jsx and clipboardCopy.js.
```

---

## Checklist Before Writing

- [ ] I searched exact endpoint names, DTO names, UI labels, and table/entity names.
- [ ] I found existing candidates and read the real entry point.
- [ ] I know which implementation owns this feature.
- [ ] I am not creating a second service/controller/component for the same business capability.
- [ ] If creating new code, I have a concrete reason and test plan.

