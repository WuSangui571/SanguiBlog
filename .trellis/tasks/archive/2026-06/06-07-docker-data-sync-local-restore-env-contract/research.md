# Focused Code Research

## Relevant Specs

Read during Codex planning:

- `.trellis/spec/backend/index.md`
  - Backend stack and Pre-Development Checklist.
  - Always-read backend specs: directory structure, quality guidelines, code reuse guide.
- `.trellis/spec/frontend/index.md`
  - Read because the standard `$before-dev` asks for backend/frontend/guides indexes.
  - No frontend changes are expected for this task.
- `.trellis/spec/guides/index.md`
  - Requires retrieval report and cross-layer contract definition for env/command changes.
- `.trellis/spec/backend/directory-structure.md`
  - Confirms this task should not create backend controllers/services or duplicate business paths.
- `.trellis/spec/backend/quality-guidelines.md`
  - Docker/config work should use targeted verification and avoid secret logging.
- `.trellis/spec/backend/logging-guidelines.md`
  - No new logs should print secrets, tokens, passwords, prompts, or full sensitive content.
- `.trellis/spec/frontend/directory-structure.md`
  - Confirms no frontend entry point is relevant.
- `.trellis/spec/frontend/quality-guidelines.md`
  - Confirms no frontend static tests are required unless frontend code is touched.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
  - Use existing data-sync script and docs. Do not create a second restore script.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Docker data sync/restore is an infra/cross-layer contract.
  - Main guide: `docs/docker-data-sync.md`.
  - Local entry: `scripts/docker-data-sync-local-restore.ps1`.
  - Missing local `.env` keys should stop before restore and print only key names, not values.
  - Local health checks should respect `.env WEB_PORT` / actual Compose published web port.

## Current Project / Journal State

Startup context reported:

- Branch: `main`.
- Working directory has four unrelated frontend AI pending-reply changes.
- Current previous task: `.trellis/tasks/06-07-06-07-version-2-3-2-readme-cleanup`, status `planning`, assignee `deepseek`.
- Recent commits:
  - `d7f2ee2 chore:更新项目版本与环境变量模板`
  - `9eb8e44 chore:record ai rag admin capability task`
  - `fcdda27 feat:新增 AI 聊天与 RAG 能力开关`
  - `9818737 chore:record openai-compatible ai provider task`
  - `f8c3049 fix:增强AI续问RAG检索与空流回退`

Recent journal entries record:

- Session 26 completed OpenAI-compatible provider/RAG follow-up, including `.env.example`, Compose, README, `docs/docker-deploy.md`, and `docs/docker-data-sync.md` updates.
- Session 27 completed AI RAG admin capability closeout.
- Separate AI pending-reply UI files remain uncommitted and unrelated.

## Retrieval Report

Keywords searched:

```text
docker-data-sync, local restore, RestoreOnly, SkipDownload, ServerHost, ServerUser,
RequiredEnvKeys, JWT_SECRET, MYSQL_DATABASE, POSTGRES_DB, docker compose config,
env, backup, restore
```

Candidate implementations:

- `scripts/docker-data-sync-local-restore.ps1`
  - Main executable restore/backup script. This is the correct implementation to modify.
- `docs/docker-data-sync.md`
  - Main handbook for production-to-local backup and local Docker restore.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Reusable infra/cross-layer contract for Docker data sync and restore.
- `.env.example`
  - Env template showing current defaultable and sensitive env contract.
- `docker-compose.yml`
  - Local Compose env defaults/fail-fast interpolation.
- `docker-compose.prod.yml`
  - Production Compose env defaults/fail-fast interpolation.

Decision:

- Modify existing script and docs. Do not create a new sync script.

Duplicate risk:

- Low if implementation stays in `scripts/docker-data-sync-local-restore.ps1` and `docs/docker-data-sync.md`.
- Creating a second helper script would split the operator workflow and is forbidden.

## Code Patterns Found

### PowerShell parameter binding currently causes the prompt

`scripts/docker-data-sync-local-restore.ps1` declares:

```powershell
[Parameter(Mandatory = $true, HelpMessage = "Server hostname or IP")]
[string]$ServerHost,

[Parameter(Mandatory = $true, HelpMessage = "SSH username")]
[string]$ServerUser,
```

Because mandatory binding happens before script body mode checks, PowerShell prompts for both values even when `-Mode RestoreOnly -SkipDownload` would skip all SSH/remote checks.

### Existing script already knows SkipDownload should skip SSH

Later preflight has:

```powershell
if ($SkipDownload -and $Mode -eq "RestoreOnly") {
    Write-Step "  1e) SSH check skipped (SkipDownload uses existing local backup files)"
}
```

This confirms the parameter prompt is a binding-layer bug, not an intentional RestoreOnly requirement.

### Existing mode validation only covers RemoteProjectDir and RemoteBackupDir

Current early validation includes:

```powershell
if ($Mode -eq "BackupOnly" -or $Mode -eq "BackupAndRestore") {
    if (-not $RemoteProjectDir) { throw ... }
    ...
}

if ($Mode -eq "RestoreOnly" -and -not $SkipDownload -and -not $RemoteBackupDir) {
    throw "-RemoteBackupDir is required in RestoreOnly mode when not using -SkipDownload."
}
```

It should gain explicit conditional checks for `ServerHost` and `ServerUser`.

### Local required env list is too strict for current Compose defaults

Current script hard-requires:

```powershell
$RequiredEnvKeys = @(
    "JWT_SECRET",
    "MYSQL_PASSWORD",
    "MYSQL_ROOT_PASSWORD",
    "POSTGRES_PASSWORD",
    "MYSQL_DATABASE",
    "MYSQL_USER",
    "POSTGRES_DB",
    "POSTGRES_USER"
)
```

But current Compose and restore code provide defaults for database name/user keys:

- `docker-compose.yml`
  - `MYSQL_DATABASE: "${MYSQL_DATABASE:-sanguiblog_db}"`
  - `MYSQL_USER: "${MYSQL_USER:-sanguiblog_user}"`
  - `POSTGRES_DB: "${POSTGRES_DB:-sanguiblog_ai}"`
  - `POSTGRES_USER: "${POSTGRES_USER:-sanguiblog_pg_user}"`
- restore script later uses `Get-LocalEnvValue` with defaults:
  - `MYSQL_DATABASE` default `sanguiblog_db`
  - `MYSQL_USER` default `sanguiblog_user`
  - `POSTGRES_DB` default `sanguiblog_ai`
  - `POSTGRES_USER` default `sanguiblog_pg_user`

Therefore `MYSQL_DATABASE` and `POSTGRES_DB` should not be hard failures when omitted.

### Compose fail-fast keys are narrower

`.trellis/spec/guides/cross-layer-thinking-guide.md` and Compose agree that hard missing values are:

- `JWT_SECRET`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `POSTGRES_PASSWORD`

Those should stay blocking for actual restore.

### Dry-run status is misleading

Current local env failure path:

```powershell
if ($missingKeys.Count -gt 0) {
    Write-Fail "Missing or empty required keys in .env: ..."
    ...
    if (-not $DryRun) { throw ".env missing required keys." }
}
```

In dry-run, this prints `FAIL` but continues to the success banner. That explains the user's observed contradictory output.

### Current local `.env` state supports the diagnosis

Codex checked key status only, without printing values:

```text
JWT_SECRET=MISSING
MYSQL_PASSWORD=SET
MYSQL_ROOT_PASSWORD=SET
POSTGRES_PASSWORD=SET
MYSQL_DATABASE=MISSING
MYSQL_USER=SET
POSTGRES_DB=MISSING
POSTGRES_USER=SET
```

After the script fix, `MYSQL_DATABASE` and `POSTGRES_DB` should not block. `JWT_SECRET` should still block until the user fills it.

## Files Likely To Modify

Likely:

- `scripts/docker-data-sync-local-restore.ps1`
  - Conditional remote parameter validation.
  - Split hard-required/defaultable env preflight.
  - Honest dry-run failure handling.
- `docs/docker-data-sync.md`
  - Local-only `RestoreOnly + -SkipDownload` examples.
  - Parameter table conditional requirements.
  - Troubleshooting/env requirements wording.

Possible:

- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - Only if the reusable contract needs clarification around defaultable DB keys and local-only SkipDownload parameters.
- A targeted script/static test file.
  - Only if a low-risk PowerShell/static-test pattern is introduced or already available.

Do not modify:

- `.env`
- backend Java source
- frontend source
- `docker-compose.yml` / `docker-compose.prod.yml` unless implementation proves the Compose contract itself is wrong
- unrelated AI pending-reply files

## Risk / Boundary Notes

- Do not weaken hard secret/password checks. Missing `JWT_SECRET` should remain blocking because Compose/backend startup require it.
- Do not print `.env` values, `docker compose config` output, or any secrets.
- PowerShell mandatory parameter prompts happen before script code executes; the fix must change `[Parameter(Mandatory = $true)]` declarations, not only later validation.
- Avoid broad dry-run rewrites that mask real warnings. Use explicit blocking failures and non-blocking warnings.
- Real restore can overwrite local Docker data after safety backup. Do not run it during implementation without explicit user approval.
- Keep PowerShell 5.1 compatibility. Avoid syntax that only works in PowerShell 7.
- Current terminal output may display Chinese docs as mojibake in this environment; do not treat that as file corruption.

## Required Tests

Required:

```powershell
git diff --check
docker compose config --quiet
```

Required parameter regression:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -SkipDownload `
  -DryRun
```

Assertion:

- no `ServerHost` / `ServerUser` prompt.
- allowed to fail later for missing local backup files or hard-required env keys.
- must not report success after a blocking `FAIL`.

Required user-path regression:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload `
  -DryRun
```

Assertions:

- no remote prompt.
- `MYSQL_DATABASE` / `POSTGRES_DB` omitted from hard missing list.
- `JWT_SECRET` still reported if absent.
- no real restore operations run.

Required remote-mode validation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupOnly `
  -RemoteProjectDir /tmp/sanguiblog `
  -DryRun
```

Assertion:

- fails clearly because `ServerHost` and `ServerUser` are conditionally required.

Trellis validation:

```powershell
python .\.trellis\scripts\task.py validate .trellis\tasks\06-07-docker-data-sync-local-restore-env-contract
```

Not required unless business code is unexpectedly touched:

- Maven tests.
- Frontend node tests, lint, or build.
