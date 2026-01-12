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

# Check if concurrently is available
Write-Host "Starting all services..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Services will start on:" -ForegroundColor Cyan
Write-Host "  - API Server:     http://localhost:3001" -ForegroundColor White
Write-Host "  - Dashboard:      http://localhost:3000" -ForegroundColor White
Write-Host "  - Discord Bot:    Running in background" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Start all services using npm script
npm run dev
