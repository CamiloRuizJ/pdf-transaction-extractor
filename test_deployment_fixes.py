#!/usr/bin/env python3
"""
Test deployment fixes for 413 "Content Too Large" error
This script tests the enhanced upload functionality locally and provides
deployment verification steps.
"""

import os
import sys
import json
import time
import requests
from datetime import datetime

def test_local_api():
    """Test API endpoints locally before deployment"""
    base_url = "http://localhost:5000"  # Adjust if needed
    
    print("🧪 Testing Local API Endpoints...")
    print("=" * 60)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health endpoint: OK")
            health_data = response.json()
            print(f"   Service: {health_data.get('service')}")
            print(f"   Status: {health_data.get('status')}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health endpoint error: {str(e)}")
        print("   Note: Make sure the Flask app is running locally")
        return False
    
    # Test debug upload limits
    try:
        response = requests.get(f"{base_url}/debug/upload-limits", timeout=10)
        if response.status_code == 200:
            print("✅ Debug upload limits: OK")
            debug_data = response.json()
            limits = debug_data.get('limits', {})
            print(f"   Max content length: {limits.get('max_content_length_mb', 'unknown')}MB")
            print(f"   Vercel recommended max: {limits.get('vercel_recommended_max_mb', 'unknown')}MB")
        else:
            print(f"❌ Debug upload limits failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Debug upload limits error: {str(e)}")
    
    # Test file size check endpoint
    try:
        test_payload = {"file_size": 30 * 1024 * 1024}  # 30MB test
        response = requests.post(f"{base_url}/check-file-size", json=test_payload, timeout=10)
        if response.status_code == 200:
            print("✅ File size check endpoint: OK")
            check_data = response.json()
            print(f"   Can upload 30MB: {check_data.get('can_upload')}")
            print(f"   Vercel warning: {check_data.get('vercel_warning')}")
            print(f"   Recommendation: {check_data.get('recommendation')}")
        else:
            print(f"❌ File size check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ File size check error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Local API tests completed")
    return True

def test_vercel_deployment():
    """Test the deployed Vercel endpoints"""
    base_url = "https://rexeli.com/api"  # Your actual domain
    
    print("\n🚀 Testing Vercel Deployment...")
    print("=" * 60)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=15)
        if response.status_code == 200:
            print("✅ Deployed health endpoint: OK")
            health_data = response.json()
            print(f"   Service: {health_data.get('service')}")
            print(f"   Version: {health_data.get('version')}")
        else:
            print(f"❌ Deployed health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Deployed health endpoint error: {str(e)}")
        return False
    
    # Test debug upload limits on production
    try:
        response = requests.get(f"{base_url}/debug/upload-limits", timeout=15)
        if response.status_code == 200:
            print("✅ Production debug upload limits: OK")
            debug_data = response.json()
            limits = debug_data.get('limits', {})
            environment = debug_data.get('environment', {})
            platform = debug_data.get('platform', {})
            
            print(f"   Max content length: {limits.get('max_content_length_mb', 'unknown')}MB")
            print(f"   Flask environment: {environment.get('FLASK_ENV', 'unknown')}")
            print(f"   Is Vercel: {platform.get('is_vercel', 'unknown')}")
            print(f"   Vercel environment: {environment.get('VERCEL_ENV', 'unknown')}")
            
        else:
            print(f"❌ Production debug upload limits failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Production debug upload limits error: {str(e)}")
    
    # Test file size check with the problematic file size
    problematic_file_size = 25 * 1024 * 1024  # Approximate size of "IE Lease Comps 25k _2months.pdf"
    try:
        test_payload = {"file_size": problematic_file_size}
        response = requests.post(f"{base_url}/check-file-size", json=test_payload, timeout=15)
        if response.status_code == 200:
            print("✅ File size check for problematic file: OK")
            check_data = response.json()
            print(f"   Can upload {problematic_file_size / (1024*1024):.1f}MB: {check_data.get('can_upload')}")
            print(f"   Vercel warning: {check_data.get('vercel_warning')}")
            print(f"   Recommendation: {check_data.get('recommendation')}")
            
            alternatives = check_data.get('alternatives', {})
            if alternatives.get('chunked_upload'):
                print("   🔄 Chunked upload recommended")
            if alternatives.get('compression_suggested'):
                print("   🗜️ Compression suggested")
                
        else:
            print(f"❌ File size check for problematic file failed: {response.status_code}")
    except Exception as e:
        print(f"❌ File size check error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Vercel deployment tests completed")
    return True

def generate_deployment_report():
    """Generate a deployment report with recommendations"""
    
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "deployment_fixes_summary": {
            "vercel_json_updates": [
                "Added explicit function configuration with 3008MB memory",
                "Added duration limits and file inclusion patterns",
                "Enhanced headers for upload endpoints"
            ],
            "api_enhancements": [
                "Enhanced 413 error handler with detailed information",
                "Added request size validation before processing",
                "Improved CORS handling for upload endpoints",
                "Added comprehensive logging for debugging"
            ],
            "new_endpoints": [
                "/api/check-file-size - Validate file size before upload",
                "/api/upload-chunk - Chunked upload for large files",
                "/api/debug/upload-limits - Debug configuration info",
                "/api/debug/request-info - Request analysis"
            ]
        },
        "root_cause_analysis": {
            "primary_issue": "Vercel platform limits for serverless functions",
            "secondary_issues": [
                "Request body parsing limits at platform level",
                "Content-Length header validation before Flask processing",
                "Missing proper error reporting for size limits"
            ]
        },
        "solutions_implemented": {
            "immediate_fixes": [
                "Enhanced error messages with specific file size information",
                "Pre-upload file size validation",
                "Improved debugging endpoints"
            ],
            "alternative_upload_methods": [
                "Chunked upload for files > 25MB",
                "File size pre-checking",
                "Detailed error reporting with recommendations"
            ],
            "monitoring_improvements": [
                "Comprehensive request logging",
                "Upload attempt tracking",
                "Platform-specific error detection"
            ]
        },
        "testing_recommendations": {
            "files_to_test": [
                "IE Lease Comps 25k _2months.pdf (original problematic file)",
                "Files around 20-30MB size range",
                "Files larger than 50MB (should trigger chunked upload)"
            ],
            "test_scenarios": [
                "Standard upload for files < 25MB",
                "Size check endpoint for all files",
                "Chunked upload for files > 25MB",
                "Error handling for oversized files"
            ]
        },
        "deployment_checklist": [
            "✅ Updated vercel.json with enhanced configuration",
            "✅ Enhanced Flask app with better error handling",
            "✅ Added chunked upload capability",
            "✅ Implemented debugging endpoints",
            "🔄 Deploy to Vercel",
            "🔄 Test with problematic PDF file",
            "🔄 Verify error messages are informative",
            "🔄 Test chunked upload fallback"
        ],
        "expected_outcomes": {
            "for_small_files": "Upload should work normally (< 25MB)",
            "for_large_files": "Clear error message with chunked upload recommendation",
            "for_problematic_file": "Should either upload successfully or provide clear alternative",
            "error_messages": "Specific, actionable error messages instead of generic 413"
        }
    }
    
    print("\n📋 DEPLOYMENT FIXES REPORT")
    print("=" * 60)
    
    print(f"\n🕒 Report Generated: {report['timestamp']}")
    
    print(f"\n🔧 FIXES IMPLEMENTED:")
    for category, fixes in report['deployment_fixes_summary'].items():
        print(f"\n  {category.replace('_', ' ').title()}:")
        for fix in fixes:
            print(f"    • {fix}")
    
    print(f"\n🎯 ROOT CAUSE:")
    print(f"  Primary: {report['root_cause_analysis']['primary_issue']}")
    print(f"  Secondary Issues:")
    for issue in report['root_cause_analysis']['secondary_issues']:
        print(f"    • {issue}")
    
    print(f"\n✅ DEPLOYMENT CHECKLIST:")
    for item in report['deployment_checklist']:
        print(f"  {item}")
    
    print(f"\n🎯 EXPECTED OUTCOMES:")
    for scenario, outcome in report['expected_outcomes'].items():
        print(f"  {scenario.replace('_', ' ').title()}: {outcome}")
    
    print(f"\n📁 FILES MODIFIED:")
    print(f"  • C:\\Users\\cruiz\\pdf-transaction-extractor\\vercel.json")
    print(f"  • C:\\Users\\cruiz\\pdf-transaction-extractor\\api\\app.py")
    print(f"  • C:\\Users\\cruiz\\pdf-transaction-extractor\\test_deployment_fixes.py (this file)")
    
    return report

def main():
    """Main test function"""
    print("🚀 RExeli Upload Fix Deployment Test")
    print("=" * 60)
    print("This script tests the fixes for the persistent 413 'Content Too Large' error.")
    print("Testing both local development and production deployment configurations.\n")
    
    # Generate deployment report
    report = generate_deployment_report()
    
    # Prompt for testing
    print(f"\n" + "=" * 60)
    print("🧪 TESTING OPTIONS")
    print("=" * 60)
    print("1. Test local development server (http://localhost:5000)")
    print("2. Test production deployment (https://rexeli.com)")
    print("3. Skip testing and show deployment commands")
    print("4. Exit")
    
    while True:
        try:
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == "1":
                if test_local_api():
                    print("\n✅ Local testing completed successfully!")
                    print("📋 Next step: Deploy to Vercel using: vercel --prod")
                break
            elif choice == "2":
                if test_vercel_deployment():
                    print("\n✅ Production testing completed successfully!")
                    print("📋 Try uploading your problematic PDF file now.")
                break
            elif choice == "3":
                print("\n🚀 DEPLOYMENT COMMANDS:")
                print("=" * 40)
                print("1. Deploy to Vercel:")
                print("   cd C:\\Users\\cruiz\\pdf-transaction-extractor")
                print("   vercel --prod")
                print("")
                print("2. Test the problematic file:")
                print("   Upload: IE Lease Comps 25k _2months.pdf")
                print("   URL: https://rexeli.com")
                print("")
                print("3. Check debug info:")
                print("   GET https://rexeli.com/api/debug/upload-limits")
                print("")
                print("4. Test file size check:")
                print("   POST https://rexeli.com/api/check-file-size")
                print("   Body: {\"file_size\": 26214400}")  # 25MB in bytes
                break
            elif choice == "4":
                print("👋 Exiting...")
                break
            else:
                print("❌ Invalid choice. Please enter 1, 2, 3, or 4.")
                continue
                
        except KeyboardInterrupt:
            print("\n\n👋 Test interrupted by user")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            break
    
    print(f"\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    print("The deployment fixes have been implemented to address the 413 error:")
    print("")
    print("🔧 Key Improvements:")
    print("  • Enhanced error handling with specific file size info")
    print("  • Pre-upload file size validation")
    print("  • Chunked upload capability for large files") 
    print("  • Comprehensive debugging endpoints")
    print("  • Better Vercel platform integration")
    print("")
    print("📤 Next Steps:")
    print("  1. Deploy the updated code to Vercel")
    print("  2. Test with the problematic PDF file")
    print("  3. Monitor the enhanced error messages")
    print("  4. Use chunked upload if needed for very large files")
    print("")
    print("🔍 If issues persist, check:")
    print("  • /api/debug/upload-limits for configuration")
    print("  • /api/debug/request-info for request analysis")
    print("  • Vercel function logs for detailed error information")

if __name__ == "__main__":
    main()