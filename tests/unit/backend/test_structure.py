"""
Quick test to verify PDF Converter V2 structure and imports.
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported successfully."""
    try:
        print("Testing imports...")
        
        # Test config
        from config import Config
        print("✓ Config imported successfully")
        
        # Test app creation
        from app import create_app
        print("✓ App factory imported successfully")
        
        # Test services
        from app.services import DocumentClassifier, AIService, OCRService
        print("✓ Core services imported successfully")
        
        # Test routes
        from app.routes import main_bp, api_bp
        print("✓ Routes imported successfully")
        
        print("\n🎉 All imports successful! PDF Converter V2 structure is ready.")
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_config():
    """Test configuration initialization."""
    try:
        from config import Config
        config = Config()
        print(f"✓ Configuration initialized successfully")
        print(f"  - Upload folder: {config.UPLOAD_FOLDER}")
        print(f"  - V2 enabled: {config.V2_ENABLED}")
        print(f"  - Document types: {len(config.SUPPORTED_DOCUMENT_TYPES)}")
        return True
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def test_app_creation():
    """Test Flask app creation."""
    try:
        from app import create_app
        app = create_app()
        print("✓ Flask app created successfully")
        print(f"  - App name: {app.name}")
        print(f"  - Debug mode: {app.debug}")
        return True
    except Exception as e:
        print(f"❌ App creation failed: {e}")
        return False

if __name__ == "__main__":
    print("PDF Converter V2 - Structure Test")
    print("=" * 40)
    
    tests = [
        ("Import Test", test_imports),
        ("Config Test", test_config),
        ("App Creation Test", test_app_creation)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} failed")
    
    print(f"\n{'=' * 40}")
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! PDF Converter V2 is ready to run.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Set up environment variables in .env file")
        print("3. Run the application: python app.py")
    else:
        print("❌ Some tests failed. Please check the errors above.")
