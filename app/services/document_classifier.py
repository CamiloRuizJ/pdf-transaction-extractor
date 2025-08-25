"""
Document Classifier Service
AI-powered classification for Real Estate documents.
"""

import re
import numpy as np
from typing import Dict, List, Any, Tuple
import structlog
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import os

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import Config

logger = structlog.get_logger()

class DocumentClassifier:
    """AI/ML-powered document classification for Real Estate documents"""
    
    def __init__(self):
        self.document_types = {
            'rent_roll': {
                'patterns': ['rent', 'tenant', 'unit', 'lease'],
                'keywords': ['rent roll', 'tenant list', 'occupancy'],
                'confidence': 0.8,
                'color': '#28a745'
            },
            'offering_memo': {
                'patterns': ['offering', 'memo', 'property', 'investment'],
                'keywords': ['offering memorandum', 'investment opportunity'],
                'confidence': 0.85,
                'color': '#007bff'
            },
            'comparable_sales': {
                'patterns': ['comparable', 'sales', 'market', 'price'],
                'keywords': ['comparable sales', 'market analysis'],
                'confidence': 0.75,
                'color': '#ffc107'
            },
            'lease_agreement': {
                'patterns': ['lease', 'agreement', 'tenant', 'landlord'],
                'keywords': ['lease agreement', 'rental contract'],
                'confidence': 0.9,
                'color': '#dc3545'
            }
        }
    
    def classify_document(self, extracted_text: str, image_features: Dict[str, Any] = None) -> Dict[str, Any]:
        """Classify document type based on extracted text"""
        try:
            # Simple keyword-based classification for now
            text_lower = extracted_text.lower()
            
            best_match = None
            best_score = 0
            
            for doc_type, config in self.document_types.items():
                score = 0
                for keyword in config['keywords']:
                    if keyword in text_lower:
                        score += 1
                
                if score > best_score:
                    best_score = score
                    best_match = doc_type
            
            if best_match:
                return {
                    'document_type': best_match,
                    'confidence': self.document_types[best_match]['confidence'],
                    'suggested_fields': self._get_suggested_fields(best_match),
                    'extraction_strategy': 'pattern_based',
                    'color': self.document_types[best_match]['color']
                }
            else:
                return {
                    'document_type': 'unknown',
                    'confidence': 0.5,
                    'suggested_fields': [],
                    'extraction_strategy': 'general',
                    'color': '#6c757d'
                }
                
        except Exception as e:
            logger.error("Error classifying document", error=str(e))
            return {
                'document_type': 'unknown',
                'confidence': 0.0,
                'suggested_fields': [],
                'extraction_strategy': 'general',
                'color': '#6c757d'
            }
    
    def _get_suggested_fields(self, document_type: str) -> list:
        """Get suggested fields for document type"""
        field_mappings = {
            'rent_roll': ['unit_number', 'tenant_name', 'rent_amount', 'sqft'],
            'offering_memo': ['property_name', 'address', 'price', 'cap_rate'],
            'comparable_sales': ['property_address', 'sale_price', 'sale_date'],
            'lease_agreement': ['tenant_name', 'property_address', 'monthly_rent']
        }
        return field_mappings.get(document_type, [])
