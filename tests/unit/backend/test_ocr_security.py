#!/usr/bin/env python3
"""
OCR Service Security Test Suite
Tests the security fixes implemented to prevent path disclosure and traversal attacks
"""

from app.services.ocr_service import OCRService
import tempfile
import os


def test_security_fixes():
    """Test all security fixes in the OCR Service"""
    print("=== OCR Service Security Test Suite ===\n")
    
    # Initialize OCR service
    ocr = OCRService()
    
    # Test 1: Path Traversal Attack Prevention
    print("1. Testing Path Traversal Attack Prevention...")
    result = ocr.extract_text_from_region('../../../etc/passwd', {'x': 0, 'y': 0, 'width': 100, 'height': 100})
    
    assert result['success'] == False, "Should reject path traversal attempts"
    assert 'error_code' in result, "Should provide secure error code"
    assert 'passwd' not in result.get('error_message', ''), "Should not expose attempted path in error message"
    
    print("PASS: Path traversal attacks are blocked")
    
    # Test 2: Invalid File Extension Security
    print("\n2. Testing Invalid File Extension Rejection...")
    result = ocr.extract_text_from_region('malicious.exe', {'x': 0, 'y': 0, 'width': 100, 'height': 100})
    
    assert result['success'] == False, "Should reject invalid file extensions"
    assert 'error_code' in result, "Should provide secure error code"
    
    print("PASS: Invalid file extensions are rejected")
    
    # Test 3: Path Disclosure Prevention
    print("\n3. Testing Path Disclosure Prevention...")
    result = ocr.extract_text_from_region('nonexistent.jpg', {'x': 0, 'y': 0, 'width': 100, 'height': 100})
    
    # Check that full paths are not exposed in error messages
    error_msg = result.get('error_message', '')
    assert 'nonexistent.jpg' not in error_msg, "Should not expose file paths in error messages"
    assert 'The specified file could not be accessed' in error_msg, "Should provide generic error message"
    
    print("PASS: File paths are not disclosed in error messages")
    
    # Test 4: Secure Error Response Structure
    print("\n4. Testing Secure Error Response Structure...")
    result = ocr.extract_text_from_region('test.txt', {'x': 0, 'y': 0, 'width': 100, 'height': 100})
    
    expected_fields = ['text', 'confidence', 'words', 'success', 'error_code', 'error_message', 'operation']
    for field in expected_fields:
        assert field in result, f"Missing expected field: {field}"
    
    # Ensure no sensitive fields are present
    sensitive_fields = ['error', 'full_path', 'file_path', 'directory']
    for field in sensitive_fields:
        assert field not in result, f"Sensitive field should not be present: {field}"
    
    print("PASS: Error response structure is secure")
    
    # Test 5: Secure File Identifier Generation
    print("\n5. Testing Secure File Identifier Generation...")
    test_path = "/some/sensitive/path/document.jpg"
    file_id = ocr._get_secure_file_identifier(test_path)
    
    assert "document.jpg" in file_id, "Should contain filename"
    assert "/some/sensitive/path" not in file_id, "Should not contain full directory path"
    assert len(file_id.split('[')[1].split(']')[0]) == 8, "Should contain 8-char hash"
    
    print("PASS: File identifiers are secure and non-exposing")
    
    print("\n=== All Security Tests PASSED ===")
    print("\nSecurity Improvements Summary:")
    print("- Path traversal attacks are blocked")
    print("- File paths are never exposed in error messages")
    print("- Invalid file types are rejected")
    print("- Secure error codes replace descriptive error messages")
    print("- Logging uses secure file identifiers")
    print("- Input validation prevents malicious file access")


if __name__ == "__main__":
    test_security_fixes()