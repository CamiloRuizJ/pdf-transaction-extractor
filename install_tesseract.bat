@echo off
echo Installing Tesseract OCR for PDF Converter V2...
echo.

REM Check if Tesseract is already installed
where tesseract >nul 2>nul
if %errorlevel% == 0 (
    echo Tesseract is already installed and in PATH.
    tesseract --version
    goto :end
)

echo Tesseract OCR not found in PATH.
echo.
echo Please install Tesseract OCR manually:
echo.
echo 1. Download Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
echo 2. Install to: C:\Program Files\Tesseract-OCR\
echo 3. Add to PATH environment variable
echo.
echo After installation, run this script again to verify.
echo.

:end
echo.
echo Installation check complete.
pause
