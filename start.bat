@echo off
REM Universal Start Script for WhitelistHub (Batch version)
REM This script starts all services in development mode

echo ========================================
echo   WhitelistHub Start Script
echo ========================================
echo.

REM Get the script directory
cd /d "%~dp0"

REM Check if dependencies are installed
echo Checking dependencies...

set MISSING=0

if not exist "node_modules" (
    echo [ERROR] Root dependencies not installed
    set MISSING=1
)
if not exist "api\node_modules" (
    echo [ERROR] API dependencies not installed
    set MISSING=1
)
if not exist "bot\node_modules" (
    echo [ERROR] Bot dependencies not installed
    set MISSING=1
)
if not exist "dashboard\node_modules" (
    echo [ERROR] Dashboard dependencies not installed
    set MISSING=1
)

if %MISSING% EQU 1 (
    echo.
    echo Please run install.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

echo [OK] All dependencies are installed
echo.

echo Starting all services...
echo.
echo Services will start on:
echo   - Unified Server: http://localhost:3000
echo   - Discord Bot:    Runs inside the unified server process
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start all services using npm script
call npm run dev

pause
