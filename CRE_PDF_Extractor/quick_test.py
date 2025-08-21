#!/usr/bin/env python3
"""
Quick test for Enhanced CRE PDF Extractor
Simple verification of core functionality.
"""

def main():
    print("🚀 Quick Test - Enhanced CRE PDF Extractor")
    print("=" * 50)
    
    # Test 1: Import application
    try:
        from app_enhanced import app
        print("✅ App import: SUCCESS")
    except Exception as e:
        print(f"❌ App import: FAILED - {e}")
        return
    
    # Test 2: Check routes
    try:
        routes = list(app.url_map._rules)
        print(f"✅ Routes: {len(routes)} routes found")
    except Exception as e:
        print(f"❌ Routes: FAILED - {e}")
    
    # Test 3: Check configuration
    try:
        from config_enhanced import EnhancedConfig
        config = EnhancedConfig()
        print("✅ Configuration: SUCCESS")
    except Exception as e:
        print(f"❌ Configuration: FAILED - {e}")
    
    # Test 4: Check AI service
    try:
        from ai_service import AIService
        ai_service = AIService(config)
        if ai_service.client:
            print("✅ AI Service: ENABLED")
        else:
            print("⚠️  AI Service: DISABLED (No API key)")
    except Exception as e:
        print(f"❌ AI Service: FAILED - {e}")
    
    # Test 5: Check security
    try:
        from security_config import secure_config
        print("✅ Security Config: SUCCESS")
    except Exception as e:
        print(f"❌ Security Config: FAILED - {e}")
    
    print("\n🎉 Quick test completed!")
    print("=" * 50)

if __name__ == '__main__':
    main()

