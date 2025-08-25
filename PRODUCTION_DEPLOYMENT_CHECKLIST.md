# Production Deployment Checklist

## Pre-Deployment Security Verification

### ✅ Security Fixes Applied
- [ ] **CORS Configuration**: Wildcard origins removed, specific domains configured
- [ ] **Error Sanitization**: Sensitive information removed from error responses
- [ ] **Rate Limiting**: Flask-Limiter configured with appropriate limits
- [ ] **File Validation**: Enhanced PDF validation and malware scanning
- [ ] **Debug Information**: Health endpoints sanitized for production
- [ ] **Security Headers**: Comprehensive security headers in vercel.json

### ✅ Environment Configuration
- [ ] **SECRET_KEY**: Strong, randomly generated secret key set
- [ ] **FLASK_ENV**: Set to "production"
- [ ] **OPENAI_API_KEY**: Valid OpenAI API key configured
- [ ] **CORS Origins**: Production domain added to allowed origins list
- [ ] **Database URLs**: Production database URLs configured (if applicable)

### ✅ Dependencies & Requirements
- [ ] **Flask-Limiter**: Added to requirements.txt (v3.5.0)
- [ ] **All Dependencies**: Up to date and security-patched
- [ ] **Python Version**: Compatible Python version specified
- [ ] **Vercel Runtime**: Correct Python runtime in vercel.json

## Deployment Configuration

### Vercel Configuration
```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install && cd frontend && npm install",
  "functions": {
    "api/app.py": {
      "runtime": "@vercel/python@5.0.0",
      "maxDuration": 300,
      "memory": 1024
    }
  }
}
```

### Environment Variables for Production
```bash
# Required Variables
SECRET_KEY="your-production-secret-key-here"
FLASK_ENV="production"
OPENAI_API_KEY="your-openai-api-key-here"

# Optional but Recommended
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
DATABASE_URL="your-database-connection-string"

# Model Configuration
OPENAI_MODEL="gpt-3.5-turbo"
```

## Security Testing Checklist

### 🔧 Run Security Test Suite
```bash
# Run the security test suite
python test_security_fixes.py
```

### Manual Security Tests
- [ ] **CORS Test**: Verify only allowed origins can access API
- [ ] **Rate Limiting**: Confirm rate limits trigger appropriately  
- [ ] **File Upload**: Test PDF validation and malicious file rejection
- [ ] **Error Handling**: Verify no sensitive data in error responses
- [ ] **Health Endpoints**: Confirm no sensitive configuration exposed
- [ ] **Security Headers**: Validate all security headers present

### API Functionality Tests
- [ ] **Health Check**: `/api/health` returns healthy status
- [ ] **File Upload**: `/api/upload` accepts valid PDF files
- [ ] **Document Processing**: `/api/process` works with uploaded files
- [ ] **AI Features**: Classification, enhancement, and validation endpoints functional
- [ ] **Export Features**: Excel export generation works

## Performance Verification

### Response Time Benchmarks
- [ ] **Health Check**: < 100ms response time
- [ ] **File Upload**: < 5s for typical PDF files (< 10MB)
- [ ] **Document Processing**: < 30s for AI processing
- [ ] **Rate Limiting Overhead**: < 5ms additional latency

### Load Testing (Recommended)
- [ ] **Concurrent Requests**: Test with 10-50 concurrent users
- [ ] **Rate Limit Behavior**: Verify graceful rate limit handling
- [ ] **Memory Usage**: Monitor serverless function memory usage
- [ ] **Error Rates**: Maintain < 1% error rate under normal load

## Production Domain Configuration

### CORS Origins Update
Update the allowed origins in `api/app.py`:
```python
allowed_origins = [
    "https://your-production-domain.com",
    "https://www.your-production-domain.com",
    "https://your-app.vercel.app",
    # Remove localhost origins for production
]
```

### SSL/TLS Verification
- [ ] **HTTPS Enforced**: All traffic redirected to HTTPS
- [ ] **SSL Certificate**: Valid SSL certificate installed
- [ ] **HSTS Headers**: HTTP Strict Transport Security enabled
- [ ] **Mixed Content**: No HTTP resources on HTTPS pages

## Monitoring & Logging Setup

### Security Monitoring
- [ ] **Rate Limiting Logs**: Monitor for excessive rate limiting
- [ ] **Failed File Uploads**: Track suspicious file upload attempts
- [ ] **Error Rates**: Monitor 4xx/5xx error patterns
- [ ] **Response Times**: Track API performance metrics

### Application Monitoring
- [ ] **Uptime Monitoring**: External uptime monitoring configured
- [ ] **Error Tracking**: Error tracking service integrated (optional)
- [ ] **Performance Monitoring**: APM tool configured (optional)
- [ ] **Log Aggregation**: Centralized logging configured (optional)

## Post-Deployment Verification

### Immediate Checks (Within 1 hour)
- [ ] **API Health**: Verify `/api/health` returns 200 OK
- [ ] **CORS Functionality**: Test from production frontend
- [ ] **File Upload**: Test with sample PDF file
- [ ] **Rate Limiting**: Verify rate limits are active
- [ ] **Error Handling**: Test error scenarios return sanitized responses

### Extended Monitoring (Within 24 hours)
- [ ] **Performance Metrics**: Verify response times within acceptable ranges
- [ ] **Security Events**: Review security event logs for anomalies
- [ ] **User Workflows**: Test complete user workflows end-to-end
- [ ] **Error Rates**: Confirm error rates are within normal parameters

## Rollback Plan

### Emergency Rollback Procedure
1. **Immediate Rollback**: Use Vercel's instant rollback to previous deployment
2. **Database Rollback**: Revert any database migrations if applicable
3. **Environment Variables**: Restore previous environment variable values
4. **CORS Configuration**: Temporarily allow broader CORS if needed for emergency access

### Rollback Triggers
- API error rate > 5%
- Response times > 10s consistently
- Security vulnerabilities discovered
- Complete service failure

## Security Incident Response

### Incident Detection
- Unusual rate limiting patterns
- Suspicious file upload attempts
- Unexpected error spikes
- Security scanner alerts

### Response Procedures
1. **Immediate**: Enable additional logging and monitoring
2. **Short-term**: Tighten rate limits if under attack
3. **Investigation**: Analyze logs and identify attack vectors
4. **Mitigation**: Deploy additional security measures
5. **Communication**: Notify stakeholders if data is at risk

## Compliance & Documentation

### Security Documentation
- [ ] **Security Fixes Summary**: Available for audit
- [ ] **API Documentation**: Updated with security considerations
- [ ] **Environment Setup**: Documented for team members
- [ ] **Incident Response Plan**: Documented and accessible

### Compliance Checklist
- [ ] **OWASP Top 10**: Major vulnerabilities addressed
- [ ] **Data Protection**: No sensitive data in logs or errors
- [ ] **Access Controls**: Proper authentication and authorization
- [ ] **Audit Trail**: Security events logged appropriately

---

## Final Deployment Commands

### 1. Pre-deployment Test
```bash
# Test locally with production environment
FLASK_ENV=production python -m pytest test_security_fixes.py
```

### 2. Deploy to Vercel
```bash
# Deploy using Vercel CLI
vercel --prod

# Or push to main branch if auto-deployment is configured
git push origin main
```

### 3. Post-deployment Verification
```bash
# Test production deployment
curl -X GET https://your-app.vercel.app/api/health
curl -X GET https://your-app.vercel.app/api/config
```

### 4. Monitor Deployment
- Watch Vercel deployment logs
- Monitor application metrics
- Check security event logs
- Verify all functionality works

---

**Checklist Completed By**: ________________  
**Date**: ________________  
**Deployment URL**: ________________  
**Post-Deployment Review Date**: ________________