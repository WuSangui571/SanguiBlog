@echo off
:: ==========================================
:: 脚本说明：生产环境静态资源同步脚本 (修正版)
:: 作用：将服务器 /home/sangui/uploads 整个目录
::      同步下载到本地 D:\...\SanguiBlog\uploads 中
:: 逻辑：以远程为准，本地同名文件会被覆盖
:: ==========================================

:: 1. 切换编码为 UTF-8
chcp 65001 >nul

:: ================= 配置区 =================
:: 服务器信息
set "REMOTE_USER=root"
set "REMOTE_HOST=sangui.top"

:: 远程源目录 (同步整个 uploads 文件夹)
set "REMOTE_PATH=/home/sangui/uploads"

:: 本地目标【父】目录 
:: 注意：这里设置的是 uploads 的上一级目录，这样 scp 会把 uploads 文件夹直接放进去
:: 如果设为 ...\uploads，结果会变成 ...\uploads\uploads (禁止套娃)
set "LOCAL_PARENT_DIR=D:\02-WorkSpace\02-Java\SanguiBlog"
:: ==========================================

echo.
echo ==========================================
echo [STEP 1] 正在连接服务器，准备同步资源...
echo 源地址: %REMOTE_HOST%:%REMOTE_PATH%
echo 目标地: %LOCAL_PARENT_DIR% (将自动更新其下的 uploads 目录)
echo ==========================================
echo.

:: 2. 检查本地父目录是否存在
if not exist "%LOCAL_PARENT_DIR%" (
    echo [ERROR] 本地父目录不存在: %LOCAL_PARENT_DIR%
    echo 请检查路径配置是否正确。
    pause
    exit
)

:: 3. 执行同步命令
:: scp 会将远程的 uploads 文件夹，完整复制到本地 LOCAL_PARENT_DIR 下
echo [STEP 2] 正在拉取数据，请耐心等待...
echo.

scp -r -p %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PATH% "%LOCAL_PARENT_DIR%"

:: 4. 结果判断
if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo [SUCCESS] 同步完成！
    echo 本地 uploads 目录已与生产环境保持一致。
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo [ERROR] 同步失败！
    echo 请检查网络连接或权限。
    echo ==========================================
)

echo.
pause