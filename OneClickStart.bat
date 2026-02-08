@echo off
chcp 65001 >nul
title 赛博玄学矩阵 | Mystic Matrix
cls

echo ========================================================
echo        欢迎进入 赛博玄学矩阵 (Mystic Matrix)
echo ========================================================
echo.

:: 1. Try to find Python for local server (Best for Camera support)
set "PYTHON_CMD="
for %%P in (python.exe) do set "PYTHON_CMD=%%~$PATH:P"

if defined PYTHON_CMD (
    echo [模式] 本地服务器模式 (推荐)
    echo  - 摄像头权限支持完善
    echo  - API 连接稳定
    echo.
    echo  正在启动服务器...
    start /min "MysticServer" "%PYTHON_CMD%" -m http.server 8000
    timeout /t 2 >nul
    echo  正在打开浏览器...
    start http://localhost:8000/index.html
) else (
    echo [模式] 离线文件模式
    echo  - 警告: 部分浏览器可能拦截摄像头或API请求
    echo  - 建议: 安装 Python 以获得最佳体验
    echo.
    echo  正在打开应用...
    start index.html
)

echo.
echo  系统已运行。祝您旅途愉快。
echo ========================================================
exit
