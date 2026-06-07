# Run the full VMS stack from the repo root (Windows PowerShell)
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Checking Docker and starting services..." -ForegroundColor Cyan
npm run docker:up
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Starting UI (port 5173) — API via Go backend on :8080..." -ForegroundColor Cyan
Write-Host "Login: subdomain demo | admin@vms.local / admin123" -ForegroundColor Yellow
Write-Host "For Next.js gateway instead, run: npm run dev:next" -ForegroundColor DarkGray
Write-Host ""

npm run dev
