param(
    [string]$Version,
    [ValidateSet("patch", "minor")]
    [string]$Bump
)

if ([string]::IsNullOrWhiteSpace($Version) -and [string]::IsNullOrWhiteSpace($Bump)) {
    throw "Specify -Version (e.g. V2.1.286) or -Bump patch|minor."
}
if (-not [string]::IsNullOrWhiteSpace($Version) -and -not [string]::IsNullOrWhiteSpace($Bump)) {
    throw "Use either -Version or -Bump, not both."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverFile = Join-Path $repoRoot "SanguiBlog-server/src/main/resources/application.yaml"
$homeViewFile = Join-Path $repoRoot "SanguiBlog-front/src/appfull/public/HomeView.jsx"
$readmeFile = Join-Path $repoRoot "README.md"
$releaseDir = Join-Path $repoRoot "release"

function Assert-FileExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }
}

function Parse-Version {
    param([string]$Value)
    if ($Value -notmatch '^V(\d+)\.(\d+)\.(\d+)$') {
        throw "Invalid version format: $Value (expected V<major>.<minor>.<patch>)"
    }
    return [pscustomobject]@{ Major = [int]$Matches[1]; Minor = [int]$Matches[2]; Patch = [int]$Matches[3] }
}

function Format-Version {
    param([int]$Major, [int]$Minor, [int]$Patch)
    return "V$Major.$Minor.$Patch"
}

function Get-Current-Version {
    param([string]$Path)
    $content = Get-Content -Path $Path -Encoding UTF8
    foreach ($line in $content) {
        if ($line -match 'version:\s*"?(V\d+\.\d+\.\d+)"?') {
            return $Matches[1]
        }
    }
    throw "Unable to locate site.version in $Path"
}

function Replace-Regex {
    param([string]$Path, [string]$Pattern, [string]$Replacement)
    $text = Get-Content -Path $Path -Raw -Encoding UTF8
    $updated = [regex]::Replace($text, $Pattern, $Replacement, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if ($text -ne $updated) {
        Set-Content -Path $Path -Value $updated -Encoding UTF8
        return $true
    }
    return $false
}

Assert-FileExists -Path $serverFile
Assert-FileExists -Path $homeViewFile
Assert-FileExists -Path $readmeFile

$currentVersion = Get-Current-Version -Path $serverFile
$current = Parse-Version -Value $currentVersion

if (-not [string]::IsNullOrWhiteSpace($Version)) {
    $target = Parse-Version -Value $Version
    if ($target.Major -ne $current.Major) {
        throw "Major version update is not allowed by policy. Current: $currentVersion, Requested: $Version"
    }
    $newVersion = Format-Version -Major $target.Major -Minor $target.Minor -Patch $target.Patch
} else {
    if ($Bump -eq "minor") {
        $newVersion = Format-Version -Major $current.Major -Minor ($current.Minor + 1) -Patch 0
    } else {
        $newVersion = Format-Version -Major $current.Major -Minor $current.Minor -Patch ($current.Patch + 1)
    }
}

if ($newVersion -eq $currentVersion) {
    throw "New version equals current version: $currentVersion"
}

# Update application.yaml
Replace-Regex -Path $serverFile -Pattern 'version:\s*"?V\d+\.\d+\.\d+"?' -Replacement "version: \"$newVersion\"" | Out-Null

# Update HomeView fallback
Replace-Regex -Path $homeViewFile -Pattern "const siteVersion = meta\?\.version \|\| 'V\d+\.\d+\.\d+';" -Replacement "const siteVersion = meta?.version || '$newVersion';" | Out-Null

# Update README current version and release link
$readmeText = Get-Content -Path $readmeFile -Raw -Encoding UTF8
$readmeText = [regex]::Replace($readmeText, '(当前站点版本号：`)(V\d+\.\d+\.\d+)(`)', ('$1' + $newVersion + '$3'))
$readmeText = [regex]::Replace($readmeText, "release/V\d+\.\d+\.\d+\.md", "release/$newVersion.md")
Set-Content -Path $readmeFile -Value $readmeText -Encoding UTF8

# Ensure release note exists
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}
$releaseFile = Join-Path $releaseDir "$newVersion.md"
if (-not (Test-Path $releaseFile)) {
    $date = (Get-Date).ToString('yyyy-MM-dd')
    $template = @(
        "# SanguiBlog $newVersion 发布说明",
        "",
        "> **版本性质**：增量更新（相对 `$currentVersion`）",
        "> **发布日期**：$date",
        "",
        "## 变更摘要",
        "- TODO",
        "",
        "## 兼容性与升级注意事项",
        "- TODO"
    )
    Set-Content -Path $releaseFile -Value $template -Encoding UTF8
}

Write-Host "Version updated: $currentVersion -> $newVersion" -ForegroundColor Green
Write-Host "Updated: application.yaml, HomeView.jsx, README.md"
Write-Host "Release note: $releaseFile"
