"""
Vercel-compatible Flask API for RExeli
Simplified version that works with Vercel serverless functions
"""

import os
import sys
import json
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Create Flask app
app = Flask(__name__)

# Configure CORS for production
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://rexeli.com",
            "https://www.rexeli.com",
            "https://*.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
    }
})

# Configure file upload limits for Vercel (4MB max due to serverless overhead)
app.config['MAX_CONTENT_LENGTH'] = 4 * 1024 * 1024  # 4MB

@app.route('/')
@app.route('/api')
def root():
    """Root endpoint"""
    return jsonify({
        "success": True,
        "message": "RExeli API is running",
        "version": "1.0.0",
        "endpoints": [
            "/api/health",
            "/api/upload"
        ]
    })

@app.route('/api/health')
@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "success": True,
        "status": "healthy",
        "message": "RExeli API is operational",
        "version": "1.0.0",
        "timestamp": "2025-08-26",
        "max_file_size_mb": 4
    })

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload():
    """File upload endpoint with 10MB limit"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Check if file is provided
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "No file provided",
                "max_size_mb": 4
            }), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected",
                "max_size_mb": 4
            }), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        max_size = 4 * 1024 * 1024  # 4MB
        if file_size > max_size:
            return jsonify({
                "success": False,
                "error": f"File size {file_size / (1024*1024):.1f}MB exceeds maximum of 4MB",
                "error_type": "file_too_large",
                "file_size_mb": round(file_size / (1024*1024), 1),
                "max_size_mb": 4,
                "suggestion": "Please compress your PDF file to under 4MB"
            }), 413
        
        # File is valid size
        return jsonify({
            "success": True,
            "message": "File upload successful (test mode)",
            "file_size_mb": round(file_size / (1024*1024), 1),
            "max_size_mb": 4,
            "filename": file.filename
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Upload error: {str(e)}",
            "max_size_mb": 10
        }), 500

@app.errorhandler(413)
def handle_file_too_large(e):
    """Handle file too large errors"""
    return jsonify({
        "success": False,
        "error": "File too large for Vercel serverless functions",
        "error_type": "payload_too_large",
        "max_size_mb": 4,
        "suggestion": "Please compress your PDF file to under 4MB"
    }), 413

@app.errorhandler(404)
def handle_not_found(e):
    """Handle 404 errors"""
    return jsonify({
        "success": False,
        "error": "API endpoint not found",
        "available_endpoints": [
            "/api/health",
            "/api/upload"
        ]
    }), 404

# Export app for Vercel
if __name__ == "__main__":
    app.run(debug=False)