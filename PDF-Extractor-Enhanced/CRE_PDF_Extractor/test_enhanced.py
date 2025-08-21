#!/usr/bin/env python3
"""
Test script for Enhanced CRE PDF Extractor
Tests the application functionality without running the server.
"""

import os
import sys
from app_enhanced import app

def test_application():
    """Test the enhanced application functionality."""
    print("🧪 Testing Enhanced CRE PDF Extractor...")
    print("=" * 50)
    
    # Test 1: Application creation
    print("✅ Test 1: Application creation - PASSED")
    
    # Test 2: Routes
    routes = list(app.url_map._rules)
    print(f"✅ Test 2: Routes - {len(routes)} routes found")
    
    # Test 3: Health endpoint
    print("🔍 Test 3: Testing health endpoint...")
    try:
        with app.test_client() as client:
            response = client.get('/health')
            if response.status_code == 200:
                data = response.get_json()
                print("✅ Test 3: Health endpoint - PASSED")
                print(f"   Status: {data.get('status', 'unknown')}")
                print(f"   AI Service: {data.get('ai_service', 'unknown')}")
            else:
                print(f"❌ Test 3: Health endpoint - FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Test 3: Health endpoint - ERROR: {e}")
    
    # Test 4: Home page
    print("🔍 Test 4: Testing home page...")
    try:
        with app.test_client() as client:
            response = client.get('/')
            if response.status_code == 200:
                print("✅ Test 4: Home page - PASSED")
            else:
                print(f"❌ Test 4: Home page - FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Test 4: Home page - ERROR: {e}")
    
    # Test 5: Tool page
    print("🔍 Test 5: Testing tool page...")
    try:
        with app.test_client() as client:
            response = client.get('/tool')
            if response.status_code == 200:
                print("✅ Test 5: Tool page - PASSED")
            else:
                print(f"❌ Test 5: Tool page - FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Test 5: Tool page - ERROR: {e}")
    
    # Test 6: Static files
    print("🔍 Test 6: Testing static files...")
    try:
        with app.test_client() as client:
            response = client.get('/static/css/styles.css')
            if response.status_code == 200:
                print("✅ Test 6: Static files - PASSED")
            else:
                print(f"❌ Test 6: Static files - FAILED (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Test 6: Static files - ERROR: {e}")
    
    # Test 7: AI Service
    print("🔍 Test 7: Testing AI service...")
    try:
        from ai_service import AIService
        from config_enhanced import EnhancedConfig
        config = EnhancedConfig()
        ai_service = AIService(config)
        
        if ai_service.client:
            print("✅ Test 7: AI Service - ENABLED")
        else:
            print("⚠️  Test 7: AI Service - DISABLED (No API key)")
    except Exception as e:
        print(f"❌ Test 7: AI Service - ERROR: {e}")
    
    print("\n🎉 All tests completed!")
    print("=" * 50)

if __name__ == '__main__':
    test_application()
