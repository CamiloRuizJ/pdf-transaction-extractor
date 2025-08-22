"""
PDF Converter V2 - Services Package
Core services for document processing, AI/ML, and analytics.
"""

from .document_classifier import DocumentClassifier
from .smart_region_manager import SmartRegionManager
from .ai_service import AIService
from .ocr_service import OCRService
from .pdf_service import PDFService
from .excel_service import ExcelService
from .analytics_service import RealEstateAnalytics
from .quality_scorer import QualityScorer
from .processing_pipeline import ProcessingPipeline
from .integration_service import IntegrationService

__all__ = [
    'DocumentClassifier',
    'SmartRegionManager', 
    'AIService',
    'OCRService',
    'PDFService',
    'ExcelService',
    'RealEstateAnalytics',
    'QualityScorer',
    'ProcessingPipeline',
    'IntegrationService'
]

def initialize_services(app):
    """Initialize all services and attach them to the Flask app"""
    app.document_classifier = DocumentClassifier()
    app.smart_region_manager = SmartRegionManager()
    app.ai_service = AIService()
    app.ocr_service = OCRService()
    app.pdf_service = PDFService()
    app.excel_service = ExcelService()
    app.analytics_service = RealEstateAnalytics()
    app.quality_scorer = QualityScorer()
    app.processing_pipeline = ProcessingPipeline(app)
    app.integration_service = IntegrationService()
    
    app.logger.info("All V2 services initialized successfully")
