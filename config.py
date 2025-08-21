"""
Unified Configuration for PDF Transaction Extractor
Consolidates all configuration settings from multiple files into a single, clean interface.
"""

import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

@dataclass
class OCRConfig:
    """OCR engine configuration."""
    engines: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        'tesseract': {
            'enabled': True,
            'configs': [
                '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$%()/- ',
                '--oem 3 --psm 8 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$%()/- ',
                '--oem 1 --psm 6',  # Legacy engine
            ]
        },
        'easyocr': {
            'enabled': False,
            'languages': ['en'],
            'gpu': False
        }
    })
    
    preprocessing: Dict[str, Any] = field(default_factory=lambda: {
        'deskew': True,
        'denoise': True,
        'contrast_enhancement': True,
        'adaptive_threshold': True,
        'morphological_operations': True,
        'field_specific_preprocessing': True,
        'dpi': 400,
        'resize_factor': 2.0
    })
    
    confidence_threshold: float = 0.6
    fallback_strategies: List[str] = field(default_factory=lambda: ['google_vision', 'azure_vision', 'aws_textract'])

@dataclass
class AIConfig:
    """AI enhancement configuration."""
    enhancement: Dict[str, bool] = field(default_factory=lambda: {
        'ocr_confidence_threshold': 0.6,
        'pattern_matching_enabled': True,
        'context_analysis_enabled': True,
        'field_validation_enabled': True,
        'auto_correction_enabled': True,
        'confidence_boost_enabled': True,
        'ml_correction_enabled': True,
        'cloud_ocr_fallback_enabled': True
    })
    
    performance: Dict[str, Any] = field(default_factory=lambda: {
        'max_concurrent_ocr': 4,
        'batch_size': 10,
        'cache_results': True,
        'use_gpu': False,
        'memory_limit_gb': 4
    })

@dataclass
class PDFConfig:
    """PDF processing configuration."""
    max_page_size: tuple = (800, 600)
    dpi: int = 150
    min_region_size: tuple = (10, 10)
    max_content_length: int = 16 * 1024 * 1024  # 16MB

@dataclass
class ExcelConfig:
    """Excel output configuration."""
    sheet_name: str = 'Extracted Data'
    header_font: Dict[str, Any] = field(default_factory=lambda: {
        'bold': True,
        'size': 12,
    })
    header_fill: Dict[str, Any] = field(default_factory=lambda: {
        'start_color': 'CCCCCC',
        'end_color': 'CCCCCC',
        'fill_type': 'solid',
    })
    max_column_width: int = 50
    min_column_width: int = 10

@dataclass
class UIConfig:
    """User interface configuration."""
    canvas_size: tuple = (800, 600)
    region_colors: Dict[str, Dict[str, str]] = field(default_factory=lambda: {
        'normal': {
            'stroke': '#007bff',
            'fill': 'rgba(0, 123, 255, 0.1)',
        },
        'selected': {
            'stroke': '#28a745',
            'fill': 'rgba(40, 167, 69, 0.1)',
        },
    })
    auto_save_interval: int = 30000  # 30 seconds

@dataclass
class SecurityConfig:
    """Security configuration."""
    allowed_extensions: set = field(default_factory=lambda: {'pdf'})
    max_file_size: int = 16 * 1024 * 1024  # 16MB
    cleanup_temp_files: bool = True
    session_timeout: int = 3600  # 1 hour
    secret_key: str = 'your-super-secret-key-change-this-in-production'

@dataclass
class LoggingConfig:
    """Logging configuration."""
    level: str = 'INFO'
    format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    file: str = 'logs/app.log'

class Config:
    """Main configuration class that consolidates all settings."""
    
    def __init__(self):
        # Flask settings
        self.DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
        self.HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
        self.PORT = int(os.environ.get('FLASK_PORT', 5000))
        
        # File paths
        self.UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
        self.TEMP_FOLDER = os.environ.get('TEMP_FOLDER', 'temp')
        
        # Initialize sub-configurations
        self.ocr = OCRConfig()
        self.ai = AIConfig()
        self.pdf = PDFConfig()
        self.excel = ExcelConfig()
        self.ui = UIConfig()
        self.security = SecurityConfig()
        self.logging = LoggingConfig()
        
        # Pattern recognition settings
        self.patterns = {
            'us_states': [
                'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
            ],
            'sf_patterns': [
                r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:SF|sq\s*ft|square\s*feet?)',
                r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:SF|sq\s*ft)',
            ],
            'date_patterns': [
                r'(\d{1,2}/\d{1,2}/\d{2,4})',
                r'(\d{1,2}-\d{1,2}-\d{2,4})',
                r'(\w+\s+\d{1,2},?\s+\d{4})',
            ],
            'currency_patterns': [
                r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+month|monthly)',
            ],
        }
        
        # Commercial real estate field patterns
        self.commercial_re_fields = {
            'property_address': {
                'patterns': [
                    r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Way|Terrace|Ter|Circle|Cir|Highway|Hwy)',
                    r'\d{1,5}\s+[A-Za-z\s]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Way|Terrace|Ter|Circle|Cir|Highway|Hwy)',
                    r'\d+\s+[A-Za-z\s]+(?:North|South|East|West|N|S|E|W)\s+(?:Street|St|Avenue|Ave|Road|Rd)',
                ],
                'confidence_threshold': 0.7,
                'validation_rules': [
                    'must_contain_number',
                    'must_contain_street_type',
                    'must_not_exceed_100_chars'
                ]
            },
            'base_rent': {
                'patterns': [
                    r'\$[\d,]+(?:\.\d{2})?',
                    r'[\d,]+(?:\.\d{2})?\s*(?:USD|dollars?|per\s+(?:month|year|sf|sq\s*ft))',
                    r'Rent[:\s]*\$?[\d,]+(?:\.\d{2})?',
                    r'Monthly[:\s]*\$?[\d,]+(?:\.\d{2})?',
                ],
                'confidence_threshold': 0.8,
                'validation_rules': [
                    'must_contain_numbers',
                    'must_be_positive',
                    'reasonable_range_100_1000000'
                ]
            },
            'leased_square_feet': {
                'patterns': [
                    r'[\d,]+(?:\.\d+)?\s*(?:SF|sq\s*ft|square\s+feet|sq\.\s*ft\.|sqft)',
                    r'[\d,]+(?:\.\d+)?\s*(?:SF|sq\s*ft|square\s+feet)',
                    r'Size[:\s]*[\d,]+(?:\.\d+)?\s*(?:SF|sq\s*ft)',
                    r'Area[:\s]*[\d,]+(?:\.\d+)?\s*(?:SF|sq\s*ft)',
                ],
                'confidence_threshold': 0.8,
                'validation_rules': [
                    'must_contain_numbers',
                    'must_be_positive',
                    'reasonable_range_100_1000000'
                ]
            },
            'tenant_name': {
                'patterns': [
                    r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*',
                    r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:LLC|Inc|Corp|Company|Ltd)',
                ],
                'confidence_threshold': 0.7,
                'validation_rules': [
                    'must_start_with_capital',
                    'must_not_contain_numbers',
                    'must_not_exceed_50_chars'
                ]
            },
            'lease_term': {
                'patterns': [
                    r'(\d+)\s*(?:months?|years?|mos?|yrs?)',
                    r'(\d+)\s*(?:month|year)\s+lease',
                    r'Term[:\s]*(\d+)\s*(?:months?|years?)',
                ],
                'confidence_threshold': 0.8,
                'validation_rules': [
                    'must_contain_numbers',
                    'must_be_positive',
                    'reasonable_range_1_120'
                ]
            }
        }
        
        # Cloud OCR configuration
        self.cloud_ocr = {
            'google_vision': {
                'enabled': False,
                'api_key': os.environ.get('GOOGLE_VISION_API_KEY'),
                'timeout': 30,
                'max_retries': 3
            },
            'azure_vision': {
                'enabled': False,
                'endpoint': os.environ.get('AZURE_VISION_ENDPOINT'),
                'key': os.environ.get('AZURE_VISION_KEY'),
                'timeout': 30
            },
            'aws_textract': {
                'enabled': False,
                'region': 'us-east-1',
                'timeout': 30
            }
        }
        
        # Common OCR error corrections
        self.ocr_corrections = {
            '0': 'O', '1': 'l', '5': 'S', '8': 'B', '6': 'G', '9': 'g',
            'l': '1', 'O': '0', 'S': '5', 'B': '8', 'G': '6', 'g': '9',
            'I': '1', '|': '1', '!': '1',
            'rn': 'm', 'cl': 'd', 'vv': 'w', 'nn': 'm'
        }
    
    def get_field_patterns(self, field_type: str) -> Optional[Dict[str, Any]]:
        """Get patterns for a specific field type."""
        return self.commercial_re_fields.get(field_type)
    
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return not self.DEBUG
    
    def get_upload_path(self, filename: str) -> str:
        """Get full path for uploaded file."""
        return os.path.join(self.UPLOAD_FOLDER, filename)
    
    def get_temp_path(self, filename: str) -> str:
        """Get full path for temporary file."""
        return os.path.join(self.TEMP_FOLDER, filename) 