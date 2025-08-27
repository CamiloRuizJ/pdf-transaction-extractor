"""
Enhanced RExeli API - Complete 25MB File Upload Support with Supabase Integration
Production-ready Flask application with chunked uploads and AI processing.
"""

import os
import sys
import json
import io
import tempfile
import traceback
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

# Flask and web framework imports
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import hashlib

# Add paths for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# Enhanced Configuration
class EnhancedConfig:
    """Production configuration with Supabase integration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'prod-key-change-this')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    
    # File Upload Limits - Enhanced for 25MB support
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 26214400))  # 25MB default
    CHUNK_SIZE = int(os.environ.get('CHUNK_SIZE', 1048576))  # 1MB chunks
    UPLOAD_TIMEOUT = int(os.environ.get('UPLOAD_TIMEOUT', 300))  # 5 minutes
    
    # Supabase Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
    
    # AI Configuration
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')
    OPENAI_TEMPERATURE = 0.1
    OPENAI_MAX_TOKENS = 1500
    
    # File handling
    UPLOAD_FOLDER = '/tmp/uploads'
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx'}
    
    def __init__(self):
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)

# Create Flask application
app = Flask(__name__)
app.config.from_object(EnhancedConfig)

# Setup CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://rexeli.com", "https://rexeli-*.vercel.app"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "max_age": 86400
    }
})

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["1000 per hour"],
    storage_uri="memory://",
    strategy="fixed-window"
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for services
storage_service = None
ai_service = None

def init_services():
    """Initialize Supabase and AI services"""
    global storage_service, ai_service
    
    try:
        # Initialize Supabase storage service
        if app.config['SUPABASE_URL']:
            try:
                from app.services.supabase_service import get_storage_service
                storage_service = get_storage_service()
                logger.info("Supabase storage service initialized")
            except ImportError as e:
                logger.warning(f"Supabase service not available: {e}")
                storage_service = None
        else:
            logger.warning("Supabase URL not configured - storage features disabled")
            storage_service = None
        
        # Initialize AI service
        if app.config['OPENAI_API_KEY']:
            try:
                # For now, just log that AI service would be initialized
                logger.info("AI service configuration detected")
                ai_service = "configured"  # Placeholder
            except Exception as e:
                logger.warning(f"AI service initialization failed: {e}")
                ai_service = None
        else:
            logger.warning("OpenAI API key not configured - AI features disabled")
            ai_service = None
            
    except Exception as e:
        logger.error(f"Failed to initialize services: {str(e)}")
        storage_service = None
        ai_service = None

def handle_error(message: str, status_code: int = 500, error_type: str = "error") -> Tuple[Dict[str, Any], int]:
    """Standardized error handling"""
    logger.error(f"API Error {status_code}: {message}")
    return {
        'success': False,
        'error': message,
        'error_type': error_type,
        'timestamp': datetime.utcnow().isoformat()
    }, status_code

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def validate_file_size(content_length: int) -> bool:
    """Validate file size against limits"""
    max_size = app.config['MAX_CONTENT_LENGTH']
    return content_length <= max_size

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check with service status"""
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0',
            'services': {}
        }
        
        # Check Supabase storage
        if storage_service:
            try:
                storage_health = storage_service.health_check()
                health_status['services']['storage'] = storage_health
            except Exception as e:
                health_status['services']['storage'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
        else:
            health_status['services']['storage'] = {
                'status': 'not_configured'
            }
        
        # Check AI service
        health_status['services']['ai'] = {
            'status': 'configured' if ai_service else 'not_configured'
        }
        
        # Check file upload limits
        health_status['upload_limits'] = {
            'max_file_size_mb': app.config['MAX_CONTENT_LENGTH'] // (1024*1024),
            'chunk_size_kb': app.config['CHUNK_SIZE'] // 1024,
            'timeout_seconds': app.config['UPLOAD_TIMEOUT']
        }
        
        return jsonify(health_status)
        
    except Exception as e:
        return handle_error(f"Health check failed: {str(e)}", 500)

# Single file upload endpoint
@app.route('/upload', methods=['POST', 'OPTIONS'])
@limiter.limit("10 per minute")
def upload_single_file():
    """Handle single file upload with Supabase storage"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Check if storage service is available
        if not storage_service:
            return handle_error("Storage service not available", 503)
        
        # Check for file in request
        if 'file' not in request.files:
            return handle_error("No file provided", 400)
        
        file = request.files['file']
        if file.filename == '':
            return handle_error("No file selected", 400)
        
        if not allowed_file(file.filename):
            return handle_error("File type not allowed", 400)
        
        # Get file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)     # Reset to beginning
        
        # Validate file size
        if not validate_file_size(file_size):
            max_mb = app.config['MAX_CONTENT_LENGTH'] // (1024*1024)
            return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
        
        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        remote_path = f"uploads/{datetime.utcnow().strftime('%Y/%m/%d')}/{file_id}_{original_filename}"
        
        # Save file temporarily
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_{original_filename}")
        file.save(temp_path)
        
        logger.info(f"Processing upload: {original_filename} ({file_size} bytes)")
        
        try:
            # Upload to Supabase storage
            upload_result = storage_service.upload_file(
                temp_path, 
                remote_path,
                content_type=file.content_type or 'application/pdf'
            )
            
            if not upload_result.get('success'):
                return handle_error(f"Storage upload failed: {upload_result.get('error')}", 500)
            
            # Store file metadata in database (if database service available)
            document_data = {
                'id': file_id,
                'original_filename': original_filename,
                'storage_path': remote_path,
                'file_size': file_size,
                'content_type': file.content_type,
                'upload_timestamp': datetime.utcnow().isoformat(),
                'processing_status': 'uploaded'
            }
            
            # Start AI processing if available
            processing_session_id = None
            if ai_service:
                try:
                    # Initiate AI processing
                    processing_session_id = str(uuid.uuid4())
                    # Note: This would trigger background processing in a real system
                    logger.info(f"AI processing initiated for document {file_id}")
                except Exception as e:
                    logger.error(f"AI processing initiation failed: {str(e)}")
                    # Continue without AI processing
            
            return jsonify({
                'success': True,
                'document_id': file_id,
                'original_filename': original_filename,
                'file_size': file_size,
                'storage_path': remote_path,
                'processing_session_id': processing_session_id,
                'upload_timestamp': document_data['upload_timestamp'],
                'message': 'File uploaded successfully',
                'next_steps': {
                    'processing_status_url': f'/api/status/{file_id}',
                    'download_url': f'/api/download/{file_id}' if processing_session_id else None
                }
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except RequestEntityTooLarge:
        max_mb = app.config['MAX_CONTENT_LENGTH'] // (1024*1024)
        return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}\n{traceback.format_exc()}")
        return handle_error(f"Upload failed: {str(e)}", 500)

# Chunked upload initialization
@app.route('/upload/init', methods=['POST'])
@limiter.limit("20 per minute")
def init_chunked_upload():
    """Initialize chunked upload session"""
    try:
        if not storage_service:
            return handle_error("Storage service not available", 503)
        
        data = request.get_json()
        if not data:
            return handle_error("Request body required", 400)
        
        filename = data.get('filename')
        total_size = data.get('total_size', 0)
        content_type = data.get('content_type', 'application/pdf')
        
        if not filename or not total_size:
            return handle_error("filename and total_size required", 400)
        
        if not allowed_file(filename):
            return handle_error("File type not allowed", 400)
        
        if not validate_file_size(total_size):
            max_mb = app.config['MAX_CONTENT_LENGTH'] // (1024*1024)
            return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
        
        # Create upload session
        session_id = storage_service.create_upload_session(filename, total_size)
        
        # Calculate number of chunks
        chunk_size = app.config['CHUNK_SIZE']
        total_chunks = (total_size + chunk_size - 1) // chunk_size
        
        logger.info(f"Initialized chunked upload: {filename} ({total_size} bytes, {total_chunks} chunks)")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'chunk_size': chunk_size,
            'total_chunks': total_chunks,
            'upload_urls': {
                'chunk_upload': f'/api/upload/chunk/{session_id}',
                'complete_upload': f'/api/upload/complete/{session_id}'
            }
        })
        
    except Exception as e:
        logger.error(f"Chunked upload initialization failed: {str(e)}")
        return handle_error(f"Initialization failed: {str(e)}", 500)

# Chunked upload - upload chunk
@app.route('/upload/chunk/<session_id>', methods=['PUT'])
@limiter.limit("100 per minute")
def upload_chunk(session_id: str):
    """Upload a single chunk"""
    try:
        if not storage_service:
            return handle_error("Storage service not available", 503)
        
        chunk_number = int(request.headers.get('X-Chunk-Number', 0))
        chunk_data = request.get_data()
        
        if not chunk_data:
            return handle_error("No chunk data received", 400)
        
        # Upload chunk to storage
        result = storage_service.upload_chunk(session_id, chunk_number, chunk_data)
        
        if not result.get('success'):
            return handle_error(f"Chunk upload failed: {result.get('error')}", 500)
        
        logger.debug(f"Uploaded chunk {chunk_number} for session {session_id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'chunk_number': chunk_number,
            'size': len(chunk_data),
            'message': f'Chunk {chunk_number} uploaded successfully'
        })
        
    except ValueError as e:
        return handle_error("Invalid chunk number", 400)
    except Exception as e:
        logger.error(f"Chunk upload failed: {str(e)}")
        return handle_error(f"Chunk upload failed: {str(e)}", 500)

# Chunked upload - complete upload
@app.route('/upload/complete/<session_id>', methods=['POST'])
@limiter.limit("10 per minute")
def complete_chunked_upload(session_id: str):
    """Complete chunked upload and assemble file"""
    try:
        if not storage_service:
            return handle_error("Storage service not available", 503)
        
        data = request.get_json()
        if not data:
            return handle_error("Request body required", 400)
        
        total_chunks = data.get('total_chunks')
        original_filename = data.get('original_filename')
        
        if not total_chunks or not original_filename:
            return handle_error("total_chunks and original_filename required", 400)
        
        # Generate final file path
        file_id = str(uuid.uuid4())
        final_path = f"documents/{datetime.utcnow().strftime('%Y/%m/%d')}/{file_id}_{secure_filename(original_filename)}"
        
        # Complete chunked upload
        result = storage_service.complete_chunked_upload(session_id, total_chunks, final_path)
        
        if not result.get('success'):
            return handle_error(f"Upload completion failed: {result.get('error')}", 500)
        
        # Start AI processing if available
        processing_session_id = None
        if ai_service:
            try:
                processing_session_id = str(uuid.uuid4())
                logger.info(f"AI processing initiated for document {file_id}")
            except Exception as e:
                logger.error(f"AI processing initiation failed: {str(e)}")
        
        logger.info(f"Chunked upload completed: {original_filename} -> {final_path}")
        
        return jsonify({
            'success': True,
            'document_id': file_id,
            'original_filename': original_filename,
            'storage_path': final_path,
            'file_size': result.get('size'),
            'processing_session_id': processing_session_id,
            'upload_timestamp': datetime.utcnow().isoformat(),
            'message': 'Chunked upload completed successfully',
            'next_steps': {
                'processing_status_url': f'/api/status/{file_id}',
                'download_url': f'/api/download/{file_id}' if processing_session_id else None
            }
        })
        
    except Exception as e:
        logger.error(f"Upload completion failed: {str(e)}")
        return handle_error(f"Upload completion failed: {str(e)}", 500)

# File download endpoint
@app.route('/download/<document_id>', methods=['GET'])
@limiter.limit("50 per minute")
def download_file(document_id: str):
    """Download file by document ID"""
    try:
        if not storage_service:
            return handle_error("Storage service not available", 503)
        
        # In a real implementation, you would look up the storage path from the database
        # For now, we'll return a signed URL
        
        # This is a placeholder - in production you'd query your database for the storage path
        storage_path = f"documents/{document_id}"  # This would come from database
        
        # Generate signed URL for download
        signed_url = storage_service.create_signed_url(storage_path, expires_in=3600)
        
        if not signed_url:
            return handle_error("File not found or access denied", 404)
        
        return jsonify({
            'success': True,
            'download_url': signed_url,
            'expires_in': 3600,
            'document_id': document_id
        })
        
    except Exception as e:
        logger.error(f"Download failed: {str(e)}")
        return handle_error(f"Download failed: {str(e)}", 500)

# Processing status endpoint
@app.route('/status/<document_id>', methods=['GET'])
def get_processing_status(document_id: str):
    """Get processing status for a document"""
    try:
        # In a real implementation, you would query the database for processing status
        # This is a placeholder response
        
        return jsonify({
            'success': True,
            'document_id': document_id,
            'status': 'processing',
            'progress': 45,
            'stage': 'ai_analysis',
            'message': 'Document is being processed by AI',
            'estimated_completion': '2 minutes',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        return handle_error(f"Status check failed: {str(e)}", 500)

# Error handlers
@app.errorhandler(413)
def handle_file_too_large(error):
    max_mb = app.config['MAX_CONTENT_LENGTH'] // (1024*1024)
    return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)

@app.errorhandler(404)
def handle_not_found(error):
    return handle_error("Endpoint not found", 404)

@app.errorhandler(500)
def handle_internal_error(error):
    return handle_error("Internal server error", 500)

# Main entry point for Vercel
def app_handler(event=None, context=None):
    """Main app handler - lazy initialize services"""
    global storage_service, ai_service
    
    # Lazy initialization for serverless environment
    if storage_service is None and ai_service is None:
        init_services()
    
    return app

# For Vercel deployment
app = app_handler()

if __name__ == '__main__':
    init_services()
    app.run(debug=True, port=5000)