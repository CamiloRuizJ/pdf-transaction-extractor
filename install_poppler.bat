@echo off
echo Installing Poppler for PDF Converter V2...
echo.

REM Check if Poppler is already installed
where pdftoppm >nul 2>nul
if %errorlevel% == 0 (
    echo Poppler is already installed and in PATH.
    pdftoppm -v
    goto :end
)

echo Poppler not found in PATH.
echo.
echo Please install Poppler manually:
echo.
echo 1. Download Poppler from: https://github.com/oschwartz10612/poppler-windows/releases/
echo 2. Extract to: poppler/ directory in the project
echo 3. Add poppler-23.11.0/Library/bin/ to PATH environment variable
echo.
echo After installation, run this script again to verify.
echo.

:end
echo.
echo Installation check complete.
pause
