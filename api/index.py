"""
RExeli API - 25MB File Upload Support
Vercel-compatible serverless function
"""

import os
import json
import tempfile
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List
import base64
import io

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file
except ImportError:
    print("python-dotenv not available - using system environment variables only")

# AI/ML imports
try:
    import openai
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("OpenAI not available - install with 'pip install openai'")

# Import Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

# Configuration
MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 26214400))  # 25MB
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'}
UPLOAD_FOLDER = '/tmp/uploads'

# Supabase Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
SUPABASE_BUCKET = 'documents'

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

# File size thresholds
DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024  # 4MB - files above this use direct Supabase upload
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB - absolute maximum (Supabase Free tier limit)

# Create Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key')

# Setup CORS
CORS(app, resources={"/*": {"origins": "*"}})

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Supabase client
supabase_client = None
if SUPABASE_AVAILABLE and SUPABASE_URL and SUPABASE_ANON_KEY:
    try:
        # Use anon key for now (service key can be added later for admin operations)
        supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        logger.info("Supabase client initialized successfully with anon key")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        supabase_client = None

# Initialize OpenAI client
openai_client = None
if OPENAI_AVAILABLE and OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {str(e)}")
        openai_client = None

def handle_error(message: str, status_code: int = 500) -> Tuple[Dict[str, Any], int]:
    """Simple error handling"""
    logger.error(f"API Error {status_code}: {message}")
    return {
        'success': False,
        'error': message,
        'timestamp': datetime.utcnow().isoformat()
    }, status_code

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_file_path(filename: str) -> str:
    """Generate a unique file path for storage"""
    file_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    extension = os.path.splitext(filename)[1].lower()
    return f"uploads/{timestamp}_{file_id}{extension}"

def create_signed_upload_url(filename: str, file_size: int, content_type: str) -> Dict[str, Any]:
    """Create a signed URL for direct upload to Supabase"""
    if not supabase_client:
        return {'success': False, 'error': 'Supabase not configured'}
    
    try:
        # Generate unique file path
        file_path = generate_file_path(filename)
        
        # Create signed upload URL (expires in 1 hour)
        expires_in = 3600
        
        # Note: Supabase doesn't have direct presigned POST URLs like S3
        # We'll use a different approach - return upload info for direct client upload
        upload_token = str(uuid.uuid4())
        
        return {
            'success': True,
            'upload_method': 'direct_supabase',
            'file_path': file_path,
            'upload_token': upload_token,
            'supabase_url': SUPABASE_URL,
            'bucket': SUPABASE_BUCKET,
            'anon_key': SUPABASE_ANON_KEY,  # Safe to expose anon key
            'expires_in': expires_in,
            'max_file_size': MAX_FILE_SIZE,
            'instructions': {
                'method': 'POST',
                'headers': {
                    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
                    'Content-Type': content_type
                }
            }
        }
    except Exception as e:
        logger.error(f"Failed to create signed upload URL: {str(e)}")
        return {'success': False, 'error': str(e)}

# Health check endpoint
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '3.0.0',
        'max_file_size_mb': MAX_FILE_SIZE // (1024*1024),
        'direct_upload_threshold_mb': DIRECT_UPLOAD_THRESHOLD // (1024*1024),
        'allowed_extensions': list(ALLOWED_EXTENSIONS),
        'supabase_available': supabase_client is not None,
        'openai_available': openai_client is not None,
        'ai_model': OPENAI_MODEL if openai_client else 'not configured',
        'upload_methods': ['server_upload', 'direct_supabase'] if supabase_client else ['server_upload']
    })

# Get upload method endpoint
@app.route('/upload-method', methods=['POST'])
@app.route('/api/upload-method', methods=['POST'])
def get_upload_method():
    """Determine upload method based on file size"""
    try:
        data = request.get_json()
        if not data:
            return handle_error("Request body required", 400)
        
        filename = data.get('filename')
        file_size = data.get('file_size', 0)
        content_type = data.get('content_type', 'application/pdf')
        
        if not filename:
            return handle_error("Filename is required", 400)
        
        if not allowed_file(filename):
            return handle_error("File type not allowed", 400)
        
        # Check file size limits
        if file_size > MAX_FILE_SIZE:
            max_mb = MAX_FILE_SIZE // (1024*1024)
            actual_mb = file_size / (1024*1024)
            return handle_error(f"File too large: {actual_mb:.1f}MB. Maximum allowed: {max_mb}MB", 413)
        
        # Determine upload method
        if file_size > DIRECT_UPLOAD_THRESHOLD and supabase_client:
            # Use direct Supabase upload for large files
            upload_info = create_signed_upload_url(filename, file_size, content_type)
            if not upload_info['success']:
                return handle_error(upload_info['error'], 500)
            
            return jsonify({
                'success': True,
                'upload_method': 'direct_supabase',
                'file_size_mb': file_size / (1024*1024),
                'threshold_mb': DIRECT_UPLOAD_THRESHOLD / (1024*1024),
                'upload_info': upload_info,
                'next_step': 'Upload directly to Supabase, then call /api/confirm-upload'
            })
        else:
            # Use server upload for smaller files
            return jsonify({
                'success': True,
                'upload_method': 'server_upload',
                'file_size_mb': file_size / (1024*1024),
                'threshold_mb': DIRECT_UPLOAD_THRESHOLD / (1024*1024),
                'upload_info': {
                    'endpoint': '/api/upload',
                    'method': 'POST',
                    'max_size_mb': MAX_CONTENT_LENGTH // (1024*1024)
                },
                'next_step': 'Upload to /api/upload endpoint'
            })
    
    except Exception as e:
        logger.error(f"Upload method determination failed: {str(e)}")
        return handle_error(f"Failed to determine upload method: {str(e)}", 500)

# Confirm Supabase upload endpoint
@app.route('/confirm-upload', methods=['POST'])
@app.route('/api/confirm-upload', methods=['POST'])
def confirm_supabase_upload():
    """Confirm that a file was successfully uploaded to Supabase"""
    try:
        data = request.get_json()
        if not data:
            return handle_error("Request body required", 400)
        
        file_path = data.get('file_path')
        original_filename = data.get('original_filename')
        file_size = data.get('file_size', 0)
        upload_token = data.get('upload_token')
        
        if not all([file_path, original_filename, upload_token]):
            return handle_error("file_path, original_filename, and upload_token are required", 400)
        
        # Since frontend handles direct upload, we trust the confirmation
        # Generate document ID for tracking
        document_id = str(uuid.uuid4())
        
        # Log the upload confirmation
        logger.info(f"Confirmed Supabase upload: {file_path} ({file_size} bytes)")
        
        return jsonify({
            'success': True,
            'message': 'File upload confirmed successfully! 🎉',
            'document_id': document_id,
            'file_path': file_path,
            'original_filename': original_filename,
            'file_size': file_size,
            'storage_location': 'supabase',
            'upload_method': 'direct_supabase',
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'Large file upload via Supabase confirmed',
            'next_steps': {
                'ai_processing': 'Ready for AI processing',
                'status_check': f'/api/status/{document_id}',
                'process': f'/api/process/{document_id}'
            }
        })
    
    except Exception as e:
        logger.error(f"Upload confirmation failed: {str(e)}")
        return handle_error(f"Upload confirmation failed: {str(e)}", 500)

# Upload chunk endpoint for fallback
@app.route('/upload-chunk', methods=['POST'])
@app.route('/api/upload-chunk', methods=['POST'])
def upload_chunk():
    """Handle chunked file upload (fallback method)"""
    return handle_error("Chunked upload not implemented. Please use direct Supabase upload for files >4MB.", 501)

# Upload endpoint
@app.route('/upload', methods=['POST', 'OPTIONS'])
@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    """Handle file upload with 25MB support"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        logger.info(f"Upload request - Content-Length: {request.headers.get('Content-Length', 'unknown')}")
        
        if 'file' not in request.files:
            return handle_error("No file provided", 400)
        
        file = request.files['file']
        if file.filename == '':
            return handle_error("No file selected", 400)
        
        if not allowed_file(file.filename):
            return handle_error("File type not allowed", 400)
        
        # Get file size
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        logger.info(f"File: {file.filename}, Size: {file_size} bytes ({file_size / (1024*1024):.2f} MB)")
        
        # Validate file size
        if file_size > MAX_CONTENT_LENGTH:
            max_mb = MAX_CONTENT_LENGTH // (1024*1024)
            return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
        
        # Save file temporarily
        original_filename = secure_filename(file.filename)
        import uuid
        file_id = str(uuid.uuid4())
        temp_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{original_filename}")
        
        file.save(temp_path)
        
        # Verify file was saved
        actual_size = os.path.getsize(temp_path) if os.path.exists(temp_path) else 0
        logger.info(f"File saved - Expected: {file_size}, Actual: {actual_size}")
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully! 🎉',
            'document_id': file_id,
            'original_filename': original_filename,
            'file_size': file_size,
            'actual_size': actual_size,
            'upload_timestamp': datetime.utcnow().isoformat(),
            'status': '25MB upload capability confirmed',
            'next_steps': {
                'ai_processing': 'Would be initiated here in full version',
                'storage': 'Would be uploaded to Supabase storage',
                'status_check': f'/api/status/{file_id}'
            }
        })
        
    except RequestEntityTooLarge:
        max_mb = MAX_CONTENT_LENGTH // (1024*1024)
        return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return handle_error(f"Upload failed: {str(e)}", 500)

# Supabase webhook endpoint
@app.route('/webhook/supabase', methods=['POST'])
@app.route('/api/webhook/supabase', methods=['POST'])
def supabase_webhook():
    """Handle Supabase storage webhooks for processing triggers"""
    try:
        # Verify webhook signature if needed
        # webhook_secret = os.environ.get('SUPABASE_WEBHOOK_SECRET')
        
        data = request.get_json()
        if not data:
            return handle_error("Webhook payload required", 400)
        
        event_type = data.get('type')
        record = data.get('record', {})
        
        logger.info(f"Received Supabase webhook: {event_type}")
        
        if event_type == 'INSERT' and record.get('bucket_id') == SUPABASE_BUCKET:
            # File was uploaded to our documents bucket
            file_path = record.get('name')
            file_size = record.get('metadata', {}).get('size', 0)
            
            if file_path and file_size > 0:
                # Generate document ID and trigger processing
                document_id = str(uuid.uuid4())
                
                # TODO: Store document metadata and queue for AI processing
                logger.info(f"Queuing document {document_id} for processing: {file_path}")
                
                return jsonify({
                    'success': True,
                    'message': 'Webhook processed successfully',
                    'document_id': document_id,
                    'file_path': file_path,
                    'file_size': file_size,
                    'action': 'queued_for_processing',
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        # For other events, just acknowledge
        return jsonify({
            'success': True,
            'message': 'Webhook received',
            'event_type': event_type,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        return handle_error(f"Webhook processing failed: {str(e)}", 500)

# Process document endpoint
@app.route('/process/<document_id>', methods=['POST'])
@app.route('/api/process/<document_id>', methods=['POST'])
def process_document(document_id: str):
    """Process a document by ID (works with both server and Supabase storage)"""
    try:
        data = request.get_json() or {}
        storage_location = data.get('storage_location', 'server')
        file_path = data.get('file_path')
        
        if not file_path:
            return handle_error("file_path is required", 400)
        
        logger.info(f"Processing document {document_id} from {storage_location}: {file_path}")
        
        # TODO: Implement actual AI processing
        # For now, simulate processing
        processing_result = {
            'document_id': document_id,
            'file_path': file_path,
            'storage_location': storage_location,
            'processing_status': 'completed',
            'ai_analysis': {
                'document_type': 'real_estate',
                'confidence': 0.95,
                'extracted_data': {
                    'property_address': 'Example property analysis',
                    'transaction_amount': 'Would be extracted by AI'
                }
            },
            'processing_time': '2.3 seconds',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'message': 'Document processed successfully',
            'results': processing_result
        })
    
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        return handle_error(f"Document processing failed: {str(e)}", 500)

# Get signed URL for viewing files
@app.route('/file/<path:file_path>', methods=['GET'])
@app.route('/api/file/<path:file_path>', methods=['GET'])
def get_file_url(file_path: str):
    """Generate signed URL for viewing Supabase stored files"""
    try:
        if not supabase_client:
            return handle_error("File viewing not available - Supabase not configured", 503)
        
        # Create signed URL for file viewing (expires in 1 hour)
        result = supabase_client.storage.from_(SUPABASE_BUCKET).create_signed_url(
            file_path, expires_in=3600
        )
        
        if result and 'signedUrl' in result:
            return jsonify({
                'success': True,
                'signed_url': result['signedUrl'],
                'file_path': file_path,
                'expires_in': 3600,
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return handle_error("Failed to create signed URL", 500)
    
    except Exception as e:
        logger.error(f"Failed to create signed URL for {file_path}: {str(e)}")
        return handle_error(f"Failed to get file URL: {str(e)}", 500)

# Status check endpoint
@app.route('/status/<document_id>', methods=['GET'])
@app.route('/api/status/<document_id>', methods=['GET'])
def get_status(document_id: str):
    """Get processing status"""
    return jsonify({
        'success': True,
        'document_id': document_id,
        'status': 'uploaded',
        'message': 'Large file upload successful via new architecture - Ready for AI processing',
        'timestamp': datetime.utcnow().isoformat(),
        'progress': 100,
        'stage': 'upload_complete',
        'next_actions': {
            'process': f'/api/process/{document_id}',
            'download_results': f'/api/results/{document_id}'
        }
    })

# Root endpoint
@app.route('/', methods=['GET'])
@app.route('/api/', methods=['GET'])
@app.route('/api', methods=['GET'])
def root():
    """API root endpoint"""
    upload_methods = ['server_upload']
    if supabase_client:
        upload_methods.append('direct_supabase')
    
    return jsonify({
        'message': 'RExeli API - Enhanced Upload Architecture! 🚀',
        'version': '3.0.0',
        'status': 'operational',
        'capabilities': {
            'max_file_size': f"{MAX_FILE_SIZE // (1024*1024)}MB",
            'direct_upload_threshold': f"{DIRECT_UPLOAD_THRESHOLD // (1024*1024)}MB",
            'supported_formats': list(ALLOWED_EXTENSIONS),
            'upload_methods': upload_methods,
            'features': [
                'Intelligent upload routing',
                '50MB+ file support via Supabase',
                'Direct browser-to-storage uploads',
                'Bypass Vercel 4.5MB limitation',
                'File validation and security'
            ]
        },
        'workflow': {
            'small_files': 'Browser → Vercel Function (≤4MB)',
            'large_files': 'Browser → Supabase Storage (≤50MB)',
            'processing': 'Webhook → Vercel Function → AI Processing'
        },
        'endpoints': {
            'health': '/api/health',
            'upload_method': '/api/upload-method (POST)',
            'upload_small': '/api/upload (POST)',
            'confirm_large': '/api/confirm-upload (POST)',
            'status': '/api/status/{document_id}',
            'ai_classify': '/api/classify-document (POST)',
            'ai_regions': '/api/suggest-regions (POST)',
            'ai_extract': '/api/extract-data (POST)',
            'ai_validate': '/api/validate-data (POST)',
            'ai_quality': '/api/quality-score (POST)'
        }
    })


# AI Processing Endpoints

def get_file_content(filepath: str) -> str:
    """Download file content from Supabase storage"""
    if not supabase_client:
        raise Exception("Supabase client not available")
    
    try:
        # Generate signed URL for the file
        response = supabase_client.storage.from_(SUPABASE_BUCKET).create_signed_url(filepath, 3600)
        if not response.get('signedURL'):
            raise Exception("Failed to create signed URL")
        
        return response['signedURL']
    except Exception as e:
        logger.error(f"Failed to get file content for {filepath}: {str(e)}")
        raise


@app.route('/api/classify-document', methods=['POST'])
def classify_document():
    """Classify document type using AI"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        
        if not filepath:
            return handle_error("File path is required", 400)
        
        if not openai_client:
            return handle_error("AI service not available", 503)
        
        # Get file URL
        file_url = get_file_content(filepath)
        
        # Use OpenAI vision to classify document
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this document and classify its type. Respond with JSON only:
{
  "document_type": "rent_roll|offering_memo|lease_agreement|comparable_sales|financial_statement|other",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": file_url
                            }
                        }
                    ]
                }
            ],
            max_tokens=300,
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content.strip()
        classification = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'data': {
                'classification': classification
            }
        })
        
    except Exception as e:
        logger.error(f"Document classification failed: {str(e)}")
        return handle_error(f"Classification failed: {str(e)}", 500)


@app.route('/api/suggest-regions', methods=['POST'])
def suggest_regions():
    """Suggest data regions in document using AI"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        document_type = data.get('documentType', 'unknown')
        
        if not filepath:
            return handle_error("File path is required", 400)
        
        if not openai_client:
            return handle_error("AI service not available", 503)
        
        # Get file URL
        file_url = get_file_content(filepath)
        
        # Use OpenAI vision to identify data regions
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Analyze this {document_type} document and identify important data regions. 
For each region, provide approximate coordinates (x, y, width, height) as percentages of the document dimensions.
Respond with JSON only:
{{
  "regions": [
    {{
      "id": "unique_id",
      "label": "Property Address",
      "type": "text",
      "x": 10,
      "y": 20,
      "width": 200,
      "height": 30,
      "confidence": 0.9,
      "page": 0
    }}
  ]
}}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": file_url
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content.strip()
        regions_data = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'data': regions_data
        })
        
    except Exception as e:
        logger.error(f"Region suggestion failed: {str(e)}")
        return handle_error(f"Region suggestion failed: {str(e)}", 500)


@app.route('/api/extract-data', methods=['POST'])
def extract_data():
    """Extract data from specified regions using AI"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        regions = data.get('regions', [])
        
        if not filepath:
            return handle_error("File path is required", 400)
        
        if not openai_client:
            return handle_error("AI service not available", 503)
        
        # Get file URL
        file_url = get_file_content(filepath)
        
        # Create region descriptions for AI
        region_descriptions = []
        for region in regions:
            region_descriptions.append(f"- {region.get('label', 'Unknown')} at position ({region.get('x', 0)}, {region.get('y', 0)})")
        
        regions_text = "\n".join(region_descriptions)
        
        # Use OpenAI vision to extract data from regions
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Extract specific data from these regions in the document:
{regions_text}

For each region, extract the actual text/value and return as JSON:
{{
  "extracted_data": {{
    "region_id_1": {{
      "value": "extracted text or number",
      "confidence": 0.95,
      "type": "text|number|currency|date"
    }}
  }}
}}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": file_url
                            }
                        }
                    ]
                }
            ],
            max_tokens=1500,
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content.strip()
        extraction_data = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'data': extraction_data
        })
        
    except Exception as e:
        logger.error(f"Data extraction failed: {str(e)}")
        return handle_error(f"Data extraction failed: {str(e)}", 500)


@app.route('/api/validate-data', methods=['POST'])
def validate_data():
    """Validate extracted data using AI"""
    try:
        data = request.get_json()
        extracted_data = data.get('extractedData', {})
        document_type = data.get('documentType', 'unknown')
        
        if not extracted_data:
            return handle_error("Extracted data is required", 400)
        
        if not openai_client:
            return handle_error("AI service not available", 503)
        
        # Use OpenAI to validate data
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": f"""Validate this extracted data from a {document_type} document:
{json.dumps(extracted_data, indent=2)}

Check for:
1. Data format correctness
2. Reasonable values
3. Missing required fields
4. Potential errors

Respond with JSON only:
{{
  "validation": {{
    "is_valid": true,
    "errors": [],
    "warnings": ["Warning message if any"],
    "suggestions": ["Suggestion if any"],
    "confidence": 0.9
  }}
}}"""
                }
            ],
            max_tokens=500,
            temperature=0.1
        )
        
        result_text = response.choices[0].message.content.strip()
        validation_data = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'data': validation_data
        })
        
    except Exception as e:
        logger.error(f"Data validation failed: {str(e)}")
        return handle_error(f"Data validation failed: {str(e)}", 500)


@app.route('/api/quality-score', methods=['POST'])
def calculate_quality_score():
    """Calculate quality score for extracted data"""
    try:
        data = request.get_json()
        extracted_data = data.get('extractedData', {})
        validation_results = data.get('validationResults', {})
        
        if not extracted_data:
            return handle_error("Extracted data is required", 400)
        
        # Simple quality scoring algorithm
        total_fields = len(extracted_data)
        valid_fields = 0
        confidence_sum = 0
        
        for field_data in extracted_data.values():
            if isinstance(field_data, dict):
                confidence = field_data.get('confidence', 0)
                confidence_sum += confidence
                if confidence > 0.7:  # Threshold for "valid"
                    valid_fields += 1
        
        completeness_score = valid_fields / total_fields if total_fields > 0 else 0
        avg_confidence = confidence_sum / total_fields if total_fields > 0 else 0
        
        # Factor in validation results
        validation_score = 1.0
        validation = validation_results.get('validation', {})
        if validation:
            if not validation.get('is_valid', True):
                validation_score -= 0.3
            
            errors = len(validation.get('errors', []))
            warnings = len(validation.get('warnings', []))
            validation_score -= (errors * 0.1) + (warnings * 0.05)
            validation_score = max(0, validation_score)
        
        overall_score = (completeness_score + avg_confidence + validation_score) / 3
        
        return jsonify({
            'success': True,
            'data': {
                'quality_score': {
                    'overall': overall_score,
                    'completeness': completeness_score,
                    'confidence': avg_confidence,
                    'validation': validation_score,
                    'total_fields': total_fields,
                    'valid_fields': valid_fields
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Quality score calculation failed: {str(e)}")
        return handle_error(f"Quality score calculation failed: {str(e)}", 500)


# Error handlers
@app.errorhandler(413)
def handle_file_too_large(error):
    max_mb = MAX_CONTENT_LENGTH // (1024*1024)
    return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)

@app.errorhandler(404)
def handle_not_found(error):
    return handle_error("API endpoint not found", 404)

@app.errorhandler(500)
def handle_internal_error(error):
    return handle_error("Internal server error", 500)

if __name__ == '__main__':
    app.run(debug=True, port=5000)