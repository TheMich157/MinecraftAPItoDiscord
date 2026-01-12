# Universal Installation Script for WhitelistHub
# This script installs all dependencies for all components

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhitelistHub Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting installation..." -ForegroundColor Yellow
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Install root dependencies
Write-Host "[1/5] Installing root dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Root dependencies installed" -ForegroundColor Green
Write-Host ""

# Install API dependencies
Write-Host "[2/5] Installing API server dependencies..." -ForegroundColor Cyan
Set-Location "$scriptDir\api"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install API dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ API dependencies installed" -ForegroundColor Green
Write-Host ""

# Install Bot dependencies
Write-Host "[3/5] Installing Discord bot dependencies..." -ForegroundColor Cyan
Set-Location "$scriptDir\bot"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install bot dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Bot dependencies installed" -ForegroundColor Green
Write-Host ""

# Install Dashboard dependencies
Write-Host "[4/5] Installing dashboard dependencies..." -ForegroundColor Cyan
Set-Location "$scriptDir\dashboard"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dashboard dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dashboard dependencies installed" -ForegroundColor Green
Write-Host ""

# Install Minecraft Server dependencies (optional)
Write-Host "[5/5] Installing Minecraft server dependencies (optional)..." -ForegroundColor Cyan
Set-Location "$scriptDir\minecraft-server"
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Failed to install Minecraft server dependencies (non-critical)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Minecraft server dependencies installed" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ Minecraft server package.json not found (skipping)" -ForegroundColor Yellow
}
Write-Host ""

# Return to root directory
Set-Location $scriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure environment variables (see documentation)" -ForegroundColor White
Write-Host "2. Run .\start.ps1 to start all services" -ForegroundColor White
Write-Host ('   Or use: npm run dev') -ForegroundColor White
Write-Host ""
