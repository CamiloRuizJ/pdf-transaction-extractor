"""
RExeli API - 25MB File Upload Support
Vercel-compatible serverless function
"""

import os
import json
import tempfile
import logging
from datetime import datetime
from typing import Dict, Any, Tuple

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

# Configuration
MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 26214400))  # 25MB
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'}
UPLOAD_FOLDER = '/tmp/uploads'

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

# Health check endpoint
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0',
        'max_file_size_mb': MAX_CONTENT_LENGTH // (1024*1024),
        'allowed_extensions': list(ALLOWED_EXTENSIONS)
    })

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

# Status check endpoint
@app.route('/status/<document_id>', methods=['GET'])
@app.route('/api/status/<document_id>', methods=['GET'])
def get_status(document_id: str):
    """Get processing status"""
    return jsonify({
        'success': True,
        'document_id': document_id,
        'status': 'uploaded',
        'message': '25MB file upload successful - AI processing would start here',
        'timestamp': datetime.utcnow().isoformat(),
        'progress': 100,
        'stage': 'upload_complete'
    })

# Root endpoint
@app.route('/', methods=['GET'])
@app.route('/api/', methods=['GET'])
@app.route('/api', methods=['GET'])
def root():
    """API root endpoint"""
    return jsonify({
        'message': 'RExeli API - 25MB Upload Support Active! 🚀',
        'version': '2.0.0',
        'status': 'operational',
        'capabilities': {
            'max_file_size': f"{MAX_CONTENT_LENGTH // (1024*1024)}MB",
            'supported_formats': list(ALLOWED_EXTENSIONS),
            'features': ['25MB uploads', 'File validation', 'Temporary storage']
        },
        'endpoints': {
            'health': '/api/health',
            'upload': '/api/upload (POST)',
            'status': '/api/status/{document_id}'
        }
    })

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