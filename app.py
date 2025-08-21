"""
Refactored PDF Transaction Extractor Application
Clean, modular, and maintainable version with proper separation of concerns.
"""

import os
import json
import tempfile
import shutil
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_file, current_app
from werkzeug.utils import secure_filename
import PyPDF2
from pdf2image import convert_from_path
from PIL import Image, ImageDraw
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill
import re
import pytesseract
import cv2
import numpy as np
import requests
import spacy
from difflib import SequenceMatcher

from config import Config
from services.ocr_service import OCRService
from services.pdf_service import PDFService
from services.ai_service import AIService
from services.excel_service import ExcelService
from models.region import Region
from models.extraction_result import ExtractionResult
from utils.validators import FileValidator, RegionValidator
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)

@dataclass
class AppState:
    """Application state management."""
    current_pdf_path: Optional[str] = None
    current_regions: List[Region] = None
    current_page_count: int = 0
    current_page: int = 0
    current_image_dimensions: Optional[Dict[str, int]] = None
    
    def __post_init__(self):
        if self.current_regions is None:
            self.current_regions = []

class PDFTransactionExtractor:
    """Main application class with clean separation of concerns."""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.config = Config()
        self.state = AppState()
        
        # Initialize services
        self.ocr_service = OCRService(self.config)
        self.pdf_service = PDFService(self.config)
        self.ai_service = AIService(self.config)
        self.excel_service = ExcelService(self.config)
        
        # Initialize validators
        self.file_validator = FileValidator(self.config)
        self.region_validator = RegionValidator()
        
        self._setup_app()
        self._setup_routes()
    
    def _setup_app(self):
        """Configure Flask application."""
        self.app.config.from_object(self.config)
        
        # Ensure directories exist
        os.makedirs(self.config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(self.config.TEMP_FOLDER, exist_ok=True)
        
        # Configure Tesseract path for Windows
        if os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    def _setup_routes(self):
        """Setup application routes."""
        # Main pages
        self.app.route('/')(self.home)
        self.app.route('/tool')(self.tool)
        self.app.route('/static/<path:filename>')(self.static_files)
        
        # File operations
        self.app.route('/upload', methods=['POST'])(self.upload_file)
        self.app.route('/render_page/<int:page_num>')(self.render_page)
        self.app.route('/temp/<filename>')(self.temp_file)
        
        # Region management
        self.app.route('/save_regions', methods=['POST'])(self.save_regions)
        
        # Data extraction
        self.app.route('/extract_data', methods=['POST'])(self.extract_data)
        self.app.route('/extract_sample_data', methods=['POST'])(self.extract_sample_data)
        self.app.route('/download/<filename>')(self.download_file)
        
        # AI features
        self.app.route('/ai_suggest_regions', methods=['POST'])(self.ai_suggest_regions)
        self.app.route('/ai_enhance_text', methods=['POST'])(self.ai_enhance_text)
        self.app.route('/ai_validate_region', methods=['POST'])(self.ai_validate_region)
        
        # Utility endpoints
        self.app.route('/test_ocr', methods=['POST'])(self.test_ocr)
        self.app.route('/health')(self.health_check)
        self.app.route('/clear_session', methods=['POST'])(self.clear_session)
    
    def home(self):
        """Landing page with marketing content."""
        return render_template('index.html')
    
    def tool(self):
        """Main tool page with the PDF viewer and region selection interface."""
        return render_template('tool.html')
    
    def static_files(self, filename):
        """Serve static files."""
        return send_file(f'static/{filename}')
    
    def upload_file(self):
        """Handle PDF file upload and return page count."""
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Validate file
            if not self.file_validator.is_valid_pdf(file.filename):
                return jsonify({'error': 'Invalid file type. Please upload a PDF.'}), 400
            
            # Save the uploaded file
            filename = secure_filename(file.filename)
            filepath = os.path.join(self.config.UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            # Get page count
            page_count = self.pdf_service.get_page_count(filepath)
            
            # Update state
            self.state.current_pdf_path = filepath
            self.state.current_regions = []
            self.state.current_image_dimensions = None
            self.state.current_page_count = page_count
            
            logger.info(f"PDF uploaded: {filename} with {page_count} pages")
            
            return jsonify({
                'success': True,
                'page_count': page_count,
                'filename': filename
            })
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500
    
    def render_page(self, page_num):
        """Render a specific page of the PDF as an image."""
        try:
            if not self.state.current_pdf_path or not os.path.exists(self.state.current_pdf_path):
                return jsonify({'error': 'No PDF loaded'}), 400
            
            # Update current page
            self.state.current_page = page_num
            
            # Render page
            image_path, dimensions = self.pdf_service.render_page(
                self.state.current_pdf_path, 
                page_num, 
                self.config.TEMP_FOLDER
            )
            
            # Store dimensions
            self.state.current_image_dimensions = dimensions
            
            return jsonify({
                'success': True,
                'image_path': f'/temp/page_{page_num}.png',
                'width': dimensions['width'],
                'height': dimensions['height']
            })
            
        except Exception as e:
            logger.error(f"Error rendering page {page_num}: {e}")
            return jsonify({'error': f'Error rendering page: {str(e)}'}), 500
    
    def temp_file(self, filename):
        """Serve temporary files (rendered PDF pages)."""
        return send_file(os.path.join(self.config.TEMP_FOLDER, filename))
    
    def save_regions(self):
        """Save the user-defined regions."""
        try:
            data = request.get_json()
            regions_data = data.get('regions', [])
            
            # Convert to Region objects and validate
            regions = []
            for region_data in regions_data:
                region = Region.from_dict(region_data)
                if not self.region_validator.is_valid(region, self.state.current_image_dimensions):
                    return jsonify({'error': f'Invalid region: {region.name}'}), 400
                regions.append(region)
            
            self.state.current_regions = regions
            logger.info(f"Saved {len(regions)} regions")
            
            return jsonify({'success': True, 'regions_count': len(regions)})
            
        except Exception as e:
            logger.error(f"Error saving regions: {e}")
            return jsonify({'error': f'Error saving regions: {str(e)}'}), 500
    
    def extract_data(self):
        """Extract data from all pages using the defined regions."""
        try:
            if not self.state.current_pdf_path or not os.path.exists(self.state.current_pdf_path):
                return jsonify({'error': 'No PDF loaded'}), 400
            
            if not self.state.current_regions:
                return jsonify({'error': 'No regions defined'}), 400
            
            # Extract data from all pages
            extraction_results = []
            page_count = self.pdf_service.get_page_count(self.state.current_pdf_path)
            
            for page_num in range(page_count):
                logger.info(f"Processing page {page_num + 1}")
                page_data = {'page': page_num + 1}
                
                for region in self.state.current_regions:
                    text = self.ocr_service.extract_text_from_region(
                        self.state.current_pdf_path, 
                        page_num, 
                        region
                    )
                    
                    # Apply AI enhancements
                    enhanced_text = self.ai_service.enhance_text(text, region.name)
                    page_data[region.name] = enhanced_text
                
                extraction_results.append(page_data)
            
            # Create Excel file
            output_filename = self.excel_service.create_excel_file(
                extraction_results, 
                self.config.UPLOAD_FOLDER
            )
            
            logger.info(f"Extraction complete: {len(extraction_results)} records")
            
            return jsonify({
                'success': True,
                'output_file': output_filename,
                'records_extracted': len(extraction_results),
                'fields_extracted': len(self.state.current_regions)
            })
            
        except Exception as e:
            logger.error(f"Error extracting data: {e}")
            return jsonify({'error': f'Error extracting data: {str(e)}'}), 500
    
    def extract_sample_data(self):
        """Extract sample data from current page for Excel preview."""
        try:
            if not self.state.current_pdf_path:
                return jsonify({'error': 'No PDF loaded'}), 400
            
            data = request.get_json()
            regions_data = data.get('regions', [])
            page = data.get('page', 0)
            
            # Convert to Region objects
            regions = [Region.from_dict(region_data) for region_data in regions_data]
            
            # Extract data from each region
            extracted_data = []
            for region in regions:
                try:
                    text = self.ocr_service.extract_text_from_region(
                        self.state.current_pdf_path, 
                        page, 
                        region
                    )
                    enhanced_text = self.ai_service.enhance_text(text, region.name)
                    extracted_data.append({region.name: enhanced_text})
                except Exception as e:
                    logger.error(f"Error extracting from region {region.name}: {e}")
                    extracted_data.append({region.name: f"Error: {str(e)}"})
            
            return jsonify({
                'success': True,
                'extracted_data': extracted_data,
                'records_count': len(extracted_data),
                'page': page
            })
            
        except Exception as e:
            logger.error(f"Error extracting sample data: {e}")
            return jsonify({'error': f'Error extracting sample data: {str(e)}'}), 500
    
    def download_file(self, filename):
        """Download the extracted Excel file."""
        try:
            file_path = os.path.join(self.config.UPLOAD_FOLDER, filename)
            if os.path.exists(file_path):
                return send_file(file_path, as_attachment=True)
            else:
                return jsonify({'error': 'File not found'}), 404
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            return jsonify({'error': f'Error downloading file: {str(e)}'}), 500
    
    def ai_suggest_regions(self):
        """AI-powered region suggestion endpoint."""
        try:
            if not self.state.current_pdf_path:
                return jsonify({'error': 'No PDF loaded'}), 400
            
            page_image_path = os.path.join(self.config.TEMP_FOLDER, f'page_{self.state.current_page}.png')
            
            if not os.path.exists(page_image_path):
                return jsonify({'error': 'Page image not found'}), 400
            
            suggestions = self.ai_service.suggest_regions(page_image_path)
            
            return jsonify({
                'success': True,
                'suggestions': [region.to_dict() for region in suggestions],
                'count': len(suggestions)
            })
            
        except Exception as e:
            logger.error(f"Error generating AI suggestions: {e}")
            return jsonify({'error': f'Error generating AI suggestions: {str(e)}'}), 500
    
    def ai_enhance_text(self):
        """AI-powered text enhancement endpoint."""
        try:
            data = request.get_json()
            text = data.get('text', '')
            field_name = data.get('field_name')
            
            enhanced_text = self.ai_service.enhance_text(text, field_name)
            
            return jsonify({
                'success': True,
                'enhanced_text': enhanced_text
            })
            
        except Exception as e:
            logger.error(f"Error enhancing text: {e}")
            return jsonify({'error': f'Error enhancing text: {str(e)}'}), 500
    
    def ai_validate_region(self):
        """AI-powered region validation endpoint."""
        try:
            data = request.get_json()
            region_data = data.get('region')
            region = Region.from_dict(region_data)
            
            is_valid = self.region_validator.is_valid(region, self.state.current_image_dimensions)
            ai_validation = self.ai_service.validate_region(region)
            
            return jsonify({
                'success': True,
                'valid': is_valid,
                'ai_validation': ai_validation
            })
            
        except Exception as e:
            logger.error(f"Error validating region: {e}")
            return jsonify({'error': f'Error validating region: {str(e)}'}), 500
    
    def test_ocr(self):
        """Test OCR capabilities and return status."""
        try:
            ocr_status = self.ocr_service.test_capabilities()
            return jsonify({
                'success': True,
                **ocr_status
            })
        except Exception as e:
            logger.error(f"Error testing OCR: {e}")
            return jsonify({'error': f'Error testing OCR: {str(e)}'}), 500
    
    def health_check(self):
        """Health check endpoint for monitoring."""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0.0'
        })
    
    def clear_session(self):
        """Clear the current session data."""
        try:
            # Clean up temporary files
            temp_dir = self.config.TEMP_FOLDER
            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            
            # Reset state
            self.state = AppState()
            
            logger.info("Session cleared successfully")
            return jsonify({'success': True})
            
        except Exception as e:
            logger.error(f"Error clearing session: {e}")
            return jsonify({'error': f'Error clearing session: {str(e)}'}), 500
    
    def run(self, debug=True, host='0.0.0.0', port=5000):
        """Run the application."""
        self.app.run(debug=debug, host=host, port=port)

# Create application instance
app = PDFTransactionExtractor().app

if __name__ == '__main__':
    extractor = PDFTransactionExtractor()
    extractor.run()
