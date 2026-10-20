@echo off
title Launch Solvane
echo ========================================================
echo  Launching Solvane Backend and Frontend Servers...
echo ========================================================
start "Solvane Backend" "%~dp0run_backend.bat"
start "Solvane Frontend" "%~dp0run_frontend.bat"
echo.
echo Both servers have been launched in separate windows!
echo - Backend API:  http://localhost:8000
echo - Frontend App: http://localhost:5173
echo.
timeout /t 3 >nul
