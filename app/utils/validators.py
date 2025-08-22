"""
Validation utilities for files and regions.
"""

import os
from typing import Dict, Optional
from models.region import Region

class FileValidator:
    """Validator for file uploads."""
    
    def __init__(self, config):
        self.config = config
    
    def is_valid_pdf(self, filename: str) -> bool:
        """Check if file is a valid PDF."""
        if not filename:
            return False
        
        # Check file extension
        return filename.lower().endswith('.pdf')

class RegionValidator:
    """Validator for regions."""
    
    def is_valid(self, region: Region, image_dimensions: Optional[Dict[str, int]] = None) -> bool:
        """Validate a region."""
        if not region:
            return False
        
        # Check basic properties
        if region.w <= 0 or region.h <= 0:
            return False
        
        if region.x < 0 or region.y < 0:
            return False
        
        # Check if region fits within image bounds
        if image_dimensions:
            max_width = image_dimensions.get('width', 0)
            max_height = image_dimensions.get('height', 0)
            
            if region.x + region.w > max_width or region.y + region.h > max_height:
                return False
        
        return True
