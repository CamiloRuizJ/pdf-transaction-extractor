# Local Testing Guide

This guide will help you test the PDF Transaction Extractor application locally before deploying to production.

## 🚀 Quick Start

### Option 1: Simplified Testing (Recommended for initial testing)

```bash
# Run the simplified version (works without Tesseract OCR)
python app_simple.py
```

### Option 2: Full Version Testing (Requires Tesseract OCR)

```bash
# First, run the test script to check your environment
python test_local.py

# If all tests pass, run the full version
python app.py
```

## 📋 Prerequisites

### Required Software
- ✅ **Python 3.8+** (already installed)
- ✅ **pip** (Python package manager)
- ✅ **Web browser** (Chrome, Firefox, Edge)

### Optional Software (for full OCR functionality)
- ⚠️ **Tesseract OCR** (for text extraction)
- ⚠️ **spaCy English model** (for AI features)

## 🔧 Installation Steps

### 1. **Install Python Dependencies**

```bash
# Install all required packages
pip install -r requirements.txt

# Install spaCy English model
python -m spacy download en_core_web_sm
```

### 2. **Install Tesseract OCR (Optional)**

#### Windows:
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to: `C:\Program Files\Tesseract-OCR\`
3. Add to PATH or update the path in `app.py` line 25

#### macOS:
```bash
brew install tesseract
```

#### Linux:
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-eng
```

### 3. **Test Your Environment**

```bash
# Run the comprehensive test script
python test_local.py
```

## 🧪 Testing the Application

### Step 1: Start the Application

```bash
# For basic testing (recommended)
python app_simple.py

# For full functionality (requires Tesseract)
python app.py
```

### Step 2: Access the Web Interface

1. Open your web browser
2. Go to: `http://localhost:5000`
3. You should see the PDF Transaction Extractor interface

### Step 3: Test Basic Functionality

#### A. **Upload a PDF**
1. Click "Choose File" or drag a PDF into the upload area
2. Select any PDF file (commercial real estate documents work best)
3. Click "Upload PDF"
4. Verify the PDF loads and displays

#### B. **Select Regions**
1. Click and drag on the PDF to create selection boxes
2. Name each region (e.g., "Property Address", "Base Rent", "Square Feet")
3. Click "Save Regions" when done

#### C. **Extract Data**
1. Click "Extract Data"
2. Wait for processing to complete
3. Download the Excel file
4. Verify the extracted data

### Step 4: Test Different Document Types

Test with various PDF types:
- ✅ **Commercial lease agreements**
- ✅ **Property listings**
- ✅ **Financial statements**
- ✅ **Any PDF with structured data**

## 📊 Expected Results

### Simplified Version (`app_simple.py`)
- ✅ **Upload**: Should work with any PDF
- ✅ **Display**: PDF should render correctly
- ✅ **Region Selection**: Should allow drawing boxes
- ✅ **Data Extraction**: Should return placeholder data
- ✅ **Excel Export**: Should create downloadable Excel files

### Full Version (`app.py`)
- ✅ **OCR**: Should extract actual text from PDFs
- ✅ **AI Enhancement**: Should improve text accuracy
- ✅ **Validation**: Should validate extracted data
- ✅ **Correction**: Should correct common OCR errors

## 🔍 Troubleshooting

### Common Issues

#### 1. **"ModuleNotFoundError"**
```bash
# Solution: Install missing dependencies
pip install -r requirements.txt
```

#### 2. **"Tesseract is not installed"**
```bash
# Solution: Install Tesseract OCR or use simplified version
python app_simple.py
```

#### 3. **"Port 5000 is already in use"**
```bash
# Solution: Kill the process or use a different port
# In app.py, change: app.run(debug=True, host='0.0.0.0', port=5001)
```

#### 4. **"PDF won't upload"**
- Check file size (max 16MB)
- Ensure it's a valid PDF file
- Check browser console for errors

#### 5. **"No text extracted"**
- Try the simplified version first
- Check if Tesseract is properly installed
- Verify PDF has readable text (not just images)

### Debug Mode

Enable debug mode for detailed error messages:

```python
# In app.py or app_simple.py
app.run(debug=True, host='0.0.0.0', port=5000)
```

## 📈 Performance Testing

### Test Scenarios

1. **Small PDF (1-5 pages)**
   - Expected: Fast processing (< 30 seconds)
   - Test: Upload, extract, download

2. **Large PDF (10+ pages)**
   - Expected: Slower processing (1-3 minutes)
   - Test: Monitor memory usage

3. **Multiple Users**
   - Expected: Concurrent processing
   - Test: Open multiple browser tabs

4. **Different File Sizes**
   - Small: < 1MB
   - Medium: 1-5MB
   - Large: 5-16MB

## 🔒 Security Testing

### Test Cases

1. **File Upload Security**
   - Try uploading non-PDF files
   - Try uploading very large files
   - Try uploading malicious files

2. **Input Validation**
   - Try invalid region coordinates
   - Try empty field names
   - Try special characters in field names

3. **Session Management**
   - Test session timeout
   - Test concurrent sessions
   - Test session cleanup

## 📝 Test Checklist

### Basic Functionality
- [ ] Application starts without errors
- [ ] Web interface loads correctly
- [ ] PDF upload works
- [ ] PDF display works
- [ ] Region selection works
- [ ] Data extraction works
- [ ] Excel download works

### Advanced Features (Full Version)
- [ ] OCR text extraction works
- [ ] AI text enhancement works
- [ ] Data validation works
- [ ] Error correction works
- [ ] Multiple page processing works

### Performance
- [ ] Small PDFs process quickly
- [ ] Large PDFs process without timeout
- [ ] Memory usage is reasonable
- [ ] No memory leaks after multiple uploads

### Error Handling
- [ ] Invalid files are rejected
- [ ] Error messages are clear
- [ ] Application recovers from errors
- [ ] No crashes during normal use

## 🎯 Success Criteria

Your local testing is successful when:

1. ✅ **All basic functionality works**
2. ✅ **No critical errors occur**
3. ✅ **Performance is acceptable**
4. ✅ **User experience is smooth**
5. ✅ **Data extraction is accurate** (or uses reasonable placeholders)

## 🚀 Next Steps

After successful local testing:

1. **Deploy to Production**: Use the production deployment guide
2. **Configure Domain**: Set up your domain and SSL
3. **Monitor Performance**: Use the built-in monitoring tools
4. **Scale as Needed**: Add more resources if required

## 📞 Support

If you encounter issues:

1. **Check the logs**: Look at console output for error messages
2. **Run the test script**: `python test_local.py`
3. **Try the simplified version**: `python app_simple.py`
4. **Check this guide**: Review the troubleshooting section
5. **Verify dependencies**: Ensure all packages are installed

## 🔮 Advanced Testing

For more comprehensive testing:

1. **Load Testing**: Use tools like Apache Bench or JMeter
2. **Security Testing**: Use tools like OWASP ZAP
3. **Browser Testing**: Test in different browsers and devices
4. **Accessibility Testing**: Ensure the interface is accessible
5. **Mobile Testing**: Test on mobile devices and tablets
