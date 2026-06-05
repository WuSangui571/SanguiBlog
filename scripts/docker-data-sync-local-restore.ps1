<#
.SYNOPSIS
    SanguiBlog Docker Data Backup and Local Restore
    从本地 Windows 发起生产 Linux 备份到本地 Windows 并恢复到本地 Docker 环境。

.DESCRIPTION
    支持三个运行模式：
    - RestoreOnly: 从已有远端/本地备份目录恢复到本地 Docker（默认，兼容现有用法）
    - BackupOnly:  通过 SSH 在生产端远程导出 MySQL/PgVector/uploads，生成 checksum/manifest，下载到本地后停止
    - BackupAndRestore: 先执行 BackupOnly，校验通过后自动恢复到本地 Docker

    RestoreOnly / BackupAndRestore 执行步骤：
    1. Preflight: 检查本地工具链、Docker Compose 项目、.env 必需键
    2a. [BackupOnly/BackupAndRestore] 远端预检 + 创建远端备份（SSH 执行 mysqldump/pg_dump/tar）
    2b. Download: 通过 SCP 下载备份文件到本地
    3. Verify: 校验 SHA256 checksum，验证 manifest（如存在）
    4. Backup: 备份本地现有 Docker volumes（安全措施）
    5. Stop: 停止 Docker Compose 服务
    6. Import MySQL: 清空数据库并重新导入
    7. Import PgVector: 清空数据库并重新导入（先确保 vector extension）
    8. Restore uploads: 解压上传文件到 uploads_data volume，修复权限
    9. Restart: 启动所有服务并等待健康检查
    10. Health check: 验证核心 API 和上传路径

    使用 -DryRun 模式仅检查前置条件，不执行实际操作。

.PARAMETER ServerHost
    服务器主机名或 IP 地址。

.PARAMETER ServerUser
    SSH 登录用户名。

.PARAMETER RemoteBackupDir
    服务器上备份目录的绝对路径。RestoreOnly 模式需指定；BackupOnly / BackupAndRestore 模式自动生成
    （格式: <RemoteBackupRoot>/sanguiblog-backup-<timestamp>）。

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
    跳过 MySQL 导入步骤。同时也跳过远端备份中的 MySQL 导出。

.PARAMETER SkipPgVector
    跳过 PgVector 导入步骤。同时也跳过远端备份中的 PgVector 导出。

.PARAMETER SkipUploads
    跳过 uploads 恢复步骤。同时也跳过远端备份中的 uploads 打包。

.PARAMETER DryRun
    仅检查前置条件，不执行任何修改操作。

.PARAMETER Mode
    运行模式:
    - RestoreOnly (默认): 从已有备份目录恢复
    - BackupOnly: 仅执行远端备份 + 下载 + 校验
    - BackupAndRestore: 远端备份 + 下载 + 校验 + 恢复

.PARAMETER RemoteProjectDir
    生产服务器 SanguiBlog 项目目录（包含 .env 和 compose 文件）。BackupOnly / BackupAndRestore 模式必填。

.PARAMETER RemoteComposeFile
    生产 Compose 文件名（相对于 RemoteProjectDir）。默认: docker-compose.prod.yml

.PARAMETER RemoteBackupRoot
    远端备份根目录。默认: /tmp

.PARAMETER RemoteHostLabel
    写入 manifest.json 的来源标签（非敏感）。默认: production

.PARAMETER KeepRemoteBackup
    下载成功后是否保留远端备份目录。默认: $true

.PARAMETER CleanupRemoteBackup
    显式要求下载且校验通过后删除远端临时备份目录。默认: $false

.PARAMETER BackupTimestamp
    指定备份时间戳（用于备份目录命名）。不指定则自动生成。

.EXAMPLE
    # 先以 dry-run 模式检查所有前置条件（RestoreOnly 模式）
    .\scripts\docker-data-sync-local-restore.ps1 -ServerHost myserver -ServerUser admin -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 -DryRun

.EXAMPLE
    # 执行完整恢复（RestoreOnly）
    .\scripts\docker-data-sync-local-restore.ps1 -ServerHost myserver -ServerUser admin -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000

.EXAMPLE
    # 仅备份生产数据到本地，不恢复
    .\scripts\docker-data-sync-local-restore.ps1 -Mode BackupOnly -ServerHost myserver -ServerUser root -RemoteProjectDir /opt/SanguiBlog

.EXAMPLE
    # 备份生产数据并恢复到本地 Docker
    .\scripts\docker-data-sync-local-restore.ps1 -Mode BackupAndRestore -ServerHost myserver -ServerUser root -RemoteProjectDir /opt/SanguiBlog -LocalBackupDir .\backups\sanguiblog-prod

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

    [Parameter(Mandatory = $false, HelpMessage = "Remote backup directory absolute path (required for RestoreOnly without -SkipDownload; auto-generated in BackupOnly/BackupAndRestore)")]
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
    [switch]$DryRun,

    [Parameter(Mandatory = $false)]
    [ValidateSet("BackupOnly", "RestoreOnly", "BackupAndRestore")]
    [string]$Mode = "RestoreOnly",

    [Parameter(Mandatory = $false, HelpMessage = "Production server project directory (required for BackupOnly/BackupAndRestore)")]
    [string]$RemoteProjectDir,

    [Parameter(Mandatory = $false)]
    [string]$RemoteComposeFile = "docker-compose.prod.yml",

    [Parameter(Mandatory = $false)]
    [string]$RemoteBackupRoot = "/tmp",

    [Parameter(Mandatory = $false)]
    [string]$RemoteHostLabel = "production",

    [Parameter(Mandatory = $false)]
    [switch]$KeepRemoteBackup,

    [Parameter(Mandatory = $false)]
    [switch]$CleanupRemoteBackup,

    [Parameter(Mandatory = $false)]
    [string]$BackupTimestamp,

    [Parameter(Mandatory = $false)]
    [string]$VolumeArchiveImage = "alpine:3.21"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ---- Mode validation and parameter initialization ----
if ($Mode -eq "BackupOnly" -or $Mode -eq "BackupAndRestore") {
    if (-not $RemoteProjectDir) {
        throw "-RemoteProjectDir is required in BackupOnly and BackupAndRestore modes. It should point to the production server SanguiBlog project directory (e.g., /opt/SanguiBlog)."
    }
    if (-not $BackupTimestamp) {
        $BackupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    }
    if (-not $RemoteBackupDir) {
        $RemoteBackupDir = "$RemoteBackupRoot/sanguiblog-backup-$BackupTimestamp"
    }
}

if ($Mode -eq "RestoreOnly" -and -not $SkipDownload -and -not $RemoteBackupDir) {
    throw "-RemoteBackupDir is required in RestoreOnly mode when not using -SkipDownload."
}

# Resolve KeepRemoteBackup: default true, set to false only if -CleanupRemoteBackup is explicitly provided
$KeepRemote = if ($CleanupRemoteBackup) { $false } else { $true }

if ($Mode -eq "BackupOnly" -or $Mode -eq "BackupAndRestore") {
    $remoteShellParameters = @{
        RemoteProjectDir = $RemoteProjectDir
        RemoteComposeFile = $RemoteComposeFile
        RemoteBackupRoot = $RemoteBackupRoot
        RemoteBackupDir = $RemoteBackupDir
        RemoteHostLabel = $RemoteHostLabel
    }
    foreach ($entry in $remoteShellParameters.GetEnumerator()) {
        if ($entry.Value -and $entry.Value.Contains("'")) {
            throw "-$($entry.Key) cannot contain a single quote because it is embedded in remote shell commands."
        }
    }
}

# ---- Color helpers ----
function Write-Step { param([string]$Msg) Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor Cyan }
function Write-Ok { param([string]$Msg) Write-Host "  OK: $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  WARN: $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "  FAIL: $Msg" -ForegroundColor Red }
function Write-Dry { param([string]$Msg) Write-Host "  [DRY-RUN] $Msg" -ForegroundColor DarkGray }

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $false)]
        [string[]]$Arguments = @()
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    [pscustomobject]@{
        ExitCode = $exitCode
        Output = $output
    }
}

function Invoke-DockerComposeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$FailureMessage,

        [Parameter(Mandatory = $false)]
        [switch]$PrintOutput
    )

    $result = Invoke-NativeCommand -FilePath "docker" -Arguments (@("compose") + $Arguments)
    if ($result.Output -and $PrintOutput) {
        Write-Host ($result.Output -join "`n")
    }
    if ($result.ExitCode -ne 0) {
        if ($result.Output) {
            Write-Host ($result.Output -join "`n") -ForegroundColor Red
        }
        throw $FailureMessage
    }
    return $result
}

function Test-DockerImagePresent {
    param([Parameter(Mandatory = $true)][string]$Image)

    $result = Invoke-NativeCommand -FilePath "docker" -Arguments @("image", "inspect", $Image)
    return ($result.ExitCode -eq 0)
}

function Ensure-DockerImagePresent {
    param([Parameter(Mandatory = $true)][string]$Image)

    if (Test-DockerImagePresent -Image $Image) {
        Write-Ok "Docker helper image is available: $Image"
        return
    }

    Write-Warn "Docker helper image is not available locally: $Image"
    Write-Host "  Pulling $Image before touching local Docker volumes..." -ForegroundColor Yellow
    $pullResult = Invoke-NativeCommand -FilePath "docker" -Arguments @("pull", $Image)
    if ($pullResult.Output) {
        Write-Host ($pullResult.Output -join "`n")
    }
    if ($pullResult.ExitCode -ne 0) {
        throw "Cannot pull Docker helper image '$Image'. Run 'docker pull $Image' and retry, or configure -VolumeArchiveImage with an available image that includes tar."
    }
    Write-Ok "Docker helper image pulled: $Image"
}

function Get-ComposeServiceHealthStatus {
    param([Parameter(Mandatory = $true)][string]$Service)

    $idResult = Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "ps", "-q", $Service)
    if ($idResult.ExitCode -ne 0) {
        return "missing"
    }

    $containerId = (($idResult.Output | Where-Object { $_ -match '\S' } | Select-Object -First 1) -as [string]).Trim()
    if (-not $containerId) {
        return "missing"
    }

    $inspectResult = Invoke-NativeCommand -FilePath "docker" -Arguments @(
        "inspect",
        "--format",
        "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
        $containerId
    )
    if ($inspectResult.ExitCode -ne 0) {
        return "unknown"
    }

    $status = (($inspectResult.Output | Where-Object { $_ -match '\S' } | Select-Object -First 1) -as [string]).Trim()
    if (-not $status) {
        return "unknown"
    }
    return $status
}

function Wait-ComposeServiceReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Service,

        [Parameter(Mandatory = $false)]
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $status = Get-ComposeServiceHealthStatus -Service $Service
        if ($status -eq "healthy" -or $status -eq "running") {
            return $true
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    Write-Warn "$Service did not become ready. Last status: $(Get-ComposeServiceHealthStatus -Service $Service)"
    return $false
}

function Wait-MysqlServerReadyForRestore {
    param(
        [Parameter(Mandatory = $false)]
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $pingResult = Invoke-NativeCommand -FilePath "docker" -Arguments @(
            "compose",
            "exec",
            "-T",
            "mysql",
            "sh",
            "-c",
            'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin ping -u root --silent'
        )
        if ($pingResult.ExitCode -eq 0) {
            return $true
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    $status = Get-ComposeServiceHealthStatus -Service "mysql"
    Write-Warn "MySQL server did not accept root connections in time. Compose health status: $status"
    return $false
}

function Get-LocalEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Key,

        [Parameter(Mandatory = $false)]
        [string]$DefaultValue = ""
    )

    if (-not (Test-Path $Path)) {
        return $DefaultValue
    }

    $match = Get-Content $Path | Where-Object { $_ -match "^\s*(?:export\s+)?$([regex]::Escape($Key))\s*=" } | Select-Object -Last 1
    if (-not $match) {
        return $DefaultValue
    }

    $value = ($match -replace '^\s*(?:export\s+)?[^=]+\s*=\s*', '').Trim()
    $value = $value -replace "`r$", ""
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    if ($value -eq "") {
        return $DefaultValue
    }
    return $value
}

function Assert-SafeSqlIdentifier {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Value -notmatch '^[A-Za-z0-9_]+$') {
        throw "$Name must contain only letters, numbers, and underscore for restore safety. Actual value is not printed."
    }
}

function Invoke-MysqlRootSqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql,

        [Parameter(Mandatory = $true)]
        [string]$ContainerPath
    )

    $localSqlFile = Join-Path ([System.IO.Path]::GetTempPath()) ("sanguiblog-mysql-" + [System.Guid]::NewGuid().ToString("N") + ".sql")
    Set-Content -Path $localSqlFile -Value $Sql -NoNewline -Encoding ASCII
    try {
        $copyResult = Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "cp", $localSqlFile, "mysql:$ContainerPath")
        if ($copyResult.ExitCode -ne 0) {
            if ($copyResult.Output) { Write-Host ($copyResult.Output -join "`n") -ForegroundColor Red }
            throw "Failed to copy temporary MySQL SQL file into mysql container"
        }

        $execResult = Invoke-NativeCommand -FilePath "docker" -Arguments @(
            "compose",
            "exec",
            "-T",
            "mysql",
            "sh",
            "-c",
            'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root < "$1"',
            "sh",
            $ContainerPath
        )
        if ($execResult.Output) {
            Write-Host ($execResult.Output -join "`n")
        }
        if ($execResult.ExitCode -ne 0) {
            throw "MySQL SQL execution failed"
        }
    } finally {
        Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "exec", "-T", "mysql", "rm", "-f", $ContainerPath) | Out-Null
        Remove-Item -Force -ErrorAction SilentlyContinue $localSqlFile
    }
}

function Invoke-PgVectorSqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql,

        [Parameter(Mandatory = $true)]
        [string]$ContainerPath
    )

    $localSqlFile = Join-Path ([System.IO.Path]::GetTempPath()) ("sanguiblog-pgvector-" + [System.Guid]::NewGuid().ToString("N") + ".sql")
    Set-Content -Path $localSqlFile -Value $Sql -NoNewline -Encoding ASCII
    try {
        $copyResult = Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "cp", $localSqlFile, "pgvector:$ContainerPath")
        if ($copyResult.ExitCode -ne 0) {
            if ($copyResult.Output) { Write-Host ($copyResult.Output -join "`n") -ForegroundColor Red }
            throw "Failed to copy temporary PgVector SQL file into pgvector container"
        }

        $execResult = Invoke-NativeCommand -FilePath "docker" -Arguments @(
            "compose",
            "exec",
            "-T",
            "pgvector",
            "sh",
            "-c",
            'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -f "$1"',
            "sh",
            $ContainerPath
        )
        if ($execResult.Output) {
            Write-Host ($execResult.Output -join "`n")
        }
        if ($execResult.ExitCode -ne 0) {
            throw "PgVector SQL execution failed"
        }
    } finally {
        Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "exec", "-T", "pgvector", "rm", "-f", $ContainerPath) | Out-Null
        Remove-Item -Force -ErrorAction SilentlyContinue $localSqlFile
    }
}

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

$ExpectedBackupFiles = @()
if (-not $SkipMysql) { $ExpectedBackupFiles += "mysql.sql" }
if (-not $SkipPgVector) { $ExpectedBackupFiles += "pgvector.dump" }
if (-not $SkipUploads) { $ExpectedBackupFiles += "uploads.tar.gz" }
if ($ExpectedBackupFiles.Count -eq 0) {
    throw "At least one data domain must be selected. Do not specify -SkipMysql, -SkipPgVector, and -SkipUploads together."
}
$ExpectedBackupFiles += "SHA256SUMS"
$DryRunWarnings = @()

# Resolve paths to absolute paths. LocalBackupDir may not exist yet, so avoid Resolve-Path for it.
$ComposeProjectDir = (Resolve-Path $ComposeProjectDir -ErrorAction Stop).Path
if ([System.IO.Path]::IsPathRooted($LocalBackupDir)) {
    $LocalBackupDir = [System.IO.Path]::GetFullPath($LocalBackupDir)
} else {
    $LocalBackupDir = [System.IO.Path]::GetFullPath((Join-Path $PWD.Path $LocalBackupDir))
}

# ---- Remote backup helper functions ----

function Test-RemoteBackupPreflight {
    Write-Step "  Checking remote project directory: $RemoteProjectDir"
    try {
        $checkDir = ssh -o ConnectTimeout=10 -o BatchMode=yes -o ServerAliveInterval=10 -o ServerAliveCountMax=2 -p $SshPort "$ServerUser@$ServerHost" "timeout 20s test -d '$RemoteProjectDir' && echo EXISTS || echo MISSING" 2>&1
    } catch {
        Write-Fail "Remote project directory check failed: $_"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote project directory check failed"
            return
        }
        throw "Remote project directory check failed."
    }
    if ($checkDir -notmatch "EXISTS") {
        Write-Fail "Remote project directory does not exist: $RemoteProjectDir"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote project directory not found"
            return
        }
        throw "Remote project directory not found."
    }
    Write-Ok "Remote project directory exists"

    Write-Step "  Checking remote .env file..."
    try {
        $checkEnv = ssh -o ConnectTimeout=10 -o BatchMode=yes -o ServerAliveInterval=10 -o ServerAliveCountMax=2 -p $SshPort "$ServerUser@$ServerHost" "timeout 20s test -f '$RemoteProjectDir/.env' && echo EXISTS || echo MISSING" 2>&1
    } catch {
        Write-Fail "Remote .env file check failed: $_"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote .env file check failed"
            return
        }
        throw "Remote .env file check failed."
    }
    if ($checkEnv -notmatch "EXISTS") {
        Write-Fail "Remote .env file not found in $RemoteProjectDir"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote .env file not found"
            return
        }
        throw "Remote .env file is required to load database connection variables."
    }
    Write-Ok "Remote .env file exists (contents not inspected)"

    Write-Step "  Remote Docker Compose availability will be verified by service status check..."

    Write-Step "  Checking remote Compose file: $RemoteComposeFile"
    try {
        $checkFile = ssh -o ConnectTimeout=10 -o BatchMode=yes -o ServerAliveInterval=10 -o ServerAliveCountMax=2 -p $SshPort "$ServerUser@$ServerHost" "timeout 20s test -f '$RemoteProjectDir/$RemoteComposeFile' && echo EXISTS || echo MISSING" 2>&1
    } catch {
        Write-Fail "Remote Compose file check failed: $_"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote Compose file check failed"
            return
        }
        throw "Remote Compose file check failed."
    }
    if ($checkFile -notmatch "EXISTS") {
        Write-Fail "Remote Compose file not found: $RemoteProjectDir/$RemoteComposeFile"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote Compose file not found"
            return
        }
        throw "Remote Compose file not found."
    }
    Write-Ok "Remote Compose file exists"

    Write-Step "  Checking remote Docker services..."
    try {
        $svcCheck = ssh -o ConnectTimeout=10 -o BatchMode=yes -o ServerAliveInterval=10 -o ServerAliveCountMax=2 -p $SshPort "$ServerUser@$ServerHost" "cd '$RemoteProjectDir' && timeout 30s docker compose -f '$RemoteComposeFile' ps --format '{{.Service}} {{.State}}'" 2>&1
    } catch {
        Write-Fail "Remote Docker service check failed: $_"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote Docker service check failed"
            return
        }
        throw "Remote Docker service check failed."
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Remote Docker service check failed: $svcCheck"
        if ($DryRun) {
            $script:DryRunWarnings += "Remote Docker service check failed"
            return
        }
        throw "Remote Docker service check failed."
    }
    Write-Host "  Remote service status:"
    Write-Host ($svcCheck -split "`n" | ForEach-Object { "    $_" })
    Write-Ok "Remote Docker services checked"
}

function New-RemoteBackup {
    Write-Step "  Creating remote backup directory: $RemoteBackupDir"
    $mkResult = ssh -o ConnectTimeout=10 -p $SshPort "$ServerUser@$ServerHost" "mkdir -p '$RemoteBackupDir' && echo OK" 2>&1
    if ($mkResult -notmatch "OK") {
        Write-Fail "Failed to create remote backup directory"
        throw "Cannot create remote backup directory: $RemoteBackupDir"
    }
    Write-Ok "Remote backup directory created"

    $doMysql = (-not $SkipMysql).ToString().ToLower()
    $doPgVector = (-not $SkipPgVector).ToString().ToLower()
    $doUploads = (-not $SkipUploads).ToString().ToLower()

    # Build remote shell script as a temp file to avoid PowerShell quoting issues
    $remoteScriptPath = Join-Path ([System.IO.Path]::GetTempPath()) "sanguiblog-remote-backup-${BackupTimestamp}.sh"
    $remoteScriptName = "sanguiblog-remote-backup-${BackupTimestamp}.sh"
    $remoteScriptTarget = "/tmp/$remoteScriptName"

    $remoteScriptContent = @"
#!/bin/bash
set -e

BACKUP_DIR='$RemoteBackupDir'
REMOTE_PROJECT_DIR='$RemoteProjectDir'
REMOTE_COMPOSE_FILE='$RemoteComposeFile'
HOST_LABEL='$RemoteHostLabel'

echo "[remote] Starting backup to `$BACKUP_DIR"
mkdir -p "`$BACKUP_DIR"

echo "[remote] Using Docker Compose environment from .env"
cd "`$REMOTE_PROJECT_DIR"
echo "[remote] .env is required by Docker Compose but is not shell-sourced by this script"

read_env_key() {
  grep -E "^[[:space:]]*(export[[:space:]]+)?`$1[[:space:]]*=" .env | tail -n 1 | sed -E 's/^[^=]*=[[:space:]]*//' | sed 's/\r$//' | sed 's/^"//; s/"$//'
}

key_state() {
  if [ -n "`$1" ]; then
    printf "present"
  else
    printf "missing"
  fi
}

mysql_database_from_jdbc_url() {
  printf "%s" "`$1" | sed -n 's#^jdbc:mysql://[^/]*/\([^?;]*\).*#\1#p'
}

# MySQL export
if [ "$doMysql" = "true" ]; then
  echo "[remote] Exporting MySQL..."
  MYSQL_DUMP_DATABASE=`$(read_env_key MYSQL_DATABASE)
  MYSQL_DUMP_USER=`$(read_env_key MYSQL_USER)
  MYSQL_DUMP_PASSWORD=`$(read_env_key MYSQL_PASSWORD)
  MYSQL_DUMP_ROOT_PASSWORD=`$(read_env_key MYSQL_ROOT_PASSWORD)
  SPRING_DATASOURCE_URL_VALUE=`$(read_env_key SPRING_DATASOURCE_URL)
  SPRING_DATASOURCE_USERNAME_VALUE=`$(read_env_key SPRING_DATASOURCE_USERNAME)
  SPRING_DATASOURCE_PASSWORD_VALUE=`$(read_env_key SPRING_DATASOURCE_PASSWORD)
  if [ -z "`$MYSQL_DUMP_DATABASE" ] && [ -n "`$SPRING_DATASOURCE_URL_VALUE" ]; then
    MYSQL_DUMP_DATABASE=`$(mysql_database_from_jdbc_url "`$SPRING_DATASOURCE_URL_VALUE")
  fi
  if [ -z "`$MYSQL_DUMP_USER" ]; then MYSQL_DUMP_USER="`$SPRING_DATASOURCE_USERNAME_VALUE"; fi
  if [ -z "`$MYSQL_DUMP_PASSWORD" ]; then MYSQL_DUMP_PASSWORD="`$SPRING_DATASOURCE_PASSWORD_VALUE"; fi
  if [ -z "`$MYSQL_DUMP_DATABASE" ]; then MYSQL_DUMP_DATABASE="sanguiblog_db"; fi
  echo "[remote] MySQL env status: MYSQL_DATABASE=`$(key_state "`$MYSQL_DUMP_DATABASE"), MYSQL_USER=`$(key_state "`$MYSQL_DUMP_USER"), MYSQL_PASSWORD=`$(key_state "`$MYSQL_DUMP_PASSWORD"), MYSQL_ROOT_PASSWORD=`$(key_state "`$MYSQL_DUMP_ROOT_PASSWORD"), SPRING_DATASOURCE_URL=`$(key_state "`$SPRING_DATASOURCE_URL_VALUE"), SPRING_DATASOURCE_USERNAME=`$(key_state "`$SPRING_DATASOURCE_USERNAME_VALUE"), SPRING_DATASOURCE_PASSWORD=`$(key_state "`$SPRING_DATASOURCE_PASSWORD_VALUE")"
  if ! docker compose -f "`$REMOTE_COMPOSE_FILE" exec -T mysql sh -c 'MYSQL_DUMP_DATABASE="`$1"; MYSQL_DUMP_USER="`$2"; MYSQL_DUMP_PASSWORD="`$3"; MYSQL_DUMP_ROOT_PASSWORD="`$4"; if [ -n "`$MYSQL_DUMP_ROOT_PASSWORD" ]; then MYSQL_PWD="`$MYSQL_DUMP_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces -uroot "`$MYSQL_DUMP_DATABASE"; else echo "MYSQL_ROOT_PASSWORD is not available from remote .env; falling back to MYSQL_USER or SPRING_DATASOURCE_USERNAME" >&2; if [ -z "`$MYSQL_DUMP_USER" ] || [ -z "`$MYSQL_DUMP_PASSWORD" ]; then echo "MYSQL_USER/MYSQL_PASSWORD and SPRING_DATASOURCE_USERNAME/SPRING_DATASOURCE_PASSWORD are missing from remote .env" >&2; exit 1; fi; MYSQL_PWD="`$MYSQL_DUMP_PASSWORD" mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces -u"`$MYSQL_DUMP_USER" "`$MYSQL_DUMP_DATABASE"; fi' sh "`$MYSQL_DUMP_DATABASE" "`$MYSQL_DUMP_USER" "`$MYSQL_DUMP_PASSWORD" "`$MYSQL_DUMP_ROOT_PASSWORD" > "`$BACKUP_DIR/mysql.sql" 2> "`$BACKUP_DIR/mysql.err"; then
    echo "[remote] MySQL export failed. stderr:"
    cat "`$BACKUP_DIR/mysql.err"
    echo "[remote] MySQL partial dump size:"
    stat -c%s "`$BACKUP_DIR/mysql.sql" 2>/dev/null || true
    echo "[remote] MySQL partial dump tail:"
    tail -20 "`$BACKUP_DIR/mysql.sql" 2>/dev/null || true
    exit 1
  fi
  rm -f "`$BACKUP_DIR/mysql.err"
  echo "[remote] MySQL export done: `$BACKUP_DIR/mysql.sql"
else
  echo "[remote] Skipping MySQL export (SkipMysql)"
fi

# PgVector export
if [ "$doPgVector" = "true" ]; then
  echo "[remote] Exporting PgVector..."
  if ! docker compose -f "`$REMOTE_COMPOSE_FILE" exec -T pgvector sh -c 'pg_dump -Fc -U "`$POSTGRES_USER" -d "`$POSTGRES_DB"' > "`$BACKUP_DIR/pgvector.dump" 2> "`$BACKUP_DIR/pgvector.err"; then
    echo "[remote] PgVector export failed. stderr:"
    cat "`$BACKUP_DIR/pgvector.err"
    exit 1
  fi
  rm -f "`$BACKUP_DIR/pgvector.err"
  echo "[remote] PgVector export done: `$BACKUP_DIR/pgvector.dump"
else
  echo "[remote] Skipping PgVector export (SkipPgVector)"
fi

# uploads export
if [ "$doUploads" = "true" ]; then
  echo "[remote] Exporting uploads..."
  if ! docker compose -f "`$REMOTE_COMPOSE_FILE" exec -T web sh -c 'tar -czf - -C /data uploads' > "`$BACKUP_DIR/uploads.tar.gz" 2> "`$BACKUP_DIR/uploads-web.err"; then
    echo "[remote] web uploads export failed; trying backend. web stderr:"
    cat "`$BACKUP_DIR/uploads-web.err"
    if ! docker compose -f "`$REMOTE_COMPOSE_FILE" exec -T backend sh -c 'tar -czf - -C /data uploads' > "`$BACKUP_DIR/uploads.tar.gz" 2> "`$BACKUP_DIR/uploads-backend.err"; then
      echo "[remote] backend uploads export failed. stderr:"
      cat "`$BACKUP_DIR/uploads-backend.err"
      exit 1
    fi
  fi
  rm -f "`$BACKUP_DIR/uploads-web.err" "`$BACKUP_DIR/uploads-backend.err"
  echo "[remote] uploads export done: `$BACKUP_DIR/uploads.tar.gz"
else
  echo "[remote] Skipping uploads export (SkipUploads)"
fi

# Generate SHA256SUMS
echo "[remote] Generating SHA256SUMS..."
cd "`$BACKUP_DIR"
FILES_TO_HASH=""
if [ "$doMysql" = "true" ]; then FILES_TO_HASH="`$FILES_TO_HASH mysql.sql"; fi
if [ "$doPgVector" = "true" ]; then FILES_TO_HASH="`$FILES_TO_HASH pgvector.dump"; fi
if [ "$doUploads" = "true" ]; then FILES_TO_HASH="`$FILES_TO_HASH uploads.tar.gz"; fi
if [ -n "`$FILES_TO_HASH" ]; then
  sha256sum `$FILES_TO_HASH > SHA256SUMS
  echo "[remote] SHA256SUMS generated"
fi

# Generate manifest.json
echo "[remote] Generating manifest.json..."
MYSQL_SIZE=`$(stat -c%s mysql.sql 2>/dev/null || echo 0)
PGVECTOR_SIZE=`$(stat -c%s pgvector.dump 2>/dev/null || echo 0)
UPLOADS_SIZE=`$(stat -c%s uploads.tar.gz 2>/dev/null || echo 0)
UPLOADS_COUNT=`$(tar -tzf uploads.tar.gz 2>/dev/null | wc -l || echo 0)
MYSQL_DATABASE_NAME=`$(docker compose -f "`$REMOTE_COMPOSE_FILE" exec -T mysql sh -c 'printf "%s" "${MYSQL_DATABASE:-sanguiblog_db}"' 2>/dev/null || echo sanguiblog_db)
POSTGRES_DATABASE_NAME=`$(docker compose -f "`$REMOTE_COMPOSE_FILE" exec -T pgvector sh -c 'printf "%s" "${POSTGRES_DB:-sanguiblog_ai}"' 2>/dev/null || echo sanguiblog_ai)

cat > manifest.json << MANIFESTEOF
{
  "generatedAt": "`$(date -Iseconds)",
  "source": {
    "hostLabel": "`$HOST_LABEL",
    "app": "SanguiBlog"
  },
  "scriptVersion": "2.0.0",
  "mysql": {
    "database": "`$MYSQL_DATABASE_NAME",
    "charset": "utf8mb4",
    "collation": "utf8mb4_general_ci",
    "dumpFile": "mysql.sql",
    "bytes": `$MYSQL_SIZE
  },
  "pgvector": {
    "database": "`$POSTGRES_DATABASE_NAME",
    "schema": "public",
    "extension": "vector",
    "table": "vector_store",
    "dumpFile": "pgvector.dump",
    "bytes": `$PGVECTOR_SIZE
  },
  "uploads": {
    "sourcePathLabel": "/data/uploads",
    "archiveFile": "uploads.tar.gz",
    "bytes": `$UPLOADS_SIZE,
    "fileCount": `$UPLOADS_COUNT,
    "topLevelDirs": ["avatar", "posts", "covers", "games", "site"]
  },
  "checksums": {
    "algorithm": "sha256",
    "file": "SHA256SUMS"
  }
}
MANIFESTEOF
echo "[remote] manifest.json generated"

echo "[remote] Backup directory contents:"
ls -lh "`$BACKUP_DIR/"
echo "[remote] BACKUP_COMPLETE"
"@

    # Write remote script to temp file with Unix line endings
    $remoteScriptContent = $remoteScriptContent -replace "`r`n", "`n"
    Set-Content -Path $remoteScriptPath -Value $remoteScriptContent -NoNewline -Encoding ASCII

    try {
        Write-Step "  Uploading backup script to remote server..."
        scp -P $SshPort $remoteScriptPath "$ServerUser@${ServerHost}:${remoteScriptTarget}" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to upload backup script to remote server"
        }
        Write-Ok "Backup script uploaded"

        Write-Step "  Executing remote backup script..."
        $backupOutput = ssh -o ConnectTimeout=30 -o ServerAliveInterval=30 -o ServerAliveCountMax=4 -p $SshPort "$ServerUser@$ServerHost" "timeout 1800s bash '$remoteScriptTarget'" 2>&1
        Write-Host $backupOutput

        $backupOutputText = $backupOutput -join "`n"
        if (-not ($backupOutputText -match "BACKUP_COMPLETE")) {
            throw "Remote backup script did not complete successfully. Check output above."
        }
        Write-Ok "Remote backup completed: $RemoteBackupDir"

        # Cleanup remote script
        ssh -o ConnectTimeout=10 -p $SshPort "$ServerUser@$ServerHost" "rm -f '$remoteScriptTarget'" 2>&1 | Out-Null

    } catch {
        Write-Fail "Remote backup failed: $_"
        ssh -o ConnectTimeout=10 -p $SshPort "$ServerUser@$ServerHost" "rm -f '$remoteScriptTarget'" 2>&1 | Out-Null
        throw
    } finally {
        Remove-Item -Force -ErrorAction SilentlyContinue $remoteScriptPath
    }
}

function Cleanup-RemoteBackup {
    if ($KeepRemote) {
        Write-Ok "Remote backup directory preserved: ${ServerUser}@${ServerHost}:$RemoteBackupDir"
    } else {
        Write-Step "  Cleaning up remote backup directory..."
        $cleanResult = ssh -o ConnectTimeout=10 -p $SshPort "$ServerUser@$ServerHost" "rm -rf '$RemoteBackupDir' && echo CLEANED || echo FAILED" 2>&1
        if ($cleanResult -match "CLEANED") {
            Write-Ok "Remote backup directory cleaned up"
        } else {
            Write-Warn "Failed to clean up remote backup directory: $RemoteBackupDir"
        }
    }
}

# ====================================================================
# STEP 1: Preflight checks
# ====================================================================
Write-Step "STEP 1: Preflight checks"

Write-Step "  1a) Checking required tools..."
$requiredTools = @("ssh", "scp")
if ($Mode -ne "BackupOnly") {
    $requiredTools += "docker"
}
foreach ($toolName in $requiredTools) {
    try {
        $null = Get-Command $toolName -ErrorAction Stop
        Write-Ok "$toolName is available"
    } catch {
        Write-Fail "$toolName is NOT available"
        if ($DryRun) { continue }
        throw "Missing required tool: $toolName. Please install it before running this script."
    }
}

if ($Mode -ne "BackupOnly") {
    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -ne 0) { throw $composeVersion }
        Write-Ok "docker compose is available"
    } catch {
        Write-Fail "docker compose is NOT available"
        if (-not $DryRun) { throw "Docker Compose v2 is required." }
    }
} else {
    Write-Step "  Local Docker Compose check skipped (BackupOnly mode)"
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

# --- 1b) Check Docker daemon (RestoreOnly, BackupAndRestore) ---
if ($Mode -ne "BackupOnly") {
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
} else {
    Write-Step "  1b) Docker daemon check skipped (BackupOnly mode, no local Docker changes)"
    $DockerDaemonAvailable = $false
}

# --- 1c) Check docker-compose.yml (RestoreOnly, BackupAndRestore) ---
if ($Mode -ne "BackupOnly") {
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

# --- 1d) Check .env for required keys (RestoreOnly, BackupAndRestore) ---
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
} else {
    Write-Step "  1c) docker-compose.yml check skipped (BackupOnly mode)"
    Write-Step "  1d) .env check skipped (BackupOnly mode, no local Compose needed)"
}

# --- 1e) Check SSH connectivity ---
if ($SkipDownload -and $Mode -eq "RestoreOnly") {
    Write-Step "  1e) SSH check skipped (SkipDownload uses existing local backup files)"
} else {
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
}

# --- 1f) Check remote backup directory (RestoreOnly) ---
if ($Mode -eq "RestoreOnly" -and -not $SkipDownload) {
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

# --- 1g) Check remote backup files exist (RestoreOnly) ---
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
} elseif ($Mode -eq "RestoreOnly") {
    Write-Step "  1f) Remote backup directory check skipped (SkipDownload)"
    Write-Step "  1g) Remote backup file check skipped (SkipDownload)"
}

# --- 1h) Check existing Docker volumes (RestoreOnly, BackupAndRestore) ---
if ($Mode -ne "BackupOnly") {
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
}

# --- 1i) Check Docker helper image for local volume backup (RestoreOnly, BackupAndRestore) ---
if ($Mode -ne "BackupOnly") {
    Write-Step "  1i) Checking Docker helper image for volume backups..."
    if (-not $DockerDaemonAvailable) {
        Write-Warn "Skipping helper image check because Docker daemon is not accessible"
        if ($DryRun) { $DryRunWarnings += "Docker helper image not checked because Docker daemon is not accessible" }
    } elseif (Test-DockerImagePresent -Image $VolumeArchiveImage) {
        Write-Ok "Docker helper image is available: $VolumeArchiveImage"
    } elseif ($DryRun) {
        Write-Warn "Docker helper image is not available locally: $VolumeArchiveImage"
        Write-Host "  Real restore will pull this image before touching local volumes, or you can run: docker pull $VolumeArchiveImage" -ForegroundColor Yellow
        $DryRunWarnings += "Docker helper image missing locally: $VolumeArchiveImage"
    } else {
        Ensure-DockerImagePresent -Image $VolumeArchiveImage
    }
}

# --- Remote backup preflight (BackupOnly, BackupAndRestore) ---
if ($Mode -eq "BackupOnly" -or $Mode -eq "BackupAndRestore") {
    Write-Step "  1j) Remote backup preflight..."
    Test-RemoteBackupPreflight
}

if ($DryRun) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    $modeLabel = switch ($Mode) {
        "BackupOnly" { "DRY-RUN COMPLETE (BackupOnly mode)" }
        "BackupAndRestore" { "DRY-RUN COMPLETE (BackupAndRestore mode)" }
        default { "DRY-RUN COMPLETE (RestoreOnly mode)" }
    }
    if ($DryRunWarnings.Count -gt 0) {
        Write-Host "$modeLabel - WITH WARNINGS" -ForegroundColor Yellow
        foreach ($warning in $DryRunWarnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    } else {
        Write-Host "$modeLabel - All preflight checks passed" -ForegroundColor Green
    }
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "No modifications were made." -ForegroundColor Yellow
    exit 0
}

if ($Mode -eq "BackupOnly" -or $Mode -eq "BackupAndRestore") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "PREFLIGHT COMPLETE - Creating remote backup" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Start-Sleep -Seconds 1

    # ====================================================================
    # STEP BACKUP: Create remote backup
    # ====================================================================
    Write-Step "STEP BACKUP: Creating remote backup on $ServerHost"
    New-RemoteBackup

    # ====================================================================
    # STEP BACKUP-DOWNLOAD: Download backup files
    # ====================================================================
    if (-not $SkipDownload) {
        Write-Step "STEP BACKUP-DOWNLOAD: Downloading backup files from $ServerUser@${ServerHost}:$RemoteBackupDir"
        New-Item -ItemType Directory -Force -Path $LocalBackupDir | Out-Null

        $filesToDownload = @()
        if (-not $SkipMysql) { $filesToDownload += "mysql.sql" }
        if (-not $SkipPgVector) { $filesToDownload += "pgvector.dump" }
        if (-not $SkipUploads) { $filesToDownload += "uploads.tar.gz" }
        $filesToDownload += @("SHA256SUMS", "manifest.json")

        foreach ($file in $filesToDownload) {
            Write-Host "  Downloading $file..."
            scp -P $SshPort "$ServerUser@${ServerHost}:$RemoteBackupDir/$file" "$LocalBackupDir/" 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "    Could not download '$file' (may not exist if skipped)"
            } else {
                Write-Ok "Downloaded $file"
            }
        }
        Write-Ok "Backup files downloaded to $LocalBackupDir"
        $SkipDownload = $true
    } else {
        Write-Step "STEP BACKUP-DOWNLOAD: Skipped (SkipDownload)"
        Write-Ok "Using existing local backup files at $LocalBackupDir"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($Mode -eq "BackupOnly") {
    Write-Host "BACKUP PHASE COMPLETE - Verifying and finishing" -ForegroundColor Green
} elseif ($Mode -eq "BackupAndRestore") {
    Write-Host "BACKUP PHASE COMPLETE - Proceeding with verification and restore" -ForegroundColor Green
} else {
    Write-Host "PREFLIGHT COMPLETE - Proceeding with download and restore" -ForegroundColor Green
}
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

# Check for manifest.json (warning only, not a hard failure)
$manifestFile = Join-Path $LocalBackupDir "manifest.json"
if (Test-Path $manifestFile) {
    Write-Ok "manifest.json found (see file for metadata)"
} else {
    Write-Warn "manifest.json not found in backup directory (optional metadata file)"
}

# ====================================================================
# BackupOnly: stop after verification
# ====================================================================
if ($Mode -eq "BackupOnly") {
    Cleanup-RemoteBackup

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "BACKUP COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Local backup directory : $LocalBackupDir" -ForegroundColor White
    Write-Host "Backup files:" -ForegroundColor White
    Get-ChildItem $LocalBackupDir | ForEach-Object { Write-Host "  $($_.Name) ($('{0:N0}' -f $_.Length) bytes)" -ForegroundColor White }
    Write-Host ""
    Write-Host "To restore this backup to local Docker, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\docker-data-sync-local-restore.ps1 -Mode RestoreOnly -ServerHost $ServerHost -ServerUser $ServerUser -RemoteBackupDir $RemoteBackupDir -SkipDownload" -ForegroundColor White
    Write-Host ""
    if ($KeepRemote) {
        Write-Host "Remote backup preserved at: ${ServerUser}@${ServerHost}:$RemoteBackupDir" -ForegroundColor Yellow
    }
    Write-Host "No local Docker volumes were modified." -ForegroundColor Green
    exit 0
}

# ====================================================================
# STEP 4: Backup existing Docker volumes
# ====================================================================
Write-Step "STEP 4: Backing up existing Docker volumes (safety measure)"
Ensure-DockerImagePresent -Image $VolumeArchiveImage

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
            $volumeBackupResult = Invoke-NativeCommand -FilePath "docker" -Arguments @(
                "run",
                "--rm",
                "--pull=never",
                "-v",
                "${volName}:/data:ro",
                "-v",
                "${PreRestoreBackupDir}:/backup",
                $VolumeArchiveImage,
                "tar",
                "-czf",
                "/backup/$($volumeBackupMap[$volName])",
                "-C",
                "/data",
                "."
            )
            if ($volumeBackupResult.ExitCode -eq 0) {
                Write-Ok "Backed up $volName to $backupFile"
            } else {
                Write-Fail "Failed to back up $volName"
                if ($volumeBackupResult.Output) {
                    Write-Host ($volumeBackupResult.Output -join "`n") -ForegroundColor Red
                }
                throw "Failed to back up existing local Docker volume '$volName'. Restore aborted before overwriting local data."
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
        Invoke-DockerComposeCommand -Arguments @("up", "-d", "mysql") -FailureMessage "Failed to start MySQL service" -PrintOutput | Out-Null
        Write-Host "  Waiting for MySQL server to accept root connections..."
        $mysqlReady = Wait-MysqlServerReadyForRestore -TimeoutSeconds 120
        if (-not $mysqlReady) {
            throw "MySQL server did not become ready for restore within timeout"
        }
        Write-Ok "MySQL server is ready for restore"

        $mysqlDatabaseName = Get-LocalEnvValue -Path (Join-Path $ComposeProjectDir ".env") -Key "MYSQL_DATABASE" -DefaultValue "sanguiblog_db"
        $mysqlUserName = Get-LocalEnvValue -Path (Join-Path $ComposeProjectDir ".env") -Key "MYSQL_USER" -DefaultValue "sanguiblog_user"
        Assert-SafeSqlIdentifier -Name "MYSQL_DATABASE" -Value $mysqlDatabaseName
        Assert-SafeSqlIdentifier -Name "MYSQL_USER" -Value $mysqlUserName

        # Drop and recreate database
        Write-Host "  Dropping and recreating database..."
        $recreateDatabaseSql = "DROP DATABASE IF EXISTS $mysqlDatabaseName;`nCREATE DATABASE $mysqlDatabaseName CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`n"
        Invoke-MysqlRootSqlFile -Sql $recreateDatabaseSql -ContainerPath "/tmp/sanguiblog-recreate-db.sql"
        Write-Ok "Database recreated"

        # Import dump
        Write-Host "  Importing MySQL dump..."
        $mysqlDump = Join-Path $LocalBackupDir "mysql.sql"
        Invoke-DockerComposeCommand -Arguments @("cp", $mysqlDump, "mysql:/tmp/sanguiblog-mysql.sql") -FailureMessage "Failed to copy MySQL dump into mysql container" | Out-Null
        $mysqlImportSql = "USE $mysqlDatabaseName;`nSOURCE /tmp/sanguiblog-mysql.sql;`n"
        Invoke-MysqlRootSqlFile -Sql $mysqlImportSql -ContainerPath "/tmp/sanguiblog-import-wrapper.sql"
        Invoke-DockerComposeCommand -Arguments @("exec", "-T", "mysql", "rm", "-f", "/tmp/sanguiblog-mysql.sql") -FailureMessage "Failed to remove temporary MySQL dump from mysql container" | Out-Null
        Write-Ok "MySQL import complete"

        # Grant privileges
        Write-Host "  Granting user privileges..."
        $grantSql = "GRANT ALL PRIVILEGES ON $mysqlDatabaseName.* TO '$mysqlUserName'@'%';`nFLUSH PRIVILEGES;`n"
        try {
            Invoke-MysqlRootSqlFile -Sql $grantSql -ContainerPath "/tmp/sanguiblog-grant.sql"
            Write-Ok "Privileges granted"
        } catch {
            Write-Warn "Failed to grant privileges (may already be set)"
        }

        # Verify import
        Write-Host "  Verifying MySQL import..."
        $verifySql = "USE $mysqlDatabaseName;`nSHOW TABLES;`n"
        Invoke-MysqlRootSqlFile -Sql $verifySql -ContainerPath "/tmp/sanguiblog-verify.sql"

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
        Invoke-DockerComposeCommand -Arguments @("up", "-d", "pgvector") -FailureMessage "Failed to start PgVector service" -PrintOutput | Out-Null
        Write-Host "  Waiting for PgVector to be healthy..."
        $pgReady = Wait-ComposeServiceReady -Service "pgvector" -TimeoutSeconds 40
        if (-not $pgReady) {
            throw "PgVector did not become healthy within timeout"
        }
        Write-Ok "PgVector is healthy"

        $pgDatabaseName = Get-LocalEnvValue -Path (Join-Path $ComposeProjectDir ".env") -Key "POSTGRES_DB" -DefaultValue "sanguiblog_ai"
        $pgUserName = Get-LocalEnvValue -Path (Join-Path $ComposeProjectDir ".env") -Key "POSTGRES_USER" -DefaultValue "sanguiblog_pg_user"
        Assert-SafeSqlIdentifier -Name "POSTGRES_DB" -Value $pgDatabaseName
        Assert-SafeSqlIdentifier -Name "POSTGRES_USER" -Value $pgUserName

        # Drop and recreate database.
        Write-Host "  Dropping and recreating database..."
        $recreatePgSql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$pgDatabaseName';
DROP DATABASE IF EXISTS $pgDatabaseName;
CREATE DATABASE $pgDatabaseName OWNER $pgUserName;
"@
        Invoke-PgVectorSqlFile -Sql $recreatePgSql -ContainerPath "/tmp/sanguiblog-pgvector-recreate.sql"
        Write-Ok "Database recreated"

        # Ensure vector extension exists
        Write-Host "  Ensuring vector extension..."
        $ensureVectorSql = "\connect $pgDatabaseName`nCREATE EXTENSION IF NOT EXISTS vector;`n"
        Invoke-PgVectorSqlFile -Sql $ensureVectorSql -ContainerPath "/tmp/sanguiblog-pgvector-extension.sql"
        # Verify
        $extCheckSql = "\connect $pgDatabaseName`nSELECT extname FROM pg_extension WHERE extname = 'vector';`n"
        try {
            Invoke-PgVectorSqlFile -Sql $extCheckSql -ContainerPath "/tmp/sanguiblog-pgvector-extension-check.sql"
            Write-Ok "vector extension is available"
        } catch {
            Write-Fail "vector extension NOT found"
            Write-Host "  The pgvector/pgvector:pg16 image should provide this extension." -ForegroundColor Yellow
            Write-Host "  Manual fix: docker compose exec pgvector psql -U '<user>' -d '<db>' -c 'CREATE EXTENSION vector;'" -ForegroundColor Yellow
            throw "vector extension is missing"
        }

        # Import dump
        Write-Host "  Importing PgVector dump (custom format)..."
        $pgDump = Join-Path $LocalBackupDir "pgvector.dump"
        Invoke-DockerComposeCommand -Arguments @("cp", $pgDump, "pgvector:/tmp/sanguiblog-pgvector.dump") -FailureMessage "Failed to copy PgVector dump into pgvector container" | Out-Null
        $pgRestoreResult = Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "exec", "-T", "-e", "PG_RESTORE_DATABASE=$pgDatabaseName", "pgvector", "sh", "-c", 'pg_restore -U "$POSTGRES_USER" -d "$PG_RESTORE_DATABASE" --clean --if-exists --no-owner /tmp/sanguiblog-pgvector.dump')
        if ($pgRestoreResult.Output) {
            Write-Host ($pgRestoreResult.Output -join "`n")
        }
        if ($pgRestoreResult.ExitCode -ne 0) {
            Write-Warn "pg_restore reported warnings (some may be non-fatal such as role/extension notices)"
            Write-Host "  Checking if vector_store table exists..."
            $vsCheckSql = "\connect $pgDatabaseName`nSELECT COUNT(*) FROM vector_store;`n"
            try {
                Invoke-PgVectorSqlFile -Sql $vsCheckSql -ContainerPath "/tmp/sanguiblog-pgvector-vector-store-check.sql"
            } catch {
                throw "pg_restore failed and vector_store table is missing"
            }
            Write-Ok "vector_store table exists despite pg_restore warnings"
        }
        Invoke-DockerComposeCommand -Arguments @("exec", "-T", "pgvector", "rm", "-f", "/tmp/sanguiblog-pgvector.dump") -FailureMessage "Failed to remove temporary PgVector dump from pgvector container" | Out-Null
        Write-Ok "PgVector import complete"

        # Verify
        Write-Host "  Verifying PgVector import..."
        $rowCheckSql = "\connect $pgDatabaseName`nSELECT COUNT(*) AS row_count FROM vector_store;`n"
        Invoke-PgVectorSqlFile -Sql $rowCheckSql -ContainerPath "/tmp/sanguiblog-pgvector-row-check.sql"
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
            Invoke-DockerComposeCommand -Arguments @("up", "-d", "web") -FailureMessage "Failed to start web service for uploads restore" | Out-Null
            Start-Sleep -Seconds 3

            if ($RestoreUploadsMode -eq "Replace") {
                # Clear existing uploads
                Invoke-DockerComposeCommand -Arguments @("exec", "-T", "web", "sh", "-c", 'rm -rf /data/uploads/* /data/uploads/.[!.]* /data/uploads/..?*') -FailureMessage "Failed to clear existing uploads" | Out-Null
                Write-Host "  Cleared existing uploads (Replace mode)"
            }

            # Copy files
            # Use docker cp which works with stopped or running containers
            Invoke-DockerComposeCommand -Arguments @("cp", "$actualRestoreDir/.", "web:/data/uploads/") -FailureMessage "Failed to copy uploads to volume" | Out-Null

            # Verify file count after copy
            $fileCount = Invoke-DockerComposeCommand -Arguments @("exec", "-T", "web", "sh", "-c", 'find /data/uploads -type f | wc -l') -FailureMessage "Failed to count restored uploads"
            Write-Ok "Restored $(($fileCount.Output -join '').Trim()) files to uploads_data volume"

            # Fix ownership: docker compose cp creates files/dirs as root.
            # Backend runs as non-root user 'sangui:sangui', so restored
            # subdirectories (avatar, posts, covers) must be writable by that user.
            Write-Host "  Fixing uploads ownership for backend non-root user..."
            $chownResult = Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "exec", "-T", "-u", "root", "backend", "sh", "-c", 'chown -R sangui:sangui /data/uploads')
            if ($chownResult.ExitCode -ne 0) {
                Write-Fail "chown command failed; uploads may not be writable by backend"
                if ($chownResult.Output) { Write-Host ($chownResult.Output -join "`n") -ForegroundColor Red }
                Write-Host "    Run manual fix: docker compose exec -u root backend sh -c 'chown -R sangui:sangui /data/uploads'" -ForegroundColor Yellow
                throw "Failed to repair uploads ownership"
            } else {
                Write-Ok "Ownership set to sangui:sangui on /data/uploads"
            }

            # Write probes: verify backend user can create files in key upload dirs
            Write-Host "  Verifying backend write access to upload directories..."
            $writeDirs = @("posts", "covers", "avatar")
            $writeFailed = $false
            foreach ($dir in $writeDirs) {
                $probe = Invoke-NativeCommand -FilePath "docker" -Arguments @("compose", "exec", "-T", "backend", "sh", "-c", "mkdir -p /data/uploads/$dir && touch /data/uploads/$dir/.write-test && rm -f /data/uploads/$dir/.write-test")
                if ($probe.ExitCode -ne 0) {
                    Write-Fail "Backend cannot write to /data/uploads/$dir"
                    if ($probe.Output) { Write-Host ($probe.Output -join "`n") -ForegroundColor Red }
                    Write-Host "    Run manual fix: docker compose exec -u root backend sh -c 'chown -R sangui:sangui /data/uploads'" -ForegroundColor Yellow
                    $writeFailed = $true
                } else {
                    Write-Ok "/data/uploads/$dir is writable by backend"
                }
            }
            if ($writeFailed) {
                Write-Fail "Upload write probe failed. Restored files may be root-owned."
                Write-Host "  Uploads files were copied but backend may not be able to create new uploads." -ForegroundColor Yellow
                Write-Host "  Data and existing files are preserved. Fix ownership manually, then rerun restore verification." -ForegroundColor Yellow
                throw "Upload write probe failed"
            }

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
    Invoke-DockerComposeCommand -Arguments @("up", "-d", "--build") -FailureMessage "docker compose up -d --build failed" -PrintOutput | Out-Null
    Write-Ok "Services started"

    Write-Host "  Waiting for services to be ready..."
    Start-Sleep -Seconds 10

    # Wait for all core services to be ready
    $maxWait = 120 # seconds
    $waited = 0
    do {
        $notReady = @()
        foreach ($service in @("mysql", "pgvector", "backend", "web")) {
            $status = Get-ComposeServiceHealthStatus -Service $service
            if ($status -ne "healthy" -and $status -ne "running") {
                $notReady += "$service=$status"
            }
        }
        if ($notReady.Count -eq 0) {
            Write-Ok "All core services are ready"
            break
        }
        Start-Sleep -Seconds 5
        $waited += 5
    } while ($waited -lt $maxWait)

    if ($waited -ge $maxWait) {
        Write-Warn "Timed out waiting for all services to be healthy"
        Write-Host "  Run 'docker compose ps' to check status manually"
    }

    $serviceStatus = Invoke-DockerComposeCommand -Arguments @("ps") -FailureMessage "docker compose ps failed"
    Write-Host ($serviceStatus.Output -join "`n")

} finally {
    Pop-Location
}

# ====================================================================
# STEP 10: Health check
# ====================================================================
Write-Step "STEP 10: Health check (basic API verification)"

$healthErrors = @()
$webPort = Get-LocalEnvValue -Path (Join-Path $ComposeProjectDir ".env") -Key "WEB_PORT" -DefaultValue "80"
if ($webPort -notmatch '^\d+$') {
    Write-Warn "Invalid WEB_PORT in local .env; falling back to http://localhost"
    $webPort = "80"
}
$baseUrl = if ($webPort -eq "80") { "http://localhost" } else { "http://localhost:$webPort" }
Write-Host "  Health check base URL: $baseUrl"

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
if ($Mode -eq "BackupAndRestore") {
    Write-Host "BACKUP AND RESTORE COMPLETE" -ForegroundColor $(if ($healthErrors.Count -eq 0) { "Green" } else { "Yellow" })
} else {
    Write-Host "RESTORE COMPLETE" -ForegroundColor $(if ($healthErrors.Count -eq 0) { "Green" } else { "Yellow" })
}
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
Write-Host "  1. Visit $baseUrl in browser"
Write-Host "  2. Check articles, images, avatars load correctly"
Write-Host "  3. Try /admin login"
Write-Host "  4. Check /api/site/meta.aiAssistant.enabled for AI status"
Write-Host "  5. Run: docker compose exec pgvector psql -U '<user>' -d '<db>' -c 'SELECT COUNT(*) FROM vector_store;'"
Write-Host ""
