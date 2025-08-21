# Poppler Installation Script for Windows
# This script downloads and installs Poppler for use with pdf2image

Write-Host "Installing Poppler for Windows..." -ForegroundColor Green

# Create directory for Poppler
$popplerDir = "C:\poppler"
if (!(Test-Path $popplerDir)) {
    New-Item -ItemType Directory -Path $popplerDir -Force
    Write-Host "Created directory: $popplerDir" -ForegroundColor Yellow
}

# Download Poppler
$popplerUrl = "https://github.com/oschwartz10612/poppler-windows/releases/download/v23.11.0-0/Release-23.11.0-0.zip"
$zipPath = "$env:TEMP\poppler.zip"

Write-Host "Downloading Poppler..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $popplerUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Poppler: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Extract Poppler
Write-Host "Extracting Poppler..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipPath -DestinationPath $popplerDir -Force
    Write-Host "Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "Failed to extract Poppler: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Find the bin directory
$binDir = Get-ChildItem -Path $popplerDir -Recurse -Directory -Name "bin" | Select-Object -First 1
if ($binDir) {
    $fullBinPath = Join-Path $popplerDir $binDir
    Write-Host "Found Poppler bin directory: $fullBinPath" -ForegroundColor Green
    
    # Add to PATH for current session
    $env:PATH = "$fullBinPath;$env:PATH"
    Write-Host "Added Poppler to PATH for current session" -ForegroundColor Green
    
    # Test installation
    try {
        $result = & "$fullBinPath\pdftoppm.exe" -v 2>&1
        Write-Host "Poppler installation test successful!" -ForegroundColor Green
        Write-Host "Version info: $result" -ForegroundColor Cyan
    } catch {
        Write-Host "Warning: Could not test Poppler installation" -ForegroundColor Yellow
    }
    
    Write-Host "`nIMPORTANT: To make Poppler permanently available:" -ForegroundColor Yellow
    Write-Host "1. Open System Properties (Win+R, type 'sysdm.cpl')" -ForegroundColor White
    Write-Host "2. Click 'Environment Variables'" -ForegroundColor White
    Write-Host "3. Under 'User variables', find 'Path' and click 'Edit'" -ForegroundColor White
    Write-Host "4. Click 'New' and add: $fullBinPath" -ForegroundColor White
    Write-Host "5. Click 'OK' on all dialogs" -ForegroundColor White
    Write-Host "6. Restart your terminal/PowerShell" -ForegroundColor White
    
} else {
    Write-Host "Error: Could not find Poppler bin directory" -ForegroundColor Red
    exit 1
}

# Clean up
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Write-Host "Installation completed!" -ForegroundColor Green 