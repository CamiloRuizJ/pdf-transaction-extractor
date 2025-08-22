@echo off
echo ========================================
echo Adding GitHub Directory to PATH
echo ========================================

set "GITHUB_PATH=C:\Users\cruiz\OneDrive - Capright Property Advisors\Documents\GitHub\Saas-Projects"

echo.
echo Adding directory to PATH: %GITHUB_PATH%

:: Check if the directory exists
if not exist "%GITHUB_PATH%" (
    echo ERROR: Directory does not exist: %GITHUB_PATH%
    echo Please check the path and try again.
    pause
    exit /b 1
)

:: Add to PATH using PowerShell
powershell -Command "& {[Environment]::SetEnvironmentVariable('PATH', [Environment]::GetEnvironmentVariable('PATH', 'User') + ';%GITHUB_PATH%', 'User')}"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Directory added to PATH!
    echo.
    echo The directory is now accessible from any command prompt.
    echo You may need to restart your command prompt for changes to take effect.
    echo.
    echo To verify, open a new command prompt and try:
    echo   cd /d "%GITHUB_PATH%"
    echo.
) else (
    echo.
    echo ERROR: Failed to add directory to PATH
    echo Please run this script as Administrator.
    echo.
)

echo ========================================
echo PATH Update Complete
echo ========================================
pause
