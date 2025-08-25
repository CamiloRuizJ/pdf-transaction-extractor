"""
Processing Pipeline
Orchestrates document processing workflow.
"""

import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
import structlog

logger = structlog.get_logger()

class ProcessingPipeline:
    """End-to-end document processing pipeline with comprehensive workflow management"""
    
    def __init__(self, app):
        self.app = app
        # Initialize services
        self.pdf_service = getattr(app, 'pdf_service', None)
        self.ocr_service = getattr(app, 'ocr_service', None)
        self.ai_service = getattr(app, 'ai_service', None)
        self.document_classifier = getattr(app, 'document_classifier', None)
        self.smart_region_manager = getattr(app, 'smart_region_manager', None)
        self.quality_scorer = getattr(app, 'quality_scorer', None)
        
        # Processing stages for progress tracking
        self.processing_stages = [
            'initialization',
            'pdf_processing',
            'document_classification',
            'region_detection',
            'ocr_processing',
            'ai_enhancement',
            'quality_assessment',
            'data_structuring',
            'finalization'
        ]
        
        # Progress callback for UI updates
        self.progress_callback = None
    
    def set_progress_callback(self, callback: Callable[[str, float, Dict], None]):
        """Set progress callback for UI updates"""
        self.progress_callback = callback
    
    def _update_progress(self, stage: str, progress: float, metadata: Dict[str, Any] = None):
        """Update processing progress"""
        if self.progress_callback:
            try:
                self.progress_callback(stage, progress, metadata or {})
            except Exception as e:
                logger.warning("Progress callback failed", error=str(e))
        
        logger.info("Processing progress", 
                   stage=stage, 
                   progress=progress,
                   metadata=metadata)
    
    def process_document(self, file_path: str, regions: List[Dict] = None, 
                        document_type: str = None) -> Dict[str, Any]:
        """Process document through the complete pipeline
        
        Args:
            file_path: Path to PDF file
            regions: Optional predefined regions for extraction
            document_type: Optional document type override
            
        Returns:
            Complete processing results with extracted data and metadata
        """
        start_time = time.time()
        processing_id = f"proc_{int(time.time())}"
        
        try:
            logger.info("Starting document processing", 
                       file_path=file_path,
                       processing_id=processing_id)
            
            # Stage 1: Initialization
            self._update_progress('initialization', 5.0, {
                'message': 'Initializing processing pipeline',
                'file_path': file_path
            })
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            result = {
                'processing_id': processing_id,
                'file_path': file_path,
                'start_time': datetime.utcnow().isoformat(),
                'success': False,
                'stages': {},
                'extracted_data': {},
                'metadata': {},
                'errors': [],
                'warnings': []
            }
            
            # Choose processing path based on regions
            if regions:
                processing_result = self.process_with_regions(file_path, regions, document_type)
            else:
                processing_result = self.process_full_document(file_path, document_type)
            
            # Merge results
            result.update(processing_result)
            result['success'] = processing_result.get('success', False)
            result['end_time'] = datetime.utcnow().isoformat()
            result['processing_time'] = time.time() - start_time
            
            # Stage 9: Finalization
            self._update_progress('finalization', 100.0, {
                'message': 'Processing completed',
                'success': result['success']
            })
            
            logger.info("Document processing completed", 
                       processing_id=processing_id,
                       success=result['success'],
                       processing_time=result['processing_time'])
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error("Document processing failed", 
                        error=error_msg,
                        processing_id=processing_id)
            
            return {
                'processing_id': processing_id,
                'file_path': file_path,
                'success': False,
                'error': error_msg,
                'end_time': datetime.utcnow().isoformat(),
                'processing_time': time.time() - start_time,
                'stages': {},
                'extracted_data': {},
                'metadata': {}
            }
    
    def process_with_regions(self, file_path: str, regions: List[Dict], 
                           document_type: str) -> Dict[str, Any]:
        """Process document with predefined regions"""
        try:
            result = {
                'success': True,
                'stages': {},
                'extracted_data': {},
                'metadata': {'processing_mode': 'regions'},
                'errors': [],
                'warnings': []
            }
            
            # Stage 2: PDF Processing
            self._update_progress('pdf_processing', 15.0, {
                'message': 'Converting PDF to images'
            })
            
            pdf_info = self.pdf_service.get_pdf_info(file_path)
            page_images = self.pdf_service.convert_pdf_to_images(file_path, [0])  # First page
            
            result['stages']['pdf_processing'] = {
                'success': True,
                'pdf_info': pdf_info,
                'pages_processed': len(page_images)
            }
            
            if not page_images:
                raise ValueError("Could not extract page images from PDF")
            
            page_image = page_images[0]
            
            # Stage 3: Document Classification (if not provided)
            if not document_type:
                self._update_progress('document_classification', 25.0, {
                    'message': 'Classifying document type'
                })
                
                # Extract text for classification
                text_data = self.pdf_service.extract_text_from_pdf(file_path)
                classification_result = self.document_classifier.classify_document(
                    text_data.get('text', '')
                )
                
                document_type = classification_result.get('document_type', 'unknown')
                result['stages']['document_classification'] = classification_result
            else:
                result['stages']['document_classification'] = {
                    'document_type': document_type,
                    'confidence': 1.0,
                    'method': 'provided'
                }
            
            # Stage 4: Region Processing (skip detection, use provided)
            self._update_progress('region_detection', 35.0, {
                'message': f'Processing {len(regions)} predefined regions'
            })
            
            result['stages']['region_detection'] = {
                'success': True,
                'regions_count': len(regions),
                'method': 'provided'
            }
            
            # Stage 5: OCR Processing
            self._update_progress('ocr_processing', 50.0, {
                'message': 'Extracting text from regions'
            })
            
            ocr_results = {}
            ocr_success_count = 0
            
            for i, region in enumerate(regions):
                try:
                    region_result = self.ocr_service.extract_text_from_image(
                        page_image, region
                    )
                    region_name = region.get('name', f'region_{i}')
                    ocr_results[region_name] = region_result
                    
                    if region_result.get('success', False):
                        ocr_success_count += 1
                        
                except Exception as e:
                    logger.warning(f"OCR failed for region {i}", error=str(e))
                    result['warnings'].append(f"OCR failed for region {i}: {str(e)}")
            
            result['stages']['ocr_processing'] = {
                'success': ocr_success_count > 0,
                'regions_processed': len(regions),
                'successful_extractions': ocr_success_count,
                'results': ocr_results
            }
            
            # Stage 6: AI Enhancement
            self._update_progress('ai_enhancement', 70.0, {
                'message': 'Enhancing extracted data with AI'
            })
            
            # Prepare data for AI enhancement
            raw_extracted_data = {}
            for region_name, ocr_result in ocr_results.items():
                if ocr_result.get('success') and ocr_result.get('text'):
                    raw_extracted_data[region_name] = {
                        'text': ocr_result['text'],
                        'confidence': ocr_result.get('confidence', 0.0)
                    }
            
            if raw_extracted_data and self.ai_service:
                try:
                    enhanced_result = self.ai_service.enhance_extracted_data(
                        raw_extracted_data, document_type
                    )
                    result['stages']['ai_enhancement'] = {
                        'success': True,
                        'enhanced_fields': len(enhanced_result.get('enhanced_data', {})),
                        'confidence': enhanced_result.get('enhancement_confidence', 0.0)
                    }
                    result['extracted_data'] = enhanced_result
                except Exception as e:
                    logger.warning("AI enhancement failed", error=str(e))
                    result['stages']['ai_enhancement'] = {'success': False, 'error': str(e)}
                    result['extracted_data'] = {'raw_data': raw_extracted_data}
                    result['warnings'].append(f"AI enhancement failed: {str(e)}")
            else:
                result['stages']['ai_enhancement'] = {'success': False, 'reason': 'no_data_or_service'}
                result['extracted_data'] = {'raw_data': raw_extracted_data}
            
            # Stage 7: Quality Assessment
            self._update_progress('quality_assessment', 85.0, {
                'message': 'Calculating quality scores'
            })
            
            try:
                quality_score = self.quality_scorer.calculate_quality_score(
                    result['extracted_data'], 
                    result['stages']
                )
                result['stages']['quality_assessment'] = {
                    'success': True,
                    'quality_score': quality_score
                }
                result['metadata']['quality_score'] = quality_score
            except Exception as e:
                logger.warning("Quality assessment failed", error=str(e))
                result['stages']['quality_assessment'] = {'success': False, 'error': str(e)}
                result['warnings'].append(f"Quality assessment failed: {str(e)}")
            
            # Stage 8: Data Structuring
            self._update_progress('data_structuring', 95.0, {
                'message': 'Structuring final results'
            })
            
            result['metadata'].update({
                'document_type': document_type,
                'total_regions': len(regions),
                'successful_extractions': ocr_success_count,
                'pdf_info': pdf_info
            })
            
            result['stages']['data_structuring'] = {'success': True}
            
            return result
            
        except Exception as e:
            logger.error("Process with regions failed", error=str(e))
            return {
                'success': False,
                'error': str(e),
                'stages': result.get('stages', {}),
                'extracted_data': result.get('extracted_data', {}),
                'metadata': result.get('metadata', {}),
                'errors': result.get('errors', []) + [str(e)]
            }
    
    def process_full_document(self, file_path: str, document_type: str = None) -> Dict[str, Any]:
        """Process document with full pipeline including region detection"""
        try:
            result = {
                'success': True,
                'stages': {},
                'extracted_data': {},
                'metadata': {'processing_mode': 'full_pipeline'},
                'errors': [],
                'warnings': []
            }
            
            # Stage 2: PDF Processing
            self._update_progress('pdf_processing', 15.0, {
                'message': 'Converting PDF to images and extracting text'
            })
            
            pdf_info = self.pdf_service.get_pdf_info(file_path)
            page_images = self.pdf_service.convert_pdf_to_images(file_path, [0])
            text_data = self.pdf_service.extract_text_from_pdf(file_path)
            
            result['stages']['pdf_processing'] = {
                'success': True,
                'pdf_info': pdf_info,
                'pages_processed': len(page_images),
                'text_extracted': len(text_data.get('text', '')) > 0
            }
            
            if not page_images:
                raise ValueError("Could not extract page images from PDF")
            
            page_image = page_images[0]
            
            # Stage 3: Document Classification
            self._update_progress('document_classification', 25.0, {
                'message': 'Classifying document type using AI'
            })
            
            if not document_type:
                classification_result = self.document_classifier.classify_document(
                    text_data.get('text', '')
                )
                document_type = classification_result.get('document_type', 'unknown')
                result['stages']['document_classification'] = classification_result
            else:
                result['stages']['document_classification'] = {
                    'document_type': document_type,
                    'confidence': 1.0,
                    'method': 'provided'
                }
            
            # Stage 4: Smart Region Detection
            self._update_progress('region_detection', 40.0, {
                'message': 'Detecting optimal extraction regions'
            })
            
            suggested_regions = self.smart_region_manager.suggest_regions(
                document_type, page_image
            )
            
            result['stages']['region_detection'] = {
                'success': True,
                'regions_suggested': len(suggested_regions),
                'method': 'ai_suggested'
            }
            
            # Stage 5: OCR Processing
            self._update_progress('ocr_processing', 60.0, {
                'message': 'Performing OCR on detected regions'
            })
            
            # Process both full page and regions
            full_page_ocr = self.ocr_service.extract_text_from_pdf_page(
                page_image, suggested_regions if suggested_regions else None
            )
            
            result['stages']['ocr_processing'] = {
                'success': full_page_ocr.get('success', False),
                'confidence': full_page_ocr.get('confidence', 0.0),
                'word_count': full_page_ocr.get('word_count', 0),
                'regions_processed': len(suggested_regions) if suggested_regions else 0
            }
            
            # Stage 6: AI Enhancement
            self._update_progress('ai_enhancement', 75.0, {
                'message': 'Enhancing and validating data with AI'
            })
            
            # Prepare extracted data for enhancement
            raw_data = {
                'full_text': full_page_ocr.get('text', ''),
                'regions': full_page_ocr.get('regions', {}),
                'pdf_text': text_data.get('text', '')
            }
            
            enhanced_data = {}
            validation_results = {}
            
            if self.ai_service:
                try:
                    # Enhance the data
                    enhanced_result = self.ai_service.enhance_extracted_data(
                        raw_data, document_type
                    )
                    enhanced_data = enhanced_result
                    
                    # Validate enhanced data
                    validation_results = self.ai_service.validate_real_estate_data(
                        enhanced_data.get('enhanced_data', {}), document_type
                    )
                    
                    # Extract structured data
                    structured_data = self.ai_service.extract_structured_data(
                        full_page_ocr.get('text', ''), document_type
                    )
                    
                    result['stages']['ai_enhancement'] = {
                        'success': True,
                        'enhanced': bool(enhanced_data),
                        'validated': bool(validation_results),
                        'structured': bool(structured_data),
                        'validation_score': validation_results.get('confidence', 0.0)
                    }
                    
                    # Store AI results
                    result['extracted_data'] = {
                        'enhanced_data': enhanced_data,
                        'validation_results': validation_results,
                        'structured_data': structured_data,
                        'raw_data': raw_data
                    }
                    
                except Exception as e:
                    logger.warning("AI processing failed", error=str(e))
                    result['stages']['ai_enhancement'] = {'success': False, 'error': str(e)}
                    result['extracted_data'] = {'raw_data': raw_data}
                    result['warnings'].append(f"AI processing failed: {str(e)}")
            else:
                result['stages']['ai_enhancement'] = {'success': False, 'reason': 'service_unavailable'}
                result['extracted_data'] = {'raw_data': raw_data}
            
            # Stage 7: Quality Assessment
            self._update_progress('quality_assessment', 90.0, {
                'message': 'Calculating comprehensive quality scores'
            })
            
            try:
                quality_score = self.quality_scorer.calculate_quality_score(
                    result['extracted_data'], validation_results
                )
                result['stages']['quality_assessment'] = {
                    'success': True,
                    'quality_score': quality_score,
                    'assessment_method': 'comprehensive'
                }
                result['metadata']['quality_score'] = quality_score
            except Exception as e:
                logger.warning("Quality assessment failed", error=str(e))
                result['stages']['quality_assessment'] = {'success': False, 'error': str(e)}
                result['warnings'].append(f"Quality assessment failed: {str(e)}")
            
            # Stage 8: Data Structuring
            self._update_progress('data_structuring', 95.0, {
                'message': 'Finalizing structured output'
            })
            
            result['metadata'].update({
                'document_type': document_type,
                'pages_processed': 1,
                'regions_detected': len(suggested_regions) if suggested_regions else 0,
                'ocr_confidence': full_page_ocr.get('confidence', 0.0),
                'pdf_info': pdf_info,
                'processing_method': 'full_pipeline'
            })
            
            result['stages']['data_structuring'] = {'success': True}
            
            return result
            
        except Exception as e:
            logger.error("Full document processing failed", error=str(e))
            return {
                'success': False,
                'error': str(e),
                'stages': result.get('stages', {}),
                'extracted_data': result.get('extracted_data', {}),
                'metadata': result.get('metadata', {}),
                'errors': result.get('errors', []) + [str(e)]
            }
    
    def validate_processing_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Validate processing results for completeness and accuracy
        
        Args:
            results: Processing results to validate
            
        Returns:
            Validation report with scores and recommendations
        """
        try:
            validation_report = {
                'is_valid': True,
                'overall_score': 0.0,
                'component_scores': {},
                'issues': [],
                'recommendations': [],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Validate required fields
            required_fields = ['processing_id', 'success', 'stages', 'extracted_data', 'metadata']
            missing_fields = [field for field in required_fields if field not in results]
            
            if missing_fields:
                validation_report['is_valid'] = False
                validation_report['issues'].append(f"Missing required fields: {missing_fields}")
            
            # Validate processing success
            if not results.get('success', False):
                validation_report['component_scores']['processing_success'] = 0.0
                validation_report['issues'].append("Processing failed")
                if 'error' in results:
                    validation_report['issues'].append(f"Error: {results['error']}")
            else:
                validation_report['component_scores']['processing_success'] = 1.0
            
            # Validate stages completion
            stages = results.get('stages', {})
            completed_stages = sum(1 for stage_info in stages.values() 
                                 if isinstance(stage_info, dict) and stage_info.get('success', False))
            total_expected_stages = len(self.processing_stages) - 1  # Exclude initialization
            
            stage_completion_rate = completed_stages / total_expected_stages if total_expected_stages > 0 else 0
            validation_report['component_scores']['stage_completion'] = stage_completion_rate
            
            if stage_completion_rate < 0.8:
                validation_report['issues'].append(f"Low stage completion rate: {stage_completion_rate:.2f}")
                validation_report['recommendations'].append("Review failed stages and retry processing")
            
            # Validate extracted data
            extracted_data = results.get('extracted_data', {})
            if not extracted_data or (isinstance(extracted_data, dict) and not any(extracted_data.values())):
                validation_report['component_scores']['data_extraction'] = 0.0
                validation_report['issues'].append("No data extracted")
                validation_report['recommendations'].append("Check OCR settings and document quality")
            else:
                validation_report['component_scores']['data_extraction'] = 1.0
            
            # Validate quality scores
            quality_score = results.get('metadata', {}).get('quality_score', 0.0)
            validation_report['component_scores']['quality'] = quality_score
            
            if quality_score < 0.6:
                validation_report['issues'].append(f"Low quality score: {quality_score}")
                validation_report['recommendations'].append("Consider manual review or reprocessing")
            
            # Calculate overall score
            component_values = list(validation_report['component_scores'].values())
            validation_report['overall_score'] = sum(component_values) / len(component_values) if component_values else 0.0
            
            # Final validation
            if validation_report['overall_score'] < 0.5:
                validation_report['is_valid'] = False
            
            # Add performance metrics
            processing_time = results.get('processing_time', 0)
            if processing_time > 60:  # More than 1 minute
                validation_report['recommendations'].append("Processing time exceeded expected duration")
            
            logger.info("Processing validation completed", 
                       is_valid=validation_report['is_valid'],
                       overall_score=validation_report['overall_score'],
                       issues_count=len(validation_report['issues']))
            
            return validation_report
            
        except Exception as e:
            logger.error("Error validating processing results", error=str(e))
            return {
                'is_valid': False,
                'overall_score': 0.0,
                'component_scores': {},
                'issues': [f"Validation error: {str(e)}"],
                'recommendations': ["Retry processing with error handling"],
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def generate_processing_report(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive processing report
        
        Args:
            results: Processing results to analyze
            
        Returns:
            Detailed processing report with analytics and insights
        """
        try:
            report = {
                'report_id': f"report_{int(time.time())}",
                'processing_id': results.get('processing_id', 'unknown'),
                'generated_at': datetime.utcnow().isoformat(),
                'file_info': {},
                'processing_summary': {},
                'stage_analysis': {},
                'data_analysis': {},
                'quality_metrics': {},
                'performance_metrics': {},
                'recommendations': [],
                'export_options': []
            }
            
            # File information
            file_path = results.get('file_path', '')
            if file_path and os.path.exists(file_path):
                report['file_info'] = {
                    'filename': os.path.basename(file_path),
                    'file_size': os.path.getsize(file_path),
                    'file_path': file_path
                }
            
            # Processing summary
            report['processing_summary'] = {
                'success': results.get('success', False),
                'processing_time': results.get('processing_time', 0),
                'start_time': results.get('start_time'),
                'end_time': results.get('end_time'),
                'document_type': results.get('metadata', {}).get('document_type', 'unknown'),
                'processing_mode': results.get('metadata', {}).get('processing_mode', 'unknown')
            }
            
            # Stage analysis
            stages = results.get('stages', {})
            for stage_name, stage_info in stages.items():
                if isinstance(stage_info, dict):
                    report['stage_analysis'][stage_name] = {
                        'success': stage_info.get('success', False),
                        'details': {k: v for k, v in stage_info.items() if k != 'results'},
                        'has_results': 'results' in stage_info
                    }
            
            # Data analysis
            extracted_data = results.get('extracted_data', {})
            if extracted_data:
                report['data_analysis'] = {
                    'total_fields_extracted': self._count_extracted_fields(extracted_data),
                    'data_types_found': self._analyze_data_types(extracted_data),
                    'confidence_distribution': self._analyze_confidence_scores(extracted_data),
                    'extraction_methods': self._analyze_extraction_methods(extracted_data)
                }
            
            # Quality metrics
            metadata = results.get('metadata', {})
            report['quality_metrics'] = {
                'overall_quality_score': metadata.get('quality_score', 0.0),
                'ocr_confidence': metadata.get('ocr_confidence', 0.0),
                'successful_extractions': metadata.get('successful_extractions', 0),
                'regions_processed': metadata.get('regions_detected', 0) or metadata.get('total_regions', 0)
            }
            
            # Performance metrics
            report['performance_metrics'] = {
                'processing_speed': self._calculate_processing_speed(results),
                'resource_efficiency': self._assess_resource_efficiency(results),
                'error_rate': self._calculate_error_rate(results)
            }
            
            # Generate recommendations
            report['recommendations'] = self._generate_recommendations(results, report)
            
            # Export options
            report['export_options'] = [
                {'format': 'excel', 'description': 'Export to Excel spreadsheet'},
                {'format': 'json', 'description': 'Export as JSON data'},
                {'format': 'csv', 'description': 'Export as CSV file'},
                {'format': 'pdf', 'description': 'Generate PDF report'}
            ]
            
            logger.info("Processing report generated", 
                       report_id=report['report_id'],
                       success=report['processing_summary']['success'],
                       quality_score=report['quality_metrics']['overall_quality_score'])
            
            return report
            
        except Exception as e:
            logger.error("Error generating processing report", error=str(e))
            return {
                'report_id': f"error_{int(time.time())}",
                'generated_at': datetime.utcnow().isoformat(),
                'error': str(e),
                'processing_summary': {'success': False},
                'recommendations': ['Retry processing with error handling']
            }
    
    def _count_extracted_fields(self, data: Dict[str, Any]) -> int:
        """Count total extracted fields across all data structures"""
        count = 0
        
        def count_fields(obj):
            if isinstance(obj, dict):
                return sum(count_fields(v) for v in obj.values() if v is not None and v != '')
            elif isinstance(obj, list):
                return sum(count_fields(item) for item in obj)
            elif isinstance(obj, str) and obj.strip():
                return 1
            return 0
        
        return count_fields(data)
    
    def _analyze_data_types(self, data: Dict[str, Any]) -> Dict[str, int]:
        """Analyze types of data found"""
        types_found = {}
        
        def analyze_value(key: str, value):
            if isinstance(value, dict):
                for k, v in value.items():
                    analyze_value(k, v)
            elif isinstance(value, str) and value.strip():
                # Categorize by key name patterns
                key_lower = key.lower()
                if any(keyword in key_lower for keyword in ['address', 'location']):
                    types_found['addresses'] = types_found.get('addresses', 0) + 1
                elif any(keyword in key_lower for keyword in ['phone', 'tel']):
                    types_found['phone_numbers'] = types_found.get('phone_numbers', 0) + 1
                elif any(keyword in key_lower for keyword in ['email', 'mail']):
                    types_found['emails'] = types_found.get('emails', 0) + 1
                elif any(keyword in key_lower for keyword in ['date', 'time']):
                    types_found['dates'] = types_found.get('dates', 0) + 1
                elif any(keyword in key_lower for keyword in ['price', 'cost', 'amount', '$']):
                    types_found['financial'] = types_found.get('financial', 0) + 1
                else:
                    types_found['text'] = types_found.get('text', 0) + 1
        
        for key, value in data.items():
            analyze_value(key, value)
        
        return types_found
    
    def _analyze_confidence_scores(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Analyze confidence score distribution"""
        scores = []
        
        def collect_scores(obj):
            if isinstance(obj, dict):
                if 'confidence' in obj and isinstance(obj['confidence'], (int, float)):
                    scores.append(float(obj['confidence']))
                for value in obj.values():
                    collect_scores(value)
            elif isinstance(obj, list):
                for item in obj:
                    collect_scores(item)
        
        collect_scores(data)
        
        if not scores:
            return {'average': 0.0, 'min': 0.0, 'max': 0.0}
        
        return {
            'average': sum(scores) / len(scores),
            'min': min(scores),
            'max': max(scores),
            'count': len(scores)
        }
    
    def _analyze_extraction_methods(self, data: Dict[str, Any]) -> List[str]:
        """Analyze extraction methods used"""
        methods = set()
        
        def find_methods(obj):
            if isinstance(obj, dict):
                if 'method' in obj:
                    methods.add(obj['method'])
                if 'extraction_method' in obj:
                    methods.add(obj['extraction_method'])
                for value in obj.values():
                    find_methods(value)
            elif isinstance(obj, list):
                for item in obj:
                    find_methods(item)
        
        find_methods(data)
        return list(methods)
    
    def _calculate_processing_speed(self, results: Dict[str, Any]) -> str:
        """Calculate processing speed assessment"""
        processing_time = results.get('processing_time', 0)
        
        if processing_time < 10:
            return 'excellent'
        elif processing_time < 30:
            return 'good'
        elif processing_time < 60:
            return 'acceptable'
        else:
            return 'slow'
    
    def _assess_resource_efficiency(self, results: Dict[str, Any]) -> str:
        """Assess resource usage efficiency"""
        # Basic assessment based on success rate and data extracted
        success = results.get('success', False)
        data_count = self._count_extracted_fields(results.get('extracted_data', {}))
        
        if success and data_count > 10:
            return 'high'
        elif success and data_count > 5:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_error_rate(self, results: Dict[str, Any]) -> float:
        """Calculate error rate based on stages and warnings"""
        total_stages = len(self.processing_stages)
        stages = results.get('stages', {})
        failed_stages = sum(1 for stage_info in stages.values() 
                          if isinstance(stage_info, dict) and not stage_info.get('success', True))
        
        error_count = len(results.get('errors', [])) + failed_stages
        warning_count = len(results.get('warnings', []))
        
        # Weight errors more than warnings
        weighted_issues = error_count * 2 + warning_count
        max_possible_issues = total_stages * 2  # Assume max 2 issues per stage
        
        return min(weighted_issues / max_possible_issues, 1.0) if max_possible_issues > 0 else 0.0
    
    def _generate_recommendations(self, results: Dict[str, Any], report: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on results"""
        recommendations = []
        
        # Quality-based recommendations
        quality_score = report.get('quality_metrics', {}).get('overall_quality_score', 0.0)
        if quality_score < 0.6:
            recommendations.append("Consider improving document quality or OCR settings for better results")
        
        # Performance-based recommendations
        speed = report.get('performance_metrics', {}).get('processing_speed', 'unknown')
        if speed in ['acceptable', 'slow']:
            recommendations.append("Consider optimizing processing parameters for better performance")
        
        # Data-based recommendations
        data_count = self._count_extracted_fields(results.get('extracted_data', {}))
        if data_count < 5:
            recommendations.append("Limited data extracted - verify document type and region selection")
        
        # Error-based recommendations
        error_rate = report.get('performance_metrics', {}).get('error_rate', 0.0)
        if error_rate > 0.3:
            recommendations.append("High error rate detected - review processing logs and retry if needed")
        
        # Stage-specific recommendations
        stages = results.get('stages', {})
        if 'ai_enhancement' in stages and not stages['ai_enhancement'].get('success', False):
            recommendations.append("AI enhancement failed - verify API configuration and connectivity")
        
        if not recommendations:
            recommendations.append("Processing completed successfully - data is ready for export and use")
        
        return recommendations
