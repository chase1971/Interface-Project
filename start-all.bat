@echo off
echo Starting D2L Interface Project...
echo.
echo Starting Backend API on port 5000...
start "D2L Backend" cmd /k "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend\" && npm start"
echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend on port 3015...
start "D2L Frontend" cmd /k "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend\" && npm start"
echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3015
echo.
pause
