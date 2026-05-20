<#
.SYNOPSIS
    SanguiBlog Docker Data Sync - Local Restore Script
    从 Linux 服务器下载备份数据并恢复到本地 Windows Docker 环境。

.DESCRIPTION
    本脚本执行以下步骤：
    1. Preflight: 检查本地工具链、Docker Compose 项目、.env 必需键
    2. Download: 通过 SCP 从服务器下载 MySQL dump、PgVector dump、uploads 包、checksum 文件
    3. Verify: 校验 SHA256 checksum
    4. Backup: 备份本地现有 Docker volumes（安全措施）
    5. Stop: 停止 Docker Compose 服务
    6. Import MySQL: 清空数据库并重新导入
    7. Import PgVector: 清空数据库并重新导入（先确保 vector extension）
    8. Restore uploads: 解压上传文件到 uploads_data volume
    9. Restart: 启动所有服务并等待健康检查
    10. Health check: 验证核心 API 和上传路径

    使用 -DryRun 模式仅检查前置条件，不执行实际操作。

.PARAMETER ServerHost
    服务器主机名或 IP 地址。

.PARAMETER ServerUser
    SSH 登录用户名。

.PARAMETER RemoteBackupDir
    服务器上备份目录的绝对路径（包含 mysql.sql、pgvector.dump、uploads.tar.gz、SHA256SUMS）。

.PARAMETER LocalBackupDir
    本地备份暂存目录。默认: .\backups\docker-data-sync

.PARAMETER SshPort
    SSH 端口。默认: 22

.PARAMETER ComposeProjectDir
    docker-compose.yml 所在目录。默认: . (当前目录)

.PARAMETER RestoreUploadsMode
    uploads 恢复策略:
    - Replace: 完全替换 uploads_data volume 内容（默认）
    - Merge: 保留现有文件，仅覆盖同名文件

.PARAMETER SkipDownload
    跳过从服务器下载步骤（使用已有的本地备份文件）。

.PARAMETER SkipMysql
    跳过 MySQL 导入步骤。

.PARAMETER SkipPgVector
    跳过 PgVector 导入步骤。

.PARAMETER SkipUploads
    跳过 uploads 恢复步骤。

.PARAMETER DryRun
    仅检查前置条件，不执行任何修改操作。

.EXAMPLE
    # 先以 dry-run 模式检查所有前置条件
    .\scripts\docker-data-sync-local-restore.ps1 -ServerHost myserver -ServerUser admin -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 -DryRun

.EXAMPLE
    # 执行完整恢复
    .\scripts\docker-data-sync-local-restore.ps1 -ServerHost myserver -ServerUser admin -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000

.EXAMPLE
    # 仅恢复 MySQL（使用已有本地备份）
    .\scripts\docker-data-sync-local-restore.ps1 -ServerHost myserver -ServerUser admin -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 -SkipPgVector -SkipUploads -SkipDownload
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Server hostname or IP")]
    [string]$ServerHost,

    [Parameter(Mandatory = $true, HelpMessage = "SSH username")]
    [string]$ServerUser,

    [Parameter(Mandatory = $true, HelpMessage = "Remote backup directory absolute path")]
    [string]$RemoteBackupDir,

    [Parameter(Mandatory = $false)]
    [string]$LocalBackupDir = ".\backups\docker-data-sync",

    [Parameter(Mandatory = $false)]
    [int]$SshPort = 22,

    [Parameter(Mandatory = $false)]
    [string]$ComposeProjectDir = ".",

    [Parameter(Mandatory = $false)]
    [ValidateSet("Replace", "Merge")]
    [string]$RestoreUploadsMode = "Replace",

    [Parameter(Mandatory = $false)]
    [switch]$SkipDownload,

    [Parameter(Mandatory = $false)]
    [switch]$SkipMysql,

    [Parameter(Mandatory = $false)]
    [switch]$SkipPgVector,

    [Parameter(Mandatory = $false)]
    [switch]$SkipUploads,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ---- Color helpers ----
function Write-Step { param([string]$Msg) Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor Cyan }
function Write-Ok { param([string]$Msg) Write-Host "  OK: $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  WARN: $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "  FAIL: $Msg" -ForegroundColor Red }
function Write-Dry { param([string]$Msg) Write-Host "  [DRY-RUN] $Msg" -ForegroundColor DarkGray }

# ---- Config ----
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

$ExpectedBackupFiles = @("mysql.sql", "pgvector.dump", "uploads.tar.gz", "SHA256SUMS")
$DryRunWarnings = @()

# Resolve paths to absolute paths. LocalBackupDir may not exist yet, so avoid Resolve-Path for it.
$ComposeProjectDir = (Resolve-Path $ComposeProjectDir -ErrorAction Stop).Path
if ([System.IO.Path]::IsPathRooted($LocalBackupDir)) {
    $LocalBackupDir = [System.IO.Path]::GetFullPath($LocalBackupDir)
} else {
    $LocalBackupDir = [System.IO.Path]::GetFullPath((Join-Path $PWD.Path $LocalBackupDir))
}

# ====================================================================
# STEP 1: Preflight checks
# ====================================================================
Write-Step "STEP 1: Preflight checks"

Write-Step "  1a) Checking required tools..."
foreach ($toolName in @("docker", "ssh", "scp")) {
    try {
        $null = Get-Command $toolName -ErrorAction Stop
        Write-Ok "$toolName is available"
    } catch {
        Write-Fail "$toolName is NOT available"
        if ($DryRun) { continue }
        throw "Missing required tool: $toolName. Please install it before running this script."
    }
}

try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) { throw $composeVersion }
    Write-Ok "docker compose is available"
} catch {
    Write-Fail "docker compose is NOT available"
    if (-not $DryRun) { throw "Docker Compose v2 is required." }
}

# Check for tar (Windows may not have it natively)
try {
    $tarOut = tar --version 2>&1
    Write-Ok "tar is available"
} catch {
    Write-Warn "tar is not available natively; will try Git Bash / WSL tar"
}

# Check for SHA256 checksum tool
$Sha256Tool = $null
try {
    $null = Get-Command "sha256sum" -ErrorAction Stop
    $Sha256Tool = "sha256sum"
} catch {
    try {
        $null = Get-Command "certutil" -ErrorAction Stop
        $Sha256Tool = "certutil"
    } catch {
        Write-Fail "Neither sha256sum nor certutil is available for checksum verification"
    }
}
if ($Sha256Tool) { Write-Ok "checksum tool: $Sha256Tool" }

# --- 1b) Check Docker daemon ---
Write-Step "  1b) Checking Docker daemon..."
$DockerDaemonAvailable = $false
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon not running" }
    $DockerDaemonAvailable = $true
    Write-Ok "Docker daemon is running"
} catch {
    Write-Fail "Docker daemon is not running or accessible"
    if ($DryRun) {
        $DryRunWarnings += "Docker daemon is not running or accessible"
    } else {
        throw "Docker daemon is required."
    }
}

# --- 1c) Check docker-compose.yml ---
Write-Step "  1c) Checking docker-compose.yml..."
$ComposeFile = Join-Path $ComposeProjectDir "docker-compose.yml"
if (-not (Test-Path $ComposeFile)) {
    Write-Fail "docker-compose.yml not found at $ComposeProjectDir"
    throw "docker-compose.yml not found."
}
Write-Ok "docker-compose.yml found"

try {
    Push-Location $ComposeProjectDir
    $composeConfig = docker compose config 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "docker compose config failed: $composeConfig"
        throw "docker compose config error. Fix the compose file before proceeding."
    }
    Write-Ok "docker compose config is valid"
} finally {
    Pop-Location
}

# --- 1d) Check .env for required keys ---
Write-Step "  1d) Checking .env for required keys..."
$EnvFile = Join-Path $ComposeProjectDir ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Fail ".env file not found at $ComposeProjectDir"
    throw ".env file is required. Copy .env.example to .env and fill in required values."
}

$envContent = Get-Content $EnvFile -Raw
$missingKeys = @()
foreach ($key in $RequiredEnvKeys) {
    # Match: KEY=value (where value is non-empty, non-commented)
    if ($envContent -notmatch "(?m)^\s*${key}=[^\r\n]+") {
        $missingKeys += $key
    }
}

if ($missingKeys.Count -gt 0) {
    Write-Fail "Missing or empty required keys in .env: $($missingKeys -join ', ')"
    Write-Host "  These keys must be set in .env before running restore." -ForegroundColor Yellow
    Write-Host "  Sensitive values are NOT printed. Edit .env manually to fill them in." -ForegroundColor Yellow
    if (-not $DryRun) { throw ".env missing required keys." }
} else {
    Write-Ok "All required .env keys are present (values not inspected)"
}

# --- 1e) Check SSH connectivity ---
Write-Step "  1e) Checking SSH connectivity to $ServerUser@${ServerHost}..."
try {
    $sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p $SshPort "$ServerUser@$ServerHost" "echo SSH_OK" 2>&1
    if ($sshTest -match "SSH_OK") {
        Write-Ok "SSH connection successful"
    } else {
        Write-Fail "SSH connection failed: $sshTest"
        if ($DryRun) {
            $DryRunWarnings += "SSH connection failed"
        } else {
            throw "Cannot connect to server via SSH."
        }
    }
} catch {
    Write-Warn "SSH check error: $_"
    if ($DryRun) { $DryRunWarnings += "SSH check error" }
}

# --- 1f) Check remote backup directory ---
Write-Step "  1f) Checking remote backup directory..."
try {
    $remoteCheck = ssh -o ConnectTimeout=10 -p $SshPort "$ServerUser@$ServerHost" "ls -la '$RemoteBackupDir'" 2>&1
    Write-Host $remoteCheck
    Write-Ok "Remote backup directory accessible"
} catch {
    Write-Fail "Cannot access remote backup directory: $RemoteBackupDir"
    if ($DryRun) {
        $DryRunWarnings += "Remote backup directory not accessible"
    } else {
        throw "Remote backup directory not accessible."
    }
}

# --- 1g) Check remote backup files exist ---
Write-Step "  1g) Checking remote backup files..."
$remoteMissing = @()
foreach ($file in $ExpectedBackupFiles) {
    try {
        $check = ssh -o ConnectTimeout=10 -p $SshPort "$ServerUser@$ServerHost" "test -f '$RemoteBackupDir/$file' && echo EXISTS || echo MISSING" 2>&1
        if ($check -match "EXISTS") {
            Write-Ok "Remote file exists: $file"
        } else {
            Write-Fail "Remote file MISSING: $file"
            $remoteMissing += $file
        }
    } catch {
        Write-Fail "Cannot check remote file: $file"
        $remoteMissing += $file
    }
}

if ($remoteMissing.Count -gt 0 -and -not $SkipDownload) {
    Write-Fail "Missing remote files: $($remoteMissing -join ', ')"
    if ($DryRun) {
        $DryRunWarnings += "Missing remote files: $($remoteMissing -join ', ')"
    } else {
        throw "Remote backup files are incomplete. Aborting before touching local volumes."
    }
}

# --- 1h) Check existing Docker volumes (warn if data exists) ---
Write-Step "  1h) Checking existing Docker volumes..."
if (-not $DockerDaemonAvailable) {
    Write-Warn "Skipping Docker volume check because Docker daemon is not accessible"
} else {
    Push-Location $ComposeProjectDir
    try {
        $volumeNames = @("mysql_data", "pgvector_data", "uploads_data")
        # Get the project prefix from docker compose
        $projectName = (docker compose config 2>&1 | Select-String "^\s*name:" | Select-Object -First 1 | ForEach-Object { $_ -replace '.*name:\s*', '' }).Trim()
        if (-not $projectName) { $projectName = "sanguiblog" }

        foreach ($vol in $volumeNames) {
            $volFullName = "${projectName}_${vol}"
            $volInfo = docker volume inspect $volFullName 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Warn "Volume exists: $volFullName (will be backed up before overwrite)"
            } else {
                Write-Ok "Volume does not exist yet: $volFullName"
            }
        }
    } finally {
        Pop-Location
    }
}

if ($DryRun) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    if ($DryRunWarnings.Count -gt 0) {
        Write-Host "DRY-RUN COMPLETE WITH WARNINGS" -ForegroundColor Yellow
        foreach ($warning in $DryRunWarnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    } else {
        Write-Host "DRY-RUN COMPLETE - All preflight checks passed" -ForegroundColor Green
    }
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "No modifications were made." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PREFLIGHT COMPLETE - Proceeding with restore" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Start-Sleep -Seconds 1

# ====================================================================
# STEP 2: Download backup files
# ====================================================================
if (-not $SkipDownload) {
    Write-Step "STEP 2: Downloading backup files from $ServerUser@${ServerHost}:$RemoteBackupDir"

    New-Item -ItemType Directory -Force -Path $LocalBackupDir | Out-Null

    foreach ($file in $ExpectedBackupFiles) {
        Write-Host "  Downloading $file..."
        scp -P $SshPort "$ServerUser@${ServerHost}:$RemoteBackupDir/$file" "$LocalBackupDir/"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to download $file"
        }
        Write-Ok "Downloaded $file"
    }

    Write-Ok "All files downloaded to $LocalBackupDir"
} else {
    Write-Step "STEP 2: Skipped (SkipDownload)"

    $localMissing = @()
    foreach ($file in $ExpectedBackupFiles) {
        $localPath = Join-Path $LocalBackupDir $file
        if (-not (Test-Path $localPath)) {
            Write-Fail "Local file missing: $file"
            $localMissing += $file
        }
    }
    if ($localMissing.Count -gt 0) {
        throw "Missing local backup files: $($localMissing -join ', '). Cannot proceed with SkipDownload."
    }
    Write-Ok "All expected backup files exist locally"
}

# ====================================================================
# STEP 3: Verify checksums
# ====================================================================
Write-Step "STEP 3: Verifying SHA256 checksums"

$Sha256File = Join-Path $LocalBackupDir "SHA256SUMS"
$checksumContent = Get-Content $Sha256File -Raw
$checksumFailed = $false

foreach ($line in ($checksumContent -split "`n" | Where-Object { $_ -match '\S' })) {
    $parts = $line.Trim() -split '\s+', 2
    if ($parts.Count -lt 2) { continue }
    $expectedHash = $parts[0]
    $file = $parts[1]

    # Handle different SHA256SUMS formats (hash + space + filename, or hash + space + *filename)
    $file = $file -replace '^\*', ''

    $localPath = Join-Path $LocalBackupDir $file
    if (-not (Test-Path $localPath)) {
        Write-Fail "File not found for checksum verification: $file"
        $checksumFailed = $true
        continue
    }

    if ($Sha256Tool -eq "sha256sum") {
        $result = & sha256sum $localPath 2>&1
        $resultHash = ($result -split '\s+')[0]
    } else {
        $result = certutil -hashfile $localPath SHA256 2>&1
        $lines = $result -split "`n" | Where-Object { $_ -match '^[a-fA-F0-9]{64}$' }
        $resultHash = ($lines -join '').Trim().ToLower()
    }

    if ($resultHash -eq $expectedHash.ToLower()) {
        Write-Ok "checksum OK: $file"
    } else {
        Write-Fail "CHECKSUM MISMATCH: $file"
        Write-Host "    Expected: $expectedHash" -ForegroundColor Red
        Write-Host "    Got:      $resultHash" -ForegroundColor Red
        $checksumFailed = $true
    }
}

if ($checksumFailed) {
    throw "Checksum verification failed. Check downloaded files before retrying."
}

# ====================================================================
# STEP 4: Backup existing Docker volumes
# ====================================================================
Write-Step "STEP 4: Backing up existing Docker volumes (safety measure)"

$BackupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PreRestoreBackupDir = Join-Path $LocalBackupDir "pre-restore-$BackupTimestamp"
New-Item -ItemType Directory -Force -Path $PreRestoreBackupDir | Out-Null

Push-Location $ComposeProjectDir
try {
    $projectName = (docker compose config 2>&1 | Select-String "^\s*name:" | Select-Object -First 1 | ForEach-Object { $_ -replace '.*name:\s*', '' }).Trim()
    if (-not $projectName) { $projectName = "sanguiblog" }

    $volumeBackupMap = @{
        "${projectName}_mysql_data"    = "mysql_backup.tar.gz"
        "${projectName}_pgvector_data" = "pgvector_backup.tar.gz"
        "${projectName}_uploads_data"  = "uploads_backup.tar.gz"
    }

    foreach ($volName in $volumeBackupMap.Keys) {
        $backupFile = Join-Path $PreRestoreBackupDir $volumeBackupMap[$volName]
        $volExists = docker volume inspect $volName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Backing up $volName..."
            docker run --rm -v "${volName}:/data" -v "${PreRestoreBackupDir}:/backup" alpine tar -czf "/backup/$($volumeBackupMap[$volName])" -C /data . 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Backed up $volName to $backupFile"
            } else {
                Write-Warn "Failed to back up $volName (volume may be empty, continuing)"
            }
        } else {
            Write-Host "  Volume $volName does not exist yet, skipping backup"
        }
    }
} finally {
    Pop-Location
}

# ====================================================================
# STEP 5: Stop Docker services
# ====================================================================
Write-Step "STEP 5: Stopping Docker Compose services"

Push-Location $ComposeProjectDir
try {
    docker compose down
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "docker compose down returned non-zero. Attempting to continue."
    }
    Write-Ok "Services stopped"
} finally {
    Pop-Location
}

# ====================================================================
# STEP 6: Import MySQL
# ====================================================================
if (-not $SkipMysql) {
    Write-Step "STEP 6: Importing MySQL data"

    Push-Location $ComposeProjectDir
    try {
        # Start only MySQL
        Write-Host "  Starting MySQL service..."
        docker compose up -d mysql
        Write-Host "  Waiting for MySQL to be healthy..."
        $mysqlReady = $false
        for ($i = 0; $i -lt 30; $i++) {
            $health = docker compose ps --format json 2>&1 | ConvertFrom-Json | Where-Object { $_.Service -eq "mysql" -and $_.Health -eq "healthy" }
            if ($health) { $mysqlReady = $true; break }
            Start-Sleep -Seconds 2
        }
        if (-not $mysqlReady) {
            throw "MySQL did not become healthy within timeout"
        }
        Write-Ok "MySQL is healthy"

        # Drop and recreate database
        Write-Host "  Dropping and recreating database..."
        docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"' 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to recreate MySQL database"
        }
        Write-Ok "Database recreated"

        # Import dump
        Write-Host "  Importing MySQL dump..."
        $mysqlDump = Join-Path $LocalBackupDir "mysql.sql"
        docker compose cp $mysqlDump mysql:/tmp/sanguiblog-mysql.sql 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy MySQL dump into mysql container"
        }
        docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE" < /tmp/sanguiblog-mysql.sql' 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "MySQL import failed. Check container logs: docker compose logs mysql"
        }
        docker compose exec -T mysql rm -f /tmp/sanguiblog-mysql.sql 2>&1 | Out-Null
        Write-Ok "MySQL import complete"

        # Grant privileges
        Write-Host "  Granting user privileges..."
        docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO \`$MYSQL_USER\`@\`%\`; FLUSH PRIVILEGES;"' 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Failed to grant privileges (may already be set)"
        } else {
            Write-Ok "Privileges granted"
        }

        # Verify import
        Write-Host "  Verifying MySQL import..."
        $tableCheck = docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES;"' 2>&1
        Write-Host $tableCheck

    } catch {
        Write-Fail "MySQL import failed: $_"
        Write-Host "  Local backup preserved at: $LocalBackupDir" -ForegroundColor Yellow
        Write-Host "  MySQL container logs: docker compose logs mysql" -ForegroundColor Yellow
        throw
    } finally {
        Pop-Location
    }
} else {
    Write-Step "STEP 6: Skipped (SkipMysql)"
}

# ====================================================================
# STEP 7: Import PgVector
# ====================================================================
if (-not $SkipPgVector) {
    Write-Step "STEP 7: Importing PgVector data"

    Push-Location $ComposeProjectDir
    try {
        # Start PgVector
        Write-Host "  Starting PgVector service..."
        docker compose up -d pgvector
        Write-Host "  Waiting for PgVector to be healthy..."
        $pgReady = $false
        for ($i = 0; $i -lt 20; $i++) {
            $health = docker compose ps --format json 2>&1 | ConvertFrom-Json | Where-Object { $_.Service -eq "pgvector" -and $_.Health -eq "healthy" }
            if ($health) { $pgReady = $true; break }
            Start-Sleep -Seconds 2
        }
        if (-not $pgReady) {
            throw "PgVector did not become healthy within timeout"
        }
        Write-Ok "PgVector is healthy"

        # Drop and recreate database. Run through sh so container env vars expand inside the pgvector service.
        Write-Host "  Dropping and recreating database..."
        docker compose exec -T pgvector sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"' 2>&1
        docker compose exec -T pgvector sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"' 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to recreate PgVector database"
        }
        Write-Ok "Database recreated"

        # Ensure vector extension exists
        Write-Host "  Ensuring vector extension..."
        $extResult = docker compose exec -T pgvector sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS vector;"' 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create vector extension. Is pgvector/pgvector:pg16 image used?"
        }
        # Verify
        $extCheck = docker compose exec -T pgvector sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension WHERE extname=''vector'';"' 2>&1
        if ($extCheck -match "vector") {
            Write-Ok "vector extension is available"
        } else {
            Write-Fail "vector extension NOT found"
            Write-Host "  The pgvector/pgvector:pg16 image should provide this extension." -ForegroundColor Yellow
            Write-Host "  Manual fix: docker compose exec pgvector psql -U '<user>' -d '<db>' -c 'CREATE EXTENSION vector;'" -ForegroundColor Yellow
            throw "vector extension is missing"
        }

        # Import dump
        Write-Host "  Importing PgVector dump (custom format)..."
        $pgDump = Join-Path $LocalBackupDir "pgvector.dump"
        docker compose cp $pgDump pgvector:/tmp/sanguiblog-pgvector.dump 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy PgVector dump into pgvector container"
        }
        docker compose exec -T pgvector sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner /tmp/sanguiblog-pgvector.dump' 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "pg_restore reported warnings (some may be non-fatal such as role/extension notices)"
            Write-Host "  Checking if vector_store table exists..."
            $vsCheck = docker compose exec -T pgvector sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM vector_store;"' 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "pg_restore failed and vector_store table is missing"
            }
            Write-Ok "vector_store table exists despite pg_restore warnings"
        }
        docker compose exec -T pgvector rm -f /tmp/sanguiblog-pgvector.dump 2>&1 | Out-Null
        Write-Ok "PgVector import complete"

        # Verify
        Write-Host "  Verifying PgVector import..."
        $rowCheck = docker compose exec -T pgvector sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS row_count FROM vector_store;"' 2>&1
        Write-Host $rowCheck
        Write-Ok "PgVector verified"

    } catch {
        Write-Fail "PgVector import failed: $_"
        Write-Host "  Local backup preserved at: $LocalBackupDir" -ForegroundColor Yellow
        Write-Host "  PgVector container logs: docker compose logs pgvector" -ForegroundColor Yellow
        throw
    } finally {
        Pop-Location
    }
} else {
    Write-Step "STEP 7: Skipped (SkipPgVector)"
}

# ====================================================================
# STEP 8: Restore uploads
# ====================================================================
if (-not $SkipUploads) {
    Write-Step "STEP 8: Restoring uploads"

    $uploadsArchive = Join-Path $LocalBackupDir "uploads.tar.gz"
    if (-not (Test-Path $uploadsArchive)) {
        Write-Fail "uploads.tar.gz not found at $uploadsArchive"
        throw "uploads archive is missing"
    }

    # Check for unsafe paths in archive
    Write-Host "  Checking archive for unsafe paths..."
    try {
        $tarList = tar -tzf $uploadsArchive 2>&1
    } catch {
        try {
            $tarList = bash -c "tar -tzf '$uploadsArchive'" 2>&1
        } catch {
            throw "Cannot list tar archive contents. Is tar installed?"
        }
    }

    $unsafePaths = $tarList | Where-Object { $_ -match '^\.\.|^/' -or $_ -match '(?<!\w)\.\./' }
    if ($unsafePaths) {
        Write-Fail "Unsafe paths found in uploads archive:"
        Write-Host ($unsafePaths -join "`n") -ForegroundColor Red
        throw "uploads archive contains potentially unsafe paths (.. or absolute paths). Aborting extraction."
    }
    Write-Ok "Archive paths look safe"

    # Extract to temp directory
    Write-Host "  Extracting uploads archive..."
    $tempRestoreDir = Join-Path ([System.IO.Path]::GetTempPath()) "sanguiblog-uploads-restore-$BackupTimestamp"
    New-Item -ItemType Directory -Force -Path $tempRestoreDir | Out-Null

    try {
        # Extract and strip first component if archive contains 'uploads/' prefix
        try {
            tar -xzf $uploadsArchive -C $tempRestoreDir 2>&1
        } catch {
            bash -c "tar -xzf '$uploadsArchive' -C '$tempRestoreDir'" 2>&1
        }

        # If the archive has 'uploads/' as top-level dir, strip it
        $topContents = Get-ChildItem $tempRestoreDir
        if ($topContents.Count -eq 1 -and $topContents[0].PSIsContainer -and $topContents[0].Name -eq "uploads") {
            Write-Host "  Stripping top-level 'uploads/' directory from archive..."
            $actualRestoreDir = Join-Path $tempRestoreDir "uploads"
        } else {
            $actualRestoreDir = $tempRestoreDir
        }

        # Copy to uploads_data volume via web container
        Write-Host "  Copying files to uploads_data volume..."
        Push-Location $ComposeProjectDir
        try {
            # Ensure web container is running
            docker compose up -d web 2>&1 | Out-Null
            Start-Sleep -Seconds 3

            if ($RestoreUploadsMode -eq "Replace") {
                # Clear existing uploads
                docker compose exec -T web sh -c 'rm -rf /data/uploads/* /data/uploads/.[!.]* /data/uploads/..?*' 2>&1 | Out-Null
                Write-Host "  Cleared existing uploads (Replace mode)"
            }

            # Copy files
            # Use docker cp which works with stopped or running containers
            docker compose cp "$actualRestoreDir/." web:/data/uploads/ 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to copy uploads to volume"
            }

            # Verify
            $fileCount = docker compose exec -T web sh -c 'find /data/uploads -type f | wc -l' 2>&1
            Write-Ok "Restored $($fileCount.Trim()) files to uploads_data volume"

        } finally {
            Pop-Location
        }
    } finally {
        # Clean up temp dir
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $tempRestoreDir
    }

    Write-Ok "Uploads restore complete"
} else {
    Write-Step "STEP 8: Skipped (SkipUploads)"
}

# ====================================================================
# STEP 9: Restart all services
# ====================================================================
Write-Step "STEP 9: Restarting all services"

Push-Location $ComposeProjectDir
try {
    docker compose up -d --build 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up -d --build failed"
    }
    Write-Ok "Services started"

    Write-Host "  Waiting for services to be ready..."
    Start-Sleep -Seconds 10

    # Wait for all services to be healthy
    $maxWait = 120 # seconds
    $waited = 0
    do {
        $status = docker compose ps --format json 2>&1
        if ($LASTEXITCODE -eq 0) {
            $services = $status | ForEach-Object { $_ | ConvertFrom-Json }
            $allHealthy = ($services | Where-Object { $_.Health -ne "healthy" -and $_.Health -ne "" }).Count -eq 0
            if ($allHealthy -and $services.Count -ge 2) {
                Write-Ok "All services are healthy"
                break
            }
        }
        Start-Sleep -Seconds 5
        $waited += 5
    } while ($waited -lt $maxWait)

    if ($waited -ge $maxWait) {
        Write-Warn "Timed out waiting for all services to be healthy"
        Write-Host "  Run 'docker compose ps' to check status manually"
    }

    $serviceStatus = docker compose ps 2>&1
    Write-Host $serviceStatus

} finally {
    Pop-Location
}

# ====================================================================
# STEP 10: Health check
# ====================================================================
Write-Step "STEP 10: Health check (basic API verification)"

$healthErrors = @()
$baseUrl = "http://localhost"

# 10a) /api/site/meta
Write-Host "  Checking /api/site/meta..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/site/meta" -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        Write-Ok "/api/site/meta responded 200"
    } else {
        Write-Fail "/api/site/meta returned $($response.StatusCode)"
        $healthErrors += "/api/site/meta: $($response.StatusCode)"
    }
} catch {
    Write-Fail "/api/site/meta failed: $_"
    $healthErrors += "/api/site/meta: $($_.Exception.Message)"
}

# 10b) /api/games
Write-Host "  Checking /api/games..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/games" -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        Write-Ok "/api/games responded 200"
    } else {
        Write-Fail "/api/games returned $($response.StatusCode)"
        $healthErrors += "/api/games: $($response.StatusCode)"
    }
} catch {
    Write-Fail "/api/games failed: $_"
    $healthErrors += "/api/games: $($_.Exception.Message)"
}

# 10c) /sitemap.xml
Write-Host "  Checking /sitemap.xml (must return XML, not HTML)..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/sitemap.xml" -UseBasicParsing -TimeoutSec 15
    $contentType = $response.Headers["Content-Type"]
    if ($response.StatusCode -eq 200 -and $contentType -match "xml") {
        Write-Ok "/sitemap.xml returned XML (Content-Type: $contentType)"
    } elseif ($contentType -match "html") {
        Write-Fail "/sitemap.xml returned HTML (SPA fallback captured the request)"
        $healthErrors += "/sitemap.xml: SPA fallback captured"
    } else {
        Write-Warn "/sitemap.xml returned $($response.StatusCode) Content-Type: $contentType"
    }
} catch {
    Write-Fail "/sitemap.xml failed: $_"
    $healthErrors += "/sitemap.xml: $($_.Exception.Message)"
}

# 10d) /robots.txt
Write-Host "  Checking /robots.txt (must return text/plain, not HTML)..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/robots.txt" -UseBasicParsing -TimeoutSec 15
    $contentType = $response.Headers["Content-Type"]
    if ($response.StatusCode -eq 200 -and $contentType -match "plain") {
        Write-Ok "/robots.txt returned plain text"
    } elseif ($contentType -match "html") {
        Write-Fail "/robots.txt returned HTML (SPA fallback captured the request)"
        $healthErrors += "/robots.txt: SPA fallback captured"
    } else {
        Write-Warn "/robots.txt returned $($response.StatusCode) Content-Type: $contentType"
    }
} catch {
    Write-Fail "/robots.txt failed: $_"
    $healthErrors += "/robots.txt: $($_.Exception.Message)"
}

# ====================================================================
# Summary
# ====================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESTORE COMPLETE" -ForegroundColor $(if ($healthErrors.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pre-restore backup: $PreRestoreBackupDir"
Write-Host "Downloaded backups: $LocalBackupDir"
Write-Host ""

if ($healthErrors.Count -gt 0) {
    Write-Host "Health check warnings:" -ForegroundColor Yellow
    foreach ($err in $healthErrors) {
        Write-Host "  - $err" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Refer to docs/docker-data-sync.md under 'Troubleshooting' for resolution steps." -ForegroundColor Yellow
} else {
    Write-Host "All health checks passed!" -ForegroundColor Green
}

Write-Host "Manual verification steps:" -ForegroundColor Cyan
Write-Host "  1. Visit http://localhost in browser"
Write-Host "  2. Check articles, images, avatars load correctly"
Write-Host "  3. Try /admin login"
Write-Host "  4. Check /api/site/meta.aiAssistant.enabled for AI status"
Write-Host "  5. Run: docker compose exec pgvector psql -U '<user>' -d '<db>' -c 'SELECT COUNT(*) FROM vector_store;'"
Write-Host ""
