@echo off
REM Completely invisible restart - no command prompts at all
echo Restarting servers invisibly...

REM Stop all servers
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    taskkill /F /IM node.exe >nul 2>&1
)

REM Wait for processes to stop
timeout /t 3 /nobreak >nul

REM Start backend
start /min "" cmd /c "cd /d "%~dp0backend" && npm start"
timeout /t 5 /nobreak >nul

REM Start frontend
start /min "" cmd /c "cd /d "%~dp0frontend" && npm start"

REM Close this window immediately
exit
