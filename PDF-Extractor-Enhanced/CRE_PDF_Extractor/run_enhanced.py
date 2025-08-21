#!/usr/bin/env python3
"""
Enhanced CRE PDF Extractor - Run Script
Simple script to run the enhanced application for testing and development.
"""

import os
import sys
from app_enhanced import app

def main():
    """Run the enhanced CRE PDF Extractor application."""
    print("🚀 Starting Enhanced CRE PDF Extractor...")
    print("=" * 50)
    
    # Check if required directories exist
    required_dirs = ['uploads', 'temp', 'logs']
    for dir_name in required_dirs:
        if not os.path.exists(dir_name):
            os.makedirs(dir_name)
            print(f"✅ Created directory: {dir_name}")
    
    # Check AI configuration
    try:
        from ai_service import AIService
        from config_enhanced import EnhancedConfig
        config = EnhancedConfig()
        ai_service = AIService(config)
        
        if ai_service.client:
            print("✅ AI Service: Enabled (OpenAI configured)")
        else:
            print("⚠️  AI Service: Disabled (No OpenAI API key)")
            print("   To enable AI features, run: python manage_api_keys.py")
    except Exception as e:
        print(f"⚠️  AI Service: Error - {e}")
    
    print("\n📋 Application Info:")
    print(f"   - Flask Version: {app.config.get('VERSION', 'Unknown')}")
    print(f"   - Debug Mode: {app.debug}")
    print(f"   - Routes: {len(app.url_map._rules)}")
    
    print("\n🌐 Starting server...")
    print("   - Local: http://localhost:5001")
    print("   - Network: http://0.0.0.0:5001")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 50)
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )

if __name__ == '__main__':
    main()

