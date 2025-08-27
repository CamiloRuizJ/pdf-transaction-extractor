"""
Simple Enhanced RExeli API - 25MB File Upload Support
Focused on core upload functionality without complex dependencies
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

# Simple Configuration
class SimpleConfig:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-for-testing')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    
    # Enhanced file upload limits
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 26214400))  # 25MB
    
    # File handling
    UPLOAD_FOLDER = '/tmp/uploads'
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'}
    
    def __init__(self):
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)

# Create Flask app
app = Flask(__name__)
app.config.from_object(SimpleConfig)

# Setup CORS
CORS(app, resources={
    r"/*": {
        "origins": ["*"],  # Allow all origins for testing
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }
})

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0-simple',
        'max_file_size_mb': app.config['MAX_CONTENT_LENGTH'] // (1024*1024),
        'allowed_extensions': list(app.config['ALLOWED_EXTENSIONS'])
    })

# Simple file upload
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    """Handle single file upload - simple version"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        logger.info(f"Upload request received - Content-Length: {request.headers.get('Content-Length', 'unknown')}")
        
        # Check for file in request
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
        
        logger.info(f"File size: {file_size} bytes ({file_size / (1024*1024):.2f} MB)")
        
        # Validate file size
        max_size = app.config['MAX_CONTENT_LENGTH']
        if file_size > max_size:
            max_mb = max_size // (1024*1024)
            return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
        
        # Save file temporarily (in production this would go to Supabase)
        original_filename = secure_filename(file.filename)
        import uuid
        file_id = str(uuid.uuid4())
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_{original_filename}")
        
        logger.info(f"Saving file to: {temp_path}")
        file.save(temp_path)
        
        # Verify file was saved
        if os.path.exists(temp_path):
            actual_size = os.path.getsize(temp_path)
            logger.info(f"File saved successfully - Size: {actual_size} bytes")
        else:
            return handle_error("Failed to save file", 500)
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'document_id': file_id,
            'original_filename': original_filename,
            'file_size': file_size,
            'upload_timestamp': datetime.utcnow().isoformat(),
            'status': 'File uploaded and ready for processing',
            'next_steps': {
                'description': 'In production, this would trigger AI processing',
                'processing_url': f'/api/process/{file_id}'
            }
        })
        
    except RequestEntityTooLarge:
        max_mb = app.config['MAX_CONTENT_LENGTH'] // (1024*1024)
        return handle_error(f"File too large. Maximum size: {max_mb}MB", 413)
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return handle_error(f"Upload failed: {str(e)}", 500)

# Upload status endpoint
@app.route('/status/<document_id>', methods=['GET'])
def get_status(document_id: str):
    """Get upload/processing status"""
    return jsonify({
        'success': True,
        'document_id': document_id,
        'status': 'uploaded',
        'message': 'File uploaded successfully - AI processing would start here',
        'timestamp': datetime.utcnow().isoformat()
    })

# Test endpoint for upload limits
@app.route('/upload-test', methods=['POST'])
def test_upload():
    """Test endpoint to validate upload functionality"""
    try:
        content_length = request.headers.get('Content-Length', 'unknown')
        max_size_mb = app.config['MAX_CONTENT_LENGTH'] // (1024*1024)
        
        logger.info(f"Upload test - Content-Length: {content_length}, Max: {max_size_mb}MB")
        
        return jsonify({
            'success': True,
            'message': 'Upload test endpoint working',
            'content_length': content_length,
            'max_size_mb': max_size_mb,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return handle_error(f"Test failed: {str(e)}", 500)

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
    logger.error(f"Internal server error: {str(error)}")
    return handle_error("Internal server error", 500)

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'message': 'RExeli API - Enhanced 25MB Upload Support',
        'version': '2.0.0-simple',
        'endpoints': {
            'health': '/health',
            'upload': '/upload',
            'status': '/status/<document_id>',
            'test': '/upload-test'
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)