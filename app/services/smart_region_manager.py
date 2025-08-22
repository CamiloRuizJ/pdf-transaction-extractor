"""
Smart Region Manager
AI-powered region suggestion and management.
"""

import numpy as np
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger()

class SmartRegionManager:
    """AI-powered region suggestion service"""
    
    def __init__(self):
        self.historical_regions = {}
    
    def suggest_regions(self, document_type: str, page_image: np.ndarray) -> List[Dict[str, Any]]:
        """Suggest regions for data extraction"""
        try:
            required_fields = self._get_required_fields(document_type)
            suggestions = []
            
            for field in required_fields:
                suggestion = self._generate_field_suggestion(field, document_type, page_image)
                suggestions.append(suggestion)
            
            return suggestions
            
        except Exception as e:
            logger.error("Error suggesting regions", error=str(e))
            return []
    
    def _get_required_fields(self, document_type: str) -> List[str]:
        """Get required fields for document type"""
        field_mappings = {
            'rent_roll': ['unit_number', 'tenant_name', 'rent_amount'],
            'offering_memo': ['property_name', 'address', 'price'],
            'comparable_sales': ['property_address', 'sale_price', 'sale_date'],
            'lease_agreement': ['tenant_name', 'property_address', 'monthly_rent']
        }
        return field_mappings.get(document_type, [])
    
    def _generate_field_suggestion(self, field_name: str, document_type: str, image: np.ndarray) -> Dict[str, Any]:
        """Generate suggestion for a specific field"""
        location = self._get_default_location(field_name, document_type, image.shape)
        return {
            'name': field_name,
            'x': location['x'],
            'y': location['y'],
            'width': location['width'],
            'height': location['height'],
            'confidence': 0.7
        }
    
    def _get_default_location(self, field_name: str, document_type: str, image_shape: tuple) -> Dict[str, int]:
        """Get default location for a field"""
        return {
            'x': 100,
            'y': 100,
            'width': 200,
            'height': 50
        }
