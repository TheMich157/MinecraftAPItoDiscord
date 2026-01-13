# Universal Start Script for WhitelistHub
# This script starts all services in development mode

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhitelistHub Start Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$missingDeps = @()

if (-not (Test-Path "node_modules")) {
    $missingDeps += "Root dependencies"
}
if (-not (Test-Path "api\node_modules")) {
    $missingDeps += "API dependencies"
}
if (-not (Test-Path "bot\node_modules")) {
    $missingDeps += "Bot dependencies"
}
if (-not (Test-Path "dashboard\node_modules")) {
    $missingDeps += "Dashboard dependencies"
}

if ($missingDeps.Count -gt 0) {
    Write-Host ""
    Write-Host "✗ Missing dependencies detected:" -ForegroundColor Red
    foreach ($dep in $missingDeps) {
        Write-Host "  - $dep" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please run .\install.ps1 first to install dependencies" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ All dependencies are installed" -ForegroundColor Green
Write-Host ""

# One-port mode: build dashboard then start unified server
Write-Host "Building dashboard and starting unified server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Services will start on:" -ForegroundColor Cyan
Write-Host "  - Unified Server: http://localhost:3000" -ForegroundColor White
Write-Host "  - API + Dashboard served together from the unified server" -ForegroundColor White
Write-Host "" 
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Build dashboard and start unified server
npm run build:dashboard
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Dashboard build failed" -ForegroundColor Red
    exit 1
}

npm start
