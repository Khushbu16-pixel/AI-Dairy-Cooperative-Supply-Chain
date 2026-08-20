@echo off
title DairySCM - Integrated Platform Launcher
echo ============================================================
echo   AI-Based Dairy Cooperative Supply Chain Platform
echo   Integrated Localhost Application
echo ============================================================
cd /d "%~dp0"

echo.
echo [1/3] Verifying database initialization...
"C:\Users\ASUS\OneDrive\Desktop\IBM\.venv\Scripts\python.exe" "%~dp0init_db.py"

echo.
echo [2/3] Checking compiled frontend...
if not exist "%~dp0frontend\dist\index.html" (
    echo Building frontend production bundle...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0"
)

echo.
echo [3/3] Starting Integrated Flask Platform on http://localhost:5000...
start http://localhost:5000

"C:\Users\ASUS\OneDrive\Desktop\IBM\.venv\Scripts\python.exe" "%~dp0app.py"
pause
