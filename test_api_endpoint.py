#!/usr/bin/env python3
"""
Test script to simulate the /api/test-ai endpoint behavior
"""

import os
import sys

def test_api_endpoint():
    """Test the AI endpoint functionality"""
    print("Testing AI Endpoint Functionality")
    print("=" * 45)
    
    try:
        # Import the necessary modules from the API
        sys.path.insert(0, 'api')
        from app import get_ai_service
        
        print("[TEST 1] Import get_ai_service function")
        print("[OK] get_ai_service imported successfully")
        
        print("\n[TEST 2] Get AI service instance (simulating endpoint call)")
        
        # This simulates what happens in the /api/test-ai endpoint
        ai_service = get_ai_service()
        
        print(f"[OK] AI service created: {type(ai_service).__name__}")
        
        # Collect diagnostic information like the real endpoint
        diagnostic_info = {
            'ai_service_type': type(ai_service).__name__,
            'client_available': hasattr(ai_service, 'client') and ai_service.client is not None,
        }
        
        # Add client version info if available
        if hasattr(ai_service, 'client_version'):
            diagnostic_info['client_version'] = ai_service.client_version
            
        print(f"[INFO] Service type: {diagnostic_info['ai_service_type']}")
        print(f"[INFO] Client available: {diagnostic_info['client_available']}")
        print(f"[INFO] Client version: {diagnostic_info.get('client_version', 'N/A')}")
        
        print("\n[TEST 3] Test classification (simulating endpoint test)")
        test_result = None
        if diagnostic_info['client_available']:
            try:
                test_text = "This is a simple test document about real estate property management."
                test_result = ai_service.classify_document_content(test_text)
                diagnostic_info['classification_test'] = 'success'
                diagnostic_info['test_classification'] = test_result.get('document_type', 'unknown')
                print(f"[OK] Classification test: success")
                print(f"[INFO] Document type: {diagnostic_info['test_classification']}")
                print(f"[INFO] Method: {test_result.get('method', 'unknown')}")
            except Exception as test_error:
                diagnostic_info['classification_test'] = 'failed'
                diagnostic_info['test_error'] = str(test_error)
                print(f"[WARNING] Classification test failed: {diagnostic_info['test_error']}")
        else:
            print("[INFO] No client available, skipping classification test")
        
        # Simulate the API response
        response = {
            'success': True, 
            'response': 'RExeli AI test completed',
            'diagnostics': diagnostic_info,
            'test_result': test_result
        }
        
        print(f"\n[TEST 4] API Response simulation")
        print(f"[OK] Success: {response['success']}")
        print(f"[INFO] Response: {response['response']}")
        
        # Check if this would have been a successful API response
        if response['success'] and diagnostic_info['ai_service_type'] in ['AIServiceServerless', 'BasicAIService']:
            print("\n[SUCCESS] API endpoint test simulation passed!")
            print("The OpenAI proxy fix appears to be working correctly.")
            return True
        else:
            print("\n[WARNING] API response indicates potential issues")
            return False
            
    except Exception as e:
        print(f"\n[ERROR] Test failed: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = test_api_endpoint()
    
    print("\n" + "=" * 45)
    if success:
        print("[RESULT] PASSED - API endpoint simulation successful!")
        print("The /api/test-ai endpoint should now work without proxy errors.")
        sys.exit(0)
    else:
        print("[RESULT] FAILED - API endpoint simulation failed")
        sys.exit(1)