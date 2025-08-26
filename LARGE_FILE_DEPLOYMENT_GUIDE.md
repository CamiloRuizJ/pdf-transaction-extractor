# 50MB PDF Upload Deployment Guide

## Overview

This system now supports uploading PDF files up to **50MB** using a hybrid approach that automatically selects the best upload method based on file size:

- **Files ≤ 25MB**: Standard server upload through Vercel functions
- **Files > 25MB**: Direct cloud upload to AWS S3 using presigned URLs

## Architecture

```
User Upload (50MB PDF)
    ↓
Frontend checks file size
    ↓
[If > 25MB] Request presigned URL from API
    ↓
Direct upload to S3 (bypasses Vercel limits)
    ↓
Confirm upload completion
    ↓
API downloads from S3 for processing
    ↓
AI processing pipeline
    ↓
Results returned to user
```

## Required Configuration

### 1. AWS S3 Setup

#### Create S3 Bucket
```bash
# Using AWS CLI
aws s3 mb s3://rexeli-documents --region us-east-1

# Set bucket policy for presigned URLs
aws s3api put-bucket-policy --bucket rexeli-documents --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::rexeli-documents/uploads/*"
    }
  ]
}'

# Enable CORS for direct uploads
aws s3api put-bucket-cors --bucket rexeli-documents --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["POST", "PUT"],
      "AllowedOrigins": ["https://yourdomain.com"],
      "ExposeHeaders": [],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

#### Create IAM User with S3 Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::rexeli-documents",
        "arn:aws:s3:::rexeli-documents/*"
      ]
    }
  ]
}
```

### 2. Vercel Environment Variables

Add these environment variables to your Vercel project:

```bash
# Required for 50MB support
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=rexeli-documents

# Existing variables
OPENAI_API_KEY=sk-...
SECRET_KEY=your-secret-key
FLASK_ENV=production
```

### 3. Vercel CLI Deployment
```bash
# Set environment variables
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_REGION
vercel env add S3_BUCKET

# Deploy
vercel --prod
```

## File Size Handling

### Current Limits
- **Maximum file size**: 50MB
- **Direct upload threshold**: 25MB
- **Server upload limit**: 25MB (Vercel function limit)
- **Cloud upload limit**: 50MB (configurable)

### Upload Flow

1. **File Selection**: User selects PDF file
2. **Size Check**: Frontend validates file size (≤ 50MB)
3. **Method Selection**: 
   - ≤ 25MB → Server upload via `/api/upload`
   - \> 25MB → Request presigned URL via `/api/upload-url`
4. **Upload Execution**:
   - Server upload: Direct POST to Vercel function
   - Cloud upload: Direct POST to S3 with presigned URL
5. **Processing**: API downloads file from S3 (if needed) and processes

## Testing Your Deployment

### Test Files
Create test files to verify your deployment:

```bash
# Create test PDFs of different sizes
# 10MB test file (should use server upload)
dd if=/dev/zero of=test_10mb.pdf bs=1M count=10

# 30MB test file (should use cloud upload)  
dd if=/dev/zero of=test_30mb.pdf bs=1M count=30

# 50MB test file (maximum size)
dd if=/dev/zero of=test_50mb.pdf bs=1M count=50
```

### API Testing
```bash
# Test upload URL generation
curl -X POST https://your-app.vercel.app/api/upload-url \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test_30mb.pdf",
    "file_size": 31457280,
    "content_type": "application/pdf"
  }'

# Should return upload_method: "direct_cloud" for files > 25MB
```

## Success Criteria

✅ **Verify these work**:
- [ ] Files ≤ 25MB upload through standard endpoint
- [ ] Files > 25MB get presigned URLs 
- [ ] Direct S3 upload works with progress tracking
- [ ] Upload confirmation returns valid file_id
- [ ] Processing works for both server and cloud files
- [ ] "IE Lease Comps 25k _2months.pdf" uploads successfully
- [ ] AI processing pipeline works with large files
- [ ] Excel export functions properly

## Error Handling

### Common Issues

1. **413 Request Entity Too Large**
   - Check Vercel function payload limits
   - Verify file is using cloud upload path for >25MB

2. **S3 Access Denied**
   - Verify AWS credentials in Vercel environment
   - Check S3 bucket policy and CORS configuration
   - Ensure IAM user has correct permissions

3. **Presigned URL Expired**
   - URLs expire after 1 hour by default
   - Regenerate URL if upload takes too long

4. **Processing Fails for Cloud Files**
   - Check S3 download permissions
   - Verify temporary file cleanup

## Monitoring

### Key Metrics to Monitor
- Upload success rate by file size
- Cloud vs server upload usage
- Processing time for large files  
- S3 storage usage and costs
- Error rates by upload method

### Logs to Check
```bash
# Vercel function logs
vercel logs --follow

# Check specific upload patterns
vercel logs | grep "upload_method\|file_size\|S3"
```

## Cost Optimization

### S3 Costs
- PUT requests: ~$0.005 per 1,000 requests
- Storage: ~$0.023 per GB-month
- Data transfer out: ~$0.09 per GB

### Cleanup Strategy
- Implement automatic deletion of processed files
- Use S3 lifecycle policies for temporary files
- Monitor storage usage regularly

## Security Considerations

### Presigned URL Security
- URLs are time-limited (1 hour default)
- File size restrictions enforced
- Content-Type validation
- No sensitive data in URLs

### Access Control
- Bucket policy restricts to uploads/ prefix
- IAM user has minimal required permissions
- CORS configured for specific domains only

## Future Enhancements

### If >50MB Support Needed
1. Implement true chunked upload system
2. Use S3 multipart upload API
3. Add upload resumption capabilities
4. Consider alternative processing approaches

### Performance Improvements
1. Implement CDN for faster downloads
2. Add compression before upload
3. Parallel processing for multiple files
4. Background job queue for large files

## Troubleshooting Checklist

- [ ] AWS credentials configured in Vercel
- [ ] S3 bucket exists and is accessible
- [ ] CORS policy allows your domain
- [ ] IAM permissions are sufficient
- [ ] Environment variables are set correctly
- [ ] File validation is working properly
- [ ] Progress tracking displays correctly
- [ ] Processing handles both upload types
- [ ] Error messages are user-friendly
- [ ] Cleanup of temporary files works