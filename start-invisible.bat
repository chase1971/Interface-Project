@echo off
REM Start backend completely hidden
start /b "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend\" && node server.js"

REM Wait for backend
timeout /t 3 /nobreak >nul

REM Start frontend completely hidden
start /b "" cmd /c "cd /d \"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend\" && npm start"

REM Wait for frontend
timeout /t 5 /nobreak >nul

REM Open browser
start "" "http://localhost:3015"

REM Exit this batch file (no visible window)
exit
