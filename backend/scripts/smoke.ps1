# Smoke test against running API (default http://localhost:8080)
param([string]$BaseUrl = "http://localhost:8080")

$env:SMOKE_BASE_URL = $BaseUrl
Push-Location $PSScriptRoot\..
try {
    go run ./cmd/smoke
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
