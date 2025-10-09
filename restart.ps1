# D2L Interface Restart Script
Write-Host "Restarting D2L Interface Project..." -ForegroundColor Green

# Stop all Node processes
Write-Host "Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 2 seconds
Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Start backend
Write-Host "Starting Backend API..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\backend`" && npm start" -WindowStyle Normal

# Wait 3 seconds
Write-Host "Waiting 3 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d `"C:\Users\chase\My Drive\scripts\School Scripts\Interface Project\frontend`" && npm start" -WindowStyle Normal

Write-Host "Both servers restarted successfully!" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3015" -ForegroundColor Cyan
