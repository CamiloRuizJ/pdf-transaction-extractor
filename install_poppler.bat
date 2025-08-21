@echo off
echo Installing Poppler for Windows...

REM Create poppler directory
if not exist "poppler" mkdir poppler
cd poppler

REM Download Poppler from the official source
echo Downloading Poppler...
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/oschwartz10612/poppler-windows/releases/download/v23.11.0-0/Release-23.11.0-0.zip' -OutFile 'poppler.zip'}"

REM Extract the zip file
echo Extracting Poppler...
powershell -Command "& {Expand-Archive -Path 'poppler.zip' -DestinationPath '.' -Force}"

REM Move the extracted files to the correct location
if exist "Release-23.11.0-0" (
    xcopy "Release-23.11.0-0\*" "." /E /I /Y
    rmdir "Release-23.11.0-0" /S /Q
)

REM Clean up the zip file
del poppler.zip

REM Add poppler to PATH for current session
set PATH=%CD%\Library\bin;%PATH%

echo Poppler installed successfully!
echo Please add %CD%\Library\bin to your system PATH permanently.
echo.
echo You can now run the PDF extractor application.
pause 