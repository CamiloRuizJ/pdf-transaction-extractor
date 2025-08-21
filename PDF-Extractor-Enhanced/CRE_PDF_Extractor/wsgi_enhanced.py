"""
WSGI Application for CRE PDF Extractor
Production-ready WSGI application for deployment.
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask app
from app_enhanced import app

# Configure logging for production
if not app.debug:
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Configure file logging
    file_handler = RotatingFileHandler('logs/cre_app.log', maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    
    # Configure console logging
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    app.logger.addHandler(console_handler)
    
    app.logger.setLevel(logging.INFO)
    app.logger.info('CRE PDF Extractor startup')

# Production WSGI application
application = app

if __name__ == '__main__':
    # For PaaS deployment - use environment variables for port
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
