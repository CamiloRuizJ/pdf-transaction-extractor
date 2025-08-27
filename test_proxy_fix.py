#!/usr/bin/env python3
"""
Test script to verify the OpenAI client proxy fix
This tests client initialization without requiring an API key
"""

import os
import sys

def test_openai_client_fix():
    """Test the OpenAI client initialization fix"""
    print("Testing OpenAI Client Proxy Fix")
    print("=" * 40)
    
    # Mock API key for testing
    mock_api_key = "sk-test-key-not-real"
    
    try:
        # Import the AIServiceServerless class
        sys.path.insert(0, 'api')
        from app import AIServiceServerless
        
        print("[TEST 1] Import AIServiceServerless class")
        print("[OK] AIServiceServerless imported successfully")
        
        print("\n[TEST 2] Initialize AIServiceServerless with mock key")
        
        # This should not fail with the proxy error anymore
        ai_service = AIServiceServerless(
            api_key=mock_api_key,
            model='gpt-3.5-turbo',
            temperature=0.1
        )
        
        print("[OK] AIServiceServerless initialized without proxy error")
        
        # Check if client was created (it might fail due to invalid API key, but not due to proxy error)
        print(f"[INFO] Client available: {hasattr(ai_service, 'client') and ai_service.client is not None}")
        print(f"[INFO] Client version: {getattr(ai_service, 'client_version', 'unknown')}")
        
        # Test basic classification (should work even without valid API key)
        print("\n[TEST 3] Test basic classification fallback")
        test_text = "This is a lease agreement for office space"
        result = ai_service.classify_document_content(test_text)
        
        print(f"[OK] Classification returned: {result.get('document_type', 'unknown')}")
        print(f"[INFO] Method used: {result.get('method', 'unknown')}")
        
        print("\n[SUCCESS] All tests passed - proxy fix appears to be working!")
        return True
        
    except TypeError as e:
        error_msg = str(e)
        print(f"\n[ERROR] TypeError: {error_msg}")
        
        if 'proxies' in error_msg or 'proxy' in error_msg:
            print("[FAILURE] Proxy-related error still present!")
            print("The fix needs more work.")
        else:
            print("This TypeError is not proxy-related - fix might be working.")
        
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = test_openai_client_fix()
    
    print("\n" + "=" * 40)
    if success:
        print("[RESULT] PASSED - OpenAI proxy fix is working!")
        sys.exit(0)
    else:
        print("[RESULT] FAILED - OpenAI proxy fix needs more work")
        sys.exit(1)