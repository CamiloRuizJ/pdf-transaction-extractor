#!/usr/bin/env python3
"""
Test Setup Script for PDF Converter V2
Verifies all dependencies and configurations are working correctly.
"""

import sys
import os
from pathlib import Path

def test_python_version():
    """Test Python version"""
    print("🐍 Testing Python version...")
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Requires Python 3.8+")
        return False

def test_python_packages():
    """Test required Python packages"""
    print("\n📦 Testing Python packages...")
    packages = [
        ('flask', 'flask'),
        ('pytesseract', 'pytesseract'),
        ('pdf2image', 'pdf2image'),
        ('openai', 'openai'),
        ('pandas', 'pandas'),
        ('opencv-python', 'cv2'),
        ('scikit-learn', 'sklearn'),
        ('structlog', 'structlog')
    ]
    
    all_ok = True
    for package_name, import_name in packages:
        try:
            __import__(import_name)
            print(f"✅ {package_name} - OK")
        except ImportError:
            print(f"❌ {package_name} - Missing")
            all_ok = False
    
    return all_ok

def test_external_dependencies():
    """Test external dependencies"""
    print("\n🔧 Testing external dependencies...")
    
    # Test Tesseract
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract OCR - OK (v{version})")
        tesseract_ok = True
    except Exception as e:
        print(f"❌ Tesseract OCR - Error: {e}")
        tesseract_ok = False
    
    # Test Poppler
    try:
        import pdf2image
        print("✅ Poppler - OK")
        poppler_ok = True
    except Exception as e:
        print(f"❌ Poppler - Error: {e}")
        poppler_ok = False
    
    return tesseract_ok and poppler_ok

def test_configuration():
    """Test application configuration"""
    print("\n⚙️ Testing configuration...")
    
    try:
        from config import Config
        config = Config()
        
        # Test directories
        directories = ['UPLOAD_FOLDER', 'TEMP_FOLDER', 'LOGS_FOLDER', 'ML_MODELS_FOLDER']
        for dir_name in directories:
            dir_path = getattr(config, dir_name)
            if dir_path.exists():
                print(f"✅ {dir_name} - OK")
            else:
                print(f"⚠️ {dir_name} - Created")
                dir_path.mkdir(parents=True, exist_ok=True)
        
        # Test OpenAI configuration
        if config.OPENAI_API_KEY:
            print("✅ OpenAI API Key - Configured")
        else:
            print("⚠️ OpenAI API Key - Not configured (AI features disabled)")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration - Error: {e}")
        return False

def test_flask_app():
    """Test Flask application creation"""
    print("\n🌐 Testing Flask application...")
    
    try:
        from app import create_app
        from config import Config
        
        app = create_app(Config)
        print("✅ Flask application - Created successfully")
        
        # Test basic routes
        with app.test_client() as client:
            response = client.get('/health')
            if response.status_code == 200:
                print("✅ Health endpoint - OK")
                return True
            else:
                print(f"❌ Health endpoint - Status: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Flask application - Error: {e}")
        return False

def main():
    """Run all tests"""
    print("PDF Converter V2 - Setup Test")
    print("=" * 40)
    
    tests = [
        test_python_version,
        test_python_packages,
        test_external_dependencies,
        test_configuration,
        test_flask_app
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 40)
    print("TEST SUMMARY")
    print("=" * 40)
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"🎉 All {total} tests passed!")
        print("\n✅ Setup is complete and ready to use!")
        print("\nTo start the application:")
        print("  python app.py")
        print("\nThen visit: http://localhost:5000")
    else:
        print(f"⚠️ {passed}/{total} tests passed")
        print("\n❌ Some issues need to be resolved:")
        
        if not results[0]:
            print("- Update Python to version 3.8+")
        if not results[1]:
            print("- Install missing Python packages: pip install -r requirements.txt")
        if not results[2]:
            print("- Install Tesseract OCR and Poppler")
        if not results[3]:
            print("- Check configuration files")
        if not results[4]:
            print("- Review application setup")
        
        print("\nSee SETUP_GUIDE.md for detailed instructions.")

if __name__ == "__main__":
    main()
