# PowerShell script to add GitHub directory to PATH
Write-Host "========================================" -ForegroundColor Green
Write-Host "Adding GitHub Directory to PATH" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$githubPath = "C:\Users\cruiz\OneDrive - Capright Property Advisors\Documents\GitHub\Saas-Projects"

Write-Host ""
Write-Host "Adding directory to PATH: $githubPath" -ForegroundColor Yellow

# Check if the directory exists
if (-not (Test-Path $githubPath)) {
    Write-Host "ERROR: Directory does not exist: $githubPath" -ForegroundColor Red
    Write-Host "Please check the path and try again." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

try {
    # Get current user PATH
    $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
    
    # Check if path is already in PATH
    if ($currentPath -like "*$githubPath*") {
        Write-Host "Directory is already in PATH!" -ForegroundColor Green
    } else {
        # Add to PATH
        $newPath = $currentPath + ";" + $githubPath
        [Environment]::SetEnvironmentVariable('PATH', $newPath, 'User')
        
        Write-Host ""
        Write-Host "SUCCESS: Directory added to PATH!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The directory is now accessible from any command prompt." -ForegroundColor Cyan
        Write-Host "You may need to restart your command prompt for changes to take effect." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To verify, open a new command prompt and try:" -ForegroundColor Yellow
        Write-Host "  cd /d `"$githubPath`"" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to add directory to PATH" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please run this script as Administrator." -ForegroundColor Red
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "PATH Update Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "Press Enter to continue"
