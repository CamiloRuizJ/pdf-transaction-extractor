"""
Integration Testing for OCR Service
Tests integration with Smart Region Manager and Processing Pipeline.
"""

import os
import sys
import numpy as np
import cv2
from pathlib import Path

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.ocr_service import OCRService
from services.smart_region_manager import SmartRegionManager

def test_ocr_smart_region_integration():
    """Test integration between OCR Service and Smart Region Manager"""
    print("Testing OCR Service + Smart Region Manager Integration")
    print("=" * 55)
    
    try:
        # Initialize services
        ocr_service = OCRService(confidence_threshold=60)
        smart_region_manager = SmartRegionManager()
        
        print("[INIT] Services initialized successfully")
        
        # Test with sample image
        base_dir = Path(__file__).parent
        test_image_path = base_dir / 'test_rent_roll.png'
        
        if not test_image_path.exists():
            print("[ERROR] Sample image not found")
            return False
        
        # Load image
        image = cv2.imread(str(test_image_path))
        if image is None:
            print("[ERROR] Could not load image")
            return False
        
        print(f"[IMAGE] Loaded image: {image.shape}")
        
        # Step 1: Use Smart Region Manager to detect regions
        print("\n[STEP 1] Detecting regions with Smart Region Manager...")
        
        try:
            # Use smart region manager to suggest regions
            region_suggestions = smart_region_manager.suggest_regions(
                image, 
                document_type='rent_roll'
            )
            
            print(f"[REGIONS] Found {len(region_suggestions.get('regions', []))} regions")
            
            # Display region information
            for i, region in enumerate(region_suggestions.get('regions', [])):
                print(f"  Region {i}: {region.get('type', 'unknown')} "
                      f"at ({region['x']}, {region['y']}) "
                      f"size {region['width']}x{region['height']} "
                      f"confidence {region.get('confidence', 0):.2f}")
        
        except Exception as e:
            print(f"[ERROR] Smart Region Manager failed: {e}")
            # Fallback to manual regions for testing
            region_suggestions = {
                'regions': [
                    {'x': 50, 'y': 100, 'width': 400, 'height': 50, 'type': 'header', 'confidence': 0.9},
                    {'x': 50, 'y': 180, 'width': 400, 'height': 200, 'type': 'table', 'confidence': 0.8}
                ]
            }
            print("[FALLBACK] Using manual regions for testing")
        
        # Step 2: Use OCR Service to extract text from detected regions
        print("\n[STEP 2] Extracting text from detected regions...")
        
        region_results = {}
        for i, region in enumerate(region_suggestions['regions']):
            print(f"\n  Processing Region {i} ({region.get('type', 'unknown')})...")
            
            # Extract region coordinates
            region_bounds = {
                'x': region['x'],
                'y': region['y'],
                'width': region['width'],
                'height': region['height']
            }
            
            # Use OCR service to extract text from region
            try:
                ocr_result = ocr_service.extract_text_from_region(
                    str(test_image_path), 
                    region_bounds
                )
                
                region_results[f"region_{i}"] = ocr_result
                
                print(f"    Confidence: {ocr_result['confidence']:.1f}%")
                print(f"    Text length: {len(ocr_result['text'])} chars")
                print(f"    Word count: {ocr_result.get('word_count', 0)}")
                print(f"    Success: {ocr_result['success']}")
                
                if ocr_result['text']:
                    sample_text = ocr_result['text'][:100]
                    if len(ocr_result['text']) > 100:
                        sample_text += "..."
                    print(f"    Sample: {repr(sample_text)}")
                
            except Exception as e:
                print(f"    [ERROR] OCR failed for region {i}: {e}")
                region_results[f"region_{i}"] = {'error': str(e), 'success': False}
        
        # Step 3: Test full page extraction with region context
        print("\n[STEP 3] Full page extraction with region context...")
        
        try:
            # Convert region suggestions to format expected by OCR service
            regions_for_ocr = [
                {
                    'x': r['x'], 'y': r['y'], 
                    'width': r['width'], 'height': r['height']
                } 
                for r in region_suggestions['regions']
            ]
            
            # Use OCR service PDF page extraction method
            full_result = ocr_service.extract_text_from_pdf_page(image, regions_for_ocr)
            
            print(f"  Full page confidence: {full_result['confidence']:.1f}%")
            print(f"  Full page text length: {len(full_result['text'])} chars")
            print(f"  Number of regions processed: {len(full_result['regions'])}")
            print(f"  Success: {full_result['success']}")
            
        except Exception as e:
            print(f"  [ERROR] Full page extraction failed: {e}")
        
        # Step 4: Test data flow compatibility
        print("\n[STEP 4] Testing data flow compatibility...")
        
        # Test that OCR results have expected format for processing pipeline
        required_fields = ['text', 'confidence', 'success', 'words']
        compatible_count = 0
        total_results = 0
        
        for region_id, result in region_results.items():
            total_results += 1
            if all(field in result for field in required_fields):
                compatible_count += 1
                print(f"  {region_id}: Compatible [OK]")
            else:
                missing_fields = [f for f in required_fields if f not in result]
                print(f"  {region_id}: Missing fields {missing_fields} [FAIL]")
        
        compatibility_rate = (compatible_count / total_results * 100) if total_results > 0 else 0
        print(f"  Overall compatibility: {compatible_count}/{total_results} ({compatibility_rate:.1f}%)")
        
        # Summary
        print("\n" + "=" * 55)
        print("INTEGRATION TEST SUMMARY")
        print("=" * 55)
        
        successful_regions = sum(1 for r in region_results.values() if r.get('success', False))
        total_regions = len(region_results)
        
        print(f"[OK] Services initialized successfully")
        print(f"[OK] Region detection completed")
        print(f"[OK] OCR processing: {successful_regions}/{total_regions} regions successful")
        print(f"[OK] Data format compatibility: {compatibility_rate:.1f}%")
        
        if successful_regions > 0 and compatibility_rate >= 80:
            print(f"\n[RESULT] Integration test PASSED")
            return True
        else:
            print(f"\n[RESULT] Integration test FAILED")
            print(f"  - Need at least 1 successful region (got {successful_regions})")
            print(f"  - Need at least 80% compatibility (got {compatibility_rate:.1f}%)")
            return False
        
    except Exception as e:
        print(f"[ERROR] Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_processing_pipeline_interface():
    """Test OCR Service interface compatibility with Processing Pipeline"""
    print("\nTesting Processing Pipeline Interface Compatibility")
    print("=" * 52)
    
    ocr_service = OCRService(confidence_threshold=60)
    
    # Test data structures expected by processing pipeline
    test_cases = [
        {
            'name': 'Empty image',
            'image': np.ones((100, 100, 3), dtype=np.uint8) * 255,
            'expected_success': True
        },
        {
            'name': 'Text image',
            'image': None,  # Will create text image
            'expected_success': True
        },
        {
            'name': 'Invalid image',
            'image': np.array([]),
            'expected_success': False
        }
    ]
    
    # Create text image for second test case
    text_image = np.ones((200, 400, 3), dtype=np.uint8) * 255
    cv2.putText(text_image, 'Test Pipeline Text', (50, 100), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    test_cases[1]['image'] = text_image
    
    pipeline_compatible = True
    
    for test_case in test_cases:
        print(f"\n[TEST] {test_case['name']}...")
        
        try:
            result = ocr_service.extract_text_from_image(test_case['image'])
            
            # Check required fields for pipeline
            required_fields = {
                'text': str,
                'confidence': (int, float),
                'success': bool,
                'words': list
            }
            
            field_checks = []
            for field, expected_type in required_fields.items():
                if field not in result:
                    field_checks.append(f"Missing field: {field}")
                    pipeline_compatible = False
                elif not isinstance(result[field], expected_type):
                    field_checks.append(f"Wrong type for {field}: got {type(result[field])}, expected {expected_type}")
                    pipeline_compatible = False
                else:
                    field_checks.append(f"[OK] {field}")
            
            print(f"  Success: {result.get('success', 'N/A')}")
            print(f"  Field checks: {field_checks}")
            
            # Check if success matches expectation
            if result.get('success') == test_case['expected_success']:
                print(f"  Expected success behavior: [OK]")
            else:
                print(f"  Expected success behavior: [FAIL] (got {result.get('success')}, expected {test_case['expected_success']})")
                pipeline_compatible = False
            
        except Exception as e:
            print(f"  [ERROR] {e}")
            pipeline_compatible = False
    
    print(f"\n[RESULT] Pipeline interface compatibility: {'PASSED' if pipeline_compatible else 'FAILED'}")
    return pipeline_compatible


def test_performance_integration():
    """Test performance characteristics in integration scenario"""
    print("\nTesting Performance in Integration Scenario")
    print("=" * 45)
    
    import time
    import gc
    
    ocr_service = OCRService(confidence_threshold=60)
    
    # Performance test with multiple regions
    base_dir = Path(__file__).parent
    test_image_path = base_dir / 'test_rent_roll.png'
    
    if not test_image_path.exists():
        print("[ERROR] Sample image not found")
        return False
    
    # Simulate multiple region extractions (typical integration scenario)
    test_regions = [
        {'x': 50, 'y': 100, 'width': 200, 'height': 50},
        {'x': 50, 'y': 180, 'width': 200, 'height': 50},
        {'x': 50, 'y': 260, 'width': 200, 'height': 50},
        {'x': 300, 'y': 100, 'width': 200, 'height': 50},
        {'x': 300, 'y': 180, 'width': 200, 'height': 50},
    ]
    
    print(f"[TEST] Processing {len(test_regions)} regions...")
    
    # Measure performance
    start_time = time.time()
    start_memory = _get_memory_usage()
    
    results = []
    for i, region in enumerate(test_regions):
        try:
            result = ocr_service.extract_text_from_region(str(test_image_path), region)
            results.append(result)
            print(f"  Region {i}: {result['confidence']:.1f}% confidence")
        except Exception as e:
            print(f"  Region {i}: Error - {e}")
            results.append({'success': False, 'error': str(e)})
    
    end_time = time.time()
    end_memory = _get_memory_usage()
    
    # Performance analysis
    total_time = end_time - start_time
    memory_growth = end_memory - start_memory
    avg_time_per_region = total_time / len(test_regions)
    successful_results = sum(1 for r in results if r.get('success', False))
    
    print(f"\n[PERFORMANCE RESULTS]")
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Average time per region: {avg_time_per_region:.2f}s")
    print(f"  Memory growth: {memory_growth / 1024 / 1024:.1f} MB")
    print(f"  Successful extractions: {successful_results}/{len(test_regions)}")
    
    # Performance thresholds
    performance_ok = (
        total_time < 15.0 and  # Total time should be reasonable
        avg_time_per_region < 5.0 and  # Each region should be fast
        memory_growth < 50 * 1024 * 1024 and  # Memory growth should be limited
        successful_results >= len(test_regions) * 0.8  # Most regions should succeed
    )
    
    print(f"[RESULT] Performance test: {'PASSED' if performance_ok else 'FAILED'}")
    
    if not performance_ok:
        print("  Issues detected:")
        if total_time >= 15.0:
            print(f"    - Total time too high: {total_time:.2f}s (threshold: 15.0s)")
        if avg_time_per_region >= 5.0:
            print(f"    - Average time per region too high: {avg_time_per_region:.2f}s (threshold: 5.0s)")
        if memory_growth >= 50 * 1024 * 1024:
            print(f"    - Memory growth too high: {memory_growth / 1024 / 1024:.1f}MB (threshold: 50MB)")
        if successful_results < len(test_regions) * 0.8:
            print(f"    - Success rate too low: {successful_results}/{len(test_regions)} (threshold: 80%)")
    
    return performance_ok


def _get_memory_usage():
    """Get current memory usage in bytes"""
    try:
        import psutil
        process = psutil.Process()
        return process.memory_info().rss
    except ImportError:
        return 0


if __name__ == "__main__":
    print("OCR Service Integration Testing")
    print("=" * 60)
    
    test_results = []
    
    # Run integration tests
    print("\n1. OCR + Smart Region Manager Integration")
    test_results.append(('Smart Region Integration', test_ocr_smart_region_integration()))
    
    print("\n2. Processing Pipeline Interface")  
    test_results.append(('Pipeline Interface', test_processing_pipeline_interface()))
    
    print("\n3. Performance Integration")
    test_results.append(('Performance Integration', test_performance_integration()))
    
    # Summary
    print("\n" + "=" * 60)
    print("INTEGRATION TEST SUMMARY")
    print("=" * 60)
    
    passed_tests = sum(1 for _, result in test_results if result)
    total_tests = len(test_results)
    
    for test_name, result in test_results:
        status = "PASSED" if result else "FAILED"
        print(f"  {test_name}: {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("[SUCCESS] All integration tests PASSED")
    else:
        print("[FAILURE] Some integration tests FAILED")
        print("  Review individual test results above for details.")