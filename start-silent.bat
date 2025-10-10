@echo off
echo 🚀 Silent Startup - Starting Interface Project...
echo.

REM Check if backend is running
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend already running on port 5000
    set BACKEND_RUNNING=1
) else (
    echo ❌ Backend not running
    set BACKEND_RUNNING=0
)

REM Check if frontend is running
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend already running on port 3000
    set FRONTEND_RUNNING=1
) else (
    echo ❌ Frontend not running
    set FRONTEND_RUNNING=0
)

echo.
echo 📊 Status:
echo    Backend:  %BACKEND_RUNNING%
echo    Frontend: %FRONTEND_RUNNING%
echo.

REM Start backend if not running (silent)
if %BACKEND_RUNNING% equ 0 (
    echo 🚀 Starting Backend (silent)...
    start /min "" cmd /c "cd /d "%~dp0backend" && npm start"
    timeout /t 3 /nobreak >nul
) else (
    echo ⏭️  Backend already running, skipping...
)

REM Start frontend if not running (silent)
if %FRONTEND_RUNNING% equ 0 (
    echo 🚀 Starting Frontend (silent)...
    start /min "" cmd /c "cd /d "%~dp0frontend" && npm start"
    timeout /t 3 /nobreak >nul
) else (
    echo ⏭️  Frontend already running, skipping...
)

echo.
echo 🎉 Silent startup complete!
echo.
echo 📱 Access your app at: http://localhost:3000
echo 🔧 Backend API at: http://localhost:5000
echo.
echo Press any key to close this window...
pause >nul
