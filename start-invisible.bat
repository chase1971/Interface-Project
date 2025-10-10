@echo off
REM Completely invisible startup - no command prompts at all
echo Starting servers invisibly...

REM Check if backend is running
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% neq 0 (
    start /min "" cmd /c "cd /d "%~dp0backend" && npm start"
    timeout /t 3 /nobreak >nul
)

REM Check if frontend is running
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% neq 0 (
    start /min "" cmd /c "cd /d "%~dp0frontend" && npm start"
    timeout /t 3 /nobreak >nul
)

REM Close this window immediately
exit
