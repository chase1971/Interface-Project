@echo off
echo Restarting D2L Interface Project...
echo.
echo Stopping all Node processes...
taskkill /f /im node.exe 2>nul
echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo.
echo Starting Backend API...
start "D2L Backend" cmd /k "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend\" && npm start"
echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend...
start "D2L Frontend" cmd /k "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend\" && npm start"
echo.
echo Both servers restarted successfully!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3015
pause
