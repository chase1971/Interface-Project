# D2L Interface Launcher
# Starts backend and frontend servers silently

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting D2L Interface..." -ForegroundColor Cyan

# Kill any existing processes on ports 3005 or 3000 (multiple methods to ensure they're gone)
Write-Host "Cleaning up old processes..." -ForegroundColor Yellow

# Method 1: Kill by port
Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
    (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | 
     Where-Object { $_.LocalPort -eq 3005 -or $_.LocalPort -eq 3000 }) 
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Method 2: Kill any node processes in the project directory (backup)
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    $processPath = $_.Path
    if ($processPath -and $processPath -like "*node*") {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            if ($cmdLine -like "*$projectRoot*") {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
}

Write-Host "Old processes killed." -ForegroundColor Green
Start-Sleep -Seconds 3

# Start backend on port 3005
Write-Host "Starting backend on port 3005..." -ForegroundColor Green
$backendPath = Join-Path $projectRoot "backend"
Start-Process -FilePath "cmd" -ArgumentList "/c set PORT=3005 && node server.js" -WorkingDirectory $backendPath -WindowStyle Hidden

Start-Sleep -Seconds 4

# Start frontend on port 3000
Write-Host "Starting frontend on port 3000..." -ForegroundColor Green
$frontendPath = Join-Path $projectRoot "frontend"

# Start npm with BROWSER=none to prevent auto-opening
# We MUST use cmd /c to ensure environment variables are set properly
Start-Process -FilePath "cmd" -ArgumentList "/c set PORT=3000 && set BROWSER=none && set SKIP_PREFLIGHT_CHECK=true && npm start" -WorkingDirectory $frontendPath -WindowStyle Hidden

Start-Sleep -Seconds 12

# Don't open browser here - VBS script will handle it
Write-Host "Servers started successfully!" -ForegroundColor Cyan

Write-Host ""
Write-Host "D2L Interface is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:3005" -ForegroundColor White
Write-Host ""
Write-Host "Browser will open automatically..." -ForegroundColor Yellow
