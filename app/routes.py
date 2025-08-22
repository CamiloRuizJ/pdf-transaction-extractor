"""
PDF Converter V2 - Routes
Main application routes and API endpoints.
"""

from flask import Blueprint, request, jsonify, render_template, send_file, current_app
import os
import structlog
import datetime

logger = structlog.get_logger()

# Create blueprints
main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__)

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
    """Handle PDF file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are supported'}), 400
        
        # Save file temporarily
        filename = f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Get PDF info
        pdf_info = current_app.pdf_service.get_pdf_info(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': filepath,
            'pdf_info': pdf_info
        })
        
    except Exception as e:
        logger.error("Error uploading file", error=str(e))
        return jsonify({'error': 'Upload failed'}), 500

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
