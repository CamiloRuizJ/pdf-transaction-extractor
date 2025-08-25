# RExeli Vercel Deployment Guide

## Complete Environment Setup for React + Flask Application

This guide provides step-by-step instructions for deploying the RExeli AI-powered commercial real estate document processing application to Vercel with proper environment variable configuration.

---

## Table of Contents

1. [Pre-Deployment Prerequisites](#pre-deployment-prerequisites)
2. [Vercel Project Setup](#vercel-project-setup)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Security Best Practices](#security-best-practices)
5. [Domain and CORS Configuration](#domain-and-cors-configuration)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Environment Management Best Practices](#environment-management-best-practices)

---

## Pre-Deployment Prerequisites

### Required Accounts and Services
- [x] Vercel account (authenticated)
- [ ] Supabase project with database configured
- [ ] OpenAI API account with API key
- [ ] GitHub repository access (for continuous deployment)

### Required Information Checklist
- [ ] Supabase project reference ID
- [ ] Supabase database password
- [ ] Supabase anon key
- [ ] Supabase service role key
- [ ] OpenAI API key

---

## Vercel Project Setup

### 1. Connect Repository to Vercel

1. Navigate to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository containing the RExeli application
4. Configure project settings:
   - **Project Name**: `rexeli-production`
   - **Framework Preset**: `Other` (since we're using custom config)
   - **Root Directory**: Leave as default (root)
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install && cd frontend && npm install`

### 2. Verify Build Configuration

Ensure your `vercel.json` configuration is properly set. The current configuration includes:
- Python API routing to `/api/app.py`
- Static file handling for React frontend
- CORS headers configuration
- Function timeout settings (5 minutes for large document processing)

---

## Environment Variables Configuration

### Step-by-Step Vercel Environment Variable Setup

1. **Access Environment Variables**
   - Go to your Vercel project dashboard
   - Click on "Settings" tab
   - Select "Environment Variables" from the left sidebar

2. **Add Each Variable Individually**

#### Required Variables (Critical)

##### Flask Configuration

**SECRET_KEY**
```
Name: SECRET_KEY
Value: [Generate using method below]
Environment: Production, Preview, Development
```

**Generate Secure SECRET_KEY:**
```bash
# Method 1: Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Method 2: Using OpenSSL
openssl rand -base64 32

# Example output: "dGhpc2lzYXZlcnlzZWN1cmVzZWNyZXRrZXlmb3Jwcm9kdWN0aW9u"
```

**FLASK_ENV**
```
Name: FLASK_ENV
Value: production
Environment: Production
```

##### Supabase Database Configuration

**DATABASE_URL**
```
Name: DATABASE_URL
Value: postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
Environment: Production, Preview, Development

Example: postgresql://postgres:mySecurePass123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**SUPABASE_URL**
```
Name: SUPABASE_URL
Value: https://[PROJECT_REF].supabase.co
Environment: Production, Preview, Development

Example: https://abcdefghijklmnop.supabase.co
```

**SUPABASE_ANON_KEY**
```
Name: SUPABASE_ANON_KEY
Value: [Your Supabase Anonymous Key]
Environment: Production, Preview, Development

Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**SUPABASE_SERVICE_KEY**
```
Name: SUPABASE_SERVICE_KEY
Value: [Your Supabase Service Role Key]
Environment: Production

⚠️ CRITICAL: Only add to Production environment, never Preview/Development
```

##### OpenAI Configuration

**OPENAI_API_KEY**
```
Name: OPENAI_API_KEY
Value: sk-[YOUR_OPENAI_API_KEY]
Environment: Production, Preview, Development

Example: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

#### Optional Variables (Recommended)

**MAX_CONTENT_LENGTH**
```
Name: MAX_CONTENT_LENGTH
Value: 16777216
Environment: Production, Preview, Development
Description: Maximum file upload size (16MB)
```

**WTF_CSRF_ENABLED**
```
Name: WTF_CSRF_ENABLED
Value: false
Environment: Production, Preview, Development
Description: Disable CSRF for API endpoints
```

**SQLALCHEMY_TRACK_MODIFICATIONS**
```
Name: SQLALCHEMY_TRACK_MODIFICATIONS
Value: false
Environment: Production, Preview, Development
Description: Disable SQLAlchemy event system for performance
```

### Finding Your Supabase Credentials

1. **Supabase Project Reference**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Project URL shows: `https://[PROJECT_REF].supabase.co`

2. **Supabase Keys**
   - In your Supabase project: Settings → API
   - **anon public**: Use for `SUPABASE_ANON_KEY`
   - **service_role**: Use for `SUPABASE_SERVICE_KEY`

3. **Database Password**
   - Settings → Database
   - Connection string shows format
   - Use the password you set during project creation

---

## Security Best Practices

### Environment Variable Security

#### Critical Security Rules
1. **Never commit environment variables to Git**
2. **Use different keys for different environments**
3. **Rotate keys regularly (monthly for production)**
4. **Limit service key access to production only**

#### Key-Specific Security Measures

**SECRET_KEY Security**
- Minimum 32 characters
- Use cryptographically secure random generation
- Rotate monthly in production
- Never reuse across environments

**Supabase Service Key Security**
- **CRITICAL**: Only add to Production environment
- Has full database admin access
- Monitor usage in Supabase dashboard
- Rotate immediately if compromised

**OpenAI API Key Security**
- Monitor usage and billing
- Set usage limits in OpenAI dashboard
- Use separate keys for different environments
- Enable usage alerts

### Access Control
1. **Vercel Team Settings**
   - Limit who can access environment variables
   - Use role-based permissions
   - Enable two-factor authentication

2. **Audit Trail**
   - Monitor environment variable changes
   - Log deployment activities
   - Regular security reviews

---

## Domain and CORS Configuration

### 1. Custom Domain Setup (Optional)

If using a custom domain:

1. **Add Domain in Vercel**
   - Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **Update CORS Configuration**
   
   Edit the `vercel.json` file to include your custom domain:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://yourdomain.com, https://yourproject.vercel.app"
        }
      ]
    }
  ]
}
```

### 2. CORS Environment Variable

Add dynamic CORS configuration:

```
Name: ALLOWED_ORIGINS
Value: https://yourproject.vercel.app,https://yourdomain.com
Environment: Production, Preview, Development
```

---

## Post-Deployment Verification

### Verification Checklist

#### 1. Environment Variables Check
```bash
# Test API endpoint to verify environment variables are loaded
curl -X GET "https://yourproject.vercel.app/api/health"

# Expected response should include status without exposing sensitive values
```

#### 2. Database Connection Test
- [ ] API can connect to Supabase
- [ ] Database tables are accessible
- [ ] Authentication works correctly

#### 3. OpenAI Integration Test
- [ ] API can communicate with OpenAI
- [ ] Document processing pipeline works
- [ ] Error handling functions properly

#### 4. File Upload Test
- [ ] File upload accepts PDF files
- [ ] Maximum file size limits work
- [ ] Processing completes successfully

#### 5. Frontend Integration Test
- [ ] React app loads correctly
- [ ] API calls succeed from frontend
- [ ] Error messages display properly
- [ ] Authentication flow works

### Verification Commands

Run these tests after deployment:

```bash
# 1. Health check
curl https://yourproject.vercel.app/api/health

# 2. Database connectivity (should return 200)
curl https://yourproject.vercel.app/api/regions

# 3. Frontend loads (should return HTML)
curl https://yourproject.vercel.app/

# 4. CORS headers (should include Access-Control-Allow-Origin)
curl -H "Origin: https://yourproject.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://yourproject.vercel.app/api/upload
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Environment Variables Not Loading

**Symptoms:**
- 500 errors on API calls
- "Environment variable not found" errors
- Database connection failures

**Solutions:**
1. Verify variable names match exactly (case-sensitive)
2. Check that variables are assigned to correct environments
3. Redeploy after adding variables
4. Check Vercel function logs for specific errors

**Debug Commands:**
```bash
# Check deployment logs
vercel logs https://yourproject.vercel.app

# Check specific function logs
vercel logs https://yourproject.vercel.app/api/app.py
```

#### 2. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- Authentication failures
- Timeout errors

**Solutions:**
1. Verify DATABASE_URL format and credentials
2. Check Supabase project status
3. Verify IP restrictions in Supabase
4. Test connection string locally

**Database URL Validation:**
```bash
# Test connection string format
echo "postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres" | \
  sed 's/PASSWORD/[HIDDEN]/g'
```

#### 3. OpenAI API Issues

**Symptoms:**
- Document processing fails
- "Invalid API key" errors
- Rate limiting errors

**Solutions:**
1. Verify API key format (starts with 'sk-')
2. Check OpenAI account billing and limits
3. Verify API key permissions
4. Monitor usage in OpenAI dashboard

#### 4. CORS Errors

**Symptoms:**
- Frontend can't communicate with API
- "Access to fetch blocked by CORS policy"
- OPTIONS requests failing

**Solutions:**
1. Update `vercel.json` CORS configuration
2. Verify domain matches exactly
3. Check for trailing slashes in URLs
4. Test with browser developer tools

#### 5. File Upload Issues

**Symptoms:**
- Large files fail to upload
- "Request entity too large" errors
- Timeout on file processing

**Solutions:**
1. Verify MAX_CONTENT_LENGTH setting
2. Check Vercel function timeout limits
3. Optimize file processing pipeline
4. Implement progress indicators

### Getting Help

#### Log Analysis
1. **Vercel Function Logs**
   ```bash
   vercel logs --follow
   ```

2. **Real-time Monitoring**
   - Use Vercel Dashboard → Functions
   - Monitor error rates and response times
   - Check memory usage and duration

#### Debug Mode
Add temporary debug environment variable:
```
Name: DEBUG
Value: true
Environment: Development
```

---

## Environment Management Best Practices

### 1. Environment Separation

**Development Environment**
- Use separate Supabase project for development
- Use separate OpenAI API key with lower limits
- Enable debug logging
- Use weaker security settings for easier development

**Preview Environment**
- Mirror production setup but with development data
- Use production-like security settings
- Test environment variable changes here first

**Production Environment**
- Strongest security settings
- Production Supabase project
- Production OpenAI API key with appropriate limits
- Minimal logging to avoid performance impact

### 2. Secret Rotation Schedule

**Monthly:**
- [ ] SECRET_KEY
- [ ] OPENAI_API_KEY (if needed for security)

**Quarterly:**
- [ ] SUPABASE_SERVICE_KEY
- [ ] Review and audit all environment variables

**Annually:**
- [ ] Complete security review
- [ ] Update to latest security practices
- [ ] Review access permissions

### 3. Backup and Recovery

**Environment Variable Backup**
1. Document all environment variables in secure location
2. Maintain encrypted backup of production values
3. Test recovery procedures regularly

**Recovery Process**
1. Identify compromised variables
2. Generate new secure values
3. Update in Vercel dashboard
4. Trigger new deployment
5. Verify all functionality works
6. Monitor for issues

### 4. Monitoring and Alerts

**Set up monitoring for:**
- API response times and error rates
- Database connection health
- OpenAI API usage and costs
- File processing success rates

**Configure alerts for:**
- High error rates (>5%)
- API key usage approaching limits
- Database connection failures
- Unusual traffic patterns

---

## Deployment Success Criteria

Your deployment is successful when:

- [ ] All environment variables are properly configured
- [ ] Health check endpoint returns 200 status
- [ ] Database connectivity is confirmed
- [ ] OpenAI integration is working
- [ ] Frontend loads and communicates with API
- [ ] File upload and processing works end-to-end
- [ ] CORS is properly configured
- [ ] Security headers are present
- [ ] Error handling works correctly
- [ ] Performance meets requirements (< 5 second processing time)

---

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- [ ] Monitor error logs
- [ ] Check API usage and costs
- [ ] Verify backup processes

**Monthly:**
- [ ] Security review
- [ ] Performance optimization
- [ ] Update dependencies if needed

**Quarterly:**
- [ ] Full system audit
- [ ] Disaster recovery testing
- [ ] Access review and cleanup

### Emergency Procedures

**In case of security breach:**
1. Rotate all environment variables immediately
2. Review access logs
3. Update security measures
4. Monitor for suspicious activity
5. Document incident and response

**In case of service outage:**
1. Check Vercel status page
2. Review function logs for errors
3. Verify environment variables
4. Check external service status (Supabase, OpenAI)
5. Contact support if needed

---

## Conclusion

This guide provides comprehensive instructions for deploying RExeli to Vercel with proper security and environment management. Follow each section carefully and verify each step before proceeding to ensure a successful, secure deployment.

For additional support, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

Remember to keep this guide updated as your application evolves and security practices change.