# RExeli - Enterprise Edition

**AI-Powered Document Processing Platform for Commercial Real Estate Professionals**

RExeli is a strategic, enterprise-grade application that leverages advanced AI, machine learning, and modern web technologies to automatically classify, extract, validate, and export data from commercial real estate documents into structured Excel formats.

## 🎯 **What's New in Enhanced Edition**

This version merges the robust enterprise architecture of V2 with the user-friendly interface and deployment capabilities of the Enhanced version:

- ✅ **Enterprise Architecture** from V2
- ✅ **Modern UI/UX** from Enhanced
- ✅ **Simplified Deployment** with multiple platform support
- ✅ **Enhanced Security** with CSRF protection and rate limiting
- ✅ **Better Error Handling** and logging
- ✅ **Flexible Configuration** for development/production environments

## 🚀 Key Features

### **AI-Powered Document Classification**
- **Automatic Recognition**: Identifies document types including rent rolls, offering memos, comparable sales, lease agreements, financial proformas, and property management reports
- **ML-Based Classification**: Uses scikit-learn models trained on Real Estate document patterns
- **Confidence Scoring**: Provides confidence levels for classification accuracy

### **Smart Region Detection**
- **AI-Suggested Regions**: Automatically suggests optimal data extraction regions based on document type
- **Pattern Recognition**: Learns from historical user selections to improve suggestions
- **Document-Specific Strategies**: Different extraction strategies for different document types

### **Advanced OCR & Data Extraction**
- **Enhanced OCR**: High-quality text extraction with preprocessing and error correction
- **Real Estate Patterns**: Specialized pattern matching for Real Estate data fields
- **Confidence Scoring**: Individual confidence scores for each extracted field

### **AI-Powered Data Enhancement**
- **OpenAI Integration**: Uses GPT-3.5-turbo for text enhancement and validation
- **Business Logic Validation**: Validates data against Real Estate business rules
- **Automatic Correction**: Fixes common OCR errors and data inconsistencies

### **Quality Assurance**
- **Comprehensive Scoring**: Multi-factor quality assessment including OCR accuracy, field completeness, and data consistency
- **Real-Time Validation**: Immediate feedback on data quality and completeness
- **Business Logic Checks**: Ensures extracted data makes business sense

### **Professional Excel Export**
- **Structured Output**: Clean, formatted Excel files with proper headers and styling
- **Summary Sheets**: Additional sheets with processing metadata and quality metrics
- **Multiple Formats**: Support for various Real Estate data structures

### **Enterprise Features**
- **Scalable Architecture**: Built for high-volume processing with Celery background tasks
- **Database Integration**: PostgreSQL support with SQLAlchemy ORM
- **Redis Caching**: Fast response times with Redis caching
- **Security**: Comprehensive security headers and input validation
- **Logging**: Structured logging with structlog for monitoring and debugging

## 🏗️ Architecture

### **Strategic Design**
- **Monolithic Foundation**: Well-structured Flask application with clear module boundaries
- **Microservices Ready**: Designed for easy transition to microservices architecture
- **Service-Oriented**: Clear separation of concerns with dedicated service modules

### **Core Services**
```
app/
├── services/
│   ├── document_classifier.py    # AI-powered document classification
│   ├── smart_region_manager.py   # Region suggestion and management
│   ├── ai_service.py            # OpenAI integration and AI features
│   ├── ocr_service.py           # Enhanced OCR processing
│   ├── pdf_service.py           # PDF handling and conversion
│   ├── excel_service.py         # Excel export and formatting
│   ├── analytics_service.py     # Real Estate analytics
│   ├── quality_scorer.py        # Data quality assessment
│   ├── processing_pipeline.py   # Workflow orchestration
│   └── integration_service.py   # Third-party integrations
├── models/                      # Data models and structures
├── utils/                       # Utility functions and helpers
├── templates/                   # HTML templates
└── static/                      # CSS, JS, and static assets
```

## 🛠️ Installation & Setup

### **Prerequisites**
- Python 3.11.7+
- Tesseract OCR
- Poppler (for PDF processing)
- Redis (for caching and background tasks)

### **System Dependencies**

**Windows:**
```bash
# Install Tesseract OCR
# Download from: https://github.com/UB-Mannheim/tesseract/wiki

# Install Poppler
# Download from: https://blog.alivate.com.au/poppler-windows/
```

**macOS:**
```bash
brew install tesseract
brew install poppler
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr poppler-utils libtesseract-dev libpoppler-cpp-dev
```

### **Python Setup**

1. **Clone the repository:**
```bash
git clone <repository-url>
cd PDF-Converter-V2
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Environment Configuration:**
Create a `.env` file in the root directory:
```env
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=true
SECRET_KEY=your-secret-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Database Configuration
DATABASE_URL=sqlite:///pdf_converter_v2.db

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# V2 Features
V2_ENABLED=true
DOCUMENT_CLASSIFICATION_ENABLED=true
QUALITY_SCORING_ENABLED=true
SMART_REGION_SUGGESTION=true
```

5. **Initialize the application:**
```bash
python app.py
```

The application will be available at `http://localhost:5000`

## 🚀 Deployment

### **Render Deployment**
```bash
# The render.yaml file is configured for automatic deployment
# Just connect your repository to Render
```

### **Railway Deployment**
```bash
# The railway.json file is configured for automatic deployment
# Just connect your repository to Railway
```

### **Heroku Deployment**
```bash
# Add Heroku buildpack for Tesseract
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-apt

# Deploy
git push heroku main
```

### **Docker Deployment**
```dockerfile
# Dockerfile example
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run application
CMD ["gunicorn", "wsgi:app"]
```

## 📊 Supported Document Types

### **Rent Rolls**
- **Fields**: Tenant name, unit number, rent amount, lease start/end dates, square footage, occupancy status
- **Strategy**: Table-based extraction with row-by-row processing
- **Validation**: Positive rent amounts, valid lease dates, complete tenant information

### **Offering Memos**
- **Fields**: Property name, asking price, cap rate, NOI, expenses, property type, location
- **Strategy**: Section-based extraction focusing on key financial metrics
- **Validation**: Reasonable cap rates, positive NOI, realistic asking prices

### **Comparable Sales**
- **Fields**: Property address, sale price, sale date, price per square foot, property type
- **Strategy**: List-based extraction with market analysis
- **Validation**: Reasonable sale prices, valid sale dates, accurate property details

### **Lease Agreements**
- **Fields**: Tenant name, landlord name, lease term, rent amount, security deposit, property address
- **Strategy**: Form-based extraction with legal document patterns
- **Validation**: Valid lease terms, reasonable rent amounts, complete party information

### **Financial Proformas**
- **Fields**: Gross income, operating expenses, NOI, cash flow, cap rate, property value
- **Strategy**: Table-based extraction with financial calculations
- **Validation**: Positive NOI, reasonable expense ratios, logical cash flow projections

### **Property Management Reports**
- **Fields**: Property name, occupancy rate, maintenance costs, tenant satisfaction, operational metrics
- **Strategy**: Mixed extraction approach for varied report formats
- **Validation**: Logical occupancy rates, reasonable cost structures

## 🔧 API Endpoints

### **Core Processing**
- `POST /api/upload` - Upload PDF file
- `POST /api/classify-document` - Classify document type
- `POST /api/suggest-regions` - Get AI-suggested regions
- `POST /api/extract-data` - Extract data from regions
- `POST /api/validate-data` - Validate extracted data
- `POST /api/quality-score` - Calculate quality score
- `POST /api/export-excel` - Export to Excel

### **Utility Endpoints**
- `GET /health` - Health check
- `GET /api/ai/status` - AI service status
- `GET /api/security/headers` - Security configuration
- `GET /api/download/<filename>` - Download generated files

## 🎯 Usage Examples

### **Basic Document Processing**
```python
# Upload and process a rent roll
import requests

# 1. Upload file
with open('rent_roll.pdf', 'rb') as f:
    response = requests.post('/api/upload', files={'file': f})
    file_data = response.json()

# 2. Classify document
classification = requests.post('/api/classify-document', 
                             json={'file_path': file_data['file_path']})

# 3. Get region suggestions
suggestions = requests.post('/api/suggest-regions',
                          json={'file_path': file_data['file_path'],
                                'document_type': classification['document_type']})

# 4. Extract data
extracted = requests.post('/api/extract-data',
                        json={'file_path': file_data['file_path'],
                              'regions': suggestions['suggestions']})

# 5. Export to Excel
excel = requests.post('/api/export-excel',
                     json={'extracted_data': extracted['extracted_data'],
                           'document_type': classification['document_type']})
```

## 🔒 Security Features

- **Input Validation**: Comprehensive validation of all user inputs
- **File Type Validation**: Strict PDF file validation
- **Security Headers**: XSS protection, content type options, frame options
- **Rate Limiting**: Configurable rate limiting for API endpoints
- **Data Sanitization**: Automatic sanitization of extracted data
- **Environment Variables**: Secure configuration management

## 📈 Performance & Scalability

- **Background Processing**: Celery integration for long-running tasks
- **Caching**: Redis-based caching for improved response times
- **Database Optimization**: Efficient database queries and indexing
- **Image Processing**: Optimized OCR processing with preprocessing
- **Load Balancing**: Ready for horizontal scaling

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_document_classifier.py
```

## 📝 Configuration

### **Quality Thresholds**
```python
MIN_OCR_CONFIDENCE = 0.7
MIN_FIELD_COMPLETENESS = 0.8
MIN_OVERALL_QUALITY = 0.75
```

### **AI Settings**
```python
OPENAI_MODEL = 'gpt-3.5-turbo'
OPENAI_TEMPERATURE = 0.1
OPENAI_MAX_TOKENS = 2000
```

### **Processing Settings**
```python
OCR_DPI = 400
IMAGE_QUALITY = 95
MAX_IMAGE_SIZE = (1200, 800)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Roadmap

### **Phase 1: Core Features** ✅
- [x] Document classification
- [x] Smart region detection
- [x] OCR processing
- [x] AI enhancement
- [x] Quality scoring
- [x] Excel export

### **Phase 2: Advanced Features** 🚧
- [ ] Batch processing
- [ ] Advanced analytics
- [ ] CRM integration
- [ ] Mobile interface
- [ ] Real-time collaboration

### **Phase 3: Enterprise Features** 📋
- [ ] Microservices architecture
- [ ] Advanced security
- [ ] Multi-language support
- [ ] API marketplace
- [ ] Advanced reporting

---

**Built with ❤️ for Real Estate professionals**
