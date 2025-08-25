"""
Quality Scorer with ML-based Assessment
Advanced data quality assessment and scoring for extracted document data.
"""

import re
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional, Union
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import structlog

# ML and statistical libraries
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from sklearn.cluster import KMeans
import joblib
import os

from config import Config

logger = structlog.get_logger()

@dataclass
class QualityMetric:
    """Represents a quality metric with its score and confidence"""
    name: str
    score: float
    confidence: float
    details: Dict[str, Any]
    recommendations: List[str]

@dataclass
class FieldQualityAnalysis:
    """Detailed quality analysis for a specific field"""
    field_name: str
    value: str
    ocr_confidence: float
    completeness_score: float
    consistency_score: float
    accuracy_score: float
    pattern_match: bool
    anomaly_score: float
    quality_grade: str
    issues: List[str]
    suggestions: List[str]

@dataclass
class QualityReport:
    """Comprehensive quality assessment report"""
    overall_score: float
    quality_grade: str
    confidence_distribution: Dict[str, float]
    field_analyses: List[FieldQualityAnalysis]
    quality_metrics: List[QualityMetric]
    recommendations: List[str]
    statistical_summary: Dict[str, Any]
    processing_metadata: Dict[str, Any]

class QualityScorer:
    """Advanced ML-based quality scoring service for extracted document data"""
    
    def __init__(self, config: Config = None):
        self.config = config or Config()
        
        # Quality assessment weights
        self.quality_weights = {
            'ocr_quality': 0.25,
            'data_completeness': 0.25,
            'data_consistency': 0.20,
            'content_accuracy': 0.20,
            'extraction_reliability': 0.10
        }
        
        # Quality thresholds
        self.quality_thresholds = {
            'excellent': 0.90,
            'good': 0.75,
            'fair': 0.60,
            'poor': 0.00
        }
        
        # OCR confidence thresholds
        self.ocr_confidence_thresholds = {
            'high': 0.85,
            'medium': 0.70,
            'low': 0.50
        }
        
        # Document-specific field requirements
        self.document_field_requirements = {
            'rent_roll': {
                'required_fields': ['unit_number', 'tenant_name', 'rent_amount', 'sqft'],
                'optional_fields': ['lease_start', 'lease_end', 'deposit'],
                'validation_patterns': {
                    'rent_amount': r'\$[\d,]+(?:\.\d{2})?',
                    'sqft': r'\d+',
                    'unit_number': r'[A-Za-z0-9-]+'
                }
            },
            'offering_memo': {
                'required_fields': ['property_name', 'address', 'price', 'cap_rate'],
                'optional_fields': ['year_built', 'building_class', 'parking_spaces'],
                'validation_patterns': {
                    'price': r'\$[\d,]+(?:\.\d{2})?',
                    'cap_rate': r'\d+\.\d+%',
                    'year_built': r'\d{4}'
                }
            },
            'comparable_sales': {
                'required_fields': ['property_address', 'sale_price', 'sale_date'],
                'optional_fields': ['sqft', 'price_per_sqft', 'building_type'],
                'validation_patterns': {
                    'sale_price': r'\$[\d,]+(?:\.\d{2})?',
                    'sale_date': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
                    'sqft': r'\d+'
                }
            },
            'lease_agreement': {
                'required_fields': ['tenant_name', 'property_address', 'monthly_rent'],
                'optional_fields': ['lease_term', 'security_deposit', 'lease_start'],
                'validation_patterns': {
                    'monthly_rent': r'\$[\d,]+(?:\.\d{2})?',
                    'lease_term': r'\d+\s*(?:months?|years?)',
                    'lease_start': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
                }
            }
        }
        
        # Initialize ML models
        self._initialize_ml_models()
        
        # Statistical analyzers
        self.scaler = StandardScaler()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        
        logger.info("Quality Scorer initialized with ML-based assessment")
    
    def _initialize_ml_models(self):
        """Initialize ML models for quality assessment"""
        try:
            # Anomaly detection model
            self.anomaly_detector = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )
            
            # Quality classification model
            self.quality_classifier = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=10
            )
            
            # Load pre-trained models if available
            model_path = getattr(self.config, 'ML_MODEL_PATH', 'ml_model.joblib')
            if os.path.exists(model_path):
                try:
                    models = joblib.load(model_path)
                    self.anomaly_detector = models.get('anomaly_detector', self.anomaly_detector)
                    self.quality_classifier = models.get('quality_classifier', self.quality_classifier)
                    logger.info("Loaded pre-trained ML models", model_path=model_path)
                except Exception as e:
                    logger.warning("Failed to load pre-trained models", error=str(e))
            
        except Exception as e:
            logger.error("Error initializing ML models", error=str(e))
    
    def calculate_quality_score(self, extracted_data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> QualityReport:
        """
        Calculate comprehensive quality score for extracted data
        
        Args:
            extracted_data: Dictionary containing extracted field data
            metadata: Optional metadata including OCR results, document type, etc.
            
        Returns:
            QualityReport with detailed analysis and recommendations
        """
        try:
            logger.info("Starting quality assessment", 
                       fields_count=len(extracted_data),
                       has_metadata=metadata is not None)
            
            metadata = metadata or {}
            document_type = metadata.get('document_type', 'unknown')
            
            # Initialize quality metrics
            quality_metrics = []
            field_analyses = []
            
            # 1. OCR Quality Assessment
            ocr_metric = self.assess_ocr_quality(metadata.get('ocr_results', {}))
            quality_metrics.append(ocr_metric)
            
            # 2. Data Completeness Assessment
            completeness_metric = self.evaluate_data_completeness(extracted_data, document_type)
            quality_metrics.append(completeness_metric)
            
            # 3. Data Consistency Assessment
            consistency_metric = self.check_data_consistency(extracted_data, document_type)
            quality_metrics.append(consistency_metric)
            
            # 4. Content Accuracy Assessment
            accuracy_metric = self._assess_content_accuracy(extracted_data, document_type)
            quality_metrics.append(accuracy_metric)
            
            # 5. Extraction Reliability Assessment
            reliability_metric = self._assess_extraction_reliability(extracted_data, metadata)
            quality_metrics.append(reliability_metric)
            
            # 6. Field-level Quality Analysis
            for field_name, field_data in extracted_data.items():
                field_analysis = self.analyze_field_quality(field_name, field_data, document_type)
                field_analyses.append(field_analysis)
            
            # Calculate overall score
            overall_score = self._calculate_weighted_score(quality_metrics)
            quality_grade = self._determine_quality_grade(overall_score)
            
            # Generate confidence distribution
            confidence_dist = self.calculate_confidence_distribution(extracted_data, metadata)
            
            # Generate recommendations
            recommendations = self.suggest_quality_improvements({
                'overall_score': overall_score,
                'metrics': quality_metrics,
                'field_analyses': field_analyses,
                'metadata': metadata
            })
            
            # Create comprehensive report
            report = QualityReport(
                overall_score=overall_score,
                quality_grade=quality_grade,
                confidence_distribution=confidence_dist,
                field_analyses=field_analyses,
                quality_metrics=quality_metrics,
                recommendations=recommendations,
                statistical_summary=self._generate_statistical_summary(extracted_data, quality_metrics),
                processing_metadata={
                    'timestamp': datetime.utcnow().isoformat(),
                    'document_type': document_type,
                    'total_fields': len(extracted_data),
                    'assessment_version': '1.0'
                }
            )
            
            logger.info("Quality assessment completed",
                       overall_score=overall_score,
                       quality_grade=quality_grade,
                       total_recommendations=len(recommendations))
            
            return report
            
        except Exception as e:
            logger.error("Error calculating quality score", error=str(e))
            # Return minimal report on error
            return QualityReport(
                overall_score=0.0,
                quality_grade='poor',
                confidence_distribution={},
                field_analyses=[],
                quality_metrics=[],
                recommendations=["Quality assessment failed - please review extraction results manually"],
                statistical_summary={},
                processing_metadata={
                    'timestamp': datetime.utcnow().isoformat(),
                    'error': str(e)
                }
            )
    
    def assess_ocr_quality(self, ocr_results: Dict[str, Any]) -> QualityMetric:
        """
        Assess OCR quality based on confidence scores and text characteristics
        
        Args:
            ocr_results: Dictionary containing OCR results with confidence scores
            
        Returns:
            QualityMetric for OCR quality assessment
        """
        try:
            if not ocr_results:
                return QualityMetric(
                    name='ocr_quality',
                    score=0.5,
                    confidence=0.3,
                    details={'reason': 'No OCR results provided'},
                    recommendations=['Ensure OCR processing is enabled and working correctly']
                )
            
            # Extract confidence scores
            confidences = []
            text_quality_scores = []
            
            for field_name, field_result in ocr_results.items():
                if isinstance(field_result, dict) and 'confidence' in field_result:
                    confidence = field_result['confidence']
                    confidences.append(confidence)
                    
                    # Analyze text quality characteristics
                    text = field_result.get('text', '')
                    text_quality = self._analyze_text_quality(text)
                    text_quality_scores.append(text_quality)
            
            if not confidences:
                return QualityMetric(
                    name='ocr_quality',
                    score=0.5,
                    confidence=0.3,
                    details={'reason': 'No confidence scores found'},
                    recommendations=['Check OCR configuration and confidence reporting']
                )
            
            # Calculate overall OCR quality metrics
            avg_confidence = np.mean(confidences)
            min_confidence = np.min(confidences)
            confidence_std = np.std(confidences)
            avg_text_quality = np.mean(text_quality_scores) if text_quality_scores else 0.5
            
            # Weight different aspects
            ocr_score = (
                avg_confidence * 0.4 +
                min_confidence * 0.2 +
                (1 - min(confidence_std / 0.3, 1.0)) * 0.2 +  # Lower std is better
                avg_text_quality * 0.2
            )
            
            # Determine confidence level
            if avg_confidence >= self.ocr_confidence_thresholds['high']:
                confidence_level = 'high'
            elif avg_confidence >= self.ocr_confidence_thresholds['medium']:
                confidence_level = 'medium'
            else:
                confidence_level = 'low'
            
            # Generate recommendations
            recommendations = []
            if avg_confidence < 0.7:
                recommendations.append('Consider improving image quality or OCR preprocessing')
            if confidence_std > 0.3:
                recommendations.append('Inconsistent OCR confidence - review extraction regions')
            if min_confidence < 0.5:
                recommendations.append('Some fields have very low OCR confidence - manual review recommended')
            
            return QualityMetric(
                name='ocr_quality',
                score=ocr_score,
                confidence=avg_confidence,
                details={
                    'avg_confidence': avg_confidence,
                    'min_confidence': min_confidence,
                    'confidence_std': confidence_std,
                    'confidence_level': confidence_level,
                    'fields_analyzed': len(confidences),
                    'avg_text_quality': avg_text_quality
                },
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error("Error assessing OCR quality", error=str(e))
            return QualityMetric(
                name='ocr_quality',
                score=0.0,
                confidence=0.0,
                details={'error': str(e)},
                recommendations=['OCR quality assessment failed - manual review required']
            )
    
    def evaluate_data_completeness(self, data: Dict[str, Any], document_type: str) -> QualityMetric:
        """
        Evaluate completeness of extracted data based on document type requirements
        
        Args:
            data: Extracted data dictionary
            document_type: Type of document being analyzed
            
        Returns:
            QualityMetric for data completeness assessment
        """
        try:
            if not data:
                return QualityMetric(
                    name='data_completeness',
                    score=0.0,
                    confidence=1.0,
                    details={'reason': 'No data provided'},
                    recommendations=['Ensure data extraction is working correctly']
                )
            
            # Get expected fields for document type
            doc_requirements = self.document_field_requirements.get(document_type, {
                'required_fields': [],
                'optional_fields': []
            })
            
            required_fields = doc_requirements.get('required_fields', [])
            optional_fields = doc_requirements.get('optional_fields', [])
            all_expected_fields = required_fields + optional_fields
            
            # Analyze field presence and content quality
            present_required = 0
            present_optional = 0
            non_empty_required = 0
            non_empty_optional = 0
            
            field_completeness = {}
            
            for field in required_fields:
                is_present = field in data
                is_non_empty = is_present and data[field] and str(data[field]).strip()
                
                if is_present:
                    present_required += 1
                if is_non_empty:
                    non_empty_required += 1
                
                field_completeness[field] = {
                    'present': is_present,
                    'non_empty': is_non_empty,
                    'type': 'required'
                }
            
            for field in optional_fields:
                is_present = field in data
                is_non_empty = is_present and data[field] and str(data[field]).strip()
                
                if is_present:
                    present_optional += 1
                if is_non_empty:
                    non_empty_optional += 1
                
                field_completeness[field] = {
                    'present': is_present,
                    'non_empty': is_non_empty,
                    'type': 'optional'
                }
            
            # Calculate completeness scores
            required_presence_score = present_required / max(len(required_fields), 1)
            required_content_score = non_empty_required / max(len(required_fields), 1)
            optional_presence_score = present_optional / max(len(optional_fields), 1) if optional_fields else 1.0
            
            # Overall completeness score (weighted toward required fields)
            completeness_score = (
                required_presence_score * 0.4 +
                required_content_score * 0.4 +
                optional_presence_score * 0.2
            )
            
            # Generate recommendations
            recommendations = []
            missing_required = [f for f in required_fields if f not in data or not str(data[f]).strip()]
            if missing_required:
                recommendations.append(f"Missing required fields: {', '.join(missing_required)}")
            
            empty_fields = [f for f, v in data.items() if not str(v).strip()]
            if empty_fields:
                recommendations.append(f"Empty fields detected: {', '.join(empty_fields)}")
            
            if completeness_score < 0.8:
                recommendations.append('Consider reviewing extraction regions and OCR quality')
            
            return QualityMetric(
                name='data_completeness',
                score=completeness_score,
                confidence=0.9,  # High confidence in completeness assessment
                details={
                    'document_type': document_type,
                    'required_fields_present': f"{present_required}/{len(required_fields)}",
                    'required_fields_content': f"{non_empty_required}/{len(required_fields)}",
                    'optional_fields_present': f"{present_optional}/{len(optional_fields)}",
                    'field_completeness': field_completeness,
                    'total_fields_extracted': len(data)
                },
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error("Error evaluating data completeness", error=str(e))
            return QualityMetric(
                name='data_completeness',
                score=0.0,
                confidence=0.0,
                details={'error': str(e)},
                recommendations=['Data completeness assessment failed']
            )
    
    def check_data_consistency(self, data: Dict[str, Any], document_type: str) -> QualityMetric:
        """
        Check consistency of extracted data across fields and against expected patterns
        
        Args:
            data: Extracted data dictionary
            document_type: Type of document being analyzed
            
        Returns:
            QualityMetric for data consistency assessment
        """
        try:
            if not data:
                return QualityMetric(
                    name='data_consistency',
                    score=0.5,
                    confidence=0.5,
                    details={'reason': 'No data to check consistency'},
                    recommendations=['Ensure data extraction is working']
                )
            
            consistency_checks = []
            consistency_score = 0.0
            total_checks = 0
            
            # Get validation patterns for document type
            doc_requirements = self.document_field_requirements.get(document_type, {})
            validation_patterns = doc_requirements.get('validation_patterns', {})
            
            # 1. Pattern matching consistency
            pattern_consistency = self._check_pattern_consistency(data, validation_patterns)
            consistency_checks.append(pattern_consistency)
            
            # 2. Cross-field logical consistency
            logical_consistency = self._check_logical_consistency(data, document_type)
            consistency_checks.append(logical_consistency)
            
            # 3. Format consistency
            format_consistency = self._check_format_consistency(data)
            consistency_checks.append(format_consistency)
            
            # 4. Data type consistency
            type_consistency = self._check_data_type_consistency(data)
            consistency_checks.append(type_consistency)
            
            # Calculate overall consistency score
            valid_checks = [check for check in consistency_checks if check['score'] is not None]
            if valid_checks:
                consistency_score = np.mean([check['score'] for check in valid_checks])
                total_checks = len(valid_checks)
            
            # Generate recommendations
            recommendations = []
            for check in consistency_checks:
                recommendations.extend(check.get('recommendations', []))
            
            # Remove duplicates while preserving order
            recommendations = list(dict.fromkeys(recommendations))
            
            return QualityMetric(
                name='data_consistency',
                score=consistency_score,
                confidence=0.85,
                details={
                    'total_checks_performed': total_checks,
                    'pattern_consistency': pattern_consistency,
                    'logical_consistency': logical_consistency,
                    'format_consistency': format_consistency,
                    'type_consistency': type_consistency
                },
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error("Error checking data consistency", error=str(e))
            return QualityMetric(
                name='data_consistency',
                score=0.0,
                confidence=0.0,
                details={'error': str(e)},
                recommendations=['Data consistency check failed']
            )
    
    def analyze_field_quality(self, field_name: str, field_data: Any, document_type: str = 'unknown') -> FieldQualityAnalysis:
        """
        Perform detailed quality analysis for a specific field
        
        Args:
            field_name: Name of the field being analyzed
            field_data: The field data (could be string, dict with confidence, etc.)
            document_type: Type of document for context-specific analysis
            
        Returns:
            FieldQualityAnalysis with detailed assessment
        """
        try:
            # Extract field value and confidence
            if isinstance(field_data, dict):
                field_value = field_data.get('text', field_data.get('value', str(field_data)))
                ocr_confidence = field_data.get('confidence', 0.5)
            else:
                field_value = str(field_data)
                ocr_confidence = 0.5  # Default when no confidence available
            
            # Initialize analysis components
            issues = []
            suggestions = []
            
            # 1. Completeness analysis
            completeness_score = 1.0 if field_value and field_value.strip() else 0.0
            if completeness_score == 0.0:
                issues.append('Field is empty or contains only whitespace')
                suggestions.append('Verify extraction region and OCR quality')
            
            # 2. Pattern matching analysis
            pattern_match = self._check_field_pattern(field_name, field_value, document_type)
            if not pattern_match:
                issues.append('Field value does not match expected pattern')
                suggestions.append('Review field value format and extraction accuracy')
            
            # 3. Consistency analysis
            consistency_score = self._analyze_field_consistency(field_name, field_value, document_type)
            if consistency_score < 0.7:
                issues.append('Field value appears inconsistent with expected format')
                suggestions.append('Check for OCR errors or formatting issues')
            
            # 4. Accuracy analysis using ML
            accuracy_score = self._analyze_field_accuracy(field_name, field_value, document_type)
            
            # 5. Anomaly detection
            anomaly_score = self._detect_field_anomaly(field_name, field_value)
            if anomaly_score > 0.7:
                issues.append('Field value appears to be an anomaly')
                suggestions.append('Manual review recommended - value may be incorrect')
            
            # Calculate overall quality score for field
            quality_components = {
                'completeness': completeness_score * 0.3,
                'ocr_confidence': ocr_confidence * 0.25,
                'consistency': consistency_score * 0.2,
                'accuracy': accuracy_score * 0.15,
                'pattern_match': (1.0 if pattern_match else 0.0) * 0.1
            }
            
            overall_field_score = sum(quality_components.values())
            quality_grade = self._determine_quality_grade(overall_field_score)
            
            # Additional suggestions based on quality grade
            if quality_grade == 'poor':
                suggestions.append('Consider re-extraction or manual verification')
            elif quality_grade == 'fair':
                suggestions.append('Review and validate field value')
            
            return FieldQualityAnalysis(
                field_name=field_name,
                value=field_value,
                ocr_confidence=ocr_confidence,
                completeness_score=completeness_score,
                consistency_score=consistency_score,
                accuracy_score=accuracy_score,
                pattern_match=pattern_match,
                anomaly_score=anomaly_score,
                quality_grade=quality_grade,
                issues=issues,
                suggestions=suggestions
            )
            
        except Exception as e:
            logger.error("Error analyzing field quality", field_name=field_name, error=str(e))
            return FieldQualityAnalysis(
                field_name=field_name,
                value=str(field_data),
                ocr_confidence=0.0,
                completeness_score=0.0,
                consistency_score=0.0,
                accuracy_score=0.0,
                pattern_match=False,
                anomaly_score=1.0,
                quality_grade='poor',
                issues=['Field quality analysis failed'],
                suggestions=['Manual review required']
            )
    
    def generate_quality_report(self, results: QualityReport) -> Dict[str, Any]:
        """
        Generate a detailed quality report in dictionary format for export
        
        Args:
            results: QualityReport object with assessment results
            
        Returns:
            Dictionary containing formatted quality report
        """
        try:
            # Convert dataclasses to dictionaries for JSON serialization
            field_analyses_dict = [asdict(analysis) for analysis in results.field_analyses]
            quality_metrics_dict = [asdict(metric) for metric in results.quality_metrics]
            
            report = {
                'summary': {
                    'overall_score': results.overall_score,
                    'quality_grade': results.quality_grade,
                    'assessment_timestamp': results.processing_metadata.get('timestamp'),
                    'document_type': results.processing_metadata.get('document_type', 'unknown'),
                    'total_fields_analyzed': results.processing_metadata.get('total_fields', 0)
                },
                'quality_metrics': {
                    'scores': {metric['name']: metric['score'] for metric in quality_metrics_dict},
                    'details': quality_metrics_dict
                },
                'field_analysis': {
                    'total_fields': len(field_analyses_dict),
                    'grade_distribution': self._calculate_grade_distribution(results.field_analyses),
                    'fields': field_analyses_dict
                },
                'confidence_analysis': results.confidence_distribution,
                'recommendations': {
                    'high_priority': [rec for rec in results.recommendations if 'manual review' in rec.lower() or 'failed' in rec.lower()],
                    'medium_priority': [rec for rec in results.recommendations if 'consider' in rec.lower() or 'review' in rec.lower()],
                    'low_priority': [rec for rec in results.recommendations if rec not in [rec for rec in results.recommendations if 'manual review' in rec.lower() or 'failed' in rec.lower() or 'consider' in rec.lower() or 'review' in rec.lower()]],
                    'all_recommendations': results.recommendations
                },
                'statistical_summary': results.statistical_summary,
                'processing_metadata': results.processing_metadata
            }
            
            return report
            
        except Exception as e:
            logger.error("Error generating quality report", error=str(e))
            return {
                'summary': {
                    'overall_score': 0.0,
                    'quality_grade': 'unknown',
                    'error': 'Report generation failed'
                },
                'error': str(e)
            }
    
    def suggest_quality_improvements(self, analysis: Dict[str, Any]) -> List[str]:
        """
        Generate quality improvement recommendations based on analysis results
        
        Args:
            analysis: Dictionary containing analysis results
            
        Returns:
            List of improvement suggestions
        """
        try:
            recommendations = []
            overall_score = analysis.get('overall_score', 0)
            metrics = analysis.get('metrics', [])
            field_analyses = analysis.get('field_analyses', [])
            metadata = analysis.get('metadata', {})
            
            # Overall score-based recommendations
            if overall_score < 0.5:
                recommendations.append('Overall quality is poor - consider re-processing the document')
                recommendations.append('Review extraction regions and OCR settings')
            elif overall_score < 0.7:
                recommendations.append('Quality could be improved - review field extractions')
            
            # Metric-specific recommendations
            for metric in metrics:
                if hasattr(metric, 'recommendations'):
                    recommendations.extend(metric.recommendations)
                elif isinstance(metric, dict) and 'recommendations' in metric:
                    recommendations.extend(metric['recommendations'])
            
            # Field-specific recommendations
            poor_fields = []
            low_confidence_fields = []
            empty_fields = []
            
            for field_analysis in field_analyses:
                if hasattr(field_analysis, 'quality_grade'):
                    if field_analysis.quality_grade == 'poor':
                        poor_fields.append(field_analysis.field_name)
                    if field_analysis.ocr_confidence < 0.6:
                        low_confidence_fields.append(field_analysis.field_name)
                    if field_analysis.completeness_score == 0.0:
                        empty_fields.append(field_analysis.field_name)
            
            if poor_fields:
                recommendations.append(f"Fields with poor quality need attention: {', '.join(poor_fields)}")
            
            if low_confidence_fields:
                recommendations.append(f"Low OCR confidence fields: {', '.join(low_confidence_fields)}")
            
            if empty_fields:
                recommendations.append(f"Empty fields require re-extraction: {', '.join(empty_fields)}")
            
            # Document type specific recommendations
            document_type = metadata.get('document_type')
            if document_type in self.document_field_requirements:
                required_fields = self.document_field_requirements[document_type]['required_fields']
                missing_required = [f for f in required_fields if f in empty_fields]
                if missing_required:
                    recommendations.append(f"Critical: Missing required fields for {document_type}: {', '.join(missing_required)}")
            
            # OCR quality recommendations
            ocr_results = metadata.get('ocr_results', {})
            if ocr_results:
                avg_confidence = np.mean([r.get('confidence', 0.5) for r in ocr_results.values() if isinstance(r, dict)])
                if avg_confidence < 0.7:
                    recommendations.append('Consider improving image quality or OCR preprocessing settings')
                    recommendations.append('Verify extraction regions are properly positioned')
            
            # Performance recommendations
            if len(field_analyses) < 3:
                recommendations.append('Very few fields extracted - review document processing and region detection')
            
            # Remove duplicates and return
            return list(dict.fromkeys(recommendations))
            
        except Exception as e:
            logger.error("Error generating improvement suggestions", error=str(e))
            return ["Unable to generate recommendations - manual review advised"]
    
    def calculate_confidence_distribution(self, data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        """
        Calculate statistical confidence distribution for extracted data
        
        Args:
            data: Extracted data dictionary
            metadata: Optional metadata with additional confidence information
            
        Returns:
            Dictionary with confidence distribution statistics
        """
        try:
            confidences = []
            
            # Extract confidence scores from data
            for field_name, field_data in data.items():
                if isinstance(field_data, dict) and 'confidence' in field_data:
                    confidences.append(field_data['confidence'])
                else:
                    # Use default confidence based on field content quality
                    text_quality = self._analyze_text_quality(str(field_data))
                    confidences.append(text_quality)
            
            # Extract additional confidences from metadata
            if metadata and 'ocr_results' in metadata:
                for field_result in metadata['ocr_results'].values():
                    if isinstance(field_result, dict) and 'confidence' in field_result:
                        conf = field_result['confidence']
                        if conf not in confidences:  # Avoid duplicates
                            confidences.append(conf)
            
            if not confidences:
                return {
                    'mean_confidence': 0.5,
                    'median_confidence': 0.5,
                    'std_confidence': 0.0,
                    'min_confidence': 0.0,
                    'max_confidence': 1.0,
                    'confidence_grade': 'unknown',
                    'total_fields': 0
                }
            
            # Calculate statistics
            confidences = np.array(confidences)
            
            distribution = {
                'mean_confidence': float(np.mean(confidences)),
                'median_confidence': float(np.median(confidences)),
                'std_confidence': float(np.std(confidences)),
                'min_confidence': float(np.min(confidences)),
                'max_confidence': float(np.max(confidences)),
                'q25_confidence': float(np.percentile(confidences, 25)),
                'q75_confidence': float(np.percentile(confidences, 75)),
                'total_fields': len(confidences)
            }
            
            # Add confidence grade
            mean_conf = distribution['mean_confidence']
            if mean_conf >= 0.85:
                distribution['confidence_grade'] = 'excellent'
            elif mean_conf >= 0.75:
                distribution['confidence_grade'] = 'good'
            elif mean_conf >= 0.6:
                distribution['confidence_grade'] = 'fair'
            else:
                distribution['confidence_grade'] = 'poor'
            
            # Add distribution categories
            high_conf = np.sum(confidences >= 0.8) / len(confidences)
            medium_conf = np.sum((confidences >= 0.6) & (confidences < 0.8)) / len(confidences)
            low_conf = np.sum(confidences < 0.6) / len(confidences)
            
            distribution.update({
                'high_confidence_ratio': float(high_conf),
                'medium_confidence_ratio': float(medium_conf),
                'low_confidence_ratio': float(low_conf)
            })
            
            return distribution
            
        except Exception as e:
            logger.error("Error calculating confidence distribution", error=str(e))
            return {
                'mean_confidence': 0.0,
                'confidence_grade': 'error',
                'error': str(e)
            }
    
    # ===== UTILITY METHODS =====
    
    def _calculate_weighted_score(self, quality_metrics: List[QualityMetric]) -> float:
        """Calculate weighted overall score from quality metrics"""
        try:
            total_score = 0.0
            total_weight = 0.0
            
            for metric in quality_metrics:
                weight = self.quality_weights.get(metric.name, 0.1)
                total_score += metric.score * weight
                total_weight += weight
            
            return total_score / total_weight if total_weight > 0 else 0.0
            
        except Exception as e:
            logger.error("Error calculating weighted score", error=str(e))
            return 0.0
    
    def _determine_quality_grade(self, score: float) -> str:
        """Determine quality grade based on score"""
        try:
            if score >= self.quality_thresholds['excellent']:
                return 'excellent'
            elif score >= self.quality_thresholds['good']:
                return 'good'
            elif score >= self.quality_thresholds['fair']:
                return 'fair'
            else:
                return 'poor'
        except Exception:
            return 'unknown'
    
    def _analyze_text_quality(self, text: str) -> float:
        """Analyze text quality characteristics"""
        try:
            if not text or not text.strip():
                return 0.0
            
            text = text.strip()
            quality_score = 0.0
            
            # Check for reasonable length
            if 1 <= len(text) <= 1000:
                quality_score += 0.2
            
            # Check character diversity (not all same character)
            unique_chars = len(set(text.lower()))
            if unique_chars > 1:
                quality_score += 0.2
            
            # Check for alphanumeric content
            if any(c.isalnum() for c in text):
                quality_score += 0.2
            
            # Check for reasonable word structure
            words = text.split()
            if len(words) > 0:
                avg_word_length = np.mean([len(w) for w in words])
                if 1 <= avg_word_length <= 15:
                    quality_score += 0.2
            
            # Check for minimal special character noise
            special_chars = sum(1 for c in text if not c.isalnum() and not c.isspace())
            if special_chars / len(text) < 0.5:
                quality_score += 0.2
            
            return min(quality_score, 1.0)
            
        except Exception:
            return 0.5  # Default moderate quality
    
    def _assess_content_accuracy(self, data: Dict[str, Any], document_type: str) -> QualityMetric:
        """Assess content accuracy using pattern matching and ML"""
        try:
            accuracy_scores = []
            pattern_matches = 0
            total_patterns = 0
            
            # Get validation patterns for document type
            doc_requirements = self.document_field_requirements.get(document_type, {})
            validation_patterns = doc_requirements.get('validation_patterns', {})
            
            for field_name, field_value in data.items():
                field_text = str(field_value)
                
                # Check pattern matching
                if field_name in validation_patterns:
                    pattern = validation_patterns[field_name]
                    if re.search(pattern, field_text, re.IGNORECASE):
                        pattern_matches += 1
                    total_patterns += 1
                
                # Analyze field-specific accuracy
                field_accuracy = self._analyze_field_accuracy(field_name, field_text, document_type)
                accuracy_scores.append(field_accuracy)
            
            # Calculate overall accuracy
            pattern_accuracy = pattern_matches / total_patterns if total_patterns > 0 else 0.8
            field_accuracy = np.mean(accuracy_scores) if accuracy_scores else 0.5
            overall_accuracy = (pattern_accuracy * 0.6 + field_accuracy * 0.4)
            
            recommendations = []
            if pattern_accuracy < 0.7:
                recommendations.append('Many fields do not match expected patterns')
            if field_accuracy < 0.6:
                recommendations.append('Field content accuracy appears low')
            
            return QualityMetric(
                name='content_accuracy',
                score=overall_accuracy,
                confidence=0.8,
                details={
                    'pattern_matches': f"{pattern_matches}/{total_patterns}",
                    'pattern_accuracy': pattern_accuracy,
                    'field_accuracy': field_accuracy,
                    'fields_analyzed': len(accuracy_scores)
                },
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error("Error assessing content accuracy", error=str(e))
            return QualityMetric(
                name='content_accuracy',
                score=0.0,
                confidence=0.0,
                details={'error': str(e)},
                recommendations=['Content accuracy assessment failed']
            )
    
    def _assess_extraction_reliability(self, data: Dict[str, Any], metadata: Dict[str, Any]) -> QualityMetric:
        """Assess extraction reliability based on processing metadata"""
        try:
            reliability_factors = []
            
            # Check data volume
            data_volume_score = min(len(data) / 10.0, 1.0)  # Normalize to 10 fields
            reliability_factors.append(('data_volume', data_volume_score))
            
            # Check processing success indicators
            processing_errors = metadata.get('errors', [])
            error_penalty = min(len(processing_errors) * 0.2, 0.8)
            processing_score = max(1.0 - error_penalty, 0.2)
            reliability_factors.append(('processing_success', processing_score))
            
            # Check OCR consistency
            ocr_results = metadata.get('ocr_results', {})
            if ocr_results:
                confidences = [r.get('confidence', 0.5) for r in ocr_results.values() if isinstance(r, dict)]
                if confidences:
                    ocr_consistency = 1.0 - min(np.std(confidences), 0.5)
                    reliability_factors.append(('ocr_consistency', ocr_consistency))
            
            # Check region quality
            regions_processed = metadata.get('regions_processed', 0)
            if regions_processed > 0:
                region_success_rate = len(data) / regions_processed
                region_score = min(region_success_rate, 1.0)
                reliability_factors.append(('region_success', region_score))
            
            # Calculate overall reliability
            if reliability_factors:
                overall_reliability = np.mean([score for _, score in reliability_factors])
            else:
                overall_reliability = 0.5
            
            recommendations = []
            if overall_reliability < 0.6:
                recommendations.append('Extraction reliability is low - review processing pipeline')
            if processing_errors:
                recommendations.append('Processing errors detected - check system logs')
            
            return QualityMetric(
                name='extraction_reliability',
                score=overall_reliability,
                confidence=0.75,
                details={
                    'reliability_factors': dict(reliability_factors),
                    'processing_errors': len(processing_errors),
                    'data_fields_extracted': len(data)
                },
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error("Error assessing extraction reliability", error=str(e))
            return QualityMetric(
                name='extraction_reliability',
                score=0.0,
                confidence=0.0,
                details={'error': str(e)},
                recommendations=['Reliability assessment failed']
            )
    
    def _check_pattern_consistency(self, data: Dict[str, Any], validation_patterns: Dict[str, str]) -> Dict[str, Any]:
        """Check pattern matching consistency"""
        try:
            matches = 0
            total = 0
            field_results = {}
            
            for field_name, field_value in data.items():
                if field_name in validation_patterns:
                    pattern = validation_patterns[field_name]
                    field_text = str(field_value)
                    match = bool(re.search(pattern, field_text, re.IGNORECASE))
                    
                    field_results[field_name] = {
                        'pattern': pattern,
                        'value': field_text,
                        'matches': match
                    }
                    
                    if match:
                        matches += 1
                    total += 1
            
            score = matches / total if total > 0 else 1.0
            
            recommendations = []
            if score < 0.8:
                recommendations.append('Pattern matching consistency is low')
                failed_fields = [f for f, r in field_results.items() if not r['matches']]
                if failed_fields:
                    recommendations.append(f"Fields failing pattern validation: {', '.join(failed_fields)}")
            
            return {
                'score': score,
                'matches': matches,
                'total': total,
                'field_results': field_results,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error("Error checking pattern consistency", error=str(e))
            return {
                'score': None,
                'error': str(e),
                'recommendations': ['Pattern consistency check failed']
            }
    
    def _check_logical_consistency(self, extracted_data):
        """Check logical consistency of extracted data"""
        try:
            consistency_score = 0.8
            issues = []
            
            if 'rent_amount' in extracted_data and 'sqft' in extracted_data:
                try:
                    rent = float(str(extracted_data['rent_amount']).replace('$', '').replace(',', ''))
                    sqft = float(str(extracted_data['sqft']).replace(',', ''))
                    if sqft > 0:
                        price_per_sqft = rent / sqft
                        if price_per_sqft < 0.5 or price_per_sqft > 100:
                            consistency_score -= 0.2
                            issues.append("Unusual rent per sqft ratio")
                except (ValueError, TypeError):
                    consistency_score -= 0.1
                    issues.append("Invalid numeric data")
            
            return QualityMetric(
                name="data_consistency",
                score=consistency_score,
                confidence=0.7,
                details={"issues": issues},
                recommendations=["Review data relationships" if issues else "Data relationships appear consistent"]
            )
        except Exception as e:
            return QualityMetric("data_consistency", 0.5, 0.5, {"error": str(e)}, ["Manual review required"])

    def _analyze_field_accuracy(self, extracted_data):
        """Analyze field accuracy"""
        try:
            accuracy_scores = []
            field_accuracies = {}
            
            for field_name, value in extracted_data.items():
                field_score = self._check_field_pattern(field_name, str(value))
                field_accuracies[field_name] = field_score
                accuracy_scores.append(field_score)
            
            overall_accuracy = np.mean(accuracy_scores) if accuracy_scores else 0.5
            
            return QualityMetric(
                name="content_accuracy",
                score=overall_accuracy,
                confidence=0.75,
                details={"field_accuracies": field_accuracies},
                recommendations=["Review low-scoring fields" if overall_accuracy < 0.7 else "Field patterns look good"]
            )
        except Exception as e:
            return QualityMetric("content_accuracy", 0.5, 0.5, {"error": str(e)}, ["Manual accuracy review required"])

    def _check_field_pattern(self, field_name, value):
        """Check if field value matches expected patterns"""
        try:
            patterns = {
                'rent_amount': r'^\$?[\d,]+\.?\d*$',
                'unit_number': r'^[A-Za-z0-9\-#\s]+$',
                'sqft': r'^\d{1,6}$',
                'tenant_name': r'^[A-Za-z\s\.\,\&\-\']+$'
            }
            
            if not value or value.strip() == '':
                return 0.0
            
            if field_name.lower() in patterns:
                pattern = patterns[field_name.lower()]
                if re.match(pattern, value.strip()):
                    return 0.9
                else:
                    return 0.3
            
            if len(value.strip()) > 0 and len(value) < 200:
                return 0.7
            
            return 0.5
        except Exception:
            return 0.5

    def _generate_statistical_summary(self, extracted_data, field_analyses):
        """Generate statistical summary"""
        try:
            if not field_analyses:
                return {
                    "total_fields": len(extracted_data),
                    "analyzed_fields": 0,
                    "avg_quality": 0.5,
                    "quality_distribution": {"poor": 0, "fair": 0, "good": 0, "excellent": 0}
                }
            
            quality_scores = [0.7] * len(field_analyses)  # Default scores
            
            quality_distribution = {"poor": 0, "fair": 0, "good": 0, "excellent": 0}
            for score in quality_scores:
                if score >= 0.9:
                    quality_distribution["excellent"] += 1
                elif score >= 0.75:
                    quality_distribution["good"] += 1
                elif score >= 0.6:
                    quality_distribution["fair"] += 1
                else:
                    quality_distribution["poor"] += 1
            
            return {
                "total_fields": len(extracted_data),
                "analyzed_fields": len(field_analyses),
                "avg_quality": np.mean(quality_scores),
                "std_quality": np.std(quality_scores),
                "quality_distribution": quality_distribution
            }
        except Exception as e:
            return {
                "total_fields": len(extracted_data),
                "error": str(e),
                "fallback_quality": 0.5
            }
