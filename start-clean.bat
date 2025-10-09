@echo off
echo Starting D2L Interface Project (Clean Mode)...
echo.

REM Start backend in background (no window)
start /min "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend\" && node server.js"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in background (no window)  
start /min "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend\" && npm start"

echo.
echo Both servers are starting in the background...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3015
echo.
echo Press any key to stop all servers...
pause >nul

REM Stop all servers when user presses a key
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im cmd.exe >nul 2>&1
echo All servers stopped.
pause
