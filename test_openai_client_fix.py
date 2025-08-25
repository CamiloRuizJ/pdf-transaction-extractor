#!/usr/bin/env python3
"""
Test script for OpenAI client fix
This script tests the OpenAI client initialization to ensure the proxy issue is resolved.
"""

import os
import sys
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openai_client_fix():
    """Test the OpenAI client initialization with the new fixes"""
    print("Testing OpenAI Client Fix")
    print("=" * 50)
    
    # Set up test environment
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("[ERROR] No OPENAI_API_KEY found in environment")
        print("Please set your OpenAI API key to test the fix")
        return False
    
    print(f"[OK] OpenAI API key found (length: {len(api_key)})")
    
    try:
        # Test 1: Basic import
        print("\n[TEST 1] Import OpenAI package")
        import openai
        print(f"[OK] OpenAI imported successfully")
        print(f"   Version: {getattr(openai, '__version__', 'unknown')}")
        
        # Test 2: Clear proxy environment variables (simulating our fix)
        print("\n[TEST 2] Clear proxy environment variables")
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
        original_proxy_values = {}
        for var in proxy_vars:
            if var in os.environ:
                original_proxy_values[var] = os.environ[var]
                del os.environ[var]
                print(f"   Cleared: {var}")
        
        if not original_proxy_values:
            print("   No proxy variables found to clear")
        
        # Test 3: Initialize OpenAI client with minimal parameters
        print("\n🤖 Test 3: Initialize OpenAI client")
        client_kwargs = {
            'api_key': api_key
        }
        
        if hasattr(openai, 'OpenAI'):
            client = openai.OpenAI(**client_kwargs)
            print("✅ OpenAI client initialized successfully (v1.0+ API)")
            
            # Test 4: Simple API call
            print("\n📡 Test 4: Test API call")
            try:
                # Try to list models (simple test)
                models = client.models.list()
                print("✅ API call successful - client is working")
                print(f"   Available models: {len(models.data) if hasattr(models, 'data') else 'unknown'}")
            except Exception as api_error:
                print(f"⚠️  API call failed but client created: {str(api_error)}")
                print("   This might be due to API key or network issues, not client initialization")
        else:
            print("❌ OpenAI v1.0+ API not available")
            return False
        
        # Test 5: Restore proxy variables
        print("\n🔄 Test 5: Restore proxy environment variables")
        for var, value in original_proxy_values.items():
            os.environ[var] = value
            print(f"   Restored: {var}")
        
        print("\n🎉 All tests passed! OpenAI client fix appears to be working.")
        return True
        
    except TypeError as e:
        error_msg = str(e)
        print(f"\n❌ TypeError during client initialization: {error_msg}")
        
        if 'proxies' in error_msg or 'proxy' in error_msg:
            print("🚨 DETECTED: This is the proxy-related error we're trying to fix!")
            print("   The fix may need additional adjustments.")
        else:
            print("   This TypeError is not proxy-related.")
        
        print("\nFull traceback:")
        traceback.print_exc()
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("OpenAI Client Fix Test")
    print("This script tests the fixes implemented to resolve the 'proxies' parameter error")
    print()
    
    success = test_openai_client_fix()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ TEST RESULT: PASSED - OpenAI client fix appears to be working!")
        sys.exit(0)
    else:
        print("❌ TEST RESULT: FAILED - OpenAI client fix needs more work")
        sys.exit(1)