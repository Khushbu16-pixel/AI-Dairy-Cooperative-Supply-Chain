@echo off
title DairySCM - Install Dependencies
echo ============================================================
echo   AI Dairy Cooperative Supply Chain - Setup
echo   Installing all required dependencies...
echo ============================================================
cd /d "%~dp0"

echo.
echo [1/2] Installing Python packages...
"C:\Users\ASUS\OneDrive\Desktop\IBM\.venv\Scripts\pip.exe" install -r requirements.txt

echo.
echo [2/2] Installing Node.js packages for React frontend...
cd /d "%~dp0\frontend"
npm install

echo.
echo ============================================================
echo   Setup complete! Run run_project.bat to start the platform.
echo ============================================================
pause
