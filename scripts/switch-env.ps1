param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "prod")]
    [string]$Target
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverFile = Join-Path $repoRoot "SanguiBlog-server/src/main/resources/application.yaml"
$frontEnvFile = Join-Path $repoRoot "SanguiBlog-front/.env.local"

$config = @{
    dev  = @{
        Port      = "8080"
        Storage   = '${STORAGE_BASE_PATH:D:\02-WorkSpace\02-Java\SanguiBlog\uploads}'
        AssetBase = '${ASSET_BASE_URL:http://localhost:${server.port}/uploads}'
        ApiBase   = "http://localhost:8080/api"
    }
    prod = @{
        Port      = "8082"
        Storage   = '${STORAGE_BASE_PATH:/home/sangui/uploads}'
        AssetBase = 'http://sangui.top/uploads'
        ApiBase   = "/api"
    }
}

function Assert-FileExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "未找到文件: $Path"
    }
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
            '^\s*storage:\s*$' { $section = "storage"; continue }
            '^\s*site:\s*$'    { $section = "site"; continue }
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

            '^(\s*)base-path:\s*.*$' {
                if ($section -eq "storage") { $lines[$i] = "$($Matches[1])base-path: $($Current.Storage)" }
                break
            }
            '^(\s*)#(\s*)base-path:\s*.*$' {
                if ($section -eq "storage") { $lines[$i] = "$($Matches[1])#$($Matches[2])base-path: $($Other.Storage)" }
                break
            }

            '^(\s*)asset-base-url:\s*.*$' {
                if ($section -eq "site") { $lines[$i] = "$($Matches[1])asset-base-url: $($Current.AssetBase)" }
                break
            }
            '^(\s*)#(\s*)asset-base-url:\s*.*$' {
                if ($section -eq "site") { $lines[$i] = "$($Matches[1])#$($Matches[2])asset-base-url: $($Other.AssetBase)" }
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
    Assert-FileExists -Path $frontEnvFile

    $currentCfg = $config[$Target]
    $otherCfg = if ($Target -eq "dev") { $config["prod"] } else { $config["dev"] }

    Update-ServerYaml -Path $serverFile -Current $currentCfg -Other $otherCfg
    Update-FrontendEnv -Path $frontEnvFile -Current $currentCfg

    Write-Host "已切换到 $Target 环境" -ForegroundColor Green
    Write-Host "后端 port=$($currentCfg.Port), storage=$($currentCfg.Storage), asset-base-url=$($currentCfg.AssetBase)"
    Write-Host "前端 VITE_API_BASE=$($currentCfg.ApiBase)"
} catch {
    Write-Error $_
    exit 1
}
