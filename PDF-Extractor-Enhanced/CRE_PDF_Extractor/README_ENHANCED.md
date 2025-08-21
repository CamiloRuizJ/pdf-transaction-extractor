# Enhanced CRE PDF Extractor

An AI-powered PDF extraction tool specifically designed for Commercial Real Estate (CRE) documents, featuring ChatGPT integration, advanced security, and intelligent data processing.

## 🚀 Features

### Core Functionality
- **PDF Processing**: Upload and process PDF documents with high-quality OCR
- **Region-based Extraction**: Define custom regions for targeted data extraction
- **Excel Export**: Generate formatted Excel files with extracted data
- **Batch Processing**: Handle multiple documents efficiently

### AI-Powered Enhancements
- **ChatGPT Integration**: Intelligent text correction and enhancement
- **AI Region Suggestions**: Automatic region detection based on document content
- **Data Validation**: AI-powered validation of extracted information
- **Structured Data Extraction**: Extract data according to custom templates
- **Text Enhancement**: Improve OCR accuracy with AI corrections

### Security Features
- **Encrypted Configuration**: Secure storage of API keys and sensitive data
- **Session Management**: Secure session handling with configurable timeouts
- **Input Validation**: Comprehensive validation of all user inputs
- **File Type Restrictions**: Strict file type and size validation

### Advanced Features
- **Multi-page Support**: Process documents with multiple pages
- **Real-time Preview**: Live preview of extracted data
- **Keyboard Shortcuts**: Enhanced user experience with keyboard navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Logging**: Comprehensive logging for debugging and monitoring

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- Tesseract OCR
- Poppler (for PDF processing)

### Windows Installation

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements_enhanced.txt
   ```

2. **Install Tesseract OCR**:
   - Download from: https://github.com/UB-Mannheim/tesseract/wiki
   - Install to: `C:\Program Files\Tesseract-OCR\`
   - Add to PATH environment variable

3. **Install Poppler**:
   - Download from: https://github.com/oschwartz10612/poppler-windows/releases
   - Extract to the `poppler` directory in the project

### macOS Installation

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Dependencies**:
   ```bash
   brew install tesseract poppler
   pip install -r requirements_enhanced.txt
   ```

### Linux Installation

1. **Install System Dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install tesseract-ocr poppler-utils
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements_enhanced.txt
   ```

## 🔧 Configuration

### AI Service Setup

1. **Get OpenAI API Key**:
   - Sign up at: https://platform.openai.com/
   - Create an API key in your account settings

2. **Configure API Key**:
   ```bash
   python manage_api_keys.py
   ```
   - Select option 1: "Set OpenAI API Key"
   - Enter your API key when prompted

3. **Test Configuration**:
   ```bash
   python manage_api_keys.py
   ```
   - Select option 4: "Test API Key"

### Environment Variables

Create a `.env` file in the project root:

```env
# Flask Configuration
FLASK_DEBUG=False
FLASK_HOST=0.0.0.0
FLASK_PORT=5001

# File Paths
UPLOAD_FOLDER=uploads
TEMP_FOLDER=temp

# Security
SECRET_KEY=your-secret-key-here

# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here
CHATGPT_MODEL=gpt-4
CHATGPT_TEMPERATURE=0.1
CHATGPT_MAX_TOKENS=1000
```

## 🚀 Usage

### Quick Start

1. **Run the Application**:
   ```bash
   python run_enhanced.py
   ```

2. **Access the Web Interface**:
   - Open your browser and go to: http://localhost:5001
   - Click "Launch Tool" to start using the application

3. **Upload a PDF**:
   - Click "Choose File" and select a PDF document
   - Wait for the document to load

4. **Define Extraction Regions**:
   - Use the region selection tool to define areas for data extraction
   - Or use AI suggestions for automatic region detection

5. **Extract Data**:
   - Click "Extract Text" to process the defined regions
   - Review and enhance the extracted data using AI features

6. **Export Results**:
   - Click "Generate Excel" to create a formatted Excel file
   - Download the file for further analysis

### AI Features

#### Text Enhancement
- Automatically corrects OCR errors
- Improves formatting and standardization
- Provides confidence scores for extracted data

#### Region Suggestions
- Analyzes document content to suggest relevant regions
- Prioritizes regions based on importance
- Provides descriptions of expected data types

#### Data Validation
- Validates extracted data for consistency
- Identifies potential errors or missing information
- Suggests improvements for data quality

#### Structured Extraction
- Extract data according to custom templates
- Handle complex document structures
- Support for CRE-specific data formats

## 📁 Project Structure

```
CRE_PDF_Extractor/
├── app_enhanced.py          # Main application file
├── config_enhanced.py       # Enhanced configuration
├── ai_service.py           # AI service integration
├── security_config.py      # Secure configuration management
├── manage_api_keys.py      # API key management tool
├── wsgi_enhanced.py        # Production WSGI application
├── run_enhanced.py         # Development run script
├── test_enhanced.py        # Test suite
├── requirements_enhanced.txt # Python dependencies
├── templates/              # HTML templates
│   ├── base.html
│   ├── index.html
│   └── tool.html
├── static/                 # Static files
│   ├── css/
│   │   ├── styles.css
│   │   └── tool.css
│   └── js/
│       ├── main.js
│       ├── pdf-viewer.js
│       ├── region-management.js
│       ├── data-extraction.js
│       ├── excel-preview.js
│       └── keyboard-shortcuts.js
├── uploads/                # Uploaded files
├── temp/                   # Temporary files
└── logs/                   # Application logs
```

## 🔒 Security

### Data Protection
- All uploaded files are processed locally
- No data is stored permanently on the server
- Temporary files are automatically cleaned up
- API keys are encrypted and stored securely

### Access Control
- Session-based authentication
- Configurable session timeouts
- Input validation and sanitization
- File type and size restrictions

### Privacy
- No data is sent to external services (except OpenAI API)
- All processing happens on your local machine
- Configurable logging levels for privacy

## 🧪 Testing

### Run Tests
```bash
python test_enhanced.py
```

### Test Coverage
- Application creation and configuration
- Route functionality
- Health endpoint
- Page rendering
- Static file serving
- AI service integration

## 🚀 Deployment

### Production Deployment

1. **Set Environment Variables**:
   ```bash
   export FLASK_DEBUG=False
   export FLASK_HOST=0.0.0.0
   export FLASK_PORT=5001
   ```

2. **Use WSGI Server**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5001 wsgi_enhanced:application
   ```

3. **Configure Reverse Proxy** (optional):
   - Use Nginx or Apache as a reverse proxy
   - Configure SSL/TLS certificates
   - Set up proper security headers

### Docker Deployment

1. **Build Docker Image**:
   ```bash
   docker build -t cre-pdf-extractor .
   ```

2. **Run Container**:
   ```bash
   docker run -p 5001:5001 -v $(pwd)/uploads:/app/uploads cre-pdf-extractor
   ```

## 🔧 Troubleshooting

### Common Issues

1. **Tesseract Not Found**:
   - Ensure Tesseract is installed and in PATH
   - Check installation path in `app_enhanced.py`

2. **Poppler Not Found**:
   - Verify poppler is installed correctly
   - Check poppler path in the application

3. **AI Features Disabled**:
   - Configure OpenAI API key using `manage_api_keys.py`
   - Check API key validity

4. **File Upload Issues**:
   - Check file size limits
   - Verify file type restrictions
   - Ensure upload directory has write permissions

### Logs
- Check `logs/cre_app.log` for detailed error information
- Enable debug mode for more verbose logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the logs for error details
- Open an issue on GitHub

## 🔄 Version History

### v2.0.0 (Enhanced)
- Added ChatGPT integration
- Enhanced security features
- Improved UI/UX
- Added comprehensive testing
- Production-ready deployment

### v1.0.0 (Basic)
- Basic PDF processing
- OCR text extraction
- Excel export functionality
