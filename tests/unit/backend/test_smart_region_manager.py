#!/usr/bin/env python3
"""
Test script for Smart Region Manager with Computer Vision capabilities.
Pytest-compatible tests for the Smart Region Manager.
"""

import sys
import os
import pytest
import numpy as np
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from app.services.smart_region_manager import SmartRegionManager
from config import Config
import structlog

# Configure logging
logging = structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="ISO"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

@pytest.fixture
def manager():
    """Create SmartRegionManager fixture"""
    config = {
        'confidence_threshold': 0.6,
        'debug_mode': True
    }
    return SmartRegionManager(config)

@pytest.fixture(params=['rent_roll', 'offering_memo', 'lease_agreement', 'comparable_sales'])
def document_type(request):
    """Document type fixture"""
    return request.param

def create_test_image(document_type: str):
    """Create a simple test image for a specific document type"""
    # Create a simple white background image
    height, width = 800, 1000
    image = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Add some simple patterns without requiring OpenCV
    if document_type == 'rent_roll':
        # Create simple rectangles for table structure
        image[50:80, 10:990] = [200, 200, 200]  # Header row
        for i in range(4):  # Data rows
            y = 110 + i * 30
            image[y-5:y+20, 10:990] = [250, 250, 250]  # Row background
    
    elif document_type == 'offering_memo':
        # Create form-like structure with horizontal lines
        for y in [100, 150, 200, 250, 300]:
            image[y:y+2, 50:950] = [0, 0, 0]  # Horizontal lines
    
    elif document_type == 'lease_agreement':
        # Create contract-like structure
        image[50:80, 100:900] = [220, 220, 220]  # Title area
        for y in [120, 170, 220, 270, 320]:
            image[y:y+2, 100:950] = [100, 100, 100]  # Form lines
    
    elif document_type == 'comparable_sales':
        # Create comparison table structure
        image[50:80, 10:990] = [200, 200, 200]  # Header
        for i in range(3):  # Sales data rows
            y = 110 + i * 30
            image[y-5:y+20, 10:990] = [245, 245, 245]
    
    return image

def test_region_detection(document_type, manager):
    """Test region detection for a specific document type"""
    # Create test image
    image = create_test_image(document_type)
    
    # Get region suggestions
    try:
        regions = manager.suggest_regions(document_type, image)
        assert isinstance(regions, list), "Regions should be a list"
        # Basic assertion - we should get some regions
        print(f"Detected {len(regions)} regions for {document_type}")
        
        # Check region structure if any regions are found
        if regions:
            for region in regions:
                assert isinstance(region, dict), "Each region should be a dictionary"
                assert 'x' in region, "Region should have x coordinate"
                assert 'y' in region, "Region should have y coordinate"
                assert 'width' in region, "Region should have width"
                assert 'height' in region, "Region should have height"
                
                # Validate coordinates are reasonable
                assert 0 <= region['x'] < image.shape[1], "X coordinate should be within image bounds"
                assert 0 <= region['y'] < image.shape[0], "Y coordinate should be within image bounds"
                assert region['width'] > 0, "Width should be positive"
                assert region['height'] > 0, "Height should be positive"
        
        # Test passes if we reach here without exceptions
        
    except Exception as e:
        pytest.fail(f"Error in region detection for {document_type}: {e}")

def test_specific_features(manager):
    """Test specific features of the Smart Region Manager"""
    # Create a simple test image
    image = create_test_image('rent_roll')
    
    try:
        # Test layout analysis
        layout_info = manager.analyze_document_layout(image)
        assert isinstance(layout_info, dict), "Layout info should be a dictionary"
        
        # Test text region detection
        text_regions = manager.detect_text_regions(image)
        assert isinstance(text_regions, list), "Text regions should be a list"
        
        # Test field-specific regions
        field_regions = manager.get_field_specific_regions('rent_roll', image)
        assert isinstance(field_regions, list), "Field regions should be a list"
        
        # Test region filtering if we have regions
        if text_regions:
            high_conf_regions = manager.filter_regions_by_confidence(text_regions, 0.7)
            assert isinstance(high_conf_regions, list), "Filtered regions should be a list"
            assert len(high_conf_regions) <= len(text_regions), "Filtered regions should be subset"
        
        # Test region merging
        all_regions = text_regions + field_regions
        if all_regions:
            merged_regions = manager.merge_overlapping_regions(all_regions)
            assert isinstance(merged_regions, list), "Merged regions should be a list"
            assert len(merged_regions) <= len(all_regions), "Merged regions should be equal or fewer"
        
    except Exception as e:
        pytest.fail(f"Error in feature testing: {e}")

def test_field_specific_suggestions(manager):
    """Test field-specific region suggestions"""
    image = create_test_image('rent_roll')
    
    field_types = ['unit_number', 'tenant_name', 'rent_amount']
    
    for field_type in field_types:
        try:
            field_regions = manager.get_region_suggestions_for_field(
                field_type, 'rent_roll', image
            )
            assert isinstance(field_regions, list), f"Field regions for {field_type} should be a list"
            
            # If we have regions, check their structure
            for region in field_regions[:3]:  # Check top 3
                assert isinstance(region, dict), "Each region should be a dictionary"
                if 'confidence' in region:
                    assert 0 <= region['confidence'] <= 1, "Confidence should be between 0 and 1"
                
        except Exception as e:
            pytest.fail(f"Error getting suggestions for {field_type}: {e}")

def test_manager_initialization():
    """Test SmartRegionManager initialization"""
    # Test with default config
    try:
        manager1 = SmartRegionManager()
        assert manager1 is not None, "Manager should be created with default config"
    except Exception as e:
        pytest.fail(f"Failed to initialize SmartRegionManager with default config: {e}")
    
    # Test with custom config
    try:
        config = {'confidence_threshold': 0.8, 'debug_mode': False}
        manager2 = SmartRegionManager(config)
        assert manager2 is not None, "Manager should be created with custom config"
    except Exception as e:
        pytest.fail(f"Failed to initialize SmartRegionManager with custom config: {e}")

if __name__ == "__main__":
    pytest.main([__file__])