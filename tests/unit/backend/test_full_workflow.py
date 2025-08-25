#!/usr/bin/env python3
"""Test complete workflow to verify all components work together"""

import tempfile
import os
from app import create_app

# Create app
app = create_app()

with app.app_context():
    # Test pipeline
    from app.services.processing_pipeline import ProcessingPipeline
    
    pipeline = ProcessingPipeline(app)
    print("[OK] Pipeline initialized successfully")
    
    # Create minimal PDF for testing
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        # Simple PDF content
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
180
%%EOF"""
        f.write(pdf_content)
        test_file = f.name
    
    print(f"[OK] Created test PDF: {test_file}")
    
    try:
        # Test document processing
        result = pipeline.process_document(test_file)
        
        print(f"[OK] Processing completed")
        print(f"  Success: {result.get('success', False)}")
        print(f"  Keys: {list(result.keys())}")
        
        if result.get('error'):
            print(f"  Error: {result['error'][:200]}...")
        
        if result.get('extracted_text'):
            text_len = len(result['extracted_text'].get('text', ''))
            print(f"  Text extracted: {text_len} chars")
            
        if result.get('document_type'):
            print(f"  Document type: {result['document_type']}")
            
    except Exception as e:
        print(f"[ERROR] Processing failed: {str(e)[:200]}...")
        import traceback
        traceback.print_exc()
    
    finally:
        os.unlink(test_file)
        print("[OK] Cleanup completed")