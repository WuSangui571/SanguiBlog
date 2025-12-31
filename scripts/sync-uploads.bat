@echo off
:: ==========================================================
:: SanguiBlog - 同步生产 uploads(games) 到本地（以生产为准）
:: 说明：
::   1) 只读取生产端数据，不会对远程做任何写操作。
::   2) 同步以“生产端为准”：会覆盖本地同名文件，并删除本地多余文件（镜像）。
:: 依赖：
::   - Windows 自带 OpenSSH：scp/ssh（或自行安装并加入 PATH）
::   - robocopy（Windows 自带）
:: 用法：
::   - 直接双击运行，或在仓库根目录执行：.\scripts\sync-uploads.bat
::   - 可选：设置环境变量 REMOTE_HOST / REMOTE_USER / REMOTE_DIR / REMOTE_PORT
:: ==========================================================

setlocal EnableExtensions EnableDelayedExpansion

:: 切换到 UTF-8 编码，避免中文提示乱码
chcp 65001 >nul

echo ==========================================
echo [SanguiBlog] uploads(games) 同步脚本（生产 -> 本地）
echo ==========================================

:: --------- 可配置项（可用环境变量覆盖） ----------
if not defined REMOTE_HOST set "REMOTE_HOST=sangui.top"
if not defined REMOTE_USER set "REMOTE_USER=root"
if not defined REMOTE_DIR  set "REMOTE_DIR=/home/sangui/uploads/games"
set "LOCAL_SUBDIR=uploads\\games"

:: SCP/SSH 稳定性参数：避免长时间无响应导致“挂死”
set "SSH_COMMON_OPTS=-o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3"

set "SCP_PORT_ARG="
set "SSH_PORT_ARG="
if defined REMOTE_PORT (
  set "SCP_PORT_ARG=-P %REMOTE_PORT%"
  set "SSH_PORT_ARG=-p %REMOTE_PORT%"
)

:: --------- 定位仓库根目录与本地目标目录 ----------
for %%I in ("%~dp0..") do set "REPO_ROOT=%%~fI"
set "LOCAL_DIR=%REPO_ROOT%\\%LOCAL_SUBDIR%"

:: --------- 依赖检查 ----------
where scp >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] 未找到 scp。请先安装/启用 OpenSSH 并确保 scp 在 PATH 中。
  echo         你可以在 PowerShell 执行：where scp
  echo.
  pause
  exit /b 1
)

where robocopy >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] 未找到 robocopy（这通常不应该发生）。请检查系统环境。
  echo.
  pause
  exit /b 1
)

:: --------- 临时目录（先下载到 temp，再镜像到本地） ----------
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%T"
set "TMP_BASE=%~dp0.tmp"
set "TMP_DIR=%TMP_BASE%\\uploads_%TS%"
set "TMP_REMOTE_DIR=%TMP_DIR%\\games"

echo.
echo [配置] 生产端：%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%
echo [配置] 本地端：%LOCAL_DIR%
echo.

:: --------- 1) 预检查：生产端目录是否存在 ----------
where ssh >nul 2>nul
if not errorlevel 1 (
  echo [1/3] 预检查生产端目录...
  ssh %SSH_PORT_ARG% %SSH_COMMON_OPTS% %REMOTE_USER%@%REMOTE_HOST% "test -d %REMOTE_DIR% && echo OK || echo MISSING"
  if errorlevel 1 (
    echo.
    echo [ERROR] 预检查失败：SSH 连接失败或免密配置不可用。
    echo.
    pause
    exit /b 1
  )
) else (
  echo [1/3] 未检测到 ssh，跳过预检查（仅依赖 scp 返回值）...
)

:: --------- 2) 下载：生产端 -> 临时目录 ----------
echo.
echo [2/3] 下载生产端目录到临时目录（慢一点没关系，主打一个稳）...
if exist "%TMP_DIR%" rmdir /s /q "%TMP_DIR%"
mkdir "%TMP_DIR%" >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] 无法创建临时目录：%TMP_DIR%
  echo.
  pause
  exit /b 1
)

:: 注意：该 scp 命令只读生产端，不会写入/删除任何远程文件
scp %SCP_PORT_ARG% %SSH_COMMON_OPTS% -r -p %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR% "%TMP_DIR%"
if errorlevel 1 (
  echo.
  echo [ERROR] scp 下载失败！请检查网络、DNS、SSH 免密配置、以及远程目录权限。
  echo.
  pause
  exit /b 1
)

if not exist "%TMP_REMOTE_DIR%\\." (
  echo.
  echo [ERROR] 下载完成但未发现临时目录中的 games 内容：%TMP_REMOTE_DIR%
  echo        请确认远程路径是否正确：%REMOTE_DIR%
  echo.
  pause
  exit /b 1
)

:: --------- 3) 镜像：临时目录 -> 本地目录（以生产为准） ----------
echo.
echo [3/3] 镜像到本地 uploads\\games（本地冲突会被生产端覆盖，本地多余文件会被删除）...
if not exist "%LOCAL_DIR%" mkdir "%LOCAL_DIR%" >nul 2>nul

robocopy "%TMP_REMOTE_DIR%" "%LOCAL_DIR%" /MIR /R:3 /W:5 /NP /NFL /NDL /TEE
set "ROBOCODE=%ERRORLEVEL%"

:: robocopy 返回码：0-7 视为成功，>=8 为失败
if %ROBOCODE% GEQ 8 (
  echo.
  echo [ERROR] robocopy 失败，返回码：%ROBOCODE%
  echo        注意：临时目录仍保留，便于排查：%TMP_DIR%
  echo.
  pause
  exit /b %ROBOCODE%
)

:: 清理临时目录（成功才删）
if exist "%TMP_DIR%" rmdir /s /q "%TMP_DIR%"

echo.
echo [SUCCESS] 同步完成：本地 uploads\\games 已与生产端保持一致（以生产端为准）。
echo.
pause
exit /b 0

