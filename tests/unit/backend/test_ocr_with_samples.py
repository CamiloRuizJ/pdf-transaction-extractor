"""
Sample Image Testing for OCR Service
Tests OCR service functionality with actual sample images from the project.
"""

import os
import sys
import time
import json
from pathlib import Path

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.ocr_service import OCRService

def test_sample_images():
    """Test OCR service with actual sample images"""
    print("Testing OCR Service with Sample Images")
    print("=" * 50)
    
    # Initialize OCR service
    ocr_service = OCRService(confidence_threshold=60)
    
    # Sample image paths
    base_dir = Path(__file__).parent
    sample_images = {
        'rent_roll': base_dir / 'test_rent_roll.png',
        'offering_memo': base_dir / 'test_offering_memo.png',
        'lease_agreement': base_dir / 'test_lease_agreement.png',
        'comparable_sales': base_dir / 'test_comparable_sales.png'
    }
    
    results = {}
    
    for doc_type, image_path in sample_images.items():
        print(f"\nTesting {doc_type}: {image_path.name}")
        print("-" * 40)
        
        if not image_path.exists():
            print(f"[ERROR] Image not found: {image_path}")
            continue
        
        try:
            # Test full image OCR
            start_time = time.time()
            result = ocr_service.extract_text_from_image(str(image_path))
            processing_time = time.time() - start_time
            
            # Display results
            print(f"[OK] Processing completed in {processing_time:.2f}s")
            print(f"[CONF] Confidence: {result['confidence']:.1f}%")
            print(f"[TEXT] Text length: {len(result['text'])} characters")
            print(f"[WORDS] Word count: {result.get('word_count', 0)} words")
            print(f"[SUCCESS] Success: {result['success']}")
            
            # Show preprocessing method used
            if 'preprocessing_used' in result:
                print(f"[PREP] Preprocessing: {result['preprocessing_used']}")
            
            # Show processing notes
            if result.get('processing_notes'):
                print(f"[NOTES] Notes: {', '.join(result['processing_notes'])}")
            
            # Show validation info
            if 'validation' in result:
                validation = result['validation']
                print(f"[VALID] Valid: {validation['is_valid']}")
                print(f"[QUALITY] Quality Score: {validation['quality_score']:.1f}/100")
                if validation['issues']:
                    print(f"[ISSUES] Issues: {', '.join(validation['issues'])}")
            
            # Show sample of extracted text (first 200 characters)
            if result['text']:
                sample_text = result['text'][:200]
                if len(result['text']) > 200:
                    sample_text += "..."
                print(f"[SAMPLE] Sample text: {repr(sample_text)}")
            else:
                print("[SAMPLE] No text extracted")
            
            # Test region extraction with a sample region
            print("\n[REGION] Testing region extraction...")
            test_region = {'x': 100, 'y': 100, 'width': 300, 'height': 100}
            region_result = ocr_service.extract_text_from_region(str(image_path), test_region)
            
            print(f"   Region confidence: {region_result['confidence']:.1f}%")
            print(f"   Region text length: {len(region_result['text'])} chars")
            if region_result['text']:
                region_sample = region_result['text'][:100]
                if len(region_result['text']) > 100:
                    region_sample += "..."
                print(f"   Region sample: {repr(region_sample)}")
            
            # Test structured data extraction
            print("\n[STRUCT] Testing structured data extraction...")
            structured_result = ocr_service.extract_structured_data(
                ocr_service.preprocess_image(
                    __import__('cv2').imread(str(image_path))
                )
            )
            
            if structured_result['success']:
                extracted_fields = structured_result['extracted_fields']
                print(f"   Found {structured_result['total_matches']} pattern matches")
                print(f"   Extracted fields: {list(extracted_fields.keys())}")
                
                # Show some sample field extractions
                for field_name, matches in list(extracted_fields.items())[:3]:
                    if matches:
                        sample_values = [m['value'] for m in matches[:2]]
                        print(f"   {field_name}: {sample_values}")
            else:
                print("   No structured data extracted")
            
            # Store results for summary
            results[doc_type] = {
                'success': result['success'],
                'confidence': result['confidence'],
                'text_length': len(result['text']),
                'word_count': result.get('word_count', 0),
                'processing_time': processing_time,
                'quality_score': result.get('validation', {}).get('quality_score', 0),
                'structured_matches': structured_result.get('total_matches', 0)
            }
            
        except Exception as e:
            print(f"[ERROR] Error processing {doc_type}: {e}")
            import traceback
            traceback.print_exc()
            results[doc_type] = {'error': str(e)}
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    successful_tests = [doc for doc, result in results.items() if result.get('success', False)]
    failed_tests = [doc for doc, result in results.items() if 'error' in result]
    
    print(f"[OK] Successful: {len(successful_tests)}/{len(results)}")
    print(f"[FAIL] Failed: {len(failed_tests)}/{len(results)}")
    
    if successful_tests:
        print(f"\nSuccessful Documents:")
        for doc in successful_tests:
            result = results[doc]
            print(f"  {doc}: {result['confidence']:.1f}% confidence, "
                  f"{result['word_count']} words, "
                  f"{result['processing_time']:.2f}s")
    
    if failed_tests:
        print(f"\nFailed Documents:")
        for doc in failed_tests:
            print(f"  {doc}: {results[doc]['error']}")
    
    # Performance analysis
    if successful_tests:
        processing_times = [results[doc]['processing_time'] for doc in successful_tests]
        confidences = [results[doc]['confidence'] for doc in successful_tests]
        quality_scores = [results[doc]['quality_score'] for doc in successful_tests]
        
        print(f"\nPerformance Metrics:")
        print(f"  Avg processing time: {sum(processing_times)/len(processing_times):.2f}s")
        print(f"  Avg confidence: {sum(confidences)/len(confidences):.1f}%")
        print(f"  Avg quality score: {sum(quality_scores)/len(quality_scores):.1f}/100")
        print(f"  Max processing time: {max(processing_times):.2f}s")
        print(f"  Min processing time: {min(processing_times):.2f}s")
    
    return results


def test_preprocessing_comparison():
    """Compare different preprocessing levels on sample images"""
    print("\n" + "=" * 50)
    print("PREPROCESSING COMPARISON")
    print("=" * 50)
    
    ocr_service = OCRService(confidence_threshold=60)
    
    base_dir = Path(__file__).parent
    test_image = base_dir / 'test_rent_roll.png'
    
    if not test_image.exists():
        print("[ERROR] Sample image not found for preprocessing comparison")
        return
    
    import cv2
    image = cv2.imread(str(test_image))
    
    preprocessing_levels = ['light', 'standard', 'aggressive']
    results = {}
    
    for level in preprocessing_levels:
        print(f"\nTesting {level} preprocessing...")
        try:
            start_time = time.time()
            
            # Apply preprocessing
            processed_image = ocr_service.preprocess_image(image, level)
            
            # Extract text
            result = ocr_service.extract_text_from_image(processed_image)
            
            processing_time = time.time() - start_time
            
            print(f"  Time: {processing_time:.2f}s")
            print(f"  Confidence: {result['confidence']:.1f}%")
            print(f"  Text length: {len(result['text'])} chars")
            print(f"  Word count: {result.get('word_count', 0)}")
            
            results[level] = {
                'confidence': result['confidence'],
                'text_length': len(result['text']),
                'word_count': result.get('word_count', 0),
                'processing_time': processing_time
            }
            
        except Exception as e:
            print(f"  [ERROR] Error: {e}")
            results[level] = {'error': str(e)}
    
    # Find best preprocessing method
    successful_results = {k: v for k, v in results.items() if 'error' not in v}
    if successful_results:
        best_method = max(successful_results.keys(), 
                         key=lambda k: successful_results[k]['confidence'])
        print(f"\n[BEST] Best preprocessing method: {best_method}")
        print(f"   Confidence: {successful_results[best_method]['confidence']:.1f}%")


def test_error_conditions():
    """Test OCR service error handling"""
    print("\n" + "=" * 50)
    print("ERROR CONDITION TESTING")
    print("=" * 50)
    
    ocr_service = OCRService(confidence_threshold=60)
    
    error_tests = [
        ("Non-existent file", "nonexistent_image.png", None),
        ("Invalid region", "test_rent_roll.png", {'x': -100, 'y': -100, 'width': 50, 'height': 50}),
        ("Oversized region", "test_rent_roll.png", {'x': 0, 'y': 0, 'width': 10000, 'height': 10000}),
        ("Empty region", "test_rent_roll.png", {'x': 0, 'y': 0, 'width': 0, 'height': 0}),
    ]
    
    for test_name, image_path, region in error_tests:
        print(f"\nTesting: {test_name}")
        try:
            if region is None:
                result = ocr_service.extract_text_from_image(image_path)
            else:
                result = ocr_service.extract_text_from_region(image_path, region)
            
            if result['success']:
                print(f"  [WARN] Unexpected success: {result['confidence']:.1f}% confidence")
            else:
                print(f"  [OK] Handled gracefully: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"  [ERROR] Unhandled exception: {e}")


if __name__ == "__main__":
    # Run comprehensive sample testing
    print("OCR Service Sample Image Testing")
    print("=" * 60)
    
    try:
        # Test with sample images
        results = test_sample_images()
        
        # Compare preprocessing methods
        test_preprocessing_comparison()
        
        # Test error conditions
        test_error_conditions()
        
        print("\n" + "=" * 60)
        print("Testing completed successfully!")
        
    except Exception as e:
        print(f"[ERROR] Testing failed: {e}")
        import traceback
        traceback.print_exc()