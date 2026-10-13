# HealthCopilot PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting HealthCopilot Services (PowerShell)     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Start Backend in a new window
Write-Host "Starting Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; & '$root\backend\venv\Scripts\python.exe' -m uvicorn app.main:app --app-dir backend --port 8000 --reload"

Start-Sleep -Seconds 2

# 2. Start Frontend in a new window
Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Open Browser
Start-Process "http://localhost:5173"

Write-Host "Services started! Keep the terminal windows open." -ForegroundColor Yellow
