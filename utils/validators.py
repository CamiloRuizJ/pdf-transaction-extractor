"""
Validators for PDF Transaction Extractor.
Provides validation functionality for files, regions, and data.
"""

import os
from typing import Dict, Optional, Any
from models.region import Region

class FileValidator:
    """Validates file uploads and file types."""
    
    def __init__(self, config):
        self.config = config
    
    def is_valid_pdf(self, filename: str) -> bool:
        """Check if the file is a valid PDF."""
        if not filename or '.' not in filename:
            return False
        
        extension = filename.rsplit('.', 1)[1].lower()
        return extension in self.config.security.allowed_extensions
    
    def is_valid_file_size(self, file_size: int) -> bool:
        """Check if the file size is within limits."""
        return file_size <= self.config.security.max_file_size
    
    def validate_file_path(self, file_path: str) -> bool:
        """Validate that a file path is safe and exists."""
        if not file_path or not os.path.exists(file_path):
            return False
        
        # Check if path is within allowed directories
        allowed_dirs = [
            os.path.abspath(self.config.UPLOAD_FOLDER),
            os.path.abspath(self.config.TEMP_FOLDER)
        ]
        
        file_abspath = os.path.abspath(file_path)
        return any(file_abspath.startswith(allowed_dir) for allowed_dir in allowed_dirs)

class RegionValidator:
    """Validates region definitions and coordinates."""
    
    def is_valid(self, region: Region, image_dimensions: Optional[Dict[str, int]] = None) -> bool:
        """Validate a region definition."""
        try:
            # Check basic validity
            if not region.is_valid():
                return False
            
            # Check if region is within image bounds
            if image_dimensions:
                width = image_dimensions.get('width', 0)
                height = image_dimensions.get('height', 0)
                
                if (region.x < 0 or region.y < 0 or 
                    region.x + region.width > width or 
                    region.y + region.height > height):
                    return False
            
            # Check for reasonable aspect ratio
            aspect_ratio = region.width / max(region.height, 1)
            if aspect_ratio > 20 or aspect_ratio < 0.05:  # Too wide or too tall
                return False
            
            return True
            
        except Exception:
            return False
    
    def validate_regions_list(self, regions: list, image_dimensions: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """Validate a list of regions."""
        validation_result = {
            'valid': True,
            'issues': [],
            'valid_regions': [],
            'invalid_regions': []
        }
        
        if not regions:
            validation_result['valid'] = False
            validation_result['issues'].append("No regions provided")
            return validation_result
        
        for i, region_data in enumerate(regions):
            try:
                if isinstance(region_data, dict):
                    region = Region.from_dict(region_data)
                else:
                    region = region_data
                
                if self.is_valid(region, image_dimensions):
                    validation_result['valid_regions'].append(region)
                else:
                    validation_result['invalid_regions'].append(region)
                    validation_result['issues'].append(f"Region {i+1} ({region.name}) is invalid")
                    
            except Exception as e:
                validation_result['invalid_regions'].append(region_data)
                validation_result['issues'].append(f"Region {i+1} has invalid format: {str(e)}")
        
        # Check for overlapping regions
        overlaps = self._find_overlapping_regions(validation_result['valid_regions'])
        if overlaps:
            validation_result['issues'].extend(overlaps)
        
        # Mark as invalid if there are issues
        if validation_result['issues']:
            validation_result['valid'] = False
        
        return validation_result
    
    def _find_overlapping_regions(self, regions: list) -> list:
        """Find overlapping regions."""
        overlaps = []
        
        for i, region1 in enumerate(regions):
            for j, region2 in enumerate(regions[i+1:], i+1):
                if region1.overlaps_with(region2):
                    overlap_msg = f"Regions '{region1.name}' and '{region2.name}' overlap"
                    overlaps.append(overlap_msg)
        
        return overlaps
