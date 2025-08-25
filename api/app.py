"""
RExeli API - Complete AI-Powered Real Estate Document Processing
Serverless Flask application optimized for Vercel deployment.
"""

import os
import sys
import json
import io
import tempfile
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

# Flask and web framework imports
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Add current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# Serverless configuration class
class ServerlessConfig:
    """Serverless-optimized configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # AI Settings
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    OPENAI_MODEL = 'gpt-3.5-turbo'
    OPENAI_TEMPERATURE = 0.1
    OPENAI_MAX_TOKENS = 1500
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL')
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
    
    # File handling
    UPLOAD_FOLDER = '/tmp/uploads'
    ALLOWED_EXTENSIONS = {'pdf'}
    
    # OCR settings (serverless compatible)
    OCR_CONFIDENCE_THRESHOLD = 0.6
    
    def __init__(self):
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)

# Create Flask application
app = Flask(__name__)
app.config.from_object(ServerlessConfig)

# Configure CORS for production domains
allowed_origins = [
    "https://rexeli.com",
    "https://www.rexeli.com",
    "http://localhost:3000",
    "http://localhost:5173"
]

CORS(app, resources={
    r"/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
    }
})

# Helper functions
def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def handle_error(error, status_code=500):
    """Standard error handler"""
    return jsonify({
        'success': False,
        'error': str(error),
        'timestamp': datetime.utcnow().isoformat()
    }), status_code

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0-complete',
        'environment': app.config['FLASK_ENV'],
        'features': {
            'ai_enabled': bool(app.config.get('OPENAI_API_KEY')),
            'database_enabled': bool(app.config.get('DATABASE_URL')),
            'pdf_processing': True,
            'ocr_enabled': True
        }
    })

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get API configuration status"""
    config_status = {
        'openai_configured': bool(os.environ.get('OPENAI_API_KEY')),
        'supabase_configured': bool(os.environ.get('SUPABASE_URL')),
        'database_configured': bool(os.environ.get('DATABASE_URL')),
        'flask_env': os.environ.get('FLASK_ENV', 'unknown'),
        'features': {
            'ai_processing': bool(os.environ.get('OPENAI_API_KEY')),
            'document_classification': True,
            'ocr_processing': True,
            'data_validation': True,
            'excel_export': True
        },
        'limits': {
            'max_file_size_mb': 16,
            'supported_formats': ['pdf'],
            'processing_timeout': 300
        }
    }
    return jsonify(config_status)

@app.route('/api/test-ai', methods=['POST'])
def test_ai():
    """Test OpenAI API connection with real estate context"""
    try:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
            
        # Try different OpenAI import approaches to bypass proxy issues
        try:
            # Clear proxy variables completely from environment
            import os
            proxy_env_vars = [
                'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
                'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'
            ]
            old_env = {}
            for var in proxy_env_vars:
                if var in os.environ:
                    old_env[var] = os.environ[var]
                    del os.environ[var]
            
            try:
                # Try alternative import pattern
                import openai
                
                # Use old style API (0.28.1)
                openai.api_key = api_key
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a real estate document processing expert."},
                        {"role": "user", "content": "Test successful - RExeli AI is ready for real estate document processing"}
                    ],
                    max_tokens=50,
                    temperature=0.1
                )
                response_text = response['choices'][0]['message']['content']
                model = response.get('model', 'gpt-3.5-turbo')
                usage = response.get('usage')
                
                return jsonify({
                    'success': True,
                    'response': response_text,
                    'model': model,
                    'usage': {
                        'prompt_tokens': usage.prompt_tokens if usage else None,
                        'completion_tokens': usage.completion_tokens if usage else None,
                        'total_tokens': usage.total_tokens if usage else None
                    } if usage else None
                })
                
            finally:
                # Restore environment variables
                for var, value in old_env.items():
                    os.environ[var] = value
            
        except ImportError as e:
            return jsonify({'error': f'OpenAI library not available: {str(e)}'}), 500
        except Exception as e:
            return jsonify({'error': f'OpenAI API error: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and initiate processing"""
    try:
        # Check if file is provided
        if 'file' not in request.files:
            return handle_error('No file provided', 400)
            
        file = request.files['file']
        if file.filename == '':
            return handle_error('No file selected', 400)
            
        # Validate file
        if not file or not allowed_file(file.filename):
            return handle_error('Invalid file type. Only PDF files are supported', 400)
            
        # Secure filename
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        # Save file temporarily
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        
        # Basic file validation
        if file_size > app.config['MAX_CONTENT_LENGTH']:
            os.remove(file_path)
            return handle_error(f'File too large. Maximum size is {app.config["MAX_CONTENT_LENGTH"] // (1024*1024)}MB', 400)
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'file_id': unique_filename,
            'original_filename': filename,
            'file_size': file_size,
            'upload_timestamp': datetime.utcnow().isoformat(),
            'next_step': 'process'
        })
        
    except Exception as e:
        return handle_error(f'Upload failed: {str(e)}', 500)

@app.route('/api/process', methods=['POST'])
def process_document():
    """Process uploaded document with full AI capabilities"""
    try:
        data = request.get_json()
        if not data or 'file_id' not in data:
            return handle_error('No file_id provided', 400)
            
        file_id = data['file_id']
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
        
        if not os.path.exists(file_path):
            return handle_error('File not found', 404)
            
        # Initialize AI service
        ai_service = get_ai_service()
        
        # Process PDF
        processing_result = process_pdf_document(file_path, ai_service)
        
        # Clean up temporary file
        try:
            os.remove(file_path)
        except:
            pass  # Don't fail if cleanup fails
            
        return jsonify({
            'success': True,
            'processing_result': processing_result,
            'processed_timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return handle_error(f'Processing failed: {str(e)}', 500)

@app.route('/api/classify', methods=['POST'])
def classify_document():
    """Classify document type using AI"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return handle_error('No text provided for classification', 400)
            
        text = data['text'][:5000]  # Limit text length
        
        ai_service = get_ai_service()
        classification = ai_service.classify_document_content(text)
        
        return jsonify({
            'success': True,
            'classification': classification,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return handle_error(f'Classification failed: {str(e)}', 500)

@app.route('/api/enhance', methods=['POST'])
def enhance_data():
    """Enhance extracted data using AI"""
    try:
        data = request.get_json()
        if not data or 'raw_data' not in data:
            return handle_error('No raw_data provided', 400)
            
        raw_data = data['raw_data']
        document_type = data.get('document_type', 'unknown')
        
        ai_service = get_ai_service()
        enhanced = ai_service.enhance_extracted_data(raw_data, document_type)
        
        return jsonify({
            'success': True,
            'enhanced_data': enhanced,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return handle_error(f'Enhancement failed: {str(e)}', 500)

@app.route('/api/validate', methods=['POST'])
def validate_data():
    """Validate real estate data using AI"""
    try:
        data = request.get_json()
        if not data or 'data' not in data:
            return handle_error('No data provided for validation', 400)
            
        validation_data = data['data']
        document_type = data.get('document_type', 'unknown')
        
        ai_service = get_ai_service()
        validation_result = ai_service.validate_real_estate_data(validation_data, document_type)
        
        return jsonify({
            'success': True,
            'validation': validation_result,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return handle_error(f'Validation failed: {str(e)}', 500)

@app.route('/api/export', methods=['POST'])
def export_data():
    """Export processed data to Excel format"""
    try:
        data = request.get_json()
        if not data or 'data' not in data:
            return handle_error('No data provided for export', 400)
            
        export_data = data['data']
        format_type = data.get('format', 'xlsx')
        
        # Generate Excel file
        excel_buffer = generate_excel_export(export_data)
        
        return send_file(
            excel_buffer,
            as_attachment=True,
            download_name=f'rexeli_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return handle_error(f'Export failed: {str(e)}', 500)

# AI Service Functions
def get_ai_service():
    """Get AI service instance"""
    try:
        return AIServiceServerless(
            api_key=app.config.get('OPENAI_API_KEY'),
            model=app.config.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
            temperature=app.config.get('OPENAI_TEMPERATURE', 0.1)
        )
    except:
        # Fallback to basic AI service
        return BasicAIService()

def process_pdf_document(file_path: str, ai_service) -> Dict[str, Any]:
    """Process PDF document with full pipeline"""
    try:
        # Extract text from PDF
        text_content = extract_pdf_text(file_path)
        
        if not text_content or len(text_content.strip()) < 50:
            raise ValueError("Could not extract sufficient text from PDF")
        
        # Classify document
        classification = ai_service.classify_document_content(text_content)
        document_type = classification.get('document_type', 'unknown')
        
        # Extract structured data
        structured_data = ai_service.extract_structured_data(text_content, document_type)
        
        # Enhance extracted data
        enhanced_data = ai_service.enhance_extracted_data(
            structured_data.get('extracted_fields', {}), 
            document_type
        )
        
        # Validate data
        validation_result = ai_service.validate_real_estate_data(
            enhanced_data.get('enhanced_data', {}),
            document_type
        )
        
        return {
            'text_length': len(text_content),
            'classification': classification,
            'structured_data': structured_data,
            'enhanced_data': enhanced_data,
            'validation': validation_result,
            'processing_method': 'full_ai_pipeline'
        }
        
    except Exception as e:
        raise Exception(f"Document processing failed: {str(e)}")

def extract_pdf_text(file_path: str) -> str:
    """Extract text from PDF using PyPDF2"""
    try:
        import PyPDF2
        text_content = ""
        
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
                except Exception as e:
                    continue
                    
        return text_content.strip()
        
    except ImportError:
        raise Exception("PyPDF2 not available for PDF text extraction")
    except Exception as e:
        raise Exception(f"PDF text extraction failed: {str(e)}")

def generate_excel_export(data: Dict[str, Any]) -> io.BytesIO:
    """Generate Excel export from processed data"""
    try:
        import pandas as pd
        from io import BytesIO
        
        buffer = BytesIO()
        
        # Create workbook with multiple sheets
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Summary sheet
            summary_data = {
                'Field': [],
                'Value': [],
                'Confidence': []
            }
            
            enhanced_data = data.get('enhanced_data', {}).get('enhanced_data', {})
            for field, value in enhanced_data.items():
                summary_data['Field'].append(field)
                summary_data['Value'].append(str(value))
                summary_data['Confidence'].append('High')
            
            if summary_data['Field']:
                pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            
            # Classification sheet if available
            classification = data.get('classification', {})
            if classification:
                class_df = pd.DataFrame([
                    {'Property': k, 'Value': v} for k, v in classification.items() 
                    if not isinstance(v, (dict, list))
                ])
                if not class_df.empty:
                    class_df.to_excel(writer, sheet_name='Classification', index=False)
            
            # Validation sheet if available
            validation = data.get('validation', {})
            if validation.get('errors') or validation.get('warnings'):
                validation_data = []
                for error in validation.get('errors', []):
                    validation_data.append({'Type': 'Error', 'Message': error})
                for warning in validation.get('warnings', []):
                    validation_data.append({'Type': 'Warning', 'Message': warning})
                
                if validation_data:
                    pd.DataFrame(validation_data).to_excel(writer, sheet_name='Validation', index=False)
        
        buffer.seek(0)
        return buffer
        
    except ImportError:
        raise Exception("Pandas/openpyxl not available for Excel export")
    except Exception as e:
        raise Exception(f"Excel export failed: {str(e)}")

# AI Service Classes
class AIServiceServerless:
    """Serverless-optimized AI service with OpenAI integration"""
    
    def __init__(self, api_key: str = None, model: str = 'gpt-3.5-turbo', temperature: float = 0.1):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.client = None
        
        if self.api_key:
            try:
                # Clear proxy variables to avoid conflicts
                proxy_env_vars = [
                    'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
                    'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'
                ]
                old_env = {}
                for var in proxy_env_vars:
                    if var in os.environ:
                        old_env[var] = os.environ[var]
                        del os.environ[var]
                
                try:
                    import openai
                    
                    # Use old style API (0.28.1)
                    openai.api_key = self.api_key
                    self.client = openai
                    self._is_new_style = False
                        
                finally:
                    # Restore environment variables
                    for var, value in old_env.items():
                        os.environ[var] = value
                        
            except ImportError:
                pass
    
    def _make_openai_request(self, messages, temperature=None, max_tokens=1500):
        """Make OpenAI API request using old style API (0.28.1)"""
        if not self.client:
            raise Exception("OpenAI client not available")
        
        # Use old style API (0.28.1)
        response = self.client.ChatCompletion.create(
            model=self.model,
            messages=messages,
            temperature=temperature or self.temperature,
            max_tokens=max_tokens
        )
        return response['choices'][0]['message']['content']
    
    def classify_document_content(self, text: str) -> Dict[str, Any]:
        """Classify document content using AI"""
        try:
            if not self.client:
                return self._basic_classification(text)
                
            prompt = f"""
Classify this real estate document text and extract key information:

{text[:2000]}...

Return JSON with:
{{
  "document_type": "lease_agreement|purchase_contract|property_listing|rent_roll|offering_memo",
  "property_type": "office|retail|industrial|residential|mixed_use",
  "confidence": float_0_to_1,
  "key_entities": ["list", "of", "important", "entities"],
  "summary": "brief document summary"
}}
"""
            
            messages = [
                {"role": "system", "content": "You are a real estate document classification expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ]
            
            response = self._make_openai_request(messages)
            return json.loads(response)
            
        except Exception as e:
            return self._basic_classification(text)
    
    def extract_structured_data(self, text: str, document_type: str) -> Dict[str, Any]:
        """Extract structured data from document text"""
        try:
            if not self.client:
                return self._basic_extraction(text, document_type)
                
            prompt = f"""
Extract structured data from this {document_type} document:

{text[:3000]}...

Return JSON with extracted fields relevant to {document_type}:
{{
  "extracted_fields": {{
    "property_address": "full address if found",
    "tenant_name": "tenant name if applicable",
    "landlord_name": "landlord name if applicable", 
    "rent_amount": "monthly rent if applicable",
    "lease_term": "lease duration if applicable",
    "square_footage": "property size if found",
    "other_relevant_fields": "values"
  }},
  "extraction_confidence": float_0_to_1
}}

Only include fields that are clearly present in the text.
"""
            
            messages = [
                {"role": "system", "content": "You are a real estate data extraction expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ]
            
            response = self._make_openai_request(messages)
            return json.loads(response)
            
        except Exception as e:
            return self._basic_extraction(text, document_type)
    
    def enhance_extracted_data(self, raw_data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Enhance extracted data using AI"""
        try:
            if not self.client or not raw_data:
                return {
                    "enhanced_data": raw_data,
                    "original_data": raw_data,
                    "enhancement_confidence": 0.6,
                    "method": "basic"
                }
                
            prompt = f"""
Enhance and standardize this {document_type} data:

{json.dumps(raw_data, indent=2)}

Return JSON with enhanced data:
{{
  "enhanced_data": {{
    "standardized_and_corrected_fields": "enhanced values"
  }},
  "enhancement_confidence": float_0_to_1,
  "changes_made": ["list of improvements made"]
}}

Focus on:
- Standardizing formats (addresses, phone numbers, currency)
- Correcting OCR errors
- Adding inferred information
- Validating data consistency
"""
            
            messages = [
                {"role": "system", "content": "You are a real estate data enhancement expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ]
            
            response = self._make_openai_request(messages)
            enhanced_result = json.loads(response)
            
            return {
                "enhanced_data": enhanced_result.get("enhanced_data", raw_data),
                "original_data": raw_data,
                "enhancement_confidence": enhanced_result.get("enhancement_confidence", 0.8),
                "changes_made": enhanced_result.get("changes_made", []),
                "method": "ai_enhanced"
            }
            
        except Exception as e:
            return {
                "enhanced_data": raw_data,
                "original_data": raw_data,
                "enhancement_confidence": 0.6,
                "method": "basic_fallback",
                "error": str(e)
            }
    
    def validate_real_estate_data(self, data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Validate real estate data using AI"""
        try:
            if not self.client or not data:
                return self._basic_validation(data, document_type)
                
            prompt = f"""
Validate this {document_type} data for accuracy and completeness:

{json.dumps(data, indent=2)}

Return JSON validation results:
{{
  "valid": boolean,
  "errors": ["list of critical errors"],
  "warnings": ["list of warnings"],
  "suggestions": ["improvement suggestions"],
  "confidence": float_0_to_1,
  "field_scores": {{"field_name": confidence_score}}
}}

Check for:
- Required field completeness
- Data format validity
- Real estate industry standards
- Logical consistency
- Market reasonableness
"""
            
            messages = [
                {"role": "system", "content": "You are a real estate data validation expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ]
            
            response = self._make_openai_request(messages)
            return json.loads(response)
            
        except Exception as e:
            return self._basic_validation(data, document_type)
    
    def _basic_classification(self, text: str) -> Dict[str, Any]:
        """Basic classification fallback"""
        text_lower = text.lower()
        doc_type = "unknown"
        
        if "lease" in text_lower or "tenant" in text_lower:
            doc_type = "lease_agreement"
        elif "purchase" in text_lower or "sale" in text_lower:
            doc_type = "purchase_contract"
        elif "listing" in text_lower:
            doc_type = "property_listing"
            
        return {
            "document_type": doc_type,
            "property_type": "commercial",
            "confidence": 0.6,
            "key_entities": [],
            "summary": "Basic classification",
            "method": "basic"
        }
    
    def _basic_extraction(self, text: str, document_type: str) -> Dict[str, Any]:
        """Basic extraction fallback"""
        import re
        
        extracted = {}
        
        # Basic regex patterns
        address_pattern = r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)'
        rent_pattern = r'\$[\d,]+(?:\.\d{2})?'
        
        address_match = re.search(address_pattern, text, re.IGNORECASE)
        if address_match:
            extracted["property_address"] = address_match.group()
            
        rent_matches = re.findall(rent_pattern, text)
        if rent_matches:
            extracted["rent_amount"] = rent_matches[0]
        
        return {
            "extracted_fields": extracted,
            "extraction_confidence": 0.5,
            "method": "basic_regex"
        }
    
    def _basic_validation(self, data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Basic validation fallback"""
        errors = []
        warnings = []
        
        if not data:
            errors.append("No data to validate")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "suggestions": ["Consider using AI validation for better results"],
            "confidence": 0.5,
            "field_scores": {},
            "method": "basic"
        }

# Basic AI Service fallback
class BasicAIService:
    """Basic AI service fallback when OpenAI is not available"""
    
    def classify_document_content(self, text: str) -> Dict[str, Any]:
        return {
            'document_type': 'unknown',
            'confidence': 0.5,
            'method': 'basic_fallback'
        }
    
    def extract_structured_data(self, text: str, document_type: str) -> Dict[str, Any]:
        return {
            'extracted_fields': {},
            'extraction_confidence': 0.5,
            'method': 'basic_fallback'
        }
    
    def enhance_extracted_data(self, raw_data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        return {
            'enhanced_data': raw_data,
            'original_data': raw_data,
            'enhancement_confidence': 0.5,
            'method': 'basic_fallback'
        }
    
    def validate_real_estate_data(self, data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        return {
            'valid': True,
            'errors': [],
            'warnings': [],
            'confidence': 0.5,
            'method': 'basic_fallback'
        }

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'API endpoint not found', 'success': False}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'success': False}), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({'error': 'File too large', 'success': False}), 413

# Export app for Vercel
if __name__ == '__main__':
    app.run(debug=False)