@echo off
setlocal EnableExtensions
chcp 65001 >nul
title 赛博玄学矩阵 | Mystic Matrix Launcher
cls

set "ROOT=%~dp0"
set "APP_URL=http://localhost:8000/index.html"
set "PORTABLE_EXE="
set "PYTHON_CMD="

echo ========================================================
echo        欢迎使用 赛博玄学矩阵 (Mystic Matrix)
echo ========================================================
echo.

for %%F in ("%ROOT%dist\MysticMatrix-Portable-*.exe") do (
    set "PORTABLE_EXE=%%~fF"
    goto :RUN_EXE
)

for %%F in ("%ROOT%MysticMatrix-Portable-*.exe") do (
    set "PORTABLE_EXE=%%~fF"
    goto :RUN_EXE
)

if exist "%ROOT%MysticMatrix.exe" (
    set "PORTABLE_EXE=%ROOT%MysticMatrix.exe"
    goto :RUN_EXE
)

:WEB_FALLBACK
echo  未检测到桌面 EXE，切换为网页模式...

echo  正在检测 Python...
if exist "%ROOT%runtime\python\python.exe" (
    set "PYTHON_CMD=%ROOT%runtime\python\python.exe"
) else (
    for %%P in (python.exe) do set "PYTHON_CMD=%%~$PATH:P"
)

if not defined PYTHON_CMD (
    echo [错误] 未检测到 Python 环境。
    echo 方案A：放入打包后的 EXE（推荐售卖形态）。
    echo 方案B：安装 Python 3.8+ 并加入 PATH。
    echo.
    pause
    exit /b 1
)

taskkill /F /IM python.exe /FI "WINDOWTITLE eq MysticServer*" >nul 2>&1
echo  正在启动本地服务器...
start "MysticServer" /min "%PYTHON_CMD%" -m http.server 8000 --directory "%ROOT%"

timeout /t 2 >nul
echo  正在打开浏览器...
start "" "%APP_URL%"

echo.
echo  系统已运行。请不要关闭此窗口。
echo ========================================================
exit /b 0

:RUN_EXE
echo  检测到桌面版：
echo  %PORTABLE_EXE%
echo  正在启动...
start "" "%PORTABLE_EXE%"
exit /b 0
