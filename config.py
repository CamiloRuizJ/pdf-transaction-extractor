"""
Enhanced Configuration for RExeli.
Consolidated configuration for AI-powered commercial real estate document processing.
"""

import os
from pathlib import Path

class Config:
    """Enhanced application configuration with enterprise features."""
    
    # Flask settings - Secure secret key handling
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        if os.environ.get('FLASK_ENV') == 'production':
            raise ValueError("SECRET_KEY environment variable must be set in production")
        else:
            SECRET_KEY = 'development-key-only-not-for-production'
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB max file size for large PDFs
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', os.environ.get('FLASK_PORT', 5000)))  # Support both PORT and FLASK_PORT
    
    # Database settings (from V2)
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///pdf_converter_enhanced.db')
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Redis and Celery settings (from V2)
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
    CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
    CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes
    
    # Production settings
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    TESTING = os.environ.get('TESTING', 'False').lower() == 'true'
    
    # File paths
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    TEMP_FOLDER = os.path.join(os.getcwd(), 'temp')
    
    # OCR settings
    OCR_DPI = 400
    OCR_CONFIDENCE_THRESHOLD = 0.6
    TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe' if os.name == 'nt' else 'tesseract'
    TESSERACT_CONFIG = '--oem 3 --psm 6'
    
    # Image settings
    IMAGE_QUALITY = 95
    MAX_IMAGE_SIZE = (800, 600)
    
    # Poppler settings (for PDF to image conversion)
    POPPLER_PATH = os.path.join(os.getcwd(), 'poppler', 'bin') if os.name == 'nt' else None
    
    # AI settings
    AI_TEXT_CORRECTION = True
    AI_REGION_SUGGESTION = True
    AI_DATA_VALIDATION = True
    AI_FIELD_DETECTION = True
    
    # Excel settings
    EXCEL_SHEET_NAME = 'Extracted Data'
    
    # OpenAI settings
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    OPENAI_MODEL = 'gpt-3.5-turbo'
    OPENAI_TEMPERATURE = 0.1
    OPENAI_MAX_TOKENS = 1000
    
    # ML settings
    ML_MODEL_PATH = 'ml_model.joblib'
    PATTERN_MATCHING_ENABLED = True
    AUTO_CORRECTION_ENABLED = True
    
    # CRE-specific patterns for real estate documents
    CRE_PATTERNS = {
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
    OCR_CORRECTIONS = {
        '0': 'O', 'O': '0',
        '1': 'l', 'l': '1',
        '5': 'S', 'S': '5',
        '8': 'B', 'B': '8',
    }
    
    # UI settings (Enhanced from both versions)
    CANVAS_WIDTH = 1000
    CANVAS_HEIGHT = 800
    
    # Security settings (from Enhanced)
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    
    # Feature flags (from V2)
    V2_ENABLED = os.environ.get('V2_ENABLED', 'true').lower() == 'true'
    DOCUMENT_CLASSIFICATION_ENABLED = os.environ.get('DOCUMENT_CLASSIFICATION_ENABLED', 'true').lower() == 'true'
    QUALITY_SCORING_ENABLED = os.environ.get('QUALITY_SCORING_ENABLED', 'true').lower() == 'true'
    SMART_REGION_SUGGESTION = os.environ.get('SMART_REGION_SUGGESTION', 'true').lower() == 'true'
    
    # Performance settings
    MAX_WORKERS = int(os.environ.get('MAX_WORKERS', 4))
    WORKER_TIMEOUT = int(os.environ.get('WORKER_TIMEOUT', 120))
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_TO_FILE = os.environ.get('LOG_TO_FILE', 'true').lower() == 'true'
    LOG_MAX_BYTES = int(os.environ.get('LOG_MAX_BYTES', 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', 5))
    
    # Security headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
    
    def __init__(self):
        # Ensure directories exist
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(self.TEMP_FOLDER, exist_ok=True)
        os.makedirs('logs', exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration for Vercel deployment."""
    DEBUG = False
    TESTING = False
    
    # Supabase PostgreSQL configuration
    DATABASE_URL = os.environ.get('DATABASE_URL', os.environ.get('SUPABASE_DATABASE_URL', ''))
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'sslmode': 'require'
        }
    }
    
    # Disable Celery and Redis for serverless
    CELERY_BROKER_URL = None
    REDIS_URL = None
    
    # Serverless-optimized settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB for Vercel
    WTF_CSRF_ENABLED = False  # Disable CSRF for API-only deployment
    
    # Production-specific settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # File storage (use temporary directory for serverless)
    UPLOAD_FOLDER = '/tmp/uploads'
    TEMP_FOLDER = '/tmp/temp'
    
    # OCR settings for serverless (no local executables)
    TESSERACT_PATH = None  # Will use system tesseract or cloud OCR
    POPPLER_PATH = None
    
    # Supabase specific settings
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
    
    def __init__(self):
        # Override parent __init__ for serverless environment
        import tempfile
        import os
        
        # Use system temp directory in serverless
        self.UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'uploads')
        self.TEMP_FOLDER = os.path.join(tempfile.gettempdir(), 'temp')
        
        # Ensure directories exist
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(self.TEMP_FOLDER, exist_ok=True)


class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    WTF_CSRF_ENABLED = False
    DATABASE_URL = 'sqlite:///:memory:'


# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
