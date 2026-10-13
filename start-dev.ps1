# Life-LAIne PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         Starting Life-LAIne AI Health Copilot         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# Clean up any previous lingering processes on ports 8000 and 5173
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $procIds) {
            if ($procId -gt 0 -and $procId -ne $PID) {
                Write-Host "Reclaiming port $port (stopping process $procId)..." -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Start-Sleep -Seconds 1

# 1. Start Backend in a new window
Write-Host "Starting Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; & '$root\backend\venv\Scripts\python.exe' -m uvicorn app.main:app --port 8000 --reload"

Start-Sleep -Seconds 2

# 2. Start Frontend in a new window
Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Open Browser
Write-Host "Opening web application in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Services running smoothly! Keep terminal windows open." -ForegroundColor Green
Write-Host "  Backend API:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend App: http://localhost:5173" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
