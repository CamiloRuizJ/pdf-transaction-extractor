#!/usr/bin/env python3
"""
Example integration of Smart Region Manager with OCR Service.
Demonstrates how the CV-powered region detection works with text extraction.
"""

import sys
import os
import cv2
import numpy as np
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.smart_region_manager import SmartRegionManager
from app.services.ocr_service import OCRService
import structlog

logger = structlog.get_logger()

def create_sample_rent_roll_image():
    """Create a sample rent roll document for demonstration"""
    # Create a white background
    height, width = 600, 800
    image = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Header
    cv2.rectangle(image, (10, 30), (790, 60), (220, 220, 220), -1)
    cv2.putText(image, "RENT ROLL - SUNRISE APARTMENTS", (200, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Table headers
    headers = [
        ("Unit", 50, 90),
        ("Tenant Name", 180, 90),
        ("Monthly Rent", 400, 90),
        ("Lease Expiry", 580, 90)
    ]
    
    for header, x, y in headers:
        cv2.rectangle(image, (x-5, y-15), (x+120, y+5), (200, 200, 200), -1)
        cv2.putText(image, header, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    # Sample data rows
    data_rows = [
        ("101", "John Smith", "$2,500", "12/31/2024"),
        ("102", "Jane Doe", "$2,750", "06/30/2025"),
        ("103", "Bob Wilson", "$2,400", "09/15/2024"),
        ("201", "Alice Brown", "$2,650", "03/31/2025"),
        ("202", "Charlie Davis", "$2,800", "11/30/2024")
    ]
    
    for i, (unit, tenant, rent, expiry) in enumerate(data_rows):
        y = 120 + i * 25
        cv2.putText(image, unit, (50, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        cv2.putText(image, tenant, (180, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        cv2.putText(image, rent, (400, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        cv2.putText(image, expiry, (580, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    
    return image

def demonstrate_integration():
    """Demonstrate the integration between Smart Region Manager and OCR Service"""
    
    print("Smart Region Manager + OCR Service Integration Demo")
    print("=" * 60)
    
    # Initialize services
    try:
        print("1. Initializing services...")
        region_manager = SmartRegionManager()
        ocr_service = OCRService(confidence_threshold=60)
        print("   ✓ Smart Region Manager initialized")
        print("   ✓ OCR Service initialized")
    except Exception as e:
        print(f"   ✗ Error initializing services: {e}")
        return
    
    # Create sample document
    print("\n2. Creating sample document...")
    image = create_sample_rent_roll_image()
    sample_path = "sample_rent_roll.png"
    cv2.imwrite(sample_path, image)
    print(f"   ✓ Sample document saved as: {sample_path}")
    
    # Detect regions using Smart Region Manager
    print("\n3. Detecting regions with Computer Vision...")
    try:
        regions = region_manager.suggest_regions('rent_roll', image)
        print(f"   ✓ Detected {len(regions)} regions")
        
        # Group regions by field type
        field_regions = {}
        for region in regions:
            field_type = region.get('field_type', 'unknown')
            if field_type not in field_regions:
                field_regions[field_type] = []
            field_regions[field_type].append(region)
        
        for field_type, regions_list in field_regions.items():
            print(f"   - {field_type}: {len(regions_list)} regions")
        
    except Exception as e:
        print(f"   ✗ Error detecting regions: {e}")
        return
    
    # Extract text from detected regions using OCR
    print("\n4. Extracting text from detected regions...")
    extraction_results = {}
    
    try:
        for field_type, regions_list in field_regions.items():
            extraction_results[field_type] = []
            
            # Process top 3 regions for each field type
            for region in regions_list[:3]:
                # Extract text using OCR service
                ocr_result = ocr_service.extract_text_from_image(image, region)
                
                extraction_result = {
                    'region': region,
                    'text': ocr_result['text'],
                    'confidence': ocr_result['confidence'],
                    'word_count': len(ocr_result.get('words', [])),
                    'success': ocr_result['success']
                }
                
                extraction_results[field_type].append(extraction_result)
        
        print("   ✓ Text extraction completed")
        
    except Exception as e:
        print(f"   ✗ Error in text extraction: {e}")
        return
    
    # Display results
    print("\n5. Results Summary:")
    print("   " + "=" * 50)
    
    for field_type, results in extraction_results.items():
        if not results:
            continue
            
        print(f"\n   {field_type.upper()} FIELD:")
        for i, result in enumerate(results):
            region = result['region']
            text = result['text'].strip()
            confidence = result['confidence']
            
            print(f"   #{i+1}:")
            print(f"     Region: ({region['x']}, {region['y']}) {region['width']}x{region['height']}")
            print(f"     CV Confidence: {region.get('confidence', 0):.2f}")
            print(f"     OCR Confidence: {confidence:.1f}%")
            print(f"     Extracted Text: '{text}'")
            print(f"     Success: {result['success']}")
            print()
    
    # Create visualization
    print("6. Creating visualization...")
    try:
        # Visualize all detected regions
        vis_image = region_manager.visualize_regions(image, regions)
        vis_path = "sample_rent_roll_with_regions.png"
        cv2.imwrite(vis_path, vis_image)
        print(f"   ✓ Visualization saved as: {vis_path}")
        
    except Exception as e:
        print(f"   ✗ Error creating visualization: {e}")
    
    # Performance analysis
    print("\n7. Performance Analysis:")
    total_regions = len(regions)
    successful_extractions = sum(
        1 for field_results in extraction_results.values()
        for result in field_results
        if result['success'] and result['text'].strip()
    )
    
    avg_cv_confidence = sum(r.get('confidence', 0) for r in regions) / len(regions) if regions else 0
    avg_ocr_confidence = sum(
        result['confidence'] for field_results in extraction_results.values()
        for result in field_results if result['success']
    ) / max(1, successful_extractions)
    
    print(f"   Total regions detected: {total_regions}")
    print(f"   Successful text extractions: {successful_extractions}")
    print(f"   Average CV confidence: {avg_cv_confidence:.2f}")
    print(f"   Average OCR confidence: {avg_ocr_confidence:.1f}%")
    print(f"   Overall success rate: {(successful_extractions/total_regions*100):.1f}%")

def demonstrate_real_world_workflow():
    """Demonstrate a real-world workflow with error handling and optimization"""
    
    print("\n\nReal-World Workflow Demo")
    print("=" * 30)
    
    # Initialize services with production settings
    config = {
        'confidence_threshold': 0.7,  # Higher threshold for production
        'debug_mode': False
    }
    
    region_manager = SmartRegionManager(config)
    ocr_service = OCRService(confidence_threshold=70)
    
    # Create test document
    image = create_sample_rent_roll_image()
    
    # Step 1: Analyze document layout
    print("1. Analyzing document layout...")
    layout_info = region_manager.analyze_document_layout(image)
    print(f"   Layout type: {layout_info.get('layout_type', 'unknown')}")
    print(f"   Has table structure: {layout_info.get('has_table_structure', False)}")
    
    # Step 2: Get high-confidence regions only
    print("\n2. Detecting high-confidence regions...")
    all_regions = region_manager.suggest_regions('rent_roll', image)
    high_conf_regions = region_manager.filter_regions_by_confidence(all_regions, 0.8)
    print(f"   All regions: {len(all_regions)}")
    print(f"   High-confidence regions: {len(high_conf_regions)}")
    
    # Step 3: Focus on specific field types
    print("\n3. Extracting specific field types...")
    priority_fields = ['unit_number', 'tenant_name', 'rent_amount']
    
    extracted_data = {}
    for field_type in priority_fields:
        field_regions = region_manager.get_region_suggestions_for_field(
            field_type, 'rent_roll', image
        )
        
        # Take the best region for this field type
        if field_regions:
            best_region = field_regions[0]  # Sorted by confidence
            
            # Optimize region bounds for better OCR
            optimized_region = region_manager.optimize_region_bounds(best_region, image)
            
            # Extract text
            ocr_result = ocr_service.extract_text_from_image(image, optimized_region)
            
            extracted_data[field_type] = {
                'text': ocr_result['text'],
                'confidence': ocr_result['confidence'],
                'region': optimized_region
            }
            
            print(f"   {field_type}: '{ocr_result['text']}' (conf: {ocr_result['confidence']:.1f}%)")
    
    print(f"\n✓ Workflow completed successfully!")
    print(f"   Extracted {len(extracted_data)} field types")
    print(f"   Ready for downstream processing...")

if __name__ == "__main__":
    try:
        demonstrate_integration()
        demonstrate_real_world_workflow()
        
        print("\n" + "=" * 60)
        print("Demo completed successfully!")
        print("Check the generated files:")
        print("  - sample_rent_roll.png (original document)")
        print("  - sample_rent_roll_with_regions.png (with detected regions)")
        
    except Exception as e:
        print(f"Demo failed with error: {e}")
        import traceback
        traceback.print_exc()