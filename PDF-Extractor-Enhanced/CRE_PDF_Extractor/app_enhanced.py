"""
Enhanced CRE PDF Extractor
Advanced version with ChatGPT integration and security features.
"""

import os
import json
import tempfile
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_file
from werkzeug.utils import secure_filename
import PyPDF2
from pdf2image import convert_from_path
from PIL import Image
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill
import pytesseract

from config_enhanced import EnhancedConfig
from ai_service import AIService

# Setup logger
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedCREExtractor:
    """Enhanced CRE PDF Extractor with AI capabilities."""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.config = EnhancedConfig()
        
        # Initialize AI service
        self.ai_service = AIService(self.config)
        
        # Application state
        self.current_pdf = None
        self.current_regions = []
        self.current_page = 0
        
        self._setup_app()
        self._setup_routes()
    
    def _setup_app(self):
        """Setup Flask application."""
        self.app.config['MAX_CONTENT_LENGTH'] = self.config.MAX_FILE_SIZE
        self.app.config['SECRET_KEY'] = self.config.SECRET_KEY
        
        # Setup Tesseract for Windows
        if os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    def _setup_routes(self):
        """Setup all application routes."""
        # Main pages
        self.app.route('/')(self.home)
        self.app.route('/tool')(self.tool)
        
        # File operations
        self.app.route('/upload', methods=['POST'])(self.upload_file)
        self.app.route('/render_page/<int:page_num>')(self.render_page)
        self.app.route('/temp/<filename>')(self.temp_file)
        
        # Region management
        self.app.route('/save_regions', methods=['POST'])(self.save_regions)
        self.app.route('/get_regions')(self.get_regions)
        self.app.route('/suggest_regions', methods=['POST'])(self.suggest_regions)
        
        # OCR and extraction
        self.app.route('/extract_text', methods=['POST'])(self.extract_text)
        self.app.route('/test_ocr', methods=['POST'])(self.test_ocr)
        self.app.route('/enhance_text', methods=['POST'])(self.enhance_text)
        
        # Excel generation
        self.app.route('/generate_excel', methods=['POST'])(self.generate_excel)
        self.app.route('/download_excel/<filename>')(self.download_excel)
        
        # Session management
        self.app.route('/clear_session', methods=['POST'])(self.clear_session)
        self.app.route('/health')(self.health_check)
        
        # AI features
        self.app.route('/validate_data', methods=['POST'])(self.validate_data)
        self.app.route('/extract_structured', methods=['POST'])(self.extract_structured)
    
    def home(self):
        """Home page."""
        return render_template('index.html')
    
    def tool(self):
        """Main tool page."""
        return render_template('tool.html')
    
    def upload_file(self):
        """Handle file upload."""
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['file']
            
            # Validate file
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not file.filename.lower().endswith('.pdf'):
                return jsonify({'error': 'Only PDF files are allowed'}), 400
            
            # Save file
            filename = secure_filename(file.filename)
            filepath = os.path.join(self.config.UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            # Get PDF info
            page_count = self._get_pdf_page_count(filepath)
            file_size = os.path.getsize(filepath)
            
            # Update state
            self.current_pdf = filepath
            self.current_page = 0
            self.current_regions = []
            
            logger.info(f"File uploaded: {filename} ({page_count} pages)")
            return jsonify({
                'success': True,
                'filename': filename,
                'page_count': page_count,
                'file_size': file_size
            })
            
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def render_page(self, page_num):
        """Render PDF page as image."""
        try:
            if not self.current_pdf:
                return jsonify({'error': 'No PDF loaded'}), 400
            
            if page_num < 0 or page_num >= self._get_pdf_page_count(self.current_pdf):
                return jsonify({'error': 'Invalid page number'}), 400
            
            # Convert PDF page to image
            poppler_path = os.path.join(os.getcwd(), 'poppler', 'poppler-23.11.0', 'Library', 'bin')
            images = convert_from_path(
                self.current_pdf,
                first_page=page_num + 1,
                last_page=page_num + 1,
                poppler_path=poppler_path,
                dpi=self.config.OCR_DPI
            )
            
            if not images:
                return jsonify({'error': 'Failed to convert page'}), 500
            
            # Save image
            image = images[0]
            image_path = os.path.join(self.config.TEMP_FOLDER, f'page_{page_num}.jpg')
            image.save(image_path, 'JPEG', quality=self.config.IMAGE_QUALITY)
            
            self.current_page = page_num
            
            return jsonify({
                'success': True,
                'image_url': f'/temp/page_{page_num}.jpg',
                'width': image.width,
                'height': image.height
            })
            
        except Exception as e:
            logger.error(f"Render error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def temp_file(self, filename):
        """Serve temporary files."""
        try:
            return send_file(os.path.join(self.config.TEMP_FOLDER, filename))
        except Exception as e:
            logger.error(f"Temp file error: {e}")
            return jsonify({'error': 'File not found'}), 404
    
    def save_regions(self):
        """Save regions for extraction."""
        try:
            data = request.get_json()
            regions_data = data.get('regions', [])
            
            self.current_regions = []
            for region_data in regions_data:
                region = {
                    'name': region_data['name'],
                    'x': region_data['x'],
                    'y': region_data['y'],
                    'width': region_data['width'],
                    'height': region_data['height']
                }
                self.current_regions.append(region)
            
            logger.info(f"Saved {len(self.current_regions)} regions")
            return jsonify({'success': True, 'count': len(self.current_regions)})
            
        except Exception as e:
            logger.error(f"Save regions error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def get_regions(self):
        """Get current regions."""
        try:
            return jsonify({'regions': self.current_regions})
        except Exception as e:
            logger.error(f"Get regions error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def suggest_regions(self):
        """Get AI-suggested regions."""
        try:
            data = request.get_json()
            image_description = data.get('description', '')
            
            if not image_description:
                return jsonify({'error': 'No description provided'}), 400
            
            suggestions = self.ai_service.suggest_regions(image_description)
            
            return jsonify({
                'success': True,
                'suggestions': suggestions
            })
            
        except Exception as e:
            logger.error(f"Suggest regions error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def extract_text(self):
        """Extract text from regions with AI enhancement."""
        try:
            if not self.current_pdf:
                return jsonify({'error': 'No PDF loaded'}), 400
            
            if not self.current_regions:
                return jsonify({'error': 'No regions defined'}), 400
            
            data = request.get_json()
            page_num = data.get('page', self.current_page)
            use_ai = data.get('use_ai', True)
            
            results = []
            
            # Convert PDF page to image
            poppler_path = os.path.join(os.getcwd(), 'poppler', 'poppler-23.11.0', 'Library', 'bin')
            images = convert_from_path(
                self.current_pdf,
                first_page=page_num + 1,
                last_page=page_num + 1,
                poppler_path=poppler_path,
                dpi=self.config.OCR_DPI
            )
            
            if not images:
                return jsonify({'error': 'Failed to convert page'}), 500
            
            image = images[0]
            
            # Extract text from each region
            for region in self.current_regions:
                # Basic OCR
                text = self._extract_text_from_region(image, region)
                confidence = 0.8
                
                # AI enhancement if enabled
                if use_ai and self.config.AI_TEXT_CORRECTION:
                    enhanced = self.ai_service.enhance_text(text, region['name'])
                    text = enhanced['enhanced']
                    confidence = enhanced['confidence']
                
                result = {
                    'region_name': region['name'],
                    'text': text,
                    'confidence': confidence,
                    'page': page_num
                }
                results.append(result)
            
            logger.info(f"Extracted text from {len(results)} regions")
            return jsonify({'results': results})
            
        except Exception as e:
            logger.error(f"Extract text error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def test_ocr(self):
        """Test OCR on a specific region."""
        try:
            data = request.get_json()
            region_data = data.get('region')
            page_num = data.get('page', self.current_page)
            use_ai = data.get('use_ai', True)
            
            if not region_data:
                return jsonify({'error': 'No region provided'}), 400
            
            # Convert PDF page to image
            poppler_path = os.path.join(os.getcwd(), 'poppler', 'poppler-23.11.0', 'Library', 'bin')
            images = convert_from_path(
                self.current_pdf,
                first_page=page_num + 1,
                last_page=page_num + 1,
                poppler_path=poppler_path,
                dpi=self.config.OCR_DPI
            )
            
            if not images:
                return jsonify({'error': 'Failed to convert page'}), 500
            
            image = images[0]
            text = self._extract_text_from_region(image, region_data)
            
            # AI enhancement
            enhanced = None
            if use_ai and self.config.AI_TEXT_CORRECTION:
                enhanced = self.ai_service.enhance_text(text, region_data['name'])
            
            return jsonify({
                'success': True,
                'original_text': text,
                'enhanced_text': enhanced,
                'region': region_data
            })
            
        except Exception as e:
            logger.error(f"Test OCR error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def enhance_text(self):
        """Enhance text using AI."""
        try:
            data = request.get_json()
            text = data.get('text', '')
            context = data.get('context', '')
            
            if not text:
                return jsonify({'error': 'No text provided'}), 400
            
            enhanced = self.ai_service.enhance_text(text, context)
            
            return jsonify({
                'success': True,
                'result': enhanced
            })
            
        except Exception as e:
            logger.error(f"Enhance text error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def validate_data(self):
        """Validate extracted data using AI."""
        try:
            data = request.get_json()
            extracted_data = data.get('data', {})
            
            if not extracted_data:
                return jsonify({'error': 'No data provided'}), 400
            
            validation = self.ai_service.validate_data(extracted_data)
            
            return jsonify({
                'success': True,
                'validation': validation
            })
            
        except Exception as e:
            logger.error(f"Validate data error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def extract_structured(self):
        """Extract structured data using AI."""
        try:
            data = request.get_json()
            text = data.get('text', '')
            template = data.get('template', {})
            
            if not text or not template:
                return jsonify({'error': 'Text and template required'}), 400
            
            result = self.ai_service.extract_structured_data(text, template)
            
            return jsonify({
                'success': True,
                'result': result
            })
            
        except Exception as e:
            logger.error(f"Extract structured error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def generate_excel(self):
        """Generate Excel file from extracted data."""
        try:
            data = request.get_json()
            results = data.get('results', [])
            
            if not results:
                return jsonify({'error': 'No data to export'}), 400
            
            # Create DataFrame
            df_data = []
            for result in results:
                df_data.append({
                    'Region': result['region_name'],
                    'Text': result['text'],
                    'Confidence': result['confidence'],
                    'Page': result['page']
                })
            
            df = pd.DataFrame(df_data)
            
            # Create Excel file
            filename = f'cre_extracted_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(self.config.TEMP_FOLDER, filename)
            
            with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name=self.config.EXCEL_SHEET_NAME, index=False)
                
                # Format worksheet
                workbook = writer.book
                worksheet = writer.sheets[self.config.EXCEL_SHEET_NAME]
                
                # Format headers
                header_font = Font(bold=True, size=12)
                header_fill = PatternFill(start_color='CCCCCC', end_color='CCCCCC', fill_type='solid')
                
                for cell in worksheet[1]:
                    cell.font = header_font
                    cell.fill = header_fill
                
                # Auto-adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            logger.info(f"CRE Excel file generated: {filename}")
            return jsonify({
                'success': True,
                'filename': filename,
                'download_url': f'/download_excel/{filename}'
            })
            
        except Exception as e:
            logger.error(f"Generate Excel error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def download_excel(self, filename):
        """Download Excel file."""
        try:
            filepath = os.path.join(self.config.TEMP_FOLDER, filename)
            return send_file(filepath, as_attachment=True)
        except Exception as e:
            logger.error(f"Download error: {e}")
            return jsonify({'error': 'File not found'}), 404
    
    def clear_session(self):
        """Clear current session."""
        try:
            self.current_pdf = None
            self.current_regions = []
            self.current_page = 0
            
            # Clean up temp files
            temp_dir = Path(self.config.TEMP_FOLDER)
            for file in temp_dir.glob('*'):
                if file.is_file():
                    file.unlink()
            
            logger.info("CRE session cleared")
            return jsonify({'success': True})
            
        except Exception as e:
            logger.error(f"Clear session error: {e}")
            return jsonify({'error': str(e)}), 500
    
    def health_check(self):
        """Health check endpoint."""
        ai_status = "enabled" if self.ai_service.client else "disabled"
        return jsonify({
            'status': 'healthy', 
            'timestamp': datetime.now().isoformat(),
            'ai_service': ai_status,
            'version': 'CRE Enhanced'
        })
    
    def _get_pdf_page_count(self, pdf_path: str) -> int:
        """Get number of pages in PDF."""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                return len(reader.pages)
        except Exception as e:
            logger.error(f"Error getting page count: {e}")
            return 0
    
    def _extract_text_from_region(self, image: Image.Image, region: Dict) -> str:
        """Extract text from a specific region in an image."""
        try:
            # Crop the region
            cropped = image.crop((region['x'], region['y'], region['x'] + region['width'], region['y'] + region['height']))
            
            # Perform OCR
            text = pytesseract.image_to_string(cropped, config=self.config.TESSERACT_CONFIG)
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error extracting text from region {region.get('name', 'unknown')}: {e}")
            return ""
    
    def run(self, debug=True, host='0.0.0.0', port=5001):
        """Run the enhanced application."""
        self.app.run(debug=debug, host=host, port=port)

# Create application instance
app = EnhancedCREExtractor().app

if __name__ == '__main__':
    extractor = EnhancedCREExtractor()
    extractor.run()
