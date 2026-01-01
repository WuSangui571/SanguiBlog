@echo off
:: ==========================================
:: 脚本说明：生产环境静态资源同步 (纯净版)
:: 作用：将服务器 uploads 同步到本地
:: 特性：无日志文件，执行完自动关闭
:: ==========================================

:: WinSCP 路径
set "WINSCP_PATH=D:\04-ProgramFiles\WinSCP\WinSCP.com"

:: 会话名称
set "SESSION_NAME=SanguiProduction"

:: 路径配置
set "REMOTE_PATH=/home/sangui/uploads"
set "LOCAL_DIR=D:\02-WorkSpace\02-Java\SanguiBlog\uploads"

:: 检查本地目录
if not exist "%LOCAL_DIR%" mkdir "%LOCAL_DIR%"

echo.
echo [STEP 1] 正在同步资源 (WinSCP)...
echo.

:: 执行同步命令 (已移除 /log 参数)
"%WINSCP_PATH%" /command ^
    "open %SESSION_NAME%" ^
    "synchronize local -delete ""%LOCAL_DIR%"" ""%REMOTE_PATH%""" ^
    "exit"

if %errorlevel% == 0 (
    echo [SUCCESS] 同步完成。
) else (
    echo [ERROR] 同步出错。
)

echo.
pause