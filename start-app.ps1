# PowerShell script to start the full application
Write-Host "🚀 Starting Interface Project..." -ForegroundColor Green

# Check if backend is running
$backendRunning = Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "✅ Backend already running on port 3005" -ForegroundColor Green
} else {
    Write-Host "🚀 Starting Backend..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "backend" -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

# Check if frontend is running
$frontendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontendRunning) {
    Write-Host "✅ Frontend already running on port 3000" -ForegroundColor Green
} else {
    Write-Host "🚀 Starting Frontend..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "frontend" -WindowStyle Minimized
    Start-Sleep -Seconds 5
}

# Open browser
Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host "🎉 Application started!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "🔧 Backend: http://localhost:3005" -ForegroundColor Blue
