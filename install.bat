@echo off
REM Universal Installation Script for WhitelistHub (Batch version)
REM This script installs all dependencies for all components

echo ========================================
echo   WhitelistHub Installation Script
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking prerequisites...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

node --version
npm --version
echo.

REM Get the script directory
cd /d "%~dp0"

echo Starting installation...
echo.

REM Install root dependencies
echo [1/5] Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo [OK] Root dependencies installed
echo.

REM Install API dependencies
echo [2/5] Installing API server dependencies...
cd api
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install API dependencies
    pause
    exit /b 1
)
echo [OK] API dependencies installed
echo.
cd ..

REM Install Bot dependencies
echo [3/5] Installing Discord bot dependencies...
cd bot
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install bot dependencies
    pause
    exit /b 1
)
echo [OK] Bot dependencies installed
echo.
cd ..

REM Install Dashboard dependencies
echo [4/5] Installing dashboard dependencies...
cd dashboard
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dashboard dependencies
    pause
    exit /b 1
)
echo [OK] Dashboard dependencies installed
echo.
cd ..

REM Install Minecraft Server dependencies (optional)
echo [5/5] Installing Minecraft server dependencies (optional)...
cd minecraft-server
if exist package.json (
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Failed to install Minecraft server dependencies (non-critical)
    ) else (
        echo [OK] Minecraft server dependencies installed
    )
) else (
    echo [WARNING] Minecraft server package.json not found (skipping)
)
echo.
cd ..

REM Return to root directory
cd /d "%~dp0"

echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure environment variables (see documentation)
echo 2. Run start.bat to start all services
echo    Or use: npm run dev
echo.
pause
