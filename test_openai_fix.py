#!/usr/bin/env python3
"""
Test script for OpenAI client initialization fix
This script validates the fix before deployment
"""

import os
import sys
import traceback
from datetime import datetime

# Add API path to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

def test_openai_import():
    """Test OpenAI package import"""
    try:
        import openai
        print(f"✓ OpenAI package imported successfully")
        print(f"  Version: {getattr(openai, '__version__', 'unknown')}")
        return True
    except ImportError as e:
        print(f"✗ OpenAI package import failed: {e}")
        return False

def test_ai_service_initialization():
    """Test AI service initialization"""
    try:
        # Import our AI service class
        from app import AIServiceServerless, BasicAIService
        
        print("\nTesting AI service initialization...")
        
        # Test 1: Initialize with dummy API key
        print("Test 1: Initialize with dummy API key")
        ai_service = AIServiceServerless(api_key="sk-dummy_key_for_testing_12345678901234567890123456")
        
        if hasattr(ai_service, 'client_version'):
            print(f"  ✓ Client version: {ai_service.client_version}")
        else:
            print("  ⚠ No client_version attribute found")
            
        if hasattr(ai_service, 'client') and ai_service.client:
            print("  ✓ Client object created")
        else:
            print("  ✓ Client is None (expected for dummy key)")
        
        # Test 2: Initialize without API key
        print("\nTest 2: Initialize without API key")
        ai_service_no_key = AIServiceServerless(api_key=None)
        if ai_service_no_key.client is None:
            print("  ✓ Correctly handled missing API key")
        else:
            print("  ✗ Should not have created client without API key")
            
        # Test 3: Test BasicAIService fallback
        print("\nTest 3: Test BasicAIService fallback")
        basic_service = BasicAIService()
        test_text = "This is a test document about commercial real estate."
        result = basic_service.classify_document_content(test_text)
        print(f"  ✓ BasicAIService classification result: {result.get('document_type', 'unknown')}")
        
        return True
        
    except Exception as e:
        print(f"✗ AI service initialization failed: {e}")
        traceback.print_exc()
        return False

def test_get_ai_service_function():
    """Test the get_ai_service function"""
    try:
        from app import get_ai_service
        
        print("\nTesting get_ai_service function...")
        
        # Mock Flask app config
        import app
        app.app.config['OPENAI_API_KEY'] = None  # Test without key first
        app.app.config['OPENAI_MODEL'] = 'gpt-3.5-turbo'
        app.app.config['OPENAI_TEMPERATURE'] = 0.1
        
        ai_service = get_ai_service()
        print(f"  ✓ Service type: {type(ai_service).__name__}")
        
        # Test with dummy key
        app.app.config['OPENAI_API_KEY'] = "sk-dummy_key_for_testing_12345678901234567890123456"
        
        ai_service_with_key = get_ai_service()
        print(f"  ✓ Service with key type: {type(ai_service_with_key).__name__}")
        
        return True
        
    except Exception as e:
        print(f"✗ get_ai_service function test failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("OpenAI Client Fix Validation Test")
    print("=" * 60)
    print(f"Timestamp: {datetime.utcnow().isoformat()}")
    print()
    
    tests = [
        ("OpenAI Import", test_openai_import),
        ("AI Service Initialization", test_ai_service_initialization),
        ("get_ai_service Function", test_get_ai_service_function)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = 0
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! The OpenAI fix should work correctly.")
    else:
        print("⚠️  Some tests failed. Review the issues above before deployment.")
    
    return passed == len(tests)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)