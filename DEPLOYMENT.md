# RExeli Deployment Guide

## Vercel + Supabase Production Deployment

This guide walks through deploying RExeli (PDF Transaction Extractor) to production using Vercel for hosting and Supabase for the PostgreSQL database.

## Prerequisites

- Vercel account
- Supabase account
- OpenAI API key
- Git repository connected to Vercel

## Step 1: Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to Settings > Database and copy your connection string
3. In the SQL Editor, run the schema from `database/supabase_schema.sql`
4. Note down your project URL, anon key, and service key from Settings > API

## Step 2: Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables:
- `SECRET_KEY`: A secure random string (minimum 32 characters)
- `DATABASE_URL`: Your Supabase PostgreSQL connection string
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `OPENAI_API_KEY`: Your OpenAI API key

### Optional Variables:
- `SUPABASE_SERVICE_KEY`: For advanced database operations
- `FLASK_ENV`: Set to "production"

## Step 3: Deploy to Vercel

### Option A: Connect GitHub Repository
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the configuration from `vercel.json`
3. Deploy automatically on git push

### Option B: Manual Deployment via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel --prod
```

## Step 4: Verify Deployment

1. Check that the API health endpoint works: `https://your-app.vercel.app/api/health`
2. Test file upload and processing functionality
3. Verify database connections in Supabase dashboard

## Project Structure

```
pdf-transaction-extractor/
├── api/                     # Vercel serverless API
│   ├── app.py              # Flask app entry point
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/               # Source code
│   ├── dist/              # Built assets (generated)
│   └── package.json       # Node.js dependencies
├── database/              # Database schema
│   └── supabase_schema.sql # PostgreSQL schema
├── app/                   # Flask application code
├── config.py             # Configuration management
├── vercel.json           # Vercel deployment config
└── requirements.txt      # Main Python dependencies
```

## API Routes

The deployed application exposes these API endpoints:

- `GET /api/health` - Health check
- `POST /api/upload` - File upload
- `POST /api/process-document` - Document processing
- `POST /api/extract-data` - Data extraction
- `POST /api/export-excel` - Excel export
- `GET /api/download/{filename}` - File download

## Database Schema

The Supabase database includes these main tables:

- `documents` - Uploaded PDF information
- `processing_sessions` - Document processing workflows
- `document_regions` - Region coordinates and metadata
- `extraction_results` - OCR and AI extraction results
- `export_history` - Export tracking
- `analytics` - Usage metrics

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check that all dependencies are listed in requirements.txt
   - Verify Python version compatibility (3.8+)

2. **Database Connection Issues**
   - Verify DATABASE_URL format and credentials
   - Check Supabase project status
   - Ensure schema is properly applied

3. **API Timeouts**
   - Large PDFs may timeout (16MB limit)
   - Consider file size optimization
   - Check Vercel function timeout limits

4. **CORS Issues**
   - Verify API base URL in frontend configuration
   - Check CORS settings in Flask app

### Logs and Monitoring:

- Vercel Function Logs: Available in Vercel dashboard
- Supabase Logs: Available in Supabase dashboard
- Application logs use structured JSON format

## Performance Optimization

- Images are processed with optimized settings
- Database connections use connection pooling
- Static assets are served via Vercel CDN
- API responses are cached where appropriate

## Security Features

- HTTPS enforced
- SQL injection protection via SQLAlchemy
- File type validation
- Rate limiting enabled
- Secure headers configured

## Scaling Considerations

- Vercel automatically scales serverless functions
- Supabase handles database scaling
- Consider implementing file storage optimization for large volumes
- Monitor API usage and implement additional rate limiting as needed

## Support

For deployment issues, check:
1. Vercel deployment logs
2. Supabase dashboard for database connectivity
3. OpenAI API usage limits
4. File size and processing limits