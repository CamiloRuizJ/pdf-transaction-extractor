"""
PDF Converter V2 - Routes
Main application routes and API endpoints.
"""

from flask import Blueprint, request, jsonify, render_template, send_file, current_app
import os
import hashlib
import structlog
import datetime
from marshmallow import Schema, fields, validate, ValidationError

# Try to import python-magic, fallback to basic validation if not available
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

logger = structlog.get_logger()

# Create blueprints
main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__)

# Validation schemas
class RegionSchema(Schema):
    x = fields.Integer(required=True, validate=validate.Range(min=0, max=10000))
    y = fields.Integer(required=True, validate=validate.Range(min=0, max=10000))
    width = fields.Integer(required=True, validate=validate.Range(min=1, max=5000))
    height = fields.Integer(required=True, validate=validate.Range(min=1, max=5000))
    name = fields.String(required=True, validate=validate.Length(max=100))

def validate_pdf_file(file):
    """Comprehensive PDF file validation with security checks."""
    try:
        # Check file size (16MB limit for serverless)
        file.seek(0, 2)  # Seek to end to get size
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > current_app.config['MAX_CONTENT_LENGTH']:
            return False, f"File too large. Maximum size: {current_app.config['MAX_CONTENT_LENGTH']} bytes"
        
        if file_size < 100:  # Minimum viable PDF size
            return False, "File too small to be a valid PDF"
        
        # Check filename extension
        if not file.filename.lower().endswith('.pdf'):
            return False, "Only PDF files are supported"
        
        # Read first 1KB for header analysis
        file_content = file.read(1024)
        file.seek(0)  # Reset file pointer
        
        # Check PDF signature
        if not file_content.startswith(b'%PDF-'):
            return False, "Invalid PDF signature"
        
        # If python-magic is available, perform MIME type check
        if HAS_MAGIC:
            try:
                mime_type = magic.from_buffer(file_content, mime=True)
                if mime_type != 'application/pdf':
                    return False, f"Invalid file type: {mime_type}. Expected: application/pdf"
            except Exception as e:
                logger.warning("Magic library check failed", error=str(e))
        
        # Basic PDF version check
        pdf_version = file_content[:8].decode('ascii', errors='ignore')
        if not pdf_version.startswith('%PDF-1.'):
            return False, "Unsupported PDF version"
        
        return True, "Valid PDF file"
        
    except Exception as e:
        logger.error("PDF validation error", error=str(e))
        return False, "File validation failed"

@main_bp.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@main_bp.route('/tool')
def tool():
    """Main PDF processing tool"""
    return render_template('tool.html')

@main_bp.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'version': '2.0.0'
    })

@api_bp.route('/upload', methods=['POST'])
def upload_file():
    """Handle PDF file upload with comprehensive security validation."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Comprehensive file validation
        is_valid, validation_message = validate_pdf_file(file)
        if not is_valid:
            logger.warning("File validation failed", 
                         filename=file.filename, 
                         reason=validation_message)
            return jsonify({'error': validation_message}), 400
        
        # Generate secure filename with hash
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        
        file_hash = hashlib.sha256(file_content).hexdigest()
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        secure_filename_str = f"{timestamp}_{file_hash[:16]}.pdf"
        
        # Ensure upload folder exists
        upload_folder = current_app.config.get('UPLOAD_FOLDER', '/tmp')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder, mode=0o755)
        
        filepath = os.path.join(upload_folder, secure_filename_str)
        
        # Save file with restricted permissions
        file.save(filepath)
        os.chmod(filepath, 0o644)  # Read-only for group and others
        
        logger.info("File uploaded successfully", 
                   original_filename=file.filename,
                   secure_filename=secure_filename_str,
                   file_size=len(file_content))
        
        # Get PDF info if service is available
        pdf_info = {}
        try:
            if hasattr(current_app, 'pdf_service'):
                pdf_info = current_app.pdf_service.get_pdf_info(filepath)
        except Exception as e:
            logger.warning("PDF info extraction failed", error=str(e))
        
        return jsonify({
            'success': True,
            'filename': secure_filename_str,
            'filepath': filepath,
            'file_size': len(file_content),
            'pdf_info': pdf_info
        })
        
    except Exception as e:
        logger.error("Error uploading file", error=str(e), exc_info=True)
        return jsonify({'error': 'Upload failed due to server error'}), 500

@api_bp.route('/classify-document', methods=['POST'])
def classify_document():
    """Classify document type using AI/ML"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'Invalid file path'}), 400
        
        # Extract text from PDF
        text_data = current_app.pdf_service.extract_text_from_pdf(filepath)
        
        # Classify document
        classification = current_app.document_classifier.classify_document(
            text_data.get('text', '')
        )
        
        return jsonify({
            'success': True,
            'classification': classification
        })
        
    except Exception as e:
        logger.error("Error classifying document", error=str(e))
        return jsonify({'error': 'Classification failed'}), 500

@api_bp.route('/suggest-regions', methods=['POST'])
def suggest_regions():
    """Get AI-suggested regions for data extraction"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        document_type = data.get('document_type')
        
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'Invalid file path'}), 400
        
        # Get first page image
        page_image = current_app.pdf_service.get_page_image(filepath, 0)
        
        if page_image is None:
            return jsonify({'error': 'Could not extract page image'}), 400
        
        # Get suggested regions
        regions = current_app.smart_region_manager.suggest_regions(
            document_type, page_image
        )
        
        return jsonify({
            'success': True,
            'regions': regions
        })
        
    except Exception as e:
        logger.error("Error suggesting regions", error=str(e))
        return jsonify({'error': 'Region suggestion failed'}), 500

@api_bp.route('/extract-data', methods=['POST'])
def extract_data():
    """Extract data from specified regions"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        regions = data.get('regions', [])
        
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'Invalid file path'}), 400
        
        # Get page image
        page_image = current_app.pdf_service.get_page_image(filepath, 0)
        
        if page_image is None:
            return jsonify({'error': 'Could not extract page image'}), 400
        
        # Extract data from regions
        extracted_data = {}
        for region in regions:
            region_data = current_app.ocr_service.extract_text_from_image(
                page_image, region
            )
            extracted_data[region.get('name', 'unknown')] = region_data
        
        return jsonify({
            'success': True,
            'extracted_data': extracted_data
        })
        
    except Exception as e:
        logger.error("Error extracting data", error=str(e))
        return jsonify({'error': 'Data extraction failed'}), 500

@api_bp.route('/validate-data', methods=['POST'])
def validate_data():
    """Validate extracted data using AI"""
    try:
        data = request.get_json()
        extracted_data = data.get('extracted_data', {})
        document_type = data.get('document_type')
        
        # Validate data using AI service
        validation_result = current_app.ai_service.validate_real_estate_data(
            extracted_data, document_type
        )
        
        return jsonify({
            'success': True,
            'validation': validation_result
        })
        
    except Exception as e:
        logger.error("Error validating data", error=str(e))
        return jsonify({'error': 'Data validation failed'}), 500

@api_bp.route('/quality-score', methods=['POST'])
def calculate_quality_score():
    """Calculate quality score for extracted data"""
    try:
        data = request.get_json()
        extracted_data = data.get('extracted_data', {})
        validation_results = data.get('validation_results', {})
        
        # Calculate quality score
        quality_score = current_app.quality_scorer.calculate_quality_score(
            extracted_data, validation_results
        )
        
        return jsonify({
            'success': True,
            'quality_score': quality_score
        })
        
    except Exception as e:
        logger.error("Error calculating quality score", error=str(e))
        return jsonify({'error': 'Quality scoring failed'}), 500

@api_bp.route('/export-excel', methods=['POST'])
def export_excel():
    """Export extracted data to Excel"""
    try:
        data = request.get_json()
        extracted_data = data.get('extracted_data', {})
        document_type = data.get('document_type')
        filename = data.get('filename', 'extracted_data.xlsx')
        
        # Export to Excel
        excel_path = current_app.excel_service.export_to_excel(
            extracted_data, document_type, filename
        )
        
        return jsonify({
            'success': True,
            'excel_path': excel_path,
            'download_url': f'/api/download/{os.path.basename(excel_path)}'
        })
        
    except Exception as e:
        logger.error("Error exporting to Excel", error=str(e))
        return jsonify({'error': 'Excel export failed'}), 500

@api_bp.route('/download/<filename>')
def download_file(filename):
    """Download generated files"""
    try:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True)
        
    except Exception as e:
        logger.error("Error downloading file", error=str(e))
        return jsonify({'error': 'Download failed'}), 500

@api_bp.route('/ai/status')
def ai_status():
    """Check AI service status"""
    try:
        # Check if OpenAI API key is configured
        api_key_configured = bool(current_app.config.get('OPENAI_API_KEY'))
        
        return jsonify({
            'ai_service': 'OpenAI',
            'configured': api_key_configured,
            'model': current_app.config.get('OPENAI_MODEL', 'gpt-3.5-turbo')
        })
        
    except Exception as e:
        logger.error("Error checking AI status", error=str(e))
        return jsonify({'error': 'AI status check failed'}), 500

@api_bp.route('/security/headers')
def security_headers():
    """Get security headers configuration"""
    try:
        return jsonify({
            'security_headers': current_app.config.get('SECURITY_HEADERS', {}),
            'rate_limit_enabled': current_app.config.get('RATE_LIMIT_ENABLED', True)
        })
        
    except Exception as e:
        logger.error("Error getting security headers", error=str(e))
        return jsonify({'error': 'Security headers check failed'}), 500

@api_bp.route('/process-document', methods=['POST'])
def process_document():
    """Process document through complete pipeline"""
    try:
        data = request.get_json()
        filepath = data.get('filepath')
        regions = data.get('regions')
        document_type = data.get('document_type')
        
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'Invalid file path'}), 400
        
        logger.info("Starting document processing", 
                   filepath=filepath, 
                   document_type=document_type,
                   regions_provided=bool(regions))
        
        # Process document through pipeline
        processing_results = current_app.processing_pipeline.process_document(
            filepath, regions, document_type
        )
        
        return jsonify({
            'success': True,
            'processing_results': processing_results
        })
        
    except Exception as e:
        logger.error("Error processing document", error=str(e))
        return jsonify({'error': 'Document processing failed', 'details': str(e)}), 500

@api_bp.route('/validate-processing', methods=['POST'])
def validate_processing():
    """Validate processing results"""
    try:
        data = request.get_json()
        processing_results = data.get('processing_results', {})
        
        if not processing_results:
            return jsonify({'error': 'No processing results provided'}), 400
        
        # Validate processing results
        validation_report = current_app.processing_pipeline.validate_processing_results(
            processing_results
        )
        
        return jsonify({
            'success': True,
            'validation_report': validation_report
        })
        
    except Exception as e:
        logger.error("Error validating processing results", error=str(e))
        return jsonify({'error': 'Processing validation failed'}), 500

@api_bp.route('/generate-report', methods=['POST'])
def generate_processing_report():
    """Generate comprehensive processing report"""
    try:
        data = request.get_json()
        processing_results = data.get('processing_results', {})
        
        if not processing_results:
            return jsonify({'error': 'No processing results provided'}), 400
        
        # Generate comprehensive report
        report = current_app.processing_pipeline.generate_processing_report(
            processing_results
        )
        
        return jsonify({
            'success': True,
            'report': report
        })
        
    except Exception as e:
        logger.error("Error generating processing report", error=str(e))
        return jsonify({'error': 'Report generation failed'}), 500

@api_bp.route('/process-status/<processing_id>')
def get_processing_status(processing_id):
    """Get processing status for a specific processing ID"""
    try:
        # This would typically check a database or cache for processing status
        # For now, return a basic status response
        return jsonify({
            'processing_id': processing_id,
            'status': 'completed',  # This should be dynamic based on actual processing
            'progress': 100.0,
            'stage': 'finalization',
            'message': 'Processing completed successfully'
        })
        
    except Exception as e:
        logger.error("Error getting processing status", 
                    error=str(e), 
                    processing_id=processing_id)
        return jsonify({'error': 'Status check failed'}), 500
