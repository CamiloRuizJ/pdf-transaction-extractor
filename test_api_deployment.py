#!/usr/bin/env python3
"""
RExeli API Deployment Test Script
Tests all critical endpoints after deployment to verify functionality
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "https://rexeli.com/api"
TEST_TIMEOUT = 30

def test_endpoint(endpoint, method="GET", data=None, expected_status=200):
    """Test a single API endpoint"""
    url = f"{API_BASE_URL}{endpoint}"
    print(f"\n🧪 Testing {method} {endpoint}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=TEST_TIMEOUT)
        elif method == "POST":
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, json=data, headers=headers, timeout=TEST_TIMEOUT)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                result = response.json()
                print(f"   ✅ Success: {result.get('message', result)}")
                return True, result
            except:
                print(f"   ✅ Success (non-JSON response)")
                return True, response.text
        else:
            print(f"   ❌ Expected {expected_status}, got {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error}")
            except:
                print(f"   Error: {response.text}")
            return False, None
            
    except requests.exceptions.Timeout:
        print(f"   ⏱️ Timeout after {TEST_TIMEOUT}s")
        return False, None
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False, None

def main():
    """Run all API tests"""
    print("🚀 RExeli API Deployment Testing")
    print("=" * 50)
    print(f"Base URL: {API_BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    
    tests = [
        # Core endpoints
        ("/health", "GET"),
        ("/config", "GET"),
        ("/test-ai", "GET"),
        ("/ai/status", "GET"),
        
        # Test AI functionality with POST
        ("/test-ai", "POST", {"test": "data"}),
        
        # Test upload endpoint (should fail without file, but endpoint should exist)
        ("/upload", "POST", {}, 400),
        
        # Test classification endpoint (should fail without data, but endpoint should exist)
        ("/classify", "POST", {}, 400),
        
        # Test other endpoints
        ("/enhance", "POST", {}, 400),
        ("/validate", "POST", {}, 400),
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        endpoint = test[0]
        method = test[1]
        data = test[2] if len(test) > 2 else None
        expected_status = test[3] if len(test) > 3 else 200
        
        success, result = test_endpoint(endpoint, method, data, expected_status)
        if success:
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! API deployment is successful.")
    elif passed > total * 0.7:
        print("⚠️ Most tests passed. Some issues need attention.")
    else:
        print("❌ Many tests failed. Deployment needs fixes.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)