@echo off
echo Starting Interface Project Servers...

REM Kill any existing Node processes
taskkill /F /IM node.exe 2>nul

REM Start Backend Server
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && node server.js"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend Server  
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm start"

echo Both servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
pause
