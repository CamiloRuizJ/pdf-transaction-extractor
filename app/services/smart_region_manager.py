"""Smart Region Manager
Computer vision-powered region suggestion and management for PDF Transaction Extractor.
Implements advanced text detection, layout analysis, and ML-based region classification.
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Tuple, Optional, Union
import structlog
import os
from pathlib import Path
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import json
import re
from collections import defaultdict
import math

logger = structlog.get_logger()

class SmartRegionManager:
    """Computer vision-powered region suggestion service with ML-based classification"""
    
    def __init__(self, config=None):
        """Initialize the Smart Region Manager with CV and ML capabilities"""
        self.config = config or self._get_default_config()
        self.historical_regions = defaultdict(list)
        self.confidence_threshold = 0.6
        self.min_region_area = 100
        self.max_region_area = 50000
        
        # Document-specific field mappings with position hints
        self.document_templates = {
            'rent_roll': {
                'fields': ['unit_number', 'tenant_name', 'rent_amount', 'lease_expiry', 'sq_footage'],
                'layout': 'table',
                'patterns': {
                    'unit_number': r'\b(?:Unit|Apt|#)\s*\d+[A-Za-z]?\b',
                    'rent_amount': r'\$[\d,]+(?:\.\d{2})?',
                    'tenant_name': r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',
                    'lease_expiry': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
                    'sq_footage': r'\d{1,4}(?:,\d{3})*\s*(?:SF|sq\s*ft)'
                }
            },
            'offering_memo': {
                'fields': ['property_name', 'address', 'price', 'cap_rate', 'noi'],
                'layout': 'form',
                'patterns': {
                    'price': r'\$[\d,]+(?:\.\d{2})?\s*(?:Million|M)?',
                    'cap_rate': r'\d+(?:\.\d+)?%\s*(?:Cap|CAP)',
                    'noi': r'(?:NOI|Net\s+Operating\s+Income).*?\$[\d,]+',
                    'address': r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd)'
                }
            },
            'comparable_sales': {
                'fields': ['property_address', 'sale_price', 'sale_date', 'sq_footage', 'price_per_sf'],
                'layout': 'table',
                'patterns': {
                    'sale_price': r'\$[\d,]+(?:\.\d{2})?',
                    'sale_date': r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
                    'price_per_sf': r'\$\d+(?:\.\d{2})?\s*(?:PSF|per\s*sf)',
                    'property_address': r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave)'
                }
            },
            'lease_agreement': {
                'fields': ['tenant_name', 'property_address', 'monthly_rent', 'lease_term', 'security_deposit'],
                'layout': 'form',
                'patterns': {
                    'monthly_rent': r'Monthly\s+Rent.*?\$[\d,]+(?:\.\d{2})?',
                    'lease_term': r'(?:Term|Period).*?(\d+)\s*(?:months?|years?)',
                    'security_deposit': r'Security\s+Deposit.*?\$[\d,]+(?:\.\d{2})?',
                    'tenant_name': r'Tenant.*?:.*?([A-Z][a-z]+\s+[A-Z][a-z]+)',
                    'property_address': r'Property.*?:.*?(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave))'
                }
            }
        }
        
        # Initialize computer vision models
        self._init_cv_models()
        
        logger.info("Smart Region Manager initialized with computer vision capabilities")
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for the region manager"""
        return {
            'confidence_threshold': 0.6,
            'min_text_height': 10,
            'max_text_height': 100,
            'text_detection_method': 'east',
            'enable_ml_classification': True,
            'debug_mode': False
        }
    
    def _init_cv_models(self):
        """Initialize computer vision models for text detection"""
        try:
            # Try to load EAST text detector model
            self.east_model_path = None
            self.east_net = None
            
            # Look for EAST model in common locations
            possible_paths = [
                'models/frozen_east_text_detection.pb',
                'app/models/frozen_east_text_detection.pb',
                os.path.join(os.getcwd(), 'models', 'frozen_east_text_detection.pb')
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    self.east_model_path = path
                    try:
                        self.east_net = cv2.dnn.readNet(path)
                        logger.info(f"EAST text detection model loaded from {path}")
                        break
                    except Exception as e:
                        logger.warning(f"Failed to load EAST model from {path}", error=str(e))
            
            if not self.east_net:
                logger.info("EAST model not found, using traditional CV methods for text detection")
                
        except Exception as e:
            logger.warning("Error initializing CV models", error=str(e))
            self.east_net = None
    
    def suggest_regions(self, document_type: str, page_image: np.ndarray) -> List[Dict[str, Any]]:
        """Main method to suggest regions using computer vision and ML techniques"""
        try:
            logger.info(f"Suggesting regions for document type: {document_type}")
            
            # Analyze document layout first
            layout_info = self.analyze_document_layout(page_image)
            
            # Detect text regions using computer vision
            text_regions = self.detect_text_regions(page_image)
            
            # Get document-specific regions based on patterns
            field_specific_regions = self.get_field_specific_regions(document_type, page_image)
            
            # Combine all detected regions
            all_regions = text_regions + field_specific_regions
            
            # Classify regions based on document type and ML
            classified_regions = self.classify_regions(all_regions, document_type, layout_info)
            
            # Optimize region boundaries
            optimized_regions = []
            for region in classified_regions:
                optimized = self.optimize_region_bounds(region, page_image)
                if optimized:
                    optimized_regions.append(optimized)
            
            # Filter by confidence threshold
            high_confidence_regions = self.filter_regions_by_confidence(
                optimized_regions, self.confidence_threshold
            )
            
            # Merge overlapping regions
            final_regions = self.merge_overlapping_regions(high_confidence_regions)
            
            # Store successful regions for learning
            self._store_historical_regions(document_type, final_regions)
            
            logger.info(f"Generated {len(final_regions)} region suggestions")
            return final_regions
            
        except Exception as e:
            logger.error("Error suggesting regions", error=str(e), document_type=document_type)
            return []
    
    def detect_text_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect text regions using computer vision algorithms"""
        try:
            regions = []
            
            # Method 1: EAST Text Detection (if available)
            if self.east_net is not None:
                east_regions = self._detect_text_with_east(image)
                regions.extend(east_regions)
            
            # Method 2: Traditional CV-based text detection
            cv_regions = self._detect_text_with_traditional_cv(image)
            regions.extend(cv_regions)
            
            # Method 3: Contour-based detection for structured documents
            contour_regions = self._detect_text_with_contours(image)
            regions.extend(contour_regions)
            
            # Remove duplicates and low-quality regions
            filtered_regions = self._filter_duplicate_regions(regions)
            
            logger.debug(f"Detected {len(filtered_regions)} text regions")
            return filtered_regions
            
        except Exception as e:
            logger.error("Error detecting text regions", error=str(e))
            return []
    
    def _detect_text_with_east(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect text using EAST deep learning model"""
        try:
            if self.east_net is None:
                return []
            
            # Prepare image for EAST
            orig_h, orig_w = image.shape[:2]
            
            # EAST requires dimensions to be multiples of 32
            new_w = int((orig_w // 32) * 32)
            new_h = int((orig_h // 32) * 32)
            
            r_w = orig_w / float(new_w)
            r_h = orig_h / float(new_h)
            
            resized = cv2.resize(image, (new_w, new_h))
            
            # Create blob and run forward pass
            blob = cv2.dnn.blobFromImage(resized, 1.0, (new_w, new_h),
                                       (123.68, 116.78, 103.94), swapRB=True, crop=False)
            
            self.east_net.setInput(blob)
            (scores, geometry) = self.east_net.forward(["feature_fusion/Conv_7/Sigmoid",
                                                       "feature_fusion/concat_3"])
            
            # Decode predictions
            rectangles, confidences = self._decode_east_predictions(scores, geometry)
            
            # Apply NMS
            indices = cv2.dnn.NMSBoxesRotated(rectangles, confidences, 0.5, 0.4)
            
            regions = []
            if len(indices) > 0:
                for i in indices.flatten():
                    # Get the rotated rectangle
                    (center_x, center_y), (width, height), angle = rectangles[i]
                    
                    # Scale back to original image size
                    center_x = int(center_x * r_w)
                    center_y = int(center_y * r_h)
                    width = int(width * r_w)
                    height = int(height * r_h)
                    
                    # Convert to axis-aligned bounding box
                    x = max(0, center_x - width // 2)
                    y = max(0, center_y - height // 2)
                    
                    region = {
                        'x': x,
                        'y': y,
                        'width': min(width, orig_w - x),
                        'height': min(height, orig_h - y),
                        'confidence': float(confidences[i]),
                        'detection_method': 'east',
                        'type': 'text_region'
                    }
                    regions.append(region)
            
            return regions
            
        except Exception as e:
            logger.error("Error in EAST text detection", error=str(e))
            return []
    
    def _decode_east_predictions(self, scores: np.ndarray, geometry: np.ndarray, 
                               score_threshold: float = 0.5) -> Tuple[List, List]:
        """Decode EAST model predictions"""
        rectangles = []
        confidences = []
        
        # Get dimensions
        (num_rows, num_cols) = scores.shape[2:4]
        
        for y in range(0, num_rows):
            scores_data = scores[0, 0, y]
            x_data0 = geometry[0, 0, y]
            x_data1 = geometry[0, 1, y]
            x_data2 = geometry[0, 2, y]
            x_data3 = geometry[0, 3, y]
            angles_data = geometry[0, 4, y]
            
            for x in range(0, num_cols):
                if scores_data[x] < score_threshold:
                    continue
                
                # Compute offset factor
                (offset_x, offset_y) = (x * 4.0, y * 4.0)
                
                # Extract rotation angle and compute cos/sin
                angle = angles_data[x]
                cos = np.cos(angle)
                sin = np.sin(angle)
                
                # Compute dimensions
                h = x_data0[x] + x_data2[x]
                w = x_data1[x] + x_data3[x]
                
                # Compute center of rotated rectangle
                center_x = offset_x + (cos * x_data1[x]) + (sin * x_data2[x])
                center_y = offset_y - (sin * x_data1[x]) + (cos * x_data2[x])
                
                rectangles.append(((center_x, center_y), (w, h), -1 * angle * 180.0 / math.pi))
                confidences.append(float(scores_data[x]))
        
        return rectangles, confidences
    
    def _detect_text_with_traditional_cv(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect text using traditional computer vision methods"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
            
            # Apply morphological operations to connect text components
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            morph = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
            
            # Use adaptive thresholding
            thresh = cv2.adaptiveThreshold(morph, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                         cv2.THRESH_BINARY_INV, 11, 2)
            
            # Find connected components
            connectivity = 8
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
                thresh, connectivity, cv2.CV_32S
            )
            
            regions = []
            for i in range(1, num_labels):  # Skip background (label 0)
                x, y, w, h, area = stats[i]
                
                # Filter by size and aspect ratio
                if (self.min_region_area <= area <= self.max_region_area and 
                    10 <= w <= image.shape[1] * 0.8 and
                    8 <= h <= image.shape[0] * 0.3):
                    
                    # Calculate confidence based on area and shape
                    aspect_ratio = w / h if h > 0 else 0
                    confidence = min(0.8, 0.3 + (area / 1000) * 0.1 + 
                                   (0.2 if 2 <= aspect_ratio <= 15 else 0))
                    
                    region = {
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h),
                        'confidence': confidence,
                        'detection_method': 'traditional_cv',
                        'type': 'text_region',
                        'area': area
                    }
                    regions.append(region)
            
            return regions
            
        except Exception as e:
            logger.error("Error in traditional CV text detection", error=str(e))
            return []
    
    def _detect_text_with_contours(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect text regions using contour analysis"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
            
            # Edge detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Dilate edges to connect nearby text components
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
            dilated = cv2.dilate(edges, kernel, iterations=1)
            
            # Find contours
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            regions = []
            for contour in contours:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                area = w * h
                
                # Filter by size and aspect ratio
                if (self.min_region_area <= area <= self.max_region_area and
                    w >= 20 and h >= 10 and w <= image.shape[1] * 0.9):
                    
                    # Calculate confidence based on contour properties
                    contour_area = cv2.contourArea(contour)
                    solidity = contour_area / area if area > 0 else 0
                    confidence = min(0.7, 0.2 + solidity * 0.5)
                    
                    region = {
                        'x': int(x),
                        'y': int(y),
                        'width': int(w),
                        'height': int(h),
                        'confidence': confidence,
                        'detection_method': 'contours',
                        'type': 'text_region',
                        'solidity': solidity
                    }
                    regions.append(region)
            
            return regions
            
        except Exception as e:
            logger.error("Error in contour-based text detection", error=str(e))
            return []
    
    def _filter_duplicate_regions(self, regions: List[Dict[str, Any]], 
                                iou_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Remove duplicate regions based on IoU (Intersection over Union)"""
        try:
            if not regions:
                return []
            
            # Sort by confidence (highest first)
            sorted_regions = sorted(regions, key=lambda r: r.get('confidence', 0), reverse=True)
            
            filtered = []
            for current in sorted_regions:
                is_duplicate = False
                
                for kept in filtered:
                    iou = self._calculate_iou(current, kept)
                    if iou > iou_threshold:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    filtered.append(current)
            
            return filtered
            
        except Exception as e:
            logger.error("Error filtering duplicate regions", error=str(e))
            return regions
    
    def _calculate_iou(self, region1: Dict[str, Any], region2: Dict[str, Any]) -> float:
        """Calculate Intersection over Union (IoU) between two regions"""
        try:
            # Get coordinates
            x1, y1, w1, h1 = region1['x'], region1['y'], region1['width'], region1['height']
            x2, y2, w2, h2 = region2['x'], region2['y'], region2['width'], region2['height']
            
            # Calculate intersection
            x_left = max(x1, x2)
            y_top = max(y1, y2)
            x_right = min(x1 + w1, x2 + w2)
            y_bottom = min(y1 + h1, y2 + h2)
            
            if x_right <= x_left or y_bottom <= y_top:
                return 0.0
            
            intersection = (x_right - x_left) * (y_bottom - y_top)
            
            # Calculate union
            area1 = w1 * h1
            area2 = w2 * h2
            union = area1 + area2 - intersection
            
            if union <= 0:
                return 0.0
            
            return intersection / union
            
        except Exception as e:
            logger.warning("Error calculating IoU", error=str(e))
            return 0.0
    
    def classify_regions(self, regions: List[Dict[str, Any]], document_type: str,
                        layout_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Classify regions based on document type and ML techniques"""
        try:
            if not regions:
                return []
            
            template = self.document_templates.get(document_type, {})
            required_fields = template.get('fields', [])
            
            classified_regions = []
            
            for region in regions:
                # Start with base region data
                classified_region = region.copy()
                
                # Use position-based classification
                field_type = self._classify_by_position(region, document_type, layout_info)
                if field_type:
                    classified_region['field_type'] = field_type
                    classified_region['confidence'] = min(1.0, 
                                                         region.get('confidence', 0.5) + 0.2)
                
                # Use pattern-based classification if no field type assigned
                if 'field_type' not in classified_region:
                    field_type = self._classify_by_patterns(region, document_type)
                    if field_type:
                        classified_region['field_type'] = field_type
                        classified_region['confidence'] = min(1.0,
                                                             region.get('confidence', 0.5) + 0.1)
                
                # Add region quality score
                quality_score = self._calculate_region_quality(region)
                classified_region['quality_score'] = quality_score
                classified_region['confidence'] *= quality_score
                
                classified_regions.append(classified_region)
            
            return classified_regions
            
        except Exception as e:
            logger.error("Error classifying regions", error=str(e))
            return regions
    
    def _classify_by_position(self, region: Dict[str, Any], document_type: str,
                            layout_info: Dict[str, Any]) -> Optional[str]:
        """Classify region based on its position in the document layout"""
        try:
            template = self.document_templates.get(document_type, {})
            layout_type = template.get('layout', 'form')
            
            x, y, w, h = region['x'], region['y'], region['width'], region['height']
            
            # Basic position-based classification
            if layout_type == 'table':
                # For table layouts, use row/column analysis
                if y < 100:  # Top region - likely header
                    return 'header'
                elif x < 100:  # Left column - often IDs or names
                    return template.get('fields', ['unit_number'])[0] if template.get('fields') else None
                elif x > 200:  # Right columns - often amounts
                    return 'rent_amount' if 'rent_amount' in template.get('fields', []) else None
            
            elif layout_type == 'form':
                # For form layouts, use vertical position
                total_height = layout_info.get('height', 800)
                relative_y = y / total_height
                
                fields = template.get('fields', [])
                if fields:
                    # Distribute fields by vertical position
                    field_index = min(int(relative_y * len(fields)), len(fields) - 1)
                    return fields[field_index]
            
            return None
            
        except Exception as e:
            logger.warning("Error in position-based classification", error=str(e))
            return None
    
    def _classify_by_patterns(self, region: Dict[str, Any], document_type: str) -> Optional[str]:
        """Classify region based on text patterns (requires OCR integration)"""
        try:
            # This would ideally integrate with OCR to get text content
            # For now, we'll use basic heuristics based on region properties
            
            template = self.document_templates.get(document_type, {})
            w, h = region['width'], region['height']
            aspect_ratio = w / h if h > 0 else 0
            
            # Basic heuristics for field type classification
            if 'rent_amount' in template.get('fields', []) and aspect_ratio > 3:
                # Wide regions are often amounts
                return 'rent_amount'
            elif 'tenant_name' in template.get('fields', []) and 100 <= w <= 300:
                # Medium width regions are often names
                return 'tenant_name'
            elif 'unit_number' in template.get('fields', []) and w < 100:
                # Narrow regions are often unit numbers
                return 'unit_number'
            
            return None
            
        except Exception as e:
            logger.warning("Error in pattern-based classification", error=str(e))
            return None
    
    def _calculate_region_quality(self, region: Dict[str, Any]) -> float:
        """Calculate quality score for a region based on various factors"""
        try:
            quality = 1.0
            
            # Size factor
            area = region.get('area', region['width'] * region['height'])
            if area < self.min_region_area * 2:
                quality *= 0.8
            elif area > self.max_region_area * 0.5:
                quality *= 0.9
            
            # Aspect ratio factor
            aspect_ratio = region['width'] / region['height'] if region['height'] > 0 else 0
            if not (0.5 <= aspect_ratio <= 20):
                quality *= 0.7
            
            # Detection method bonus
            method = region.get('detection_method', '')
            if method == 'east':
                quality *= 1.1
            elif method == 'traditional_cv':
                quality *= 1.0
            elif method == 'contours':
                quality *= 0.9
            
            return min(1.0, quality)
            
        except Exception as e:
            logger.warning("Error calculating region quality", error=str(e))
            return 1.0
    
    def optimize_region_bounds(self, region: Dict[str, Any], image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Fine-tune region coordinates for better text extraction"""
        try:
            x, y, w, h = region['x'], region['y'], region['width'], region['height']
            img_h, img_w = image.shape[:2]
            
            # Ensure region is within image bounds
            x = max(0, min(x, img_w - 1))
            y = max(0, min(y, img_h - 1))
            w = max(1, min(w, img_w - x))
            h = max(1, min(h, img_h - y))
            
            # Extract region for analysis
            region_img = image[y:y+h, x:x+w]
            
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(region_img, cv2.COLOR_BGR2GRAY) if len(region_img.shape) == 3 else region_img
            
            # Find text boundaries using morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 1))
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # Find contours to get tight bounding box
            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Get bounding box of all contours
                all_contours = np.vstack(contours)
                rect_x, rect_y, rect_w, rect_h = cv2.boundingRect(all_contours)
                
                # Apply padding
                padding = 3
                rect_x = max(0, rect_x - padding)
                rect_y = max(0, rect_y - padding)
                rect_w = min(w - rect_x, rect_w + 2 * padding)
                rect_h = min(h - rect_y, rect_h + 2 * padding)
                
                # Update region coordinates
                optimized_region = region.copy()
                optimized_region.update({
                    'x': x + rect_x,
                    'y': y + rect_y,
                    'width': rect_w,
                    'height': rect_h,
                    'optimized': True
                })
                
                return optimized_region
            
            return region
            
        except Exception as e:
            logger.warning("Error optimizing region bounds", error=str(e))
            return region
    
    def analyze_document_layout(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze document layout to understand structure"""
        try:
            h, w = image.shape[:2]
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
            
            # Detect horizontal and vertical lines
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
            
            # Apply morphological operations to detect lines
            horizontal_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel)
            vertical_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel)
            
            # Count significant lines
            h_line_count = np.sum(horizontal_lines > 0) // w
            v_line_count = np.sum(vertical_lines > 0) // h
            
            # Determine layout type
            layout_type = 'form'
            if h_line_count > 5 and v_line_count > 3:
                layout_type = 'table'
            elif h_line_count > 10:
                layout_type = 'list'
            
            # Calculate text density
            edges = cv2.Canny(gray, 50, 150)
            text_density = np.sum(edges > 0) / (w * h)
            
            layout_info = {
                'width': w,
                'height': h,
                'layout_type': layout_type,
                'horizontal_lines': h_line_count,
                'vertical_lines': v_line_count,
                'text_density': text_density,
                'has_table_structure': h_line_count > 5 and v_line_count > 3,
                'is_form_like': text_density < 0.1 and v_line_count < 3
            }
            
            return layout_info
            
        except Exception as e:
            logger.error("Error analyzing document layout", error=str(e))
            return {'width': image.shape[1], 'height': image.shape[0], 'layout_type': 'unknown'}
    
    def filter_regions_by_confidence(self, regions: List[Dict[str, Any]], 
                                   threshold: float) -> List[Dict[str, Any]]:
        """Filter regions by confidence threshold"""
        return [r for r in regions if r.get('confidence', 0) >= threshold]
    
    def merge_overlapping_regions(self, regions: List[Dict[str, Any]], 
                                iou_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """Merge overlapping regions to reduce redundancy"""
        try:
            if not regions:
                return []
            
            # Group regions by field type if available
            grouped = defaultdict(list)
            for region in regions:
                field_type = region.get('field_type', 'unknown')
                grouped[field_type].append(region)
            
            merged_regions = []
            
            for field_type, field_regions in grouped.items():
                if len(field_regions) <= 1:
                    merged_regions.extend(field_regions)
                    continue
                
                # Sort by confidence
                sorted_regions = sorted(field_regions, key=lambda r: r.get('confidence', 0), reverse=True)
                
                merged_field_regions = []
                for current in sorted_regions:
                    should_merge = False
                    merge_target = None
                    
                    for existing in merged_field_regions:
                        iou = self._calculate_iou(current, existing)
                        if iou > iou_threshold:
                            should_merge = True
                            merge_target = existing
                            break
                    
                    if should_merge and merge_target:
                        # Merge regions by taking the union and averaging confidence
                        merged_region = self._merge_two_regions(current, merge_target)
                        merged_field_regions = [r for r in merged_field_regions if r != merge_target]
                        merged_field_regions.append(merged_region)
                    else:
                        merged_field_regions.append(current)
                
                merged_regions.extend(merged_field_regions)
            
            return merged_regions
            
        except Exception as e:
            logger.error("Error merging overlapping regions", error=str(e))
            return regions
    
    def _merge_two_regions(self, region1: Dict[str, Any], region2: Dict[str, Any]) -> Dict[str, Any]:
        """Merge two regions into one"""
        try:
            # Calculate union bounding box
            x1, y1, w1, h1 = region1['x'], region1['y'], region1['width'], region1['height']
            x2, y2, w2, h2 = region2['x'], region2['y'], region2['width'], region2['height']
            
            x_min = min(x1, x2)
            y_min = min(y1, y2)
            x_max = max(x1 + w1, x2 + w2)
            y_max = max(y1 + h1, y2 + h2)
            
            merged = {
                'x': x_min,
                'y': y_min,
                'width': x_max - x_min,
                'height': y_max - y_min,
                'confidence': (region1.get('confidence', 0.5) + region2.get('confidence', 0.5)) / 2,
                'detection_method': 'merged',
                'type': region1.get('type', region2.get('type', 'text_region')),
                'field_type': region1.get('field_type', region2.get('field_type')),
                'merged_from': [region1.get('detection_method', 'unknown'), 
                               region2.get('detection_method', 'unknown')]
            }
            
            return merged
            
        except Exception as e:
            logger.error("Error merging two regions", error=str(e))
            return region1
    
    def get_field_specific_regions(self, document_type: str, image: np.ndarray) -> List[Dict[str, Any]]:
        """Get regions specific to document type using pattern matching and heuristics"""
        try:
            template = self.document_templates.get(document_type)
            if not template:
                return []
            
            regions = []
            patterns = template.get('patterns', {})
            
            # This is a simplified implementation - in a full system, this would
            # integrate with OCR to search for specific patterns in the text
            
            # For now, we'll use position-based heuristics for different document types
            h, w = image.shape[:2]
            
            if document_type == 'rent_roll':
                regions.extend(self._get_rent_roll_regions(image))
            elif document_type == 'offering_memo':
                regions.extend(self._get_offering_memo_regions(image))
            elif document_type == 'comparable_sales':
                regions.extend(self._get_comparable_sales_regions(image))
            elif document_type == 'lease_agreement':
                regions.extend(self._get_lease_agreement_regions(image))
            
            return regions
            
        except Exception as e:
            logger.error("Error getting field-specific regions", error=str(e))
            return []
    
    def _get_rent_roll_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Get regions specific to rent roll documents"""
        regions = []
        h, w = image.shape[:2]
        
        # Typical rent roll layout: table with columns for unit, tenant, rent, etc.
        col_width = w // 5
        row_height = 30
        
        # Skip header row
        start_y = 80
        
        for row in range(0, min(20, (h - start_y) // row_height)):  # Max 20 rows
            y = start_y + row * row_height
            
            # Unit number column
            regions.append({
                'x': 10,
                'y': y,
                'width': col_width - 10,
                'height': row_height - 5,
                'confidence': 0.7,
                'field_type': 'unit_number',
                'detection_method': 'template',
                'type': 'field_region'
            })
            
            # Tenant name column
            regions.append({
                'x': col_width,
                'y': y,
                'width': col_width * 2 - 10,
                'height': row_height - 5,
                'confidence': 0.7,
                'field_type': 'tenant_name',
                'detection_method': 'template',
                'type': 'field_region'
            })
            
            # Rent amount column
            regions.append({
                'x': col_width * 3,
                'y': y,
                'width': col_width - 10,
                'height': row_height - 5,
                'confidence': 0.7,
                'field_type': 'rent_amount',
                'detection_method': 'template',
                'type': 'field_region'
            })
        
        return regions
    
    def _get_offering_memo_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Get regions specific to offering memo documents"""
        regions = []
        h, w = image.shape[:2]
        
        # Offering memos typically have key data points scattered throughout
        # We'll focus on common locations
        
        # Property name (usually at top)
        regions.append({
            'x': w // 4,
            'y': 50,
            'width': w // 2,
            'height': 40,
            'confidence': 0.8,
            'field_type': 'property_name',
            'detection_method': 'template',
            'type': 'field_region'
        })
        
        # Price (often in upper right or center)
        regions.append({
            'x': w // 2,
            'y': h // 4,
            'width': w // 3,
            'height': 30,
            'confidence': 0.7,
            'field_type': 'price',
            'detection_method': 'template',
            'type': 'field_region'
        })
        
        return regions
    
    def _get_comparable_sales_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Get regions specific to comparable sales documents"""
        regions = []
        h, w = image.shape[:2]
        
        # Similar to rent roll but with different fields
        col_width = w // 4
        row_height = 35
        start_y = 100
        
        for row in range(0, min(15, (h - start_y) // row_height)):
            y = start_y + row * row_height
            
            # Address
            regions.append({
                'x': 10,
                'y': y,
                'width': col_width * 2 - 10,
                'height': row_height - 5,
                'confidence': 0.7,
                'field_type': 'property_address',
                'detection_method': 'template',
                'type': 'field_region'
            })
            
            # Sale price
            regions.append({
                'x': col_width * 2,
                'y': y,
                'width': col_width - 10,
                'height': row_height - 5,
                'confidence': 0.7,
                'field_type': 'sale_price',
                'detection_method': 'template',
                'type': 'field_region'
            })
        
        return regions
    
    def _get_lease_agreement_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Get regions specific to lease agreement documents"""
        regions = []
        h, w = image.shape[:2]
        
        # Lease agreements are typically form-based with labeled fields
        field_height = 25
        label_width = w // 3
        
        # Common lease agreement fields with typical positions
        fields = [
            ('tenant_name', h // 6),
            ('property_address', h // 4),
            ('monthly_rent', h // 3),
            ('lease_term', h // 2),
            ('security_deposit', h * 2 // 3)
        ]
        
        for field_type, y_pos in fields:
            regions.append({
                'x': label_width,
                'y': y_pos,
                'width': w - label_width - 20,
                'height': field_height,
                'confidence': 0.6,
                'field_type': field_type,
                'detection_method': 'template',
                'type': 'field_region'
            })
        
        return regions
    
    def _store_historical_regions(self, document_type: str, regions: List[Dict[str, Any]]):
        """Store successful regions for future learning"""
        try:
            if not regions:
                return
            
            # Store only high-confidence regions for learning
            good_regions = [r for r in regions if r.get('confidence', 0) >= 0.8]
            
            if good_regions:
                self.historical_regions[document_type].extend(good_regions)
                
                # Keep only the most recent 100 regions per document type
                if len(self.historical_regions[document_type]) > 100:
                    self.historical_regions[document_type] = \
                        self.historical_regions[document_type][-100:]
                
                logger.debug(f"Stored {len(good_regions)} regions for {document_type}")
            
        except Exception as e:
            logger.error("Error storing historical regions", error=str(e))
    
    def get_region_suggestions_for_field(self, field_name: str, document_type: str, 
                                       image: np.ndarray) -> List[Dict[str, Any]]:
        """Get specific suggestions for a particular field"""
        try:
            all_regions = self.suggest_regions(document_type, image)
            field_regions = [r for r in all_regions if r.get('field_type') == field_name]
            
            # Sort by confidence
            field_regions.sort(key=lambda r: r.get('confidence', 0), reverse=True)
            
            return field_regions
            
        except Exception as e:
            logger.error("Error getting field-specific suggestions", error=str(e))
            return []
    
    def visualize_regions(self, image: np.ndarray, regions: List[Dict[str, Any]], 
                         output_path: str = None) -> np.ndarray:
        """Visualize detected regions on the image for debugging"""
        try:
            vis_image = image.copy()
            
            # Color map for different field types
            colors = {
                'unit_number': (255, 0, 0),      # Red
                'tenant_name': (0, 255, 0),      # Green
                'rent_amount': (0, 0, 255),      # Blue
                'property_name': (255, 255, 0),  # Yellow
                'address': (255, 0, 255),        # Magenta
                'price': (0, 255, 255),          # Cyan
                'default': (128, 128, 128)       # Gray
            }
            
            for region in regions:
                x, y, w, h = region['x'], region['y'], region['width'], region['height']
                field_type = region.get('field_type', 'default')
                color = colors.get(field_type, colors['default'])
                confidence = region.get('confidence', 0)
                
                # Draw rectangle
                cv2.rectangle(vis_image, (x, y), (x + w, y + h), color, 2)
                
                # Add label
                label = f"{field_type}: {confidence:.2f}"
                cv2.putText(vis_image, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.5, color, 1)
            
            if output_path:
                cv2.imwrite(output_path, vis_image)
            
            return vis_image
            
        except Exception as e:
            logger.error("Error visualizing regions", error=str(e))
            return image