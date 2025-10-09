@echo off
REM Start backend silently
start /min "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend\" && node server.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend silently
start /min "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend\" && npm start"

REM Open browser to the application
timeout /t 5 /nobreak >nul
start "" "http://localhost:3015"

REM Keep this window open but minimized
echo D2L Interface is running...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3015
echo.
echo Close this window to stop all servers.
pause
