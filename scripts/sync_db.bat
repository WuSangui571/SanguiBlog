@echo off
:: 切换到 UTF-8 编码，解决乱码问题
chcp 65001 >nul

echo ==========================================
echo 正在连接阿里云服务器 (sangui.top)...
echo ==========================================

:: 执行下载
:: 注意：配置好免密登录后，这里就不需要输密码了
scp root@sangui.top:/home/sangui/db_backups/*.gz D:\07-ImportantFiles\14-MyBlogBackups\

:: 检查上一条命令是否成功 (%errorlevel% 为 0 代表成功)
if %errorlevel% == 0 (
    echo.
    echo [SUCCESS] 恭喜三桂！备份文件已成功同步到 D:\07-ImportantFiles\14-MyBlogBackups\
) else (
    echo.
    echo [ERROR] 下载失败！请检查网络或 SSH 配置。
)

echo.
pause