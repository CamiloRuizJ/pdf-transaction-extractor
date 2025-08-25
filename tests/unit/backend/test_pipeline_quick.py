#!/usr/bin/env python3
import sys
import os
import tempfile

sys.path.insert(0, 'app')

from app import create_app
from services.processing_pipeline import ProcessingPipeline

# Create test app
app = create_app('testing')
with app.app_context():
    # Quick pipeline test
    p = ProcessingPipeline(app)
    print('Pipeline init: OK')

    # Create test PDF file
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\nxref\n0 3\ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\nstartxref\n%%EOF')
        test_file = f.name

    try:
        result = p.process_document(test_file, regions=None)
        print('Keys:', list(result.keys()))
        print('Success:', result.get('success'))
        error = result.get('error', 'None')
        print('Error:', error[:100] + '...' if len(str(error)) > 100 else error)
    finally:
        os.unlink(test_file)