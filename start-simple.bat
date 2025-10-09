@echo off
echo Starting D2L Interface...

REM Start backend in background
start /min "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend\" && node server.js"

REM Wait 3 seconds
timeout /t 3 /nobreak >nul

REM Start frontend in background  
start /min "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend\" && npm start"

REM Wait 5 seconds
timeout /t 5 /nobreak >nul

REM Open browser
start "" "http://localhost:3015"

echo.
echo D2L Interface is running!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3015
echo.
echo Press any key to stop all servers...
pause >nul

REM Stop all servers
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im cmd.exe >nul 2>&1
echo All servers stopped.
pause
