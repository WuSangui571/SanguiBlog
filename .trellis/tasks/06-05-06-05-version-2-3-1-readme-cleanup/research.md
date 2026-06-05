# Focused Code Research

## Relevant Specs

- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## Retrieval Report

- Keywords searched:
  - `V2.3.0`
  - `2.3.0`
  - `site.version`
  - `version`
  - `release`
  - `SANGUI_IMAGE_TAG`
  - `GHCR`
  - `bump-version`
  - `Trellis`
  - ignored/generated directories through `git status --ignored` and `git check-ignore -v`
- Candidate implementations:
  - `SanguiBlog-server/src/main/resources/application.yaml`: canonical `site.version` config currently set to `V2.3.0`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`: reads `site.version` through `@Value` and maps existing `SiteMetaDto.version`.
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteMetaDto.java`: existing `version` response field.
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`: home public view fallback currently `V2.3.0`.
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`: nav brand version fallback currently `V2.3.0`.
  - `README.md` and `README.zh-CN.md`: current version and project structure docs.
  - `.gitignore`: shared ignore rules for local/generated files.
  - `.git/info/exclude`: currently ignores `Trellis/` locally, but this is not shared with other clones.
- Decision: modify existing version/docs/ignore paths only.
- Duplicate risk: no new service, endpoint, DTO, frontend component, script, or release document is needed.

## Code Patterns Found

### Version Data Flow

```text
application.yaml site.version
-> SiteService.siteVersion
-> SiteService.meta()
-> SiteMetaDto.version
-> GET /api/site/meta data.version
-> AppFull.jsx passes meta?.version to Navigation
-> HomeView.jsx and Navigation.jsx display version, with local fallback strings
```

### Current Version References

- `README.md:7`: `Current version: **V2.3.0**`
- `README.zh-CN.md:7`: `当前版本：**V2.3.0**`
- `SanguiBlog-server/src/main/resources/application.yaml:56`: `version: "V2.3.0"`
- `SanguiBlog-front/src/appfull/public/HomeView.jsx:152`: `meta?.version || 'V2.3.0'`
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx:645`: `{siteVersion || 'V2.3.0'}`

### README Findings

- Both README files are valid UTF-8. If PowerShell 5.1 displays Chinese as mojibake, do not treat that as file corruption.
- README deployment content matches current Docker-first / GHCR production Compose direction.
- README port examples use `localhost:8090`, matching `.env.example WEB_PORT=8090` and `docker-compose.prod.yml` default port mapping.
- README secret list matches Compose fail-fast keys and `.env.example`:
  - `JWT_SECRET`
  - `MYSQL_PASSWORD`
  - `MYSQL_ROOT_PASSWORD`
  - `POSTGRES_PASSWORD`
- Stale README item found:
  - Both root README files list `release/` in project structure, but no root `release/` directory exists and the current task explicitly forbids release docs.

### Ignore / Cleanup Findings

`git status --short --ignored` showed only ignored local/generated paths and no active source changes before task creation:

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
- `docker/ip2region/`
- `uploads/`

`git ls-files` found no tracked files under the obvious ignored local/generated directories checked:

- `Trellis`
- `.idea`
- `.vscode`
- `.kilo`
- `.m2`
- `uploads`
- `docker/ip2region`
- `SanguiBlog-front/dist`
- `SanguiBlog-server/target`
- `.trellis/scripts/common/__pycache__`

`git check-ignore -v` showed:

- Most paths are covered by committed `.gitignore` or subdirectory `.gitignore`.
- `Trellis/` is covered only by `.git/info/exclude`, so a shared `.gitignore` entry is likely appropriate.
- `.trellis/scripts/common/__pycache__/` is covered by `.trellis/.gitignore`.

## Files Likely To Modify

- `SanguiBlog-server/src/main/resources/application.yaml`
- `SanguiBlog-front/src/appfull/public/HomeView.jsx`
- `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- `README.md`
- `README.zh-CN.md`
- `.gitignore` if adding shared ignore coverage for `Trellis/`

## Risk / Boundary Notes

- This is not a dependency/package version bump. Do not change `SanguiBlog-server/pom.xml`, `SanguiBlog-front/package.json`, or `SanguiBlog-front/package-lock.json`.
- Do not create `release/V2.3.1.md`.
- Do not remove local runtime/user state such as `.env` or `uploads/`.
- Do not delete dependency caches required for verification, especially `SanguiBlog-front/node_modules/`.
- Do not add `.trellis/` to `.gitignore`; `.trellis` is the active workflow source.
- If `Trellis/` is added to root `.gitignore`, keep it scoped exactly to the root-level legacy directory.
- If cleanup candidates are ignored and untracked, they do not need to be staged or committed. Local deletion is not required to satisfy "do not upload".

## Required Tests

```powershell
git diff --check
rg -n "V2\.3\.0|2\.3\.0" README.md README.zh-CN.md SanguiBlog-server/src/main/resources/application.yaml SanguiBlog-front/src/appfull/public/HomeView.jsx SanguiBlog-front/src/appfull/ui/Navigation.jsx
rg --files release
git status --short --ignored
docker compose -f docker-compose.prod.yml config --quiet
```

```powershell
cd SanguiBlog-server
mvn -q -DskipTests compile
```

```powershell
cd SanguiBlog-front
node src/appfull/noNativeBlockingDialogs.test.js
cmd /c npm run lint
cmd /c npm run build
```
