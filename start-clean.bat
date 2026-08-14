@echo off
REM Kill any processes on port 3005 or 3000
echo Cleaning up old processes...
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3005 -or $_.LocalPort -eq 3000 }) } | Stop-Process -Force" >nul 2>&1

REM Wait for cleanup
timeout /t 2 /nobreak >nul

REM Start backend on port 3005
echo Starting backend on port 3005...
cd /d "%~dp0backend"
start /B "D2L Backend" cmd /c "set PORT=3005 && node server.js"

REM Wait for backend to start
timeout /t 4 /nobreak >nul

REM Start frontend on port 3000 (suppress browser, no prompts)
echo Starting frontend on port 3000...
cd /d "%~dp0frontend"
start /B "D2L Frontend" cmd /c "set PORT=3000 && set BROWSER=none && npm start"

REM Wait for frontend to start
timeout /t 10 /nobreak >nul

REM Open browser
echo Opening browser...
start "" "http://localhost:3000"

echo.
echo D2L Interface is running!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:3005
echo.
echo Close this window to keep servers running in background.
timeout /t 3 /nobreak >nul
