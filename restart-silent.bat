@echo off
echo 🔄 Silent Restart - Stopping and Starting Interface Project...
echo.

REM Stop all servers first
echo 🛑 Stopping all servers...

REM Kill backend processes
echo 🔍 Looking for backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo 🛑 Killing backend process %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill frontend processes
echo 🔍 Looking for frontend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo 🛑 Killing frontend process %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill any Node.js processes
echo 🔍 Looking for Node.js processes...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo 🛑 Killing all Node.js processes...
    taskkill /F /IM node.exe >nul 2>&1
)

echo.
echo ⏳ Waiting for processes to fully stop...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Starting servers back up (silent)...

REM Start backend (silent)
echo 🚀 Starting Backend (silent)...
start /min "" cmd /c "cd /d "%~dp0backend" && npm start"

REM Wait a moment for backend to start
echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend (silent)
echo 🚀 Starting Frontend (silent)...
start /min "" cmd /c "cd /d "%~dp0frontend" && npm start"

echo.
echo 🎉 Silent restart complete!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000
echo.
echo Press any key to close this window...
pause >nul
