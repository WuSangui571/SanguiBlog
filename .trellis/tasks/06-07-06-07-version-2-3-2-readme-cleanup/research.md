# Research Notes

## Relevant Specs

- `.trellis/spec/backend/index.md`
  - Read first as backend spec index.
  - Pre-development checklist requires directory structure, quality guidelines, and code reuse guide.
- `.trellis/spec/backend/directory-structure.md`
  - Site meta/settings are owned by `SiteController`, `SiteService`, `site_settings`, and related existing paths.
- `.trellis/spec/backend/quality-guidelines.md`
  - Version contract: site version lives in `application.yaml` under `site.version`; release docs only when explicitly requested.
  - Pure docs/spec changes require static review; backend compile-risk changes require `mvn -q -DskipTests compile`.
- `.trellis/spec/frontend/index.md`
  - Read first as frontend spec index.
  - Data loading/auth/site meta work points to hook/state/type/cross-layer specs.
- `.trellis/spec/frontend/directory-structure.md`
  - `AppFull.jsx`, `appfull/public`, and `appfull/ui` are current active surfaces; do not create duplicate home/nav implementations.
- `.trellis/spec/frontend/state-management.md`
  - `useBlogData.jsx` caches site meta in `sessionStorage` under `sg_site_meta_cache`; backend `/api/site/meta` changes should keep safe defaults aligned.
- `.trellis/spec/frontend/quality-guidelines.md`
  - Home uses `HomeView.jsx`, `Hero.jsx`, `homeRedesign.css`, and `Navigation.jsx`; avoid unrelated UI changes.
- `.trellis/spec/guides/index.md`
  - Cross-layer guide applies when frontend consumes backend data.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
  - Reuse existing site meta and navigation/home paths; do not create duplicate utilities or display surfaces.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Site meta changes are cross-layer; define existing endpoint/field contract even when only the value changes.

## Code Patterns Found

Searches run:

```powershell
rg -n "site\.version|version:|class SiteService|SiteMetaDto|meta\(\)|/api/site/meta|const siteVersion|home-nav-brand__version" SanguiBlog-server\src\main\java SanguiBlog-server\src\main\resources SanguiBlog-front\src
rg -n "V2\.3\.1|V2\.3\.0|V2\.3\.2|Current version|当前版本|release/|release\\|AI_DASHSCOPE|DASHSCOPE|AI_OPENAI" README.md README.zh-CN.md SanguiBlog-server\src\main\resources\application.yaml SanguiBlog-front\src\appfull\public\HomeView.jsx SanguiBlog-front\src\appfull\ui\Navigation.jsx .env.example docs\docker-deploy.md docs\docker-data-sync.md
git status --short --ignored
git check-ignore -v .env SanguiBlog-front/.env.local SanguiBlog-front/dist SanguiBlog-server/target Trellis backups docker/ip2region/example.xdb uploads/example.txt .trellis/scripts/common/__pycache__
```

Existing candidates:

- `SanguiBlog-server/src/main/resources/application.yaml`
  - Current source of truth has `site.version: "V2.3.1"`.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`
  - Injects `@Value("${site.version:V1.0.0}") private String siteVersion;`.
  - Returns `.version(siteVersion)` in `meta()`.
  - No service logic change needed.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteMetaDto.java`
  - Already has `private String version;`.
  - No DTO change needed.
- `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/SiteController.java`
  - Existing `GET /api/site/meta` returns `ApiResponse.ok(siteService.meta())`.
  - No controller change needed.
- `SanguiBlog-front/src/hooks/useBlogData.jsx`
  - Loads `fetchSiteMeta()`, stores `meta`, caches in `sessionStorage`, and applies asset origin.
  - No cache or loader change needed for value-only version bump.
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - Current fallback: `const siteVersion = meta?.version || 'V2.3.1';`.
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - Current brand fallback: `{siteVersion || 'V2.3.1'}`.
- `README.md`
  - Current version line: `> Current version: **V2.3.1**`.
  - OpenAI-compatible AI settings are present and current with recent provider migration.
- `README.zh-CN.md`
  - Current version line includes `V2.3.1`.
  - PowerShell output may show mojibake, but grep confirms actual UTF-8 Chinese/OpenAI-compatible text is present.
- `.gitignore`
  - Already ignores `.env`, `.env.*`, targets/dist/node_modules, upload/runtime folders, backups, `/Trellis/`, Docker GeoIP XDB copies, patches/rejects/backups, and Python cache.
- `SanguiBlog-front/.gitignore`
  - Already ignores `*.local`, `node_modules`, `dist`, and editor files.

Decision:

- Modify existing version literals only.
- Modify README pair only for current version and any confirmed stale mirrored content.
- Reuse existing ignore rules; change `.gitignore` only if a real nonignored generated artifact is discovered during DeepSeek's live check.

Duplicate implementation risk:

- No new endpoint, DTO field, component, helper, config key, or doc family should be created.
- Existing version display chain remains the only chain.

## Cleanup / Ignore Findings

Current nonignored working tree changes are unrelated AI widget work:

- `M SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- `M SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
- `?? SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
- `?? SanguiBlog-front/src/appfull/ui/aiPendingReply.test.js`

Ignored/generated/local candidates already covered:

- `.env`
- `.idea/`
- `.kilo/`
- `.m2/`
- `.trellis/scripts/common/__pycache__/`
- `.vscode/`
- `SanguiBlog-front/.env.local`
- `SanguiBlog-front/dist/`
- `SanguiBlog-front/node_modules/`
- `SanguiBlog-server/src/main/resources/application-local.yaml`
- `SanguiBlog-server/target/`
- `Trellis/`
- `backups/`
- `docker/ip2region/`
- `uploads/`

`git check-ignore -v` confirmed:

- `.env` -> root `.gitignore`
- `SanguiBlog-front/.env.local` -> frontend `.gitignore`
- `SanguiBlog-front/dist` -> frontend `.gitignore`
- `SanguiBlog-server/target` -> root `.gitignore`
- `Trellis` -> root `.gitignore`
- `backups` -> root `.gitignore`
- `docker/ip2region/*.xdb` -> root `.gitignore`
- `uploads/**` -> root `.gitignore`
- `.trellis/**/__pycache__` -> `.trellis/.gitignore`

Tracked cleanup search:

```powershell
git ls-files | rg -n "(^|/)(target|dist|node_modules|__pycache__|logs?|uploads|backups|Trellis)(/|$)|\.tmp$|\.bak$|\.orig$|\.rej$|\.patch$|\.log$|\.tar\.gz$|\.dump$|release/"
```

Only archived Trellis task files with `release` in the historical task name appeared. No tracked generated `target`, `dist`, `node_modules`, upload, backup, dump, or release directory artifact was found in this check.

## Files Likely To Modify

Required:

- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- `README.md`
- `README.zh-CN.md`

Conditional only if live cleanup check finds a real shared ignore gap:

- `.gitignore`
- `SanguiBlog-front/.gitignore`

## Risk / Boundary Notes

- Do not touch unrelated AI widget changes already present in the working tree.
- Do not create release docs.
- Do not treat PowerShell mojibake as README corruption; use UTF-8-aware editing.
- Do not broaden cleanup into deleting user/local state. The safer acceptance path is ignore coverage plus status review.
- If `npm run build` or Maven compile fails due to unrelated existing AI widget changes, report the failure boundary precisely instead of changing those files.

## Required Tests

Required grep/static checks:

```powershell
rg -n "V2\.3\.1|V2\.3\.2" README.md README.zh-CN.md SanguiBlog-server\src\main\resources\application.yaml SanguiBlog-front\src\appfull\public\HomeView.jsx SanguiBlog-front\src\appfull\ui\Navigation.jsx
git status --short --ignored
git diff --check
python .\.trellis\scripts\task.py validate .trellis\tasks\06-07-06-07-version-2-3-2-readme-cleanup
```

Required build/compile checks:

```powershell
cd SanguiBlog-server
mvn -q -DskipTests compile
```

```powershell
cd SanguiBlog-front
cmd /c npm run build
```

Optional smoke:

- Verify `/api/site/meta` returns `version: "V2.3.2"`.
- Verify home/nav UI displays `V2.3.2`.
