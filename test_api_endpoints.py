"""
Test script to verify API endpoints are working correctly.
"""

import requests
import json

def test_api_endpoints():
    """Test the new API endpoints."""
    base_url = "http://localhost:5000"
    
    print("Testing API endpoints...")
    
    # Test AI status endpoint
    try:
        response = requests.get(f"{base_url}/api/ai/status")
        print(f"✓ AI Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  - AI Available: {data.get('ai_available')}")
            print(f"  - OCR Available: {data.get('ocr_available')}")
            print(f"  - Status: {data.get('status')}")
    except Exception as e:
        print(f"✗ AI Status Error: {e}")
    
    # Test security headers endpoint
    try:
        response = requests.get(f"{base_url}/api/security/headers")
        print(f"✓ Security Headers: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  - CSP Enabled: {data.get('csp_enabled')}")
            print(f"  - HSTS Enabled: {data.get('hsts_enabled')}")
    except Exception as e:
        print(f"✗ Security Headers Error: {e}")
    
    # Test legacy AI status endpoint
    try:
        response = requests.get(f"{base_url}/ai_status")
        print(f"✓ Legacy AI Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  - Status: {data.get('status')}")
    except Exception as e:
        print(f"✗ Legacy AI Status Error: {e}")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        print(f"✓ Health Check: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  - Status: {data.get('status')}")
            print(f"  - Version: {data.get('version')}")
    except Exception as e:
        print(f"✗ Health Check Error: {e}")

if __name__ == "__main__":
    print("API Endpoint Test")
    print("=" * 50)
    test_api_endpoints()
    print("=" * 50)
    print("Test completed!")
