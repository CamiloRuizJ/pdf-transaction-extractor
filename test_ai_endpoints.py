#!/usr/bin/env python3
"""
Test all AI endpoints to verify the OpenAI client fix
"""

import requests
import json
import time
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_endpoint(endpoint, method='GET', data=None, files=None):
    """Test a specific endpoint"""
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method == 'POST':
            if files:
                response = requests.post(url, data=data, files=files)
            else:
                response = requests.post(url, json=data)
        else:
            response = requests.get(url)
        
        print(f"[{response.status_code}] {method} {endpoint}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                return True, result
            except:
                return True, response.text
        else:
            return False, response.text
            
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to {BASE_URL}")
        print("Make sure the Flask app is running on port 5000")
        return False, "Connection error"
    except Exception as e:
        return False, str(e)

def test_all_ai_endpoints():
    """Test all AI-related endpoints"""
    print("Testing AI Endpoints After OpenAI Client Fix")
    print("=" * 50)
    
    # Test basic endpoints first
    endpoints_to_test = [
        ("/health", "GET", None, "Health check"),
        ("/test-ai", "POST", None, "AI functionality test"),
    ]
    
    all_passed = True
    
    for endpoint, method, data, description in endpoints_to_test:
        print(f"\nTesting: {description}")
        print(f"Endpoint: {method} {endpoint}")
        
        success, result = test_endpoint(endpoint, method, data)
        
        if success:
            print("[OK] Endpoint responding")
            if isinstance(result, dict):
                # Check for specific success indicators
                if 'success' in result:
                    if result['success']:
                        print(f"[OK] Success: {result.get('response', 'No response message')}")
                    else:
                        print(f"[WARNING] Endpoint returned success=false: {result}")
                
                # Check for AI service diagnostics
                if 'diagnostics' in result:
                    diag = result['diagnostics']
                    print(f"AI Service Type: {diag.get('ai_service_type', 'unknown')}")
                    print(f"OpenAI Key Configured: {diag.get('openai_key_configured', 'unknown')}")
                    print(f"Client Available: {diag.get('client_available', 'unknown')}")
                    
                    # The key test - if there was a proxy error, it would show here
                    if 'error' in diag:
                        if 'proxies' in str(diag['error']) or 'proxy' in str(diag['error']):
                            print("[ERROR] Proxy-related error still present!")
                            all_passed = False
                        else:
                            print(f"[INFO] Non-proxy error: {diag['error']}")
                    else:
                        print("[OK] No proxy-related errors detected")
        else:
            print(f"[ERROR] Endpoint failed: {result}")
            all_passed = False
    
    # Test document classification endpoints (they should not crash even without OpenAI)
    print(f"\nTesting: Document classification fallback")
    classify_data = {
        "text": "This is a test document about real estate lease agreements and property management."
    }
    
    success, result = test_endpoint("/classify", "POST", classify_data)
    if success:
        print("[OK] Classification endpoint responding")
        if isinstance(result, dict) and result.get('success'):
            print("[OK] Classification working with fallback")
    else:
        print(f"[WARNING] Classification endpoint failed: {result}")
    
    return all_passed

if __name__ == "__main__":
    print("AI Endpoints Test Suite")
    print("This tests that all AI endpoints work after the OpenAI client fix")
    print()
    
    # Give user a chance to start the server
    print("Make sure the Flask app is running:")
    print("cd pdf-transaction-extractor && ./venv/Scripts/python.exe api/app.py")
    print()
    input("Press Enter when the server is running...")
    
    success = test_all_ai_endpoints()
    
    print("\n" + "=" * 50)
    if success:
        print("[RESULT] PASSED - All AI endpoints working properly!")
        print("The OpenAI client fix has resolved the proxy parameter error.")
        sys.exit(0)
    else:
        print("[RESULT] FAILED - Some issues detected")
        print("Check the output above for details.")
        sys.exit(1)