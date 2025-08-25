#!/usr/bin/env python3
"""
Minimal OpenAI test for Vercel deployment
This will be deployed as a separate API endpoint to test OpenAI isolation
"""

import os
import sys
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/test-minimal-openai', methods=['GET', 'POST'])
def test_minimal_openai():
    """Minimal test of OpenAI client initialization"""
    try:
        # Test 1: Check if OpenAI is importable
        try:
            import openai
            openai_available = True
            openai_version = getattr(openai, '__version__', 'unknown')
        except ImportError as e:
            return jsonify({
                'success': False,
                'error': 'OpenAI package not available',
                'details': str(e)
            })
        
        # Test 2: Check environment variable
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'OPENAI_API_KEY not set',
                'openai_version': openai_version
            })
        
        # Test 3: Try to initialize client (minimal approach)
        try:
            if hasattr(openai, 'OpenAI'):
                # New API (v1.0+)
                client = openai.OpenAI(api_key=api_key)
                return jsonify({
                    'success': True,
                    'message': 'OpenAI client initialized successfully',
                    'openai_version': openai_version,
                    'api_type': 'new',
                    'client_type': str(type(client))
                })
            else:
                # Old API (v0.28.1)
                openai.api_key = api_key
                return jsonify({
                    'success': True,
                    'message': 'OpenAI old API initialized successfully',
                    'openai_version': openai_version,
                    'api_type': 'old'
                })
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'OpenAI client initialization failed: {str(e)}',
                'openai_version': openai_version,
                'error_type': str(type(e))
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'General error: {str(e)}',
            'error_type': str(type(e))
        })

# For Vercel
def handler(request):
    with app.test_request_context(request.url, method=request.method, data=request.get_data()):
        return app.dispatch_request()

if __name__ == '__main__':
    app.run(debug=True)