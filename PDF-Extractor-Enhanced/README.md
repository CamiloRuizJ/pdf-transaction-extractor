# PDF Extractor Enhanced - Advanced Version

A comprehensive, AI-powered PDF transaction extraction tool with advanced features and production-ready capabilities.

## Overview

This is the enhanced version of the PDF Transaction Extractor, featuring AI-powered extraction, advanced OCR capabilities, region-based processing, and a modern web interface.

## Features

- 🤖 AI-powered extraction
- 🔍 Advanced OCR with Tesseract
- 📍 Region-based extraction
- 📊 Excel export functionality
- 🌐 Modern web-based interface
- 📝 Comprehensive logging
- ✅ Error handling and validation
- 🎨 Interactive region selection
- 📱 Responsive design
- ⌨️ Keyboard shortcuts

## Quick Start

1. **Install system dependencies:**
   ```bash
   # Windows
   install_tesseract.bat
   install_poppler.bat
   
   # Or manually install:
   # - Tesseract OCR
   # - Poppler for PDF processing
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements_enhanced.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

4. **Run the application:**
   ```bash
   python app_enhanced.py
   ```

5. **Open your browser:**
   ```
   http://localhost:5000
   ```

## Advanced Features

### AI-Powered Extraction
- Intelligent text recognition
- Pattern matching for real estate data
- Automatic field detection
- Smart data cleaning

### Region-Based Processing
- Visual region selection
- Multi-page processing
- Coordinate transformation
- Region management

### Excel Export
- Formatted spreadsheets
- Auto-sized columns
- Professional styling
- Structured data output

### Web Interface
- Drag-and-drop upload
- Real-time preview
- Interactive drawing tools
- Progress indicators

## File Structure

```
PDF-Extractor-Enhanced/
├── app_enhanced.py          # Main Flask application
├── config_enhanced.py       # Configuration settings
├── ai_service.py           # AI processing service
├── security_config.py      # Security configurations
├── manage_api_keys.py      # API key management
├── static/                 # CSS, JS, and assets
├── templates/              # HTML templates
├── logs/                   # Application logs
├── uploads/                # Uploaded files
└── temp/                   # Temporary files
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `FLASK_SECRET_KEY` - Flask secret key
- `UPLOAD_FOLDER` - Upload directory path
- `TEMP_FOLDER` - Temporary files directory

### API Keys Setup
```bash
python manage_api_keys.py
```

## Usage

1. **Upload PDF**: Drag and drop or select a PDF file
2. **Define Regions**: Click and drag to create extraction regions
3. **Name Fields**: Give each region a descriptive name
4. **Extract Data**: Process all pages automatically
5. **Download Results**: Get formatted Excel file

## Dependencies

### System Dependencies
- Tesseract OCR
- Poppler (for PDF processing)

### Python Dependencies
- Flask
- PyPDF2
- pdf2image
- openpyxl
- pandas
- openai
- pillow
- And more (see requirements_enhanced.txt)

## Deployment

### Local Development
```bash
python app_enhanced.py
```

### Production Deployment
```bash
gunicorn wsgi_enhanced:app
```

### PaaS Platforms
- Render
- Railway
- Heroku
- See deployment guides for details

## When to Use Enhanced

- Production environments
- Complex PDF processing
- AI-powered extraction needs
- Professional data output
- Advanced user interfaces
- Comprehensive logging requirements

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in the `logs/` directory
3. Open an issue with detailed information
