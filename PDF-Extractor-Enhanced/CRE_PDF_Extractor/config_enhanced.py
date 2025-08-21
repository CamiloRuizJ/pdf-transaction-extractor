"""
Enhanced Configuration for CRE PDF Extractor
Enhanced with security features and ChatGPT integration.
"""

import os
from typing import Dict, Any
from security_config import secure_config

class EnhancedConfig:
    """Enhanced configuration with ChatGPT integration."""
    
    def __init__(self):
        # Flask settings
        self.DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
        self.HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
        self.PORT = int(os.environ.get('FLASK_PORT', 5001))  # Different port
        
        # Security settings
        self.SECRET_KEY = self._get_secret_key()
        self.SESSION_COOKIE_SECURE = not self.DEBUG
        self.SESSION_COOKIE_HTTPONLY = True
        self.SESSION_COOKIE_SAMESITE = 'Lax'
        self.PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
        
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
        self.EXCEL_SHEET_NAME = 'CRE Extracted Data'
        
        # AI/Pattern matching
        self.PATTERN_MATCHING_ENABLED = True
        self.AUTO_CORRECTION_ENABLED = True
        
        # ChatGPT Integration
        self.OPENAI_API_KEY = secure_config.get_api_key('openai')
        self.CHATGPT_MODEL = 'gpt-4'
        self.CHATGPT_TEMPERATURE = 0.1
        self.CHATGPT_MAX_TOKENS = 1000
        
        # AI Enhancement Settings
        self.AI_TEXT_CORRECTION = True
        self.AI_REGION_SUGGESTION = True
        self.AI_DATA_VALIDATION = True
        self.AI_FIELD_DETECTION = True
        
        # CRE-specific patterns
        self.CRE_PATTERNS = {
            'property_address': r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)',
            'rent_amount': r'\$[\d,]+(?:\.\d{2})?',
            'square_footage': r'(?:SF|sq\s*ft|square\s*feet?)\s*:?\s*[\d,]+',
            'lease_term': r'(?:lease|term)\s*(?:of\s*)?(\d+)\s*(?:years?|months?)',
            'tenant_name': r'(?:tenant|lessee)\s*:?\s*([A-Za-z\s]+)',
            'landlord_name': r'(?:landlord|lessor)\s*:?\s*([A-Za-z\s]+)',
            'property_type': r'(?:office|retail|industrial|warehouse|apartment|residential|commercial)',
            'date': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            'phone': r'\(\d{3}\)\s*\d{3}-\d{4}',
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        }
        
        # Text corrections for common OCR mistakes
        self.OCR_CORRECTIONS = {
            '0': 'O', 'O': '0',
            '1': 'l', 'l': '1',
            '5': 'S', 'S': '5',
            '8': 'B', 'B': '8',
        }
        
        # UI settings
        self.CANVAS_WIDTH = 800
        self.CANVAS_HEIGHT = 600
        
        # Ensure directories exist
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(self.TEMP_FOLDER, exist_ok=True)
    
    def _get_secret_key(self) -> str:
        """Get Flask secret key securely."""
        # Try to get from secure config first
        secret_key = secure_config.get_secret('flask_secret_key')
        if secret_key:
            return secret_key
        
        # Generate new secret key
        secret_key = os.urandom(32).hex()
        secure_config.set_secret('flask_secret_key', secret_key)
        return secret_key
    
    def set_api_key(self, service: str, api_key: str):
        """Set API key securely."""
        secure_config.set_api_key(service, api_key)
        # Update instance variables
        if service == 'openai':
            self.OPENAI_API_KEY = api_key
    
    def get_api_key(self, service: str) -> str:
        """Get API key securely."""
        return secure_config.get_api_key(service)
