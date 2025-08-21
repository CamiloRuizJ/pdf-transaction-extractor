@echo off
echo Enhanced PDF Transaction Extractor
echo ===================================
echo.

cd CRE_PDF_Extractor

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Run the enhanced application
echo Starting Enhanced PDF Transaction Extractor...
echo Open your web browser and go to: http://localhost:5001
echo Press Ctrl+C to stop the application
echo.
python -c "from app_enhanced import app; app.run(host='0.0.0.0', port=5001, debug=False)"

pause

