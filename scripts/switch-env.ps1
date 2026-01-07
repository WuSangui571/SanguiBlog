param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "prod")]
    [string]$Target
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverFile = Join-Path $repoRoot "SanguiBlog-server/src/main/resources/application.yaml"
$serverLocalFile = Join-Path $repoRoot "SanguiBlog-server/src/main/resources/application-local.yaml"
$frontEnvFile = Join-Path $repoRoot "SanguiBlog-front/.env.local"

$config = @{
    dev  = @{
        Port      = "8080"
        DbUrl     = "jdbc:mysql://123.56.244.121:3306/sanguiblog_db?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf-8"
        Storage   = "D:\02-WorkSpace\02-Java\SanguiBlog\uploads"
        AssetBase = "http://localhost:8080/uploads"
        ApiBase   = "http://localhost:8080/api"
    }
    prod = @{
        Port      = "8082"
        DbUrl     = "jdbc:mysql://127.0.0.1:3306/sanguiblog_db?useSSL=true&serverTimezone=Asia/Shanghai&characterEncoding=utf-8"
        Storage   = "/home/sangui/uploads"
        AssetBase = "http://sangui.top/uploads"
        ApiBase   = "/api"
    }
}

function Assert-FileExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "未找到文件 $Path"
    }
}

function Ensure-LocalYaml {
    param([string]$Path)
    if (Test-Path $Path) { return }
    $template = @(
        "spring:",
        "  datasource:",
        "    url: jdbc:mysql://127.0.0.1:3306/sanguiblog_db?useSSL=true&serverTimezone=Asia/Shanghai&characterEncoding=utf-8",
        "    username: your_db_user",
        "    password: your_db_password",
        "    driver-class-name: com.mysql.cj.jdbc.Driver",
        "",
        "jwt:",
        "  secret: your_jwt_secret",
        "",
        "storage:",
        "  base-path: /path/to/uploads",
        "",
        "security:",
        "  cors:",
        "    allowed-origins: >",
        "      https://sangui.top,",
        "      https://www.sangui.top,",
        "      http://localhost:5173",
        "",
        "site:",
        "  base-url: https://www.sangui.top",
        "  allowed-hosts: sangui.top,www.sangui.top",
        "  asset-base-url: https://www.sangui.top/uploads"
    )
    Set-Content -Path $Path -Value $template -Encoding UTF8
}

function Update-ServerYaml {
    param(
        [string]$Path,
        [hashtable]$Current,
        [hashtable]$Other
    )

    $lines = Get-Content -Path $Path -Encoding UTF8
    $section = ""
    for ($i = 0; $i -lt $lines.Length; $i++) {
        switch -Regex ($lines[$i]) {
            '^\s*server:\s*$'  { $section = "server"; continue }
            '^\s*[a-zA-Z0-9_-]+:\s*$' { $section = ""; continue }
        }

        switch -Regex ($lines[$i]) {
            '^(\s*)port:\s*\S+' {
                if ($section -eq "server") { $lines[$i] = "$($Matches[1])port: $($Current.Port)" }
                break
            }
            '^(\s*)#(\s*)port:\s*\S+' {
                if ($section -eq "server") { $lines[$i] = "$($Matches[1])#$($Matches[2])port: $($Other.Port)" }
                break
            }
        }
    }
    Set-Content -Path $Path -Value $lines -Encoding UTF8
}

function Update-LocalYaml {
    param(
        [string]$Path,
        [hashtable]$Current
    )

    $lines = Get-Content -Path $Path -Encoding UTF8
    $section = ""
    $subSection = ""

    for ($i = 0; $i -lt $lines.Length; $i++) {
        switch -Regex ($lines[$i]) {
            '^(\s*)spring:\s*$' { $section = "spring"; $subSection = ""; continue }
            '^(\s*)storage:\s*$' { $section = "storage"; $subSection = ""; continue }
            '^(\s*)site:\s*$' { $section = "site"; $subSection = ""; continue }
            '^(\s*)datasource:\s*$' {
                if ($section -eq "spring") { $subSection = "datasource" }
                continue
            }
            '^(\s*)[a-zA-Z0-9_-]+:\s*$' {
                if ($section -eq "spring" -and $subSection -eq "datasource") {
                    if ($Matches[1].Length -le 2) { $subSection = "" }
                }
                if ($Matches[1].Length -eq 0) { $section = ""; $subSection = "" }
                continue
            }
        }

        switch -Regex ($lines[$i]) {
            '^(\s*)url:\s*.*$' {
                if ($section -eq "spring" -and $subSection -eq "datasource") {
                    $lines[$i] = "$($Matches[1])url: $($Current.DbUrl)"
                }
                break
            }
            '^(\s*)base-path:\s*.*$' {
                if ($section -eq "storage") { $lines[$i] = "$($Matches[1])base-path: $($Current.Storage)" }
                break
            }
            '^(\s*)asset-base-url:\s*.*$' {
                if ($section -eq "site") { $lines[$i] = "$($Matches[1])asset-base-url: $($Current.AssetBase)" }
                break
            }
        }
    }
    Set-Content -Path $Path -Value $lines -Encoding UTF8
}

function Update-FrontendEnv {
    param(
        [string]$Path,
        [hashtable]$Current
    )
    $content = @("VITE_API_BASE=$($Current.ApiBase)")
    Set-Content -Path $Path -Value $content -Encoding UTF8
}

try {
    Assert-FileExists -Path $serverFile
    Ensure-LocalYaml -Path $serverLocalFile

    $currentCfg = $config[$Target]
    $otherCfg = if ($Target -eq "dev") { $config["prod"] } else { $config["dev"] }

    Update-ServerYaml -Path $serverFile -Current $currentCfg -Other $otherCfg
    Update-LocalYaml -Path $serverLocalFile -Current $currentCfg
    Update-FrontendEnv -Path $frontEnvFile -Current $currentCfg

    Write-Host "已切换到 $Target 环境" -ForegroundColor Green
    Write-Host "后端 port=$($currentCfg.Port), dbUrl=$($currentCfg.DbUrl), storage=$($currentCfg.Storage), asset-base-url=$($currentCfg.AssetBase)"
    Write-Host "前端 VITE_API_BASE=$($currentCfg.ApiBase)"
} catch {
    Write-Error $_
    exit 1
}
