#!/usr/bin/env python3
"""
Example usage of the AI Service for PDF Transaction Extractor.

This script demonstrates how to use the AI service for various real estate
document processing tasks. Set OPENAI_API_KEY environment variable to use
full AI capabilities, otherwise fallback methods will be used.
"""

import os
import json
from app.services.ai_service import AIService

def main():
    print("=== PDF Transaction Extractor - AI Service Demo ===\n")
    
    # Initialize the AI service
    ai_service = AIService()
    
    print(f"OpenAI Client Available: {ai_service.client is not None}")
    print(f"Model: {ai_service.model}")
    print(f"Usage Statistics: {ai_service.get_usage_statistics()}\n")
    
    # Sample real estate data for testing
    sample_lease_data = {
        "property_address": "l23 Main 5treet, New York, NY l001l",
        "tenant_name": "John D0e",
        "landlord_name": "Jane 5mith",
        "monthly_rent": "$2,5OO.OO",
        "lease_start": "Ol/Ol/2O24",
        "lease_end": "l2/3l/2O24",
        "security_deposit": "$5,OOO",
        "square_footage": "l,2OO 5F",
        "property_type": "0ffice"
    }
    
    sample_document_text = """
    COMMERCIAL LEASE AGREEMENT
    
    This lease agreement is entered into between Jane Smith (Landlord) and 
    John Doe (Tenant) for the property located at 123 Main Street, New York, NY 10011.
    
    Monthly Rent: $2,500.00
    Lease Term: January 1, 2024 to December 31, 2024
    Security Deposit: $5,000.00
    Property Type: Office Space
    Square Footage: 1,200 SF
    
    Tenant Contact: john.doe@email.com
    Phone: (555) 123-4567
    """
    
    print("1. DOCUMENT CLASSIFICATION")
    print("-" * 40)
    classification = ai_service.classify_document_content(sample_document_text)
    print(f"Document Type: {classification['document_type']}")
    print(f"Property Type: {classification['property_type']}")
    print(f"Confidence: {classification['confidence']}")
    print(f"Method: {classification['method']}\n")
    
    print("2. DATA ENHANCEMENT")
    print("-" * 40)
    enhanced = ai_service.enhance_extracted_data(sample_lease_data, "lease_agreement")
    print(f"Enhancement Method: {enhanced.get('enhancement_method', 'ai')}")
    print(f"Enhancement Confidence: {enhanced['enhancement_confidence']}")
    print("Enhanced Data Sample:")
    for key, value in list(enhanced['enhanced_data'].items())[:3]:
        original = sample_lease_data.get(key, "N/A")
        print(f"  {key}:")
        print(f"    Original: {original}")
        print(f"    Enhanced: {value}")
    print()
    
    print("3. DATA VALIDATION")
    print("-" * 40)
    validation = ai_service.validate_real_estate_data(sample_lease_data, "lease_agreement")
    print(f"Valid: {validation['valid']}")
    print(f"Confidence: {validation['confidence']}")
    print(f"Errors: {len(validation['errors'])}")
    if validation['errors']:
        for error in validation['errors'][:3]:
            print(f"  - {error}")
    print(f"Warnings: {len(validation['warnings'])}")
    if validation['warnings']:
        for warning in validation['warnings'][:3]:
            print(f"  - {warning}")
    print()
    
    print("4. OCR ERROR CORRECTION")
    print("-" * 40)
    test_ocr_text = "l23 Main 5treet, New Y0rk, NY l001l - 0ffice 5pace"
    ocr_result = ai_service.correct_ocr_errors(test_ocr_text, "real_estate")
    print(f"Original: {test_ocr_text}")
    print(f"Corrected: {ocr_result['corrected_text']}")
    print(f"Confidence: {ocr_result['confidence']}")
    print(f"Method: {ocr_result['method']}")
    if ocr_result.get('corrections_made'):
        print(f"Corrections: {ocr_result['corrections_made']}")
    print()
    
    print("5. FIELD CORRECTIONS")
    print("-" * 40)
    field_data = {
        "property_address": "l23 Main 5treet",
        "phone_number": "555-l23-4567",
        "email": "john.d0e@email.c0m"
    }
    context = {"document_type": "lease_agreement", "property_type": "office"}
    
    corrections = ai_service.suggest_field_corrections(field_data, context)
    print("Field Corrections:")
    for field, correction in corrections['corrections'].items():
        original = field_data[field]
        confidence = corrections['confidence_scores'].get(field, 0)
        print(f"  {field}:")
        print(f"    Original: {original}")
        print(f"    Suggested: {correction}")
        print(f"    Confidence: {confidence}")
    print()
    
    print("6. STRUCTURED DATA EXTRACTION")
    print("-" * 40)
    extraction = ai_service.extract_structured_data(sample_document_text, "lease_agreement")
    print(f"Extraction Method: {extraction['method']}")
    print(f"Overall Confidence: {extraction['extraction_confidence']}")
    print("Extracted Fields:")
    for field, data in list(extraction['extracted_fields'].items())[:4]:
        if isinstance(data, dict):
            print(f"  {field}: {data.get('value', 'N/A')} (confidence: {data.get('confidence', 'N/A')})")
        else:
            print(f"  {field}: {data}")
    print()
    
    print("7. DATA INSIGHTS GENERATION")
    print("-" * 40)
    insights = ai_service.generate_data_insights(enhanced['enhanced_data'])
    print(f"Analysis Method: {insights['method']}")
    print("Market Insights:")
    for insight in insights['market_insights'][:2]:
        print(f"  - {insight}")
    print(f"Investment Score: {insights['investment_potential']['score']}/10")
    print(f"Risk Level: {insights['risk_assessment']['risk_level']}")
    print()
    
    print("8. BATCH PROCESSING DEMO")
    print("-" * 40)
    batch_items = [
        {"data": sample_lease_data, "document_type": "lease_agreement"},
        {"data": {"property_address": "456 Oak Ave", "listing_price": "$300,000"}, "document_type": "property_listing"}
    ]
    
    batch_results = ai_service.process_batch(batch_items, "enhance", batch_size=2, delay=0.1)
    print(f"Processed {len(batch_results)} items in batch")
    for i, result in enumerate(batch_results):
        if 'error' not in result:
            print(f"  Item {i+1}: Enhancement confidence {result.get('enhancement_confidence', 'N/A')}")
        else:
            print(f"  Item {i+1}: Error - {result['error']}")
    print()
    
    print("9. FINAL USAGE STATISTICS")
    print("-" * 40)
    final_stats = ai_service.get_usage_statistics()
    print(f"Total Requests: {final_stats['total_requests']}")
    print(f"Total Tokens: {final_stats['total_tokens']}")
    print(f"Estimated Cost: ${final_stats['estimated_cost']}")
    print(f"Model Used: {final_stats['model_used']}")
    
    print("\n=== Demo Complete ===")
    print("\nTo use full AI capabilities, set your OpenAI API key:")
    print("export OPENAI_API_KEY='your-api-key-here'")
    print("or set it in your .env file")


if __name__ == "__main__":
    main()