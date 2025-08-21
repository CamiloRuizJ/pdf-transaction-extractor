# PDF Transaction Extractor - PaaS Deployment Guide

## Overview
This guide covers deployment to various Zero-Docker PaaS platforms including Render, Railway, and Heroku.

## Prerequisites
- Git repository with your code
- Account on your chosen PaaS platform
- Python 3.9+ support

## Platform-Specific Deployment

### 1. Render Deployment

#### Setup
1. **Create Render Account**: Sign up at [render.com](https://render.com)
2. **Connect Repository**: Connect your GitHub/GitLab repository
3. **Create Web Service**: Choose "Web Service" from the dashboard

#### Configuration
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python wsgi.py`
- **Environment**: Python 3.9

#### Environment Variables
Set these in your Render dashboard:
```
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=10000
UPLOAD_FOLDER=uploads
TEMP_FOLDER=temp
```

#### Automatic Deployment
- Render will automatically deploy when you push to your main branch
- Use the `render.yaml` file for configuration

### 2. Railway Deployment

#### Setup
1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Connect Repository**: Connect your GitHub repository
3. **Deploy**: Railway will automatically detect and deploy

#### Configuration
- Uses `railway.json` for configuration
- Automatically installs dependencies from `requirements.txt`
- Uses `python wsgi.py` as start command

#### Environment Variables
Set these in Railway dashboard:
```
FLASK_ENV=production
FLASK_DEBUG=false
UPLOAD_FOLDER=uploads
TEMP_FOLDER=temp
```

### 3. Heroku Deployment

#### Setup
1. **Install Heroku CLI**: Download from [heroku.com](https://heroku.com)
2. **Login**: `heroku login`
3. **Create App**: `heroku create your-app-name`

#### Configuration
- Uses `Procfile` for process definition
- Uses `runtime.txt` for Python version
- Uses `requirements.txt` for dependencies

#### Environment Variables
```bash
heroku config:set FLASK_ENV=production
heroku config:set FLASK_DEBUG=false
heroku config:set UPLOAD_FOLDER=uploads
heroku config:set TEMP_FOLDER=temp
```

#### Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

## System Dependencies

### Tesseract OCR
Most PaaS platforms don't include Tesseract by default. You'll need to:

#### Option 1: Use Cloud OCR Services
Update your configuration to use cloud OCR services like:
- Google Cloud Vision API
- Azure Computer Vision
- AWS Textract

#### Option 2: Buildpacks (Heroku)
For Heroku, use the Tesseract buildpack:
```bash
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-apt
```

Create `Aptfile`:
```
tesseract-ocr
tesseract-ocr-eng
poppler-utils
```

#### Option 3: Custom Build Scripts
For Render/Railway, you may need to install system dependencies in your build process.

## File Storage Considerations

### Temporary Storage
- PaaS platforms have ephemeral file systems
- Files uploaded will be lost on restart
- Consider using cloud storage services

### Recommended Solutions
1. **AWS S3**: For file storage
2. **Google Cloud Storage**: Alternative to S3
3. **Cloudinary**: For image processing
4. **Database**: Store file metadata

## Environment Variables

### Required Variables
```
FLASK_ENV=production
FLASK_DEBUG=false
UPLOAD_FOLDER=uploads
TEMP_FOLDER=temp
```

### Optional Variables
```
FLASK_HOST=0.0.0.0
FLASK_PORT=10000
LOG_LEVEL=INFO
```

### Security Variables
```
SECRET_KEY=your-secret-key
API_KEYS=your-api-keys
```

## Monitoring and Logs

### Health Check
Your application includes a health check endpoint:
- **URL**: `/health`
- **Method**: GET
- **Response**: JSON with status and timestamp

### Logging
- Application logs are sent to stdout/stderr
- PaaS platforms capture these automatically
- Check your platform's logging dashboard

## Troubleshooting

### Common Issues

#### 1. Port Issues
- Ensure your app listens on `0.0.0.0`
- Use `PORT` environment variable
- Don't hardcode port numbers

#### 2. File System Issues
- Don't rely on persistent file storage
- Use cloud storage for files
- Clean up temporary files

#### 3. Memory Issues
- Monitor memory usage
- Optimize image processing
- Consider using smaller images

#### 4. Build Failures
- Check `requirements.txt` for conflicts
- Ensure all dependencies are compatible
- Test locally before deploying

### Debug Commands

#### Render
```bash
# View logs
render logs --service your-service-name

# SSH into instance (if available)
render ssh --service your-service-name
```

#### Railway
```bash
# View logs
railway logs

# Open shell
railway shell
```

#### Heroku
```bash
# View logs
heroku logs --tail

# Open shell
heroku run bash
```

## Performance Optimization

### 1. Image Processing
- Resize images before processing
- Use efficient image formats
- Implement caching

### 2. OCR Optimization
- Use appropriate OCR engines
- Implement result caching
- Batch process when possible

### 3. Memory Management
- Clean up temporary files
- Use generators for large datasets
- Monitor memory usage

## Security Considerations

### 1. File Uploads
- Validate file types
- Limit file sizes
- Scan for malware

### 2. API Security
- Use HTTPS
- Implement rate limiting
- Validate all inputs

### 3. Environment Variables
- Never commit secrets
- Use platform-specific secret management
- Rotate keys regularly

## Cost Optimization

### 1. Resource Usage
- Monitor CPU and memory usage
- Scale down when not needed
- Use appropriate instance sizes

### 2. Storage Costs
- Use cloud storage efficiently
- Implement file cleanup
- Compress files when possible

### 3. API Usage
- Cache OCR results
- Batch API calls
- Use free tiers when possible

## Next Steps

1. **Choose Platform**: Select your preferred PaaS platform
2. **Set Up Repository**: Ensure your code is in a Git repository
3. **Configure Environment**: Set up environment variables
4. **Deploy**: Follow platform-specific deployment steps
5. **Monitor**: Set up monitoring and alerting
6. **Optimize**: Monitor performance and optimize as needed

## Support

- **Render**: [docs.render.com](https://docs.render.com)
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Heroku**: [devcenter.heroku.com](https://devcenter.heroku.com)
