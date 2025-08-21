@echo off
echo Installing Tesseract OCR for Windows...
echo.

REM Check if Tesseract is already installed
tesseract --version >nul 2>&1
if %errorlevel% == 0 (
    echo Tesseract is already installed!
    tesseract --version
    goto :end
)

REM Create temp directory
if not exist "temp" mkdir temp
cd temp

echo Downloading Tesseract OCR installer...
echo.

REM Download Tesseract installer (64-bit version)
powershell -Command "& {Invoke-WebRequest -Uri 'https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe' -OutFile 'tesseract-installer.exe'}"

if not exist "tesseract-installer.exe" (
    echo Failed to download Tesseract installer.
    echo Please download manually from: https://github.com/UB-Mannheim/tesseract/wiki
    pause
    exit /b 1
)

echo.
echo Tesseract installer downloaded successfully!
echo.
echo Please run the installer manually:
echo 1. Double-click tesseract-installer.exe
echo 2. Install to: C:\Program Files\Tesseract-OCR\
echo 3. Make sure to check "Add to PATH" during installation
echo 4. Complete the installation
echo.
echo After installation, run this script again to verify.
echo.
pause

:end
echo.
echo Verifying Tesseract installation...
tesseract --version >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo ✅ Tesseract OCR installed successfully!
    tesseract --version
    echo.
    echo Available languages:
    tesseract --list-langs
) else (
    echo.
    echo ❌ Tesseract OCR not found in PATH
    echo Please ensure Tesseract is installed and added to PATH
    echo Default installation path: C:\Program Files\Tesseract-OCR\
)

echo.
echo Installation complete!
pause
