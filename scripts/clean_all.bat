@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ================================================
echo Mystic Matrix clean all

echo ================================================

echo remove project artifacts...
if exist "%ROOT%\dist" rmdir /s /q "%ROOT%\dist"
if exist "%ROOT%\node_modules" rmdir /s /q "%ROOT%\node_modules"
if exist "%ROOT%\release" rmdir /s /q "%ROOT%\release"
if exist "%ROOT%\.cache" rmdir /s /q "%ROOT%\.cache"

echo remove external caches used by electron-builder...
if exist "%LOCALAPPDATA%\electron-builder\Cache" rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
if exist "%LOCALAPPDATA%\electron\Cache" rmdir /s /q "%LOCALAPPDATA%\electron\Cache"

echo done. You can now delete the whole mystic_matrix folder.
echo ================================================
pause
exit /b 0
