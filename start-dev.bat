@echo off
title Life-LAIne Launcher
echo ========================================================
echo        Starting Life-LAIne Services
echo ========================================================

powershell -NoProfile -Command "$ports = @(8000, 5173); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -gt 0) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } } }"

timeout /t 1 /nobreak >nul

echo Starting Backend Server on port 8000...
start "Life-LAIne Backend" cmd /k "cd /d %~dp0backend && ..\backend\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Frontend Server on port 5173...
start "Life-LAIne Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo ========================================================
echo Services launched! Keep the opened windows running.
echo API Docs: http://localhost:8000/docs
echo Web App:  http://localhost:5173
echo ========================================================
