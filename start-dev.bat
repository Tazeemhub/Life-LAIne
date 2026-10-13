@echo off
title HealthCopilot Launcher
echo ========================================================
echo        Starting HealthCopilot Services
echo ========================================================

echo Starting Backend Server on port 8000...
start "HealthCopilot Backend" cmd /k "cd /d %~dp0 && backend\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Frontend Server on port 5173...
start "HealthCopilot Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo ========================================================
echo Services launched! Keep the opened windows running.
echo ========================================================
