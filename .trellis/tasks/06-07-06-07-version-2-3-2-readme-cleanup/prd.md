# Update Project Version to V2.3.2 and README Hygiene PRD

## Summary

Update the SanguiBlog visible project version from `V2.3.1` to `V2.3.2`, refresh the root README pair if stale content is found, and review repository ignore/cleanup state so generated, temporary, secret, and local runtime files are not uploaded.

This is a planning-only handoff from Codex to DeepSeek. Codex must not modify business implementation files in this pass. DeepSeek should implement the narrow maintenance change on the existing branch `feature/openai-compatible-ai-provider-config`.

## Scope Classification

Simple Task.

Reasoning:

- The requested version bump and README sync are narrow maintenance changes.
- The change spans backend config and frontend fallback display strings, but does not add API fields, DTO fields, database schema, permissions, storage behavior, AI behavior, or deployment infrastructure.
- Repository cleanup requires care because the working tree already contains unrelated AI widget changes; this risk is procedural, not architectural.

## Current Project State

- Branch: `feature/openai-compatible-ai-provider-config`.
- Trellis startup context reports no active tasks before this task was created.
- Recent journal entries record completed OpenAI-compatible AI provider/RAG work and completed AI RAG admin capability closeout.
- Working tree currently has unrelated uncommitted AI pending-reply UI work:
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
  - `SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
  - `SanguiBlog-front/src/appfull/ui/aiPendingReply.test.js`
- Those files are outside this task. Do not modify, stage, revert, format, or include them in this task.

## Goals

1. Update homepage/site version display from `V2.3.1` to `V2.3.2`.
2. Keep the version chain aligned:
   - backend config source
   - `/api/site/meta` DTO value
   - frontend fallback literals
   - root README current-version text
   - Chinese README current-version text
3. Review `README.md` and `README.zh-CN.md` for stale content introduced by recent provider/RAG work and sync equivalent updates between both files.
4. Review root `.gitignore`, frontend `.gitignore`, ignored files, and untracked files. Ensure generated/local/secret/runtime files stay ignored and useful source/docs files remain trackable.
5. Do not write release documentation.

## Non-Goals / Forbidden Scope

- Do not create or edit any `release/` document or changelog.
- Do not change API paths, HTTP methods, DTO fields, JSON response shape, SSE events, DB schema, auth/permission rules, upload/storage behavior, AI provider behavior, RAG behavior, Docker service topology, or deployment commands except README wording if stale.
- Do not modify AI assistant pending-reply files already present in the working tree.
- Do not delete ignored local state unless it is clearly generated and safe. Prefer reporting cleanup candidates over destructive deletion.
- Do not run broad formatting or refactors.
- Do not stage, commit, push, archive, or record a session in this implementation pass unless the user explicitly asks later after manual acceptance.

## Version Contract

Backend source of truth:

- `SanguiBlog-server/src/main/resources/application.yaml`
- Key: `site.version`
- Current value: `"V2.3.1"`
- Target value: `"V2.3.2"`

Backend data flow:

```text
application.yaml site.version
-> SiteService.siteVersion @Value("${site.version:V1.0.0}")
-> SiteService.meta()
-> SiteMetaDto.version
-> GET /api/site/meta ApiResponse<SiteMetaDto>
```

Frontend display/fallback flow:

```text
useBlogData.loadMeta()
-> meta.version
-> HomeView.jsx siteVersion fallback
-> Navigation.jsx brand version fallback
```

Expected frontend fallback literals:

- `SanguiBlog-front/src/appfull/public/HomeView.jsx`: `meta?.version || 'V2.3.2'`
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`: `siteVersion || 'V2.3.2'`

README version text:

- `README.md`: `> Current version: **V2.3.2**`
- `README.zh-CN.md`: equivalent Chinese current-version line with `V2.3.2`

## Cross-Layer Contract

### 1. Scope / Trigger

The existing site meta version value changes. The field already exists and is already consumed by the frontend. This is not a new contract.

### 2. Signatures

- Backend config: `site.version: "V2.3.2"`
- Backend endpoint: `GET /api/site/meta` unchanged
- Backend response field: `data.version` unchanged key, new value only
- Frontend consumers:
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- DB: no change
- Env/config: no new key
- Command surface: no new command; existing Docker and Maven/NPM commands remain unchanged

### 3. Payload Fields

Request:

- No request payload.

Response:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "version": "V2.3.2"
  }
}
```

Only the value changes from `V2.3.1` to `V2.3.2`.

### 4. Validation / Error Matrix

| Case | Expected Result | Assertion Point |
| --- | --- | --- |
| Backend config has `site.version: "V2.3.2"` | `/api/site/meta` returns `data.version = "V2.3.2"` | config grep and/or backend compile |
| Frontend receives meta with `version` | Home/nav render backend-provided `V2.3.2` | source review; optional browser/manual smoke |
| Frontend meta missing or stale cache absent | Home/nav fallback is `V2.3.2` | grep `V2.3.1` no longer appears in fallback files |
| README pair updated | English and Chinese current-version lines match target | grep both README files |
| No release doc requested | No new `release/` docs are created | git status review |
| Ignored generated/local state exists | It remains ignored and untracked for upload | `git status --short --ignored`; `git check-ignore -v` |
| Unrelated AI widget changes exist | They remain untouched and unstaged by this task | `git status --short` path review |

### 5. Good / Base / Bad Cases

Good:

- `application.yaml`, `HomeView.jsx`, `Navigation.jsx`, `README.md`, and `README.zh-CN.md` consistently show `V2.3.2`.
- README content remains synchronized between English and Chinese versions.
- `.gitignore` covers generated/local/secret/runtime artifacts found during review.
- Unrelated AI widget files are left exactly as they were.

Base:

- Only the version strings need modification because README content is otherwise current.
- Existing ignored local files such as `.env`, `node_modules`, `dist`, `target`, `uploads`, `backups`, `Trellis/`, and `.trellis/**/__pycache__` stay ignored; no deletion is required.

Bad:

- Creating release documents despite explicit "no release doc" instruction.
- Updating only README but not `site.version`, or updating only backend while frontend fallback remains `V2.3.1`.
- Reverting, staging, or editing the unrelated AI pending-reply files.
- Adding broad ignore rules that hide useful source/docs files.
- Treating terminal mojibake as source-file corruption and rewriting Chinese README unnecessarily.

## Implementation Plan

1. Recheck working tree:
   - Run `git status --short --branch`.
   - Confirm branch is `feature/openai-compatible-ai-provider-config`.
   - Record unrelated AI widget files and do not touch them.
2. Update version source of truth:
   - Modify `SanguiBlog-server/src/main/resources/application.yaml` from `site.version: "V2.3.1"` to `"V2.3.2"`.
3. Update frontend fallbacks:
   - Modify `SanguiBlog-front/src/appfull/public/HomeView.jsx` fallback from `'V2.3.1'` to `'V2.3.2'`.
   - Modify `SanguiBlog-front/src/appfull/ui/Navigation.jsx` fallback from `'V2.3.1'` to `'V2.3.2'`.
4. Update README pair:
   - Modify `README.md` current version line to `V2.3.2`.
   - Modify `README.zh-CN.md` current version line to `V2.3.2`.
   - Compare sections for parity: Quick Start, Version Update/Redeploy, AI Assistant, Further Reading, Project Structure, Troubleshooting.
   - If stale content is found, update both files with equivalent meaning.
   - Do not create release docs.
5. Review cleanup and ignore state:
   - Run `git status --short --ignored`.
   - Run `git check-ignore -v` on ignored generated/local candidates.
   - If a generated/temp/secret/runtime artifact is not ignored, update `.gitignore` narrowly.
   - If a useful source/doc file is untracked, leave it visible for user review; do not broad-ignore it.
   - Do not delete or stage unrelated AI widget files.
6. Verification:
   - Run required commands listed below.
   - Summarize changed files and excluded unrelated files.

## Expected Files To Modify

Likely required:

- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- `README.md`
- `README.zh-CN.md`

Only if cleanup review finds a real shared ignore gap:

- `.gitignore`
- `SanguiBlog-front/.gitignore`

Do not modify:

- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
- `SanguiBlog-front/src/appfull/ui/aiPendingReply.test.js`
- any `release/` path
- AI provider/RAG backend/frontend files unrelated to version display

## Required Tests / Checks

Minimum required:

```powershell
rg -n "V2\.3\.1|V2\.3\.2" README.md README.zh-CN.md SanguiBlog-server\src\main\resources\application.yaml SanguiBlog-front\src\appfull\public\HomeView.jsx SanguiBlog-front\src\appfull\ui\Navigation.jsx
git status --short --ignored
git diff --check
python .\.trellis\scripts\task.py validate .trellis\tasks\06-07-06-07-version-2-3-2-readme-cleanup
```

Build/compile verification:

```powershell
cd SanguiBlog-server
mvn -q -DskipTests compile
```

```powershell
cd SanguiBlog-front
cmd /c npm run build
```

Optional manual/browser smoke after implementation:

- Open home page and verify brand/home version displays `V2.3.2`.
- Call `/api/site/meta` and verify `data.version` is `V2.3.2`.

## Acceptance Criteria

- `V2.3.1` no longer appears in the version display surfaces listed above.
- `V2.3.2` appears in backend config, frontend fallbacks, and both root READMEs.
- English and Chinese READMEs are semantically synchronized for any content touched.
- No release document exists or is modified.
- `.gitignore` review is documented; only narrow ignore changes are made if needed.
- Unrelated AI widget changes remain untouched.
- Required checks pass or any failures are reported with exact boundary and command output.
