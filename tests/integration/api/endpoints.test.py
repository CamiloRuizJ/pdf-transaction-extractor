"""
Integration Tests for API Endpoints
PDF Transaction Extractor - Backend API Integration Testing
"""

import pytest
import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from io import BytesIO

# Import the Flask app and test client
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from app import create_app
from app.routes import api_bp, main_bp


class TestAPIEndpoints:
    """Integration tests for API endpoints"""
    
    @pytest.fixture(scope='class')
    def app(self):
        """Create and configure test app"""
        app = create_app()
        app.config.update({
            'TESTING': True,
            'UPLOAD_FOLDER': tempfile.mkdtemp(),
            'SECRET_KEY': 'test-secret-key',
            'WTF_CSRF_ENABLED': False
        })
        
        # Register blueprints if not already registered
        if not hasattr(app, '_got_first_request'):
            app.register_blueprint(main_bp)
            app.register_blueprint(api_bp, url_prefix='/api')
        
        return app
    
    @pytest.fixture(scope='class')
    def client(self, app):
        """Create test client"""
        return app.test_client()
    
    @pytest.fixture
    def sample_pdf_file(self):
        """Create a sample PDF file for testing"""
        # Create a minimal PDF file content
        pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
398
%%EOF"""
        return BytesIO(pdf_content)


class TestHealthEndpoints:
    """Test health and status endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
        assert data['version'] == '2.0.0'
    
    def test_ai_status_endpoint(self, client):
        """Test AI status endpoint"""
        with patch('flask.current_app.config.get') as mock_config:
            mock_config.side_effect = lambda key, default=None: {
                'OPENAI_API_KEY': 'test-key',
                'OPENAI_MODEL': 'gpt-3.5-turbo'
            }.get(key, default)
            
            response = client.get('/api/ai/status')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['ai_service'] == 'OpenAI'
            assert data['configured'] is True
            assert data['model'] == 'gpt-3.5-turbo'
    
    def test_ai_status_not_configured(self, client):
        """Test AI status when not configured"""
        with patch('flask.current_app.config.get') as mock_config:
            mock_config.return_value = None
            
            response = client.get('/api/ai/status')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert data['configured'] is False
    
    def test_security_headers_endpoint(self, client):
        """Test security headers endpoint"""
        with patch('flask.current_app.config.get') as mock_config:
            mock_config.side_effect = lambda key, default=None: {
                'SECURITY_HEADERS': {'X-Content-Type-Options': 'nosniff'},
                'RATE_LIMIT_ENABLED': True
            }.get(key, default)
            
            response = client.get('/api/security/headers')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            assert 'security_headers' in data
            assert data['rate_limit_enabled'] is True


class TestFileUploadEndpoints:
    """Test file upload related endpoints"""
    
    def test_upload_valid_pdf(self, client, app, sample_pdf_file):
        """Test uploading a valid PDF file"""
        with app.app_context():
            with patch('flask.current_app.pdf_service') as mock_pdf_service:
                mock_pdf_service.get_pdf_info.return_value = {
                    'page_count': 1,
                    'file_size': len(sample_pdf_file.getvalue())
                }
                
                data = {
                    'file': (sample_pdf_file, 'test.pdf', 'application/pdf')
                }
                
                response = client.post('/api/upload', data=data, 
                                     content_type='multipart/form-data')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert 'filename' in response_data
                assert 'filepath' in response_data
                assert 'pdf_info' in response_data
    
    def test_upload_no_file(self, client):
        """Test upload without file"""
        response = client.post('/api/upload', data={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'No file provided'
    
    def test_upload_empty_filename(self, client):
        """Test upload with empty filename"""
        data = {
            'file': (BytesIO(b''), '', 'application/pdf')
        }
        
        response = client.post('/api/upload', data=data,
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['error'] == 'No file selected'
    
    def test_upload_invalid_file_type(self, client):
        """Test upload with invalid file type"""
        data = {
            'file': (BytesIO(b'text content'), 'test.txt', 'text/plain')
        }
        
        response = client.post('/api/upload', data=data,
                             content_type='multipart/form-data')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['error'] == 'Only PDF files are supported'


class TestDocumentProcessingEndpoints:
    """Test document processing endpoints"""
    
    def test_classify_document_success(self, client, app):
        """Test successful document classification"""
        with app.app_context():
            with patch('flask.current_app.pdf_service') as mock_pdf_service, \
                 patch('flask.current_app.document_classifier') as mock_classifier, \
                 patch('os.path.exists') as mock_exists:
                
                mock_exists.return_value = True
                mock_pdf_service.extract_text_from_pdf.return_value = {
                    'text': 'Sample rent roll document with unit numbers'
                }
                mock_classifier.classify_document.return_value = {
                    'document_type': 'rent_roll',
                    'confidence': 0.95
                }
                
                data = {'filepath': '/test/path/document.pdf'}
                response = client.post('/api/classify-document',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert response_data['classification']['document_type'] == 'rent_roll'
                assert response_data['classification']['confidence'] == 0.95
    
    def test_classify_document_invalid_path(self, client):
        """Test document classification with invalid path"""
        with patch('os.path.exists') as mock_exists:
            mock_exists.return_value = False
            
            data = {'filepath': '/invalid/path/document.pdf'}
            response = client.post('/api/classify-document',
                                 data=json.dumps(data),
                                 content_type='application/json')
            
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['error'] == 'Invalid file path'
    
    def test_suggest_regions_success(self, client, app):
        """Test successful region suggestion"""
        with app.app_context():
            with patch('flask.current_app.pdf_service') as mock_pdf_service, \
                 patch('flask.current_app.smart_region_manager') as mock_region_manager, \
                 patch('os.path.exists') as mock_exists:
                
                mock_exists.return_value = True
                mock_pdf_service.get_page_image.return_value = MagicMock()  # Mock PIL Image
                mock_region_manager.suggest_regions.return_value = [
                    {'name': 'unit_number', 'x': 100, 'y': 200, 'width': 50, 'height': 20},
                    {'name': 'tenant_name', 'x': 200, 'y': 200, 'width': 150, 'height': 20}
                ]
                
                data = {
                    'filepath': '/test/path/document.pdf',
                    'document_type': 'rent_roll'
                }
                
                response = client.post('/api/suggest-regions',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert len(response_data['regions']) == 2
                assert response_data['regions'][0]['name'] == 'unit_number'
    
    def test_extract_data_success(self, client, app):
        """Test successful data extraction"""
        with app.app_context():
            with patch('flask.current_app.pdf_service') as mock_pdf_service, \
                 patch('flask.current_app.ocr_service') as mock_ocr_service, \
                 patch('os.path.exists') as mock_exists:
                
                mock_exists.return_value = True
                mock_pdf_service.get_page_image.return_value = MagicMock()
                mock_ocr_service.extract_text_from_image.return_value = 'Unit 101'
                
                data = {
                    'filepath': '/test/path/document.pdf',
                    'regions': [
                        {'name': 'unit_number', 'x': 100, 'y': 200, 'width': 50, 'height': 20}
                    ]
                }
                
                response = client.post('/api/extract-data',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert 'extracted_data' in response_data
                assert response_data['extracted_data']['unit_number'] == 'Unit 101'
    
    def test_validate_data_success(self, client, app):
        """Test successful data validation"""
        with app.app_context():
            with patch('flask.current_app.ai_service') as mock_ai_service:
                mock_ai_service.validate_real_estate_data.return_value = {
                    'is_valid': True,
                    'confidence': 0.92,
                    'issues': []
                }
                
                data = {
                    'extracted_data': {'unit_number': '101', 'rent': '$1,200'},
                    'document_type': 'rent_roll'
                }
                
                response = client.post('/api/validate-data',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert response_data['validation']['is_valid'] is True
                assert response_data['validation']['confidence'] == 0.92


class TestQualityAndExportEndpoints:
    """Test quality scoring and export endpoints"""
    
    def test_calculate_quality_score(self, client, app):
        """Test quality score calculation"""
        with app.app_context():
            with patch('flask.current_app.quality_scorer') as mock_quality_scorer:
                mock_quality_scorer.calculate_quality_score.return_value = {
                    'overall_score': 85.5,
                    'completeness': 90.0,
                    'accuracy': 88.0,
                    'consistency': 78.5
                }
                
                data = {
                    'extracted_data': {'unit_number': '101', 'rent': '$1,200'},
                    'validation_results': {'is_valid': True, 'confidence': 0.92}
                }
                
                response = client.post('/api/quality-score',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert response_data['quality_score']['overall_score'] == 85.5
    
    def test_export_excel_success(self, client, app):
        """Test successful Excel export"""
        with app.app_context():
            with patch('flask.current_app.excel_service') as mock_excel_service:
                mock_excel_service.export_to_excel.return_value = '/test/path/output.xlsx'
                
                data = {
                    'extracted_data': {'unit_number': '101', 'rent': '$1,200'},
                    'document_type': 'rent_roll',
                    'filename': 'rent_roll_export.xlsx'
                }
                
                response = client.post('/api/export-excel',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert response_data['excel_path'] == '/test/path/output.xlsx'
                assert 'download_url' in response_data


class TestProcessingPipelineEndpoints:
    """Test complete processing pipeline endpoints"""
    
    def test_process_document_success(self, client, app):
        """Test successful document processing through pipeline"""
        with app.app_context():
            with patch('flask.current_app.processing_pipeline') as mock_pipeline, \
                 patch('os.path.exists') as mock_exists:
                
                mock_exists.return_value = True
                mock_pipeline.process_document.return_value = {
                    'classification': {'document_type': 'rent_roll', 'confidence': 0.95},
                    'extracted_data': {'unit_number': '101', 'rent': '$1,200'},
                    'validation': {'is_valid': True, 'confidence': 0.92},
                    'quality_score': 85.5
                }
                
                data = {
                    'filepath': '/test/path/document.pdf',
                    'regions': [{'name': 'unit_number', 'x': 100, 'y': 200}],
                    'document_type': 'rent_roll'
                }
                
                response = client.post('/api/process-document',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert 'processing_results' in response_data
                assert response_data['processing_results']['quality_score'] == 85.5
    
    def test_validate_processing_results(self, client, app):
        """Test processing results validation"""
        with app.app_context():
            with patch('flask.current_app.processing_pipeline') as mock_pipeline:
                mock_pipeline.validate_processing_results.return_value = {
                    'is_valid': True,
                    'warnings': [],
                    'errors': [],
                    'recommendations': ['Consider manual review of low-confidence extractions']
                }
                
                data = {
                    'processing_results': {
                        'extracted_data': {'unit_number': '101'},
                        'quality_score': 85.5
                    }
                }
                
                response = client.post('/api/validate-processing',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert response_data['validation_report']['is_valid'] is True
    
    def test_generate_processing_report(self, client, app):
        """Test processing report generation"""
        with app.app_context():
            with patch('flask.current_app.processing_pipeline') as mock_pipeline:
                mock_pipeline.generate_processing_report.return_value = {
                    'summary': {
                        'document_type': 'rent_roll',
                        'pages_processed': 1,
                        'data_points_extracted': 25,
                        'quality_score': 85.5
                    },
                    'details': {
                        'processing_time': '2.3 seconds',
                        'ai_confidence': 0.92,
                        'validation_passed': True
                    }
                }
                
                data = {
                    'processing_results': {
                        'extracted_data': {'unit_number': '101'},
                        'quality_score': 85.5
                    }
                }
                
                response = client.post('/api/generate-report',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 200
                response_data = json.loads(response.data)
                
                assert response_data['success'] is True
                assert 'report' in response_data
                assert response_data['report']['summary']['quality_score'] == 85.5
    
    def test_get_processing_status(self, client):
        """Test processing status retrieval"""
        processing_id = 'test-processing-123'
        
        response = client.get(f'/api/process-status/{processing_id}')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        
        assert response_data['processing_id'] == processing_id
        assert response_data['status'] == 'completed'
        assert response_data['progress'] == 100.0


class TestErrorHandling:
    """Test error handling across endpoints"""
    
    def test_upload_error_handling(self, client, app, sample_pdf_file):
        """Test upload error handling"""
        with app.app_context():
            with patch('flask.current_app.pdf_service') as mock_pdf_service:
                mock_pdf_service.get_pdf_info.side_effect = Exception('PDF processing error')
                
                data = {
                    'file': (sample_pdf_file, 'test.pdf', 'application/pdf')
                }
                
                response = client.post('/api/upload', data=data,
                                     content_type='multipart/form-data')
                
                assert response.status_code == 500
                response_data = json.loads(response.data)
                assert response_data['error'] == 'Upload failed'
    
    def test_classification_error_handling(self, client, app):
        """Test classification error handling"""
        with app.app_context():
            with patch('flask.current_app.document_classifier') as mock_classifier, \
                 patch('os.path.exists') as mock_exists:
                
                mock_exists.return_value = True
                mock_classifier.classify_document.side_effect = Exception('Classification error')
                
                data = {'filepath': '/test/path/document.pdf'}
                response = client.post('/api/classify-document',
                                     data=json.dumps(data),
                                     content_type='application/json')
                
                assert response.status_code == 500
                response_data = json.loads(response.data)
                assert response_data['error'] == 'Classification failed'
    
    def test_missing_processing_results(self, client):
        """Test handling of missing processing results"""
        data = {}  # Empty data
        
        response = client.post('/api/validate-processing',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['error'] == 'No processing results provided'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])