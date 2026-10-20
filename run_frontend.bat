@echo off
title Solvane Frontend (Vite + React)
echo ========================================================
echo  Starting Solvane Frontend Server (Vite on Port 5173)
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
