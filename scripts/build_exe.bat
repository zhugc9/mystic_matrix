@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ================================================
echo Mystic Matrix build (portable exe)
echo ================================================

if not exist "%ROOT%\.cache" mkdir "%ROOT%\.cache"
set "ELECTRON_BUILDER_CACHE=%ROOT%\.cache\electron-builder"
set "npm_config_cache=%ROOT%\.cache\npm"

if exist "%ELECTRON_BUILDER_CACHE%\nsis" rmdir /s /q "%ELECTRON_BUILDER_CACHE%\nsis"
if exist "%ELECTRON_BUILDER_CACHE%\nsis-resources" rmdir /s /q "%ELECTRON_BUILDER_CACHE%\nsis-resources"

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js LTS first.
  pause
  exit /b 1
)

if not exist "%ROOT%\node_modules" (
  echo [1/4] install dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/4] dependencies already installed.
)

echo [2/4] building exe...
call npm run build:win
if errorlevel 1 (
  echo ERROR: build failed.
  pause
  exit /b 1
)

echo [3/4] prepare release folder...
if exist "%ROOT%\release" rmdir /s /q "%ROOT%\release"
mkdir "%ROOT%\release"
for %%F in ("%ROOT%\dist\MysticMatrix-Portable-*.exe") do copy /y "%%~fF" "%ROOT%\release\" >nul
copy /y "%ROOT%\??????.bat" "%ROOT%\release\" >nul
copy /y "%ROOT%\?????.txt" "%ROOT%\release\" >nul
if exist "%ROOT%\docs\??????.md" copy /y "%ROOT%\docs\??????.md" "%ROOT%\release\" >nul

if exist "%ROOT%\dist\win-unpacked" rmdir /s /q "%ROOT%\dist\win-unpacked"
if exist "%ROOT%\dist\builder-debug.yml" del /f /q "%ROOT%\dist\builder-debug.yml"

echo [4/4] done.
echo release folder: %ROOT%\release

echo ================================================
pause
exit /b 0
