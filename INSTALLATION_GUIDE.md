# Installation Guide for Tesseract OCR and spaCy

This guide will help you install Tesseract OCR and spaCy English model for the PDF Transaction Extractor.

## 🚀 Quick Installation Steps

### Step 1: Install Tesseract OCR

1. **Navigate to the installer:**
   ```
   Open: temp\tesseract-installer.exe
   ```

2. **Run the installer:**
   - Double-click `tesseract-installer.exe`
   - Click "Yes" if prompted by User Account Control

3. **Installation settings:**
   - **Installation path:** `C:\Program Files\Tesseract-OCR\` (default)
   - **✅ Check "Add to PATH"** (IMPORTANT!)
   - **✅ Check "Install additional language data"**
   - Click "Install"

4. **Wait for installation to complete**

### Step 2: Verify Tesseract Installation

After installation, run this command to verify:

```bash
tesseract --version
```

You should see output like:
```
tesseract 5.3.3
 leptonica-1.83.1
  libgif 5.2.1 : libjpeg 8d (libjpeg-turbo 2.1.5.1) : libpng 1.6.39 : libtiff 4.5.1 : zlib 1.2.13 : libwebp 1.3.2 : libopenjp2 2.4.0
```

### Step 3: Install spaCy English Model

Since the automatic installation had issues, let's try a manual approach:

```bash
# Try this command
python -m spacy download en_core_web_sm --direct
```

If that doesn't work, try:

```bash
# Alternative method
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
```

### Step 4: Test the Installation

Run the test script to verify everything is working:

```bash
python test_local.py
```

## 🔧 Alternative Installation Methods

### Method 1: Chocolatey (if you have it installed)

```bash
# Install Tesseract via Chocolatey
choco install tesseract

# Install additional languages
choco install tesseract-lang
```

### Method 2: Manual Download

1. **Download Tesseract manually:**
   - Go to: https://github.com/UB-Mannheim/tesseract/wiki
   - Download: `tesseract-ocr-w64-setup-5.3.3.20231005.exe`
   - Run the installer

2. **Add to PATH manually:**
   - Open System Properties → Advanced → Environment Variables
   - Add `C:\Program Files\Tesseract-OCR\` to PATH

### Method 3: spaCy Model (Alternative)

If the spaCy model installation continues to fail, you can:

1. **Skip spaCy for now** - The app will work without it
2. **Use the simplified version** - `python app_simple.py`
3. **Try a different spaCy version:**

```bash
# Uninstall current spaCy
pip uninstall spacy

# Install a specific version
pip install spacy==3.6.1

# Try downloading the model again
python -m spacy download en_core_web_sm
```

## 🧪 Testing Your Installation

### Test Tesseract OCR

```bash
# Test Tesseract
tesseract --version
tesseract --list-langs

# Test OCR on a sample image (if you have one)
tesseract sample.png stdout
```

### Test spaCy (if installed)

```bash
# Test spaCy
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('✅ spaCy working')"
```

### Test the Full Application

```bash
# Run the test script
python test_local.py

# If all tests pass, run the full app
python app.py
```

## 🆘 Troubleshooting

### Tesseract Issues

**Problem:** `tesseract is not installed or it's not in your PATH`

**Solutions:**
1. **Reinstall Tesseract** and make sure to check "Add to PATH"
2. **Add to PATH manually:**
   - Open System Properties → Environment Variables
   - Add `C:\Program Files\Tesseract-OCR\` to PATH
   - Restart your terminal

**Problem:** `tesseract command not found`

**Solutions:**
1. **Restart your terminal** after installation
2. **Check installation path:** `C:\Program Files\Tesseract-OCR\`
3. **Verify PATH:** `echo $env:PATH` (should include Tesseract path)

### spaCy Issues

**Problem:** `Can't find model 'en_core_web_sm'`

**Solutions:**
1. **Try the direct download:**
   ```bash
   python -m spacy download en_core_web_sm --direct
   ```

2. **Use a different version:**
   ```bash
   pip install spacy==3.6.1
   python -m spacy download en_core_web_sm
   ```

3. **Skip spaCy for now** - The app works without it

### Python Issues

**Problem:** `ModuleNotFoundError`

**Solutions:**
1. **Install missing packages:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Check Python version:**
   ```bash
   python --version
   ```
   (Should be Python 3.8+)

## ✅ Success Criteria

Your installation is successful when:

1. ✅ **Tesseract OCR works:**
   ```bash
   tesseract --version
   ```

2. ✅ **spaCy model loads (optional):**
   ```bash
   python -c "import spacy; spacy.load('en_core_web_sm')"
   ```

3. ✅ **Test script passes:**
   ```bash
   python test_local.py
   ```

4. ✅ **Full app runs:**
   ```bash
   python app.py
   ```

## 🚀 Next Steps

After successful installation:

1. **Test the application:**
   ```bash
   python app.py
   ```

2. **Access the web interface:**
   - Open: http://localhost:5000

3. **Upload a PDF and test OCR functionality**

4. **If everything works, proceed to production deployment**

## 📞 Support

If you continue to have issues:

1. **Check the logs** in the terminal
2. **Try the simplified version:** `python app_simple.py`
3. **Verify your Python environment**
4. **Check Windows PATH settings**
5. **Restart your computer** after installation

## 🔗 Useful Links

- **Tesseract OCR:** https://github.com/UB-Mannheim/tesseract/wiki
- **spaCy Models:** https://spacy.io/models
- **Python Installation:** https://python.org/downloads/
- **Windows PATH Guide:** https://www.windows-commandline.com/set-path-environment-variable/
