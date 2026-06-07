# Docker Data Sync Local Restore Env Contract Fix PRD

## Summary

Fix the Docker data sync local restore workflow after the recent `.env.example` structure change so the documented RestoreOnly + SkipDownload flow works again without unnecessary remote prompts and with a correct local `.env` preflight contract.

This is a planning-only handoff from Codex to DeepSeek. Codex must not modify business implementation files in this pass. DeepSeek should implement the narrow infra/script/docs fix on a new branch created from `main`.

## Scope Classification

Simple Task.

Reasoning:

- The failing behavior is concentrated in one PowerShell script plus matching Docker data-sync docs/spec context.
- The task changes command/env validation behavior, not backend business APIs, frontend UI, database schema, permissions, storage model, or AI/RAG runtime logic.
- It is still an infra/cross-layer contract because it affects operator commands, local `.env` expectations, Docker Compose validation, local restore safety, and documentation.

## Current Project State

- Current git branch from `$start`: `main...origin/main`.
- Working tree already contains unrelated AI pending-reply UI changes:
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
  - `SanguiBlog-front/src/appfull/ui/aiPendingReply.js`
  - `SanguiBlog-front/src/appfull/ui/aiPendingReply.test.js`
- Existing active Trellis task before this one: `06-07-06-07-version-2-3-2-readme-cleanup`, status `planning`, assignee `deepseek`.
- Recent journal records completed OpenAI-compatible provider/RAG work. That work changed `.env.example`, Compose env injection, Docker docs, and data sync docs.
- Current local `.env` key-state check printed only key status, not values. It shows:
  - `JWT_SECRET=MISSING`
  - `MYSQL_DATABASE=MISSING`
  - `POSTGRES_DB=MISSING`
  - `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_PASSWORD`, `MYSQL_USER`, `POSTGRES_USER` are present and set.

## User-Reported Failure

Manual command from `D:\01-TempFiles\2026-06-05-备份记录\同步手册.md` step 4:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload `
  -DryRun
```

Observed behavior:

- PowerShell prompts for `ServerHost` and `ServerUser` even though `-SkipDownload` means no SSH/remote backup access is needed.
- Preflight prints:

```text
FAIL: Missing or empty required keys in .env: JWT_SECRET, MYSQL_DATABASE, POSTGRES_DB
```

- Then dry-run still prints:

```text
DRY-RUN COMPLETE (RestoreOnly mode) - All preflight checks passed
```

This is inconsistent and makes it unclear whether step 5 real restore is safe to run.

## Goals

1. Make `RestoreOnly + -SkipDownload` callable without `-ServerHost`, `-ServerUser`, or `-RemoteBackupDir`.
2. Keep remote parameters required when the mode actually needs SSH:
   - `BackupOnly`
   - `BackupAndRestore` unless explicitly designed otherwise
   - `RestoreOnly` without `-SkipDownload`
3. Align local `.env` preflight with current `.env.example` and Compose defaults:
   - hard-required non-empty keys: `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_PASSWORD`
   - defaultable keys: `MYSQL_DATABASE`, `MYSQL_USER`, `POSTGRES_DB`, `POSTGRES_USER`
4. Preserve secret-safe output:
   - print only key names and status classes
   - never print actual `.env` values
   - never print full `docker compose config` output
5. Make dry-run status honest:
   - missing hard-required local restore keys must not be followed by "All preflight checks passed"
   - dry-run should exit non-zero or end with an explicit failed/preflight-blocked summary when hard prerequisites are missing
6. Update repo documentation for the local-only restore command and parameter table so it matches the fixed script behavior.

## Non-Goals / Forbidden Scope

- Do not edit the user's real `.env` file or add secrets.
- Do not print, log, commit, or copy actual secret values.
- Do not change Docker service topology, volume names, container names, image names, DB schema, upload storage model, AI provider behavior, RAG behavior, backend controllers/services, frontend UI, or API payloads.
- Do not modify unrelated AI pending-reply frontend files already present in the working tree.
- Do not modify the external manual at `D:\01-TempFiles\2026-06-05-备份记录\同步手册.md` unless the user explicitly asks later. Keep implementation inside the repo.
- Do not run a real restore during implementation. Only dry-run and config/static checks are allowed unless the user explicitly asks for destructive restore testing.
- Do not stage, commit, push, archive, or record a session until the user explicitly confirms implementation and manual testing later.

## Command Contract

### RestoreOnly with existing local backup files

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload `
  -DryRun
```

Expected:

- No prompt for `ServerHost`.
- No prompt for `ServerUser`.
- No requirement for `RemoteBackupDir`.
- SSH, remote backup dir, and remote file checks are skipped.
- Local tool, Docker daemon, Compose, local `.env`, local backup file, checksum, existing volume, and helper image checks still run.

### RestoreOnly with remote download

Command shape:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -ServerHost <host> `
  -ServerUser <user> `
  -RemoteBackupDir /tmp/sanguiblog-backup-<timestamp> `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -DryRun
```

Expected:

- Requires `ServerHost`, `ServerUser`, and `RemoteBackupDir`.
- Performs SSH and remote backup file checks.

### BackupOnly / BackupAndRestore

Command shape:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupOnly `
  -ServerHost <host> `
  -ServerUser <user> `
  -RemoteProjectDir /root/MyProjects/SanguiBlog `
  -RemoteComposeFile docker-compose.prod.yml `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -DryRun
```

Expected:

- Requires `ServerHost`, `ServerUser`, and `RemoteProjectDir`.
- Keeps `RemoteBackupDir` auto-generation behavior.
- Does not require local Docker/Compose/.env for `BackupOnly`.

## Env Payload Contract

Hard-required local restore keys:

| Key | Why Required | Default Allowed |
| --- | --- | --- |
| `JWT_SECRET` | backend/Compose fail-fast secret | No |
| `MYSQL_PASSWORD` | MySQL app user password and Compose fail-fast | No |
| `MYSQL_ROOT_PASSWORD` | MySQL root restore/import path | No |
| `POSTGRES_PASSWORD` | PgVector restore and Compose fail-fast | No |

Defaultable local restore keys:

| Key | Default | Why |
| --- | --- | --- |
| `MYSQL_DATABASE` | `sanguiblog_db` | Compose defaults and script `Get-LocalEnvValue` already default to this |
| `MYSQL_USER` | `sanguiblog_user` | Compose defaults and script `Get-LocalEnvValue` already default to this |
| `POSTGRES_DB` | `sanguiblog_ai` | Compose defaults and script `Get-LocalEnvValue` already default to this |
| `POSTGRES_USER` | `sanguiblog_pg_user` | Compose defaults and script `Get-LocalEnvValue` already default to this |

Sensitive values must stay blank in `.env.example`.

## Validation / Error Matrix

| Case | Expected Result | Assertion Point |
| --- | --- | --- |
| `RestoreOnly + -SkipDownload + -DryRun` with no remote args and valid local env | No prompt; remote checks skipped; dry-run passes if backup files/checks pass | command exits 0; output contains skipped SSH/remote checks |
| `RestoreOnly + -SkipDownload + -DryRun` with `JWT_SECRET` missing | No prompt; fail/preflight-blocked summary; no "All checks passed" | command exits non-zero or explicit failed summary |
| `RestoreOnly + -SkipDownload + -DryRun` with `MYSQL_DATABASE` and `POSTGRES_DB` missing but passwords/JWT set | Does not fail on DB names; reports defaults or proceeds silently | output does not list those keys as missing required |
| `RestoreOnly` without `-SkipDownload` and no `ServerHost`/`ServerUser` | Fails with clear parameter validation before SSH | no interactive prompt preferred; no local restore starts |
| `BackupOnly` missing `ServerHost` or `ServerUser` | Fails with clear parameter validation | no remote command attempted |
| `BackupOnly` missing `RemoteProjectDir` | Existing clear failure preserved | no remote command attempted |
| Missing local backup file with `-SkipDownload` | Fails before touching local Docker volumes | `Missing local backup files` error retained |
| Dry-run remote SSH failure | Dry-run reports warning/failure state honestly | no "All checks passed" if blocking warning is collected |
| Actual restore missing hard-required local env | Fails before volume overwrite or import | no `docker compose down`, no DB import |
| Output includes secrets | Forbidden | review output strings and tests/static assertions |

## Good / Base / Bad Cases

Good:

- The user's step 4 local dry-run command no longer asks for fake `ServerHost`/`ServerUser`.
- With `JWT_SECRET` and required passwords filled, missing defaultable DB name/user keys do not block dry-run or restore.
- With `JWT_SECRET` missing, dry-run gives a clear failure and does not claim all checks passed.
- Docs show local-only RestoreOnly commands without remote parameters when `-SkipDownload` is used.

Base:

- Users who still run the older `RestoreOnly` remote-download command with `ServerHost`, `ServerUser`, and `RemoteBackupDir` keep working.
- BackupOnly and BackupAndRestore behavior stays compatible.
- `.env.example` keeps blank sensitive defaults.

Bad:

- Script still prompts for remote fields on a local-only restore.
- Script treats defaultable DB names as hard errors.
- Script hides missing `JWT_SECRET` and lets a real restore proceed.
- Dry-run prints a red `FAIL` line followed by "All preflight checks passed".
- Implementation modifies business backend/frontend/AI code or the user's real `.env`.

## Implementation Plan

1. Recheck working tree and protect unrelated files:
   - `git status --short --branch`
   - Do not touch AI pending-reply UI files.
2. Update script parameter declarations:
   - Change `ServerHost` and `ServerUser` from PowerShell mandatory to optional parameters.
   - Add explicit mode-aware validation immediately after `$ErrorActionPreference` setup or in the existing mode validation section.
   - Require `ServerHost`/`ServerUser` only for commands that need remote access.
3. Split env validation:
   - Replace single `$RequiredEnvKeys` list with hard-required keys and defaultable keys.
   - Check hard-required keys for presence and non-empty values.
   - For defaultable keys, either report a non-blocking default note or skip them as required checks.
   - Keep output value-safe.
4. Fix dry-run result semantics:
   - Track blocking preflight failures separately from non-blocking warnings.
   - If blocking failures exist in dry-run, print a failed/preflight-blocked summary and exit non-zero, or throw with a clear message before the "complete" banner.
   - Ensure existing non-blocking remote dry-run warnings do not silently become "All checks passed".
5. Update docs:
   - `docs/docker-data-sync.md`: local-only RestoreOnly commands should omit `ServerHost`, `ServerUser`, and `RemoteBackupDir` when `-SkipDownload` is used.
   - Parameter table should mark `ServerHost`/`ServerUser` as conditionally required, not always required.
   - Troubleshooting should clarify required hard-secret keys versus defaultable DB name/user keys.
   - Update `.trellis/spec/guides/cross-layer-thinking-guide.md` only if the reusable project contract should be clarified.
6. Add or update a narrow script test if feasible:
   - If no PowerShell test harness exists, add a low-risk static regression test under `scripts/` or a documented dry-run verification matrix.
   - Prefer assertions that parse the script text for optional parameter declarations and conditionally required behavior only if runtime dry-run requires Docker.
7. Run required checks listed below and record results.

## Expected Files To Modify

Likely:

- `scripts/docker-data-sync-local-restore.ps1`
- `docs/docker-data-sync.md`

Possible:

- `.trellis/spec/guides/cross-layer-thinking-guide.md`
- a new or updated script regression test file if a local pattern exists

Do not modify:

- `.env`
- `.env.example` unless implementation proves a template comment is objectively wrong
- `docker-compose.yml`
- `docker-compose.prod.yml`
- backend Java source
- frontend source
- unrelated AI pending-reply files
- external manual under `D:\01-TempFiles\...`

## Required Tests / Checks

Minimum after implementation:

```powershell
git diff --check
docker compose config --quiet
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload `
  -DryRun
```

Targeted parameter validation checks:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -SkipDownload `
  -DryRun
```

Expected: no `ServerHost`/`ServerUser` prompt. It may fail later on missing local backup files or missing hard-required env keys, but must not prompt for remote values.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupOnly `
  -RemoteProjectDir /tmp/sanguiblog `
  -DryRun
```

Expected: fails clearly because `ServerHost`/`ServerUser` are required for BackupOnly.

If docs/spec changed:

```powershell
python .\.trellis\scripts\task.py validate .trellis\tasks\06-07-docker-data-sync-local-restore-env-contract
```

Optional if Docker and backup files are ready:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupOnly `
  -ServerHost localhost `
  -ServerUser test `
  -RemoteProjectDir /tmp/sanguiblog `
  -DryRun
```

Do not run real restore without explicit user approval.

## Acceptance Criteria

- `RestoreOnly + -SkipDownload` no longer prompts for `ServerHost`/`ServerUser`.
- The script no longer treats missing `MYSQL_DATABASE` or `POSTGRES_DB` as hard failures when their Compose/script defaults apply.
- The script still blocks missing `JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `POSTGRES_PASSWORD` before real restore.
- Dry-run output no longer says "All preflight checks passed" after a blocking `FAIL`.
- `docs/docker-data-sync.md` matches the fixed command contract.
- No secret values are printed in test output, docs, or committed files.
- No unrelated business implementation files are modified.
