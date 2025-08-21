"""
Simplified Configuration for PDF Transaction Extractor
Easy-to-understand configuration with sensible defaults.
"""

import os
from typing import Dict, Any

class SimpleConfig:
    """Simplified configuration with all essential settings."""
    
    def __init__(self):
        # Flask settings
        self.DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
        self.HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
        self.PORT = int(os.environ.get('FLASK_PORT', 5000))
        
        # File paths
        self.UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
        self.TEMP_FOLDER = os.environ.get('TEMP_FOLDER', 'temp')
        
        # OCR settings
        self.OCR_DPI = 400
        self.OCR_CONFIDENCE_THRESHOLD = 0.6
        self.TESSERACT_CONFIG = '--oem 3 --psm 6'
        
        # Image processing
        self.IMAGE_QUALITY = 95
        self.MAX_IMAGE_SIZE = (800, 600)
        
        # PDF settings
        self.MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
        self.ALLOWED_EXTENSIONS = {'pdf'}
        
        # Excel settings
        self.EXCEL_SHEET_NAME = 'Extracted Data'
        
        # AI/Pattern matching
        self.PATTERN_MATCHING_ENABLED = True
        self.AUTO_CORRECTION_ENABLED = True
        
        # Common patterns for text extraction
        self.PATTERNS = {
            'amount': r'\$[\d,]+\.?\d*',
            'date': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            'phone': r'\(\d{3}\) \d{3}-\d{4}',
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        }
        
        # Text corrections for common OCR mistakes
        self.OCR_CORRECTIONS = {
            '0': 'O', 'O': '0',  # Common OCR confusion
            '1': 'l', 'l': '1',
            '5': 'S', 'S': '5',
            '8': 'B', 'B': '8',
        }
        
        # Cloud OCR fallback (if needed)
        self.CLOUD_OCR_ENABLED = False
        self.GOOGLE_VISION_API_KEY = os.environ.get('GOOGLE_VISION_API_KEY', '')
        
        # UI settings
        self.CANVAS_WIDTH = 800
        self.CANVAS_HEIGHT = 600
        
        # Ensure directories exist
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(self.TEMP_FOLDER, exist_ok=True)
