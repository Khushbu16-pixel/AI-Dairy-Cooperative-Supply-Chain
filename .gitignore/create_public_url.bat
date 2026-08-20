@echo off
title DairySCM - Create Public URL (ngrok)
set NGROK="C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

echo ============================================================
echo   Creating Public URL for AI Dairy Supply Chain Platform
echo ============================================================
echo.
echo NOTE: ngrok v3 requires a FREE account authtoken.
echo   1. Sign up at: https://ngrok.com
echo   2. Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken
echo   3. Run this command ONCE in any terminal:
echo      ngrok config add-authtoken ^<YOUR_TOKEN^>
echo   4. Then run this .bat file again.
echo.

echo Starting ngrok tunnel on port 5000 (Flask API)...
echo After ngrok starts, your public URL will appear in the ngrok window.
echo Copy the https://xxxxx.ngrok-free.app URL for sharing.
echo.
%NGROK% http 5000 --log=stdout
pause
