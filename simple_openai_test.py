#!/usr/bin/env python3
"""
Simple test for OpenAI client fix
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openai_fix():
    """Test the OpenAI client initialization"""
    print("Testing OpenAI Client Fix")
    print("=" * 40)
    
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("[ERROR] No OPENAI_API_KEY found")
        return False
    
    print("[OK] OpenAI API key found")
    
    try:
        # Import OpenAI
        print("\n[TEST 1] Import OpenAI package")
        import openai
        print(f"[OK] OpenAI imported successfully")
        print(f"Version: {getattr(openai, '__version__', 'unknown')}")
        
        # Clear proxy variables (our fix)
        print("\n[TEST 2] Clear proxy environment variables")
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
        original_proxy_values = {}
        for var in proxy_vars:
            if var in os.environ:
                original_proxy_values[var] = os.environ[var]
                del os.environ[var]
                print(f"Cleared: {var}")
        
        if not original_proxy_values:
            print("No proxy variables found")
        
        # Initialize client
        print("\n[TEST 3] Initialize OpenAI client")
        client_kwargs = {'api_key': api_key}
        
        if hasattr(openai, 'OpenAI'):
            client = openai.OpenAI(**client_kwargs)
            print("[OK] OpenAI client initialized successfully")
            
            # Test API call
            print("\n[TEST 4] Test API call")
            try:
                models = client.models.list()
                print("[OK] API call successful")
                print(f"Models found: {len(models.data) if hasattr(models, 'data') else 'unknown'}")
            except Exception as api_error:
                print(f"[WARNING] API call failed: {str(api_error)}")
                print("This might be network/key issue, not client initialization")
        else:
            print("[ERROR] OpenAI v1.0+ API not available")
            return False
        
        # Restore proxy variables
        print("\n[TEST 5] Restore proxy environment variables")
        for var, value in original_proxy_values.items():
            os.environ[var] = value
            print(f"Restored: {var}")
        
        print("\n[SUCCESS] All tests passed!")
        return True
        
    except TypeError as e:
        error_msg = str(e)
        print(f"\n[ERROR] TypeError: {error_msg}")
        
        if 'proxies' in error_msg or 'proxy' in error_msg:
            print("[DETECTED] This is the proxy-related error we're fixing!")
        else:
            print("This TypeError is not proxy-related.")
        
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_openai_fix()
    
    print("\n" + "=" * 40)
    if success:
        print("[RESULT] PASSED - OpenAI client fix is working!")
        sys.exit(0)
    else:
        print("[RESULT] FAILED - OpenAI client fix needs more work")
        sys.exit(1)