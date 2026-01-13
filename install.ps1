# ================================
# WhitelistHub Universal Installer
# ================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhitelistHub Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking prerequisites..." -ForegroundColor Yellow

function Test-Command {
    param ([string]$Command)
    return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

if (-not (Test-Command "node")) {
    Write-Host "✗ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "✗ npm not found in PATH" -ForegroundColor Red
    Write-Host "npm should be included with Node.js" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
$npmVersion  = npm --version

Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
Write-Host ""

Write-Host "Starting installation..." -ForegroundColor Yellow
Write-Host ""

# Resolve script directory safely
if ($PSScriptRoot) {
    $scriptDir = $PSScriptRoot
} else {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Push-Location $scriptDir

try {
    Write-Host "[1/1] Installing dependencies (npm workspaces)..." -ForegroundColor Cyan
    npm install

    if ($LASTEXITCODE -ne 0) {
        throw "Dependency installation failed."
    }

    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
}
catch {
    Write-Host "✗ Installation failed:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}

Write-Host "" 
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure environment variables (see documentation)" -ForegroundColor White
Write-Host '2. Run .\start.ps1 to start the unified server' -ForegroundColor White
Write-Host '   Or use: npm run dev' -ForegroundColor White
Write-Host ""
