@echo off
echo PDF Transaction Extractor Enhanced - Startup Script
echo ====================================================

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit .env file with your API keys before running the application!
    pause
)

REM Install requirements
echo Installing requirements...
pip install --upgrade pip
pip install -r requirements.txt

REM Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs

REM Start the application
echo Starting PDF Transaction Extractor Enhanced...
echo Application will be available at: http://localhost:5000
echo Press Ctrl+C to stop the application
echo.
python app.py

pause