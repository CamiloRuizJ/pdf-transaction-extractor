#!/usr/bin/env python3
from app import create_app

app = create_app()
with app.app_context():
    print("Application running successfully!")
    print("Available services:")
    print(f"- PDF Service: {hasattr(app, 'pdf_service')}")
    print(f"- OCR Service: {hasattr(app, 'ocr_service')}")
    print(f"- AI Service: {hasattr(app, 'ai_service')}")
    print(f"- Smart Region Manager: {hasattr(app, 'smart_region_manager')}")
    print(f"- Quality Scorer: {hasattr(app, 'quality_scorer')}")
    print(f"- Excel Service: {hasattr(app, 'excel_service')}")
    print(f"- Processing Pipeline: {hasattr(app, 'processing_pipeline')}")