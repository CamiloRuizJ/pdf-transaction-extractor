# RExeli Deployment Checklist

## Pre-Deployment Setup

### 1. Supabase Database Setup
- [ ] Create Supabase project
- [ ] Run database schema from `database/supabase_schema.sql`
- [ ] Copy connection strings and API keys
- [ ] Test database connectivity

### 2. Environment Variables
Create these environment variables in Vercel:

**Required:**
- [ ] `SECRET_KEY` - Generate secure 32+ character string
- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `OPENAI_API_KEY` - OpenAI API key

**Optional:**
- [ ] `SUPABASE_SERVICE_KEY` - For admin operations
- [ ] `FLASK_ENV` - Set to "production"

### 3. Code Verification
- [ ] Verify all API routes work locally
- [ ] Test frontend build: `cd frontend && npm run build`
- [ ] Check that database models are properly configured
- [ ] Confirm CORS settings allow frontend-API communication

## Deployment Steps

### Option A: GitHub Integration (Recommended)
1. [ ] Push code to GitHub repository
2. [ ] Connect GitHub repo to Vercel
3. [ ] Configure environment variables in Vercel dashboard
4. [ ] Deploy automatically on git push

### Option B: Vercel CLI
1. [ ] Install Vercel CLI: `npm install -g vercel`
2. [ ] Login: `vercel login`
3. [ ] Deploy: `vercel --prod`

## Post-Deployment Verification

### 1. Health Checks
- [ ] Visit: `https://your-app.vercel.app/api/health`
- [ ] Should return: `{"status": "healthy", "version": "enhanced"}`
- [ ] Check Vercel function logs for any errors

### 2. Database Connection
- [ ] Verify database connection in Supabase dashboard
- [ ] Check that tables were created properly
- [ ] Test basic CRUD operations

### 3. File Upload Test
- [ ] Test PDF upload functionality
- [ ] Verify files are processed correctly
- [ ] Check file size limits (16MB max)

### 4. API Endpoints Test
Test these key endpoints:
- [ ] `POST /api/upload` - File upload
- [ ] `POST /api/process-document` - Document processing
- [ ] `POST /api/extract-data` - Data extraction
- [ ] `POST /api/export-excel` - Excel export
- [ ] `GET /api/download/{filename}` - File download

### 5. Frontend Functionality
- [ ] Test complete user workflow
- [ ] Verify all components load properly
- [ ] Check that API calls work from frontend
- [ ] Test responsive design on mobile

## Monitoring and Maintenance

### 1. Set Up Monitoring
- [ ] Monitor Vercel function usage and errors
- [ ] Set up Supabase alerts for database issues
- [ ] Monitor OpenAI API usage
- [ ] Track application performance metrics

### 2. Regular Maintenance
- [ ] Review application logs weekly
- [ ] Monitor database storage usage
- [ ] Update dependencies regularly
- [ ] Backup database regularly (Supabase handles this)

## Troubleshooting Common Issues

### Build Failures
- Check Python dependencies in `api/requirements.txt`
- Verify Node.js version compatibility
- Check for syntax errors in code

### Database Issues
- Verify DATABASE_URL format and credentials
- Check Supabase project status
- Ensure schema migration completed

### API Timeouts
- Large files may exceed Vercel limits
- Check function timeout configuration
- Consider optimizing file processing

### CORS Issues
- Verify API base URL in frontend
- Check Flask CORS configuration
- Ensure proper environment variables

## Performance Optimization Tips

1. **File Processing**
   - Optimize image processing parameters
   - Implement file size validation
   - Consider background processing for large files

2. **Database**
   - Use database indexes for frequently queried fields
   - Implement proper connection pooling
   - Monitor query performance

3. **Caching**
   - Enable Vercel edge caching for static assets
   - Implement API response caching where appropriate
   - Use browser caching for frontend assets

## Security Considerations

- [ ] HTTPS is enforced (automatic with Vercel)
- [ ] API rate limiting is configured
- [ ] File upload validation is in place
- [ ] Database queries use parameterization
- [ ] Environment variables are properly secured

## Rollback Plan

If deployment fails:
1. Check Vercel deployment logs
2. Revert to previous deployment via Vercel dashboard
3. Check environment variable configuration
4. Verify database connectivity
5. Test API endpoints individually

## Success Criteria

Deployment is successful when:
- [ ] Application loads without errors
- [ ] Users can upload and process PDF files
- [ ] Data extraction and export work correctly
- [ ] Database operations function properly
- [ ] Performance is acceptable (< 3s response times)
- [ ] No critical errors in logs

---

**Next Steps After Successful Deployment:**
- Share application URL with users
- Monitor usage and performance
- Plan for scaling if needed
- Schedule regular maintenance
- Gather user feedback for improvements