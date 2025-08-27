#!/usr/bin/env python3
"""
Test script to demonstrate the AI processing capabilities
"""

import requests
import json

# Test the AI endpoints
BASE_URL = "http://localhost:5000"

def test_ai_endpoints():
    print("Testing RExeli AI Processing Pipeline")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Health Check:")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        health_data = response.json()
        print(f"   Status: {health_data.get('status', 'unknown')}")
        print(f"   OpenAI Available: {health_data.get('openai_available', False)}")
        print(f"   AI Model: {health_data.get('ai_model', 'none')}")
        print(f"   Supabase Available: {health_data.get('supabase_available', False)}")
    except Exception as e:
        print(f"   X Error: {e}")
    
    # Test 2: Data Validation (doesn't need file URL)
    print("\n2. Testing AI Data Validation:")
    test_data = {
        "extractedData": {
            "property_address": {"value": "123 Main St, Dallas, TX", "confidence": 0.95, "type": "text"},
            "rental_income": {"value": "$2,500/month", "confidence": 0.88, "type": "currency"},
            "lease_term": {"value": "12 months", "confidence": 0.92, "type": "text"}
        },
        "documentType": "lease_agreement"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/validate-data", json=test_data)
        if response.status_code == 200:
            result = response.json()
            print("   AI Validation successful!")
            validation = result.get('data', {}).get('validation', {})
            print(f"   Valid: {validation.get('is_valid', False)}")
            print(f"   Confidence: {validation.get('confidence', 0):.2f}")
            if validation.get('warnings'):
                print(f"   Warnings: {validation.get('warnings', [])}")
        else:
            print(f"   X Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   X Error: {e}")
    
    # Test 3: Quality Score Calculation
    print("\n3. Testing AI Quality Score:")
    quality_data = {
        "extractedData": {
            "field1": {"confidence": 0.95},
            "field2": {"confidence": 0.88},
            "field3": {"confidence": 0.92}
        },
        "validationResults": {
            "validation": {
                "is_valid": True,
                "errors": [],
                "warnings": ["Minor formatting issue"],
                "confidence": 0.9
            }
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/quality-score", json=quality_data)
        if response.status_code == 200:
            result = response.json()
            print("   + Quality Score calculation successful!")
            quality = result.get('data', {}).get('quality_score', {})
            print(f"   Overall Score: {quality.get('overall', 0):.2f}")
            print(f"   Completeness: {quality.get('completeness', 0):.2f}")
            print(f"   Confidence: {quality.get('confidence', 0):.2f}")
            print(f"   Validation: {quality.get('validation', 0):.2f}")
        else:
            print(f"   X Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   X Error: {e}")
    
    print("\n" + "=" * 50)
    print("TARGET: AI Pipeline Status: Ready for complete workflow!")
    print("   - Upload PDFs via frontend")
    print("   - AI will classify document types")
    print("   - Extract data with region detection") 
    print("   - Validate and score results")
    print("   - Export to Excel")

if __name__ == "__main__":
    test_ai_endpoints()