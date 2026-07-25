# Démarre le backend en mode ASGI (HTTP + WebSocket GPS).
# Usage: .\run_asgi.ps1
Set-Location $PSScriptRoot
Write-Host "BlockTask ASGI on http://0.0.0.0:8000 (WebSockets enabled)" -ForegroundColor Green
daphne -b 0.0.0.0 -p 8000 config.asgi:application
