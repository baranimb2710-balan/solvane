@echo off
title Solvane Backend (FastAPI)
echo ========================================================
echo  Starting Solvane Backend Server (FastAPI on Port 8000)
echo ========================================================
cd /d "%~dp0backend"
if not exist ".\.venv\Scripts\python.exe" (
    echo Error: Python virtual environment not found in backend\.venv
    pause
    exit /b 1
)
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
