@echo off
echo ========================================
echo Verifying GitHub Directory Access
echo ========================================

set "GITHUB_PATH=C:\Users\cruiz\OneDrive - Capright Property Advisors\Documents\GitHub\Saas-Projects"

echo.
echo Checking if directory is accessible from PATH...

:: Try to change to the directory
cd /d "%GITHUB_PATH%" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Directory is accessible from PATH!
    echo Current directory: %CD%
    echo.
    echo Directory contents:
    dir /b
    echo.
    echo You can now access this directory from anywhere using:
    echo   cd /d "%GITHUB_PATH%"
    echo.
) else (
    echo WARNING: Directory not accessible from PATH
    echo This might be because:
    echo 1. PATH changes haven't taken effect yet
    echo 2. You need to restart your command prompt
    echo 3. The directory path is incorrect
    echo.
    echo Try opening a new command prompt and running this script again.
    echo.
)

echo ========================================
echo Verification Complete
echo ========================================
pause
