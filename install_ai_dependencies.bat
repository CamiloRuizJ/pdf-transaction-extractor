@echo off
echo Installing AI-enhanced PDF Transaction Extractor Dependencies...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install basic requirements
echo Installing basic requirements...
pip install -r requirements.txt

REM Install spaCy English model
echo Installing spaCy English model...
python -m spacy download en_core_web_sm

REM Download NLTK data
echo Downloading NLTK data...
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('wordnet')"

REM Install Tesseract OCR
echo.
echo Installing Tesseract OCR...
echo Please download and install Tesseract OCR from:
echo https://github.com/UB-Mannheim/tesseract/wiki
echo.
echo After installation, make sure to add Tesseract to your PATH
echo or update the path in app.py line 25

REM Create directories
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp

echo.
echo Installation complete!
echo.
echo To run the application:
echo 1. Activate the virtual environment: venv\Scripts\activate.bat
echo 2. Run the application: python app.py
echo 3. Open your browser to: http://localhost:5000
echo.
echo For AI features to work optimally:
echo - Install Tesseract OCR and add to PATH
echo - Set GOOGLE_VISION_API_KEY in app.py for cloud OCR fallback
echo - Consider using GPU for faster processing (CUDA support)
echo.
pause
