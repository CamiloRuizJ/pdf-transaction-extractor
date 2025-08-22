# PDF Transaction Extractor Enhanced - Complete Setup Guide

## 🚀 Quick Start (Windows)

### Option 1: Automated Setup (Recommended)
1. **Run the startup script:**
   ```bash
   start_enhanced.bat
   ```
   This will automatically:
   - Create virtual environment
   - Install dependencies
   - Create configuration files
   - Start the application

### Option 2: Manual Setup

#### 1. **Prerequisites**
- Python 3.11.7+ (Download from [python.org](https://python.org))
- Git (Download from [git-scm.com](https://git-scm.com))

#### 2. **System Dependencies**

**Install Tesseract OCR:**
```bash
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Or run our installer:
install_tesseract.bat
```

**Install Poppler (for PDF processing):**
```bash
# Download from: https://blog.alivate.com.au/poppler-windows/
# Or run our installer:
install_poppler.bat
```

#### 3. **Python Environment Setup**

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

#### 4. **Configuration**

```bash
# Copy environment template
copy .env.example .env

# Edit .env file with your settings:
# - Add your OpenAI API key
# - Configure database settings
# - Set other preferences
```

#### 5. **Run the Application**

```bash
# Development mode
python app.py

# Production mode (with Gunicorn)
gunicorn wsgi:app --workers 2 --timeout 120
```

## 🌐 Platform-Specific Setup

### macOS Setup
```bash
# Install system dependencies
brew install tesseract poppler

# Python setup (same as above)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run application
python app.py
```

### Linux (Ubuntu/Debian) Setup
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install tesseract-ocr poppler-utils libtesseract-dev libpoppler-cpp-dev

# Python setup (same as above)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run application
python app.py
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | - | Yes |
| `FLASK_ENV` | Environment (development/production) | development | No |
| `SECRET_KEY` | Flask secret key | auto-generated | No |
| `DATABASE_URL` | Database connection string | SQLite | No |
| `REDIS_URL` | Redis connection for caching | localhost:6379 | No |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `V2_ENABLED` | Enable V2 enterprise features | true |
| `DOCUMENT_CLASSIFICATION_ENABLED` | AI document classification | true |
| `QUALITY_SCORING_ENABLED` | Data quality scoring | true |
| `SMART_REGION_SUGGESTION` | AI region suggestions | true |

## 🚀 Deployment Options

### 1. Render Deployment
```bash
# Connect your repository to Render
# The render.yaml file is pre-configured
# Just add your environment variables in Render dashboard
```

### 2. Railway Deployment
```bash
# Connect your repository to Railway
# The railway.json file is pre-configured
# Add environment variables in Railway dashboard
```

### 3. Heroku Deployment
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add buildpack for Tesseract
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-apt

# Set environment variables
heroku config:set OPENAI_API_KEY=your_api_key
heroku config:set FLASK_ENV=production

# Deploy
git push heroku main
```

### 4. Docker Deployment
```dockerfile
# Use the provided Dockerfile
docker build -t pdf-extractor-enhanced .
docker run -p 5000:5000 -e OPENAI_API_KEY=your_key pdf-extractor-enhanced
```

## 🧪 Testing the Setup

### 1. **Basic Health Check**
```bash
curl http://localhost:5000/health
```
Should return: `{"status": "healthy", "version": "enhanced"}`

### 2. **Upload Test**
1. Open browser to `http://localhost:5000`
2. Upload a sample PDF
3. Create extraction regions
4. Test data extraction

### 3. **API Test**
```bash
# Test API endpoints
curl -X POST http://localhost:5000/api/upload -F "file=@test.pdf"
```

## 🔍 Troubleshooting

### Common Issues

**1. Tesseract not found**
```bash
# Windows: Add Tesseract to PATH
# Or set TESSERACT_PATH in .env file
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

**2. Poppler not found**
```bash
# Windows: Add Poppler to PATH
# Or set POPPLER_PATH in .env file
POPPLER_PATH=C:\poppler\bin
```

**3. OpenAI API errors**
```bash
# Check your API key in .env file
# Ensure you have sufficient API credits
```

**4. Port already in use**
```bash
# Change port in .env file
FLASK_PORT=5001
```

**5. Virtual environment issues**
```bash
# Recreate virtual environment
rmdir /s venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## 📈 Performance Optimization

### For Large Files
```env
# Increase file size limit
MAX_CONTENT_LENGTH=67108864  # 64MB

# Increase worker timeout
WORKER_TIMEOUT=300  # 5 minutes

# Enable Redis caching
REDIS_URL=redis://localhost:6379/0
```

### For High Traffic
```env
# Increase max workers
MAX_WORKERS=8

# Enable rate limiting
FLASK_LIMITER_ENABLED=true
```

## 🔒 Security Considerations

### Production Checklist
- [ ] Change default SECRET_KEY
- [ ] Use HTTPS in production
- [ ] Set strong database passwords
- [ ] Enable CSRF protection
- [ ] Configure rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable logging and monitoring

### Recommended Production Settings
```env
FLASK_ENV=production
FLASK_DEBUG=false
SECRET_KEY=your-very-long-and-random-secret-key
WTF_CSRF_ENABLED=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
```

## 📚 Additional Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tesseract OCR Documentation](https://tesseract-ocr.github.io/)
- [Deployment Guides](./docs/deployment/)

## 🆘 Getting Help

1. Check the logs in the `logs/` directory
2. Review this setup guide
3. Check the main README.md
4. Open an issue with detailed error information

---

**Congratulations! You're ready to start extracting data from PDFs with AI! 🎉**