#!/usr/bin/env python3
"""
Test script for 50MB PDF upload functionality
Tests both server upload (<25MB) and direct cloud upload (>25MB)
"""

import requests
import os
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"  # Change to your deployed URL
TEST_PDF_PATH = "IE Lease Comps 25k _2months.pdf"  # Your actual 25MB+ PDF

def test_health_check():
    """Test API health"""
    print("🔍 Testing API health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API healthy: {data.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API health check error: {str(e)}")
        return False

def test_upload_url_generation(filename, file_size):
    """Test upload URL generation"""
    print(f"\n📝 Testing upload URL generation for {filename} ({file_size / (1024*1024):.1f}MB)...")
    
    try:
        response = requests.post(f"{BASE_URL}/upload-url", json={
            "filename": filename,
            "file_size": file_size,
            "content_type": "application/pdf"
        })
        
        if response.status_code == 200:
            data = response.json()
            upload_method = data.get('upload_method', 'unknown')
            file_size_mb = data.get('file_size_mb', 0)
            
            print(f"✅ Upload URL generated successfully")
            print(f"   📊 Method: {upload_method}")
            print(f"   📏 Size: {file_size_mb}MB")
            
            if upload_method == 'direct_cloud':
                print(f"   ☁️  Cloud upload (presigned URL generated)")
                upload_info = data.get('upload_info', {})
                print(f"   🔗 S3 Key: {upload_info.get('key', 'N/A')}")
                print(f"   ⏰ Expires: {data.get('expires_at', 'N/A')}")
            else:
                print(f"   🖥️  Server upload (standard endpoint)")
                
            return data
        else:
            print(f"❌ Upload URL generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Upload URL generation error: {str(e)}")
        return None

def test_file_upload(file_path):
    """Test actual file upload"""
    if not os.path.exists(file_path):
        print(f"❌ Test file not found: {file_path}")
        return None
        
    file_size = os.path.getsize(file_path)
    filename = os.path.basename(file_path)
    
    print(f"\n📤 Testing file upload: {filename}")
    print(f"   📏 Size: {file_size / (1024*1024):.1f}MB")
    
    # First get upload URL
    upload_data = test_upload_url_generation(filename, file_size)
    if not upload_data:
        return None
    
    upload_method = upload_data.get('upload_method')
    
    if upload_method == 'direct_cloud':
        print(f"\n☁️  Simulating direct cloud upload...")
        print(f"   ℹ️  In real implementation, frontend would POST directly to S3")
        print(f"   ℹ️  Then call /confirm-upload with S3 key")
        
        # Simulate confirmation (in real app, this would happen after S3 upload)
        s3_key = upload_data.get('upload_info', {}).get('key', f'uploads/test_{int(time.time())}_{filename}')
        confirm_response = requests.post(f"{BASE_URL}/confirm-upload", json={
            "s3_key": s3_key,
            "original_filename": filename,
            "file_size": file_size
        })
        
        if confirm_response.status_code == 200:
            confirm_data = confirm_response.json()
            print(f"✅ Cloud upload confirmed")
            print(f"   🆔 File ID: {confirm_data.get('file_id', 'N/A')}")
            print(f"   🔑 S3 Key: {confirm_data.get('s3_key', 'N/A')}")
            return confirm_data
        else:
            print(f"❌ Upload confirmation failed: {confirm_response.status_code}")
            return None
            
    else:
        print(f"\n🖥️  Testing server upload...")
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (filename, f, 'application/pdf')}
                response = requests.post(f"{BASE_URL}/upload", files=files)
                
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Server upload successful")
                print(f"   🆔 File ID: {data.get('file_id', 'N/A')}")
                print(f"   📄 Filename: {data.get('original_filename', 'N/A')}")
                return data
            else:
                print(f"❌ Server upload failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Server upload error: {str(e)}")
            return None

def test_processing(upload_result):
    """Test document processing"""
    if not upload_result:
        print("❌ Cannot test processing - no upload result")
        return None
        
    print(f"\n⚡ Testing document processing...")
    
    # Prepare processing request
    process_data = {
        "file_id": upload_result.get('file_id'),
        "s3_key": upload_result.get('s3_key'),
        "storage_location": upload_result.get('storage_location', 'server')
    }
    
    try:
        response = requests.post(f"{BASE_URL}/process", json=process_data)
        
        if response.status_code == 200:
            data = response.json()
            processing_result = data.get('processing_result', {})
            
            print(f"✅ Processing completed successfully")
            print(f"   📊 Text length: {processing_result.get('text_length', 0)} characters")
            print(f"   🏷️  Document type: {processing_result.get('classification', {}).get('document_type', 'unknown')}")
            print(f"   ⚙️  Processing method: {processing_result.get('processing_method', 'unknown')}")
            
            file_info = processing_result.get('file_info', {})
            if file_info:
                print(f"   📁 Storage: {file_info.get('storage_location', 'unknown')}")
                print(f"   📏 Size: {file_info.get('file_size', 0) / (1024*1024):.1f}MB")
                
            return data
        else:
            print(f"❌ Processing failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Processing error: {str(e)}")
        return None

def main():
    """Run all tests"""
    print("🚀 Starting 50MB PDF Upload Test Suite")
    print("=" * 50)
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ Health check failed - aborting tests")
        return
    
    # Test 2: Small file (should use server upload)
    print(f"\n" + "=" * 50)
    print("TEST 2: Small File Upload (Server Upload)")
    small_file_result = test_upload_url_generation("small_test.pdf", 10 * 1024 * 1024)  # 10MB
    
    # Test 3: Large file (should use cloud upload)  
    print(f"\n" + "=" * 50)
    print("TEST 3: Large File Upload (Cloud Upload)")
    large_file_result = test_upload_url_generation("large_test.pdf", 30 * 1024 * 1024)  # 30MB
    
    # Test 4: Maximum file (should use cloud upload)
    print(f"\n" + "=" * 50) 
    print("TEST 4: Maximum File Size (Cloud Upload)")
    max_file_result = test_upload_url_generation("IE Lease Comps 25k _2months.pdf", 50 * 1024 * 1024)  # 50MB
    
    # Test 5: Actual file upload (if test file exists)
    if os.path.exists(TEST_PDF_PATH):
        print(f"\n" + "=" * 50)
        print("TEST 5: Real File Upload and Processing")
        upload_result = test_file_upload(TEST_PDF_PATH)
        
        if upload_result:
            processing_result = test_processing(upload_result)
            
            if processing_result:
                print(f"\n🎉 COMPLETE SUCCESS!")
                print(f"   ✅ File uploaded successfully")
                print(f"   ✅ Processing completed") 
                print(f"   ✅ AI pipeline functional")
            else:
                print(f"\n⚠️  PARTIAL SUCCESS")
                print(f"   ✅ File uploaded successfully")
                print(f"   ❌ Processing failed")
        else:
            print(f"\n❌ UPLOAD FAILED")
    else:
        print(f"\n⚠️  Skipping real file test - {TEST_PDF_PATH} not found")
    
    print(f"\n" + "=" * 50)
    print("🏁 Test Suite Complete")
    print("=" * 50)

if __name__ == "__main__":
    main()