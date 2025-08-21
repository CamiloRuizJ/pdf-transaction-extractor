"""
OCR Service for PDF Transaction Extractor
Handles all OCR-related functionality with clean separation of concerns.
"""

import os
import re
import cv2
import numpy as np
import pytesseract
from typing import Dict, List, Optional, Any, Tuple
from PIL import Image
import requests
import base64
from io import BytesIO

from utils.logger import get_logger
from models.region import Region

logger = get_logger(__name__)

class OCRService:
    """Service for handling OCR operations."""
    
    def __init__(self, config):
        self.config = config
        self._setup_tesseract()
    
    def _setup_tesseract(self):
        """Setup Tesseract configuration."""
        if os.name == 'nt':  # Windows
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    def extract_text_from_region(self, pdf_path: str, page_num: int, region: Region) -> str:
        """Extract text from a specific region on a PDF page."""
        try:
            logger.info(f"Extracting from region: {region.name} at coordinates {region.coordinates}")
            
            # Convert PDF page to high-resolution image
            image = self._convert_pdf_page_to_image(pdf_path, page_num)
            if image is None:
                return ""
            
            # Normalize coordinates
            normalized_region = self._normalize_coordinates(region, image.size)
            
            # Crop the region
            cropped_image = self._crop_region(image, normalized_region)
            
            # Preprocess image
            preprocessed_image = self._preprocess_image(cropped_image, region.name)
            
            # Perform OCR
            ocr_results = self._perform_multi_engine_ocr(preprocessed_image, region.name)
            
            # Select best result
            best_result = self._select_best_ocr_result(ocr_results, region.name)
            
            if best_result:
                logger.info(f"Best OCR result for {region.name}: '{best_result['text']}' (confidence: {best_result['confidence']:.2f})")
                return best_result['text']
            
            return ""
            
        except Exception as e:
            logger.error(f"Error extracting text from region {region.name}: {e}")
            return ""
    
    def _convert_pdf_page_to_image(self, pdf_path: str, page_num: int) -> Optional[Image.Image]:
        """Convert PDF page to high-resolution image."""
        try:
            poppler_path = os.path.join(os.getcwd(), 'poppler', 'poppler-23.11.0', 'Library', 'bin')
            
            from pdf2image import convert_from_path
            images = convert_from_path(
                pdf_path, 
                first_page=page_num + 1, 
                last_page=page_num + 1, 
                poppler_path=poppler_path,
                dpi=self.config.ocr.preprocessing['dpi']
            )
            
            return images[0] if images else None
            
        except Exception as e:
            logger.error(f"Error converting PDF page to image: {e}")
            return None
    
    def _normalize_coordinates(self, region: Region, image_size: Tuple[int, int]) -> Region:
        """Normalize coordinates from display space to image space."""
        try:
            # This would need to be implemented based on your coordinate system
            # For now, return the region as-is
            return region
        except Exception as e:
            logger.error(f"Error normalizing coordinates: {e}")
            return region
    
    def _crop_region(self, image: Image.Image, region: Region) -> Image.Image:
        """Crop image to the specified region."""
        try:
            x1, y1 = region.x, region.y
            x2 = x1 + region.width
            y2 = y1 + region.height
            
            return image.crop((x1, y1, x2, y2))
            
        except Exception as e:
            logger.error(f"Error cropping region: {e}")
            return image
    
    def _preprocess_image(self, image: Image.Image, field_type: str) -> np.ndarray:
        """Apply advanced image preprocessing."""
        try:
            # Convert PIL image to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            
            # Apply preprocessing steps
            if self.config.ocr.preprocessing['deskew']:
                gray = self._deskew_image(gray)
            
            if self.config.ocr.preprocessing['denoise']:
                gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            if self.config.ocr.preprocessing['contrast_enhancement']:
                gray = self._enhance_contrast(gray)
            
            if self.config.ocr.preprocessing['adaptive_threshold']:
                thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            else:
                _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            if self.config.ocr.preprocessing['morphological_operations']:
                thresh = self._apply_morphological_operations(thresh, field_type)
            
            return thresh
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return np.array(image)
    
    def _deskew_image(self, image: np.ndarray) -> np.ndarray:
        """Deskew the image to fix rotation."""
        try:
            coords = np.column_stack(np.where(image > 0))
            angle = cv2.minAreaRect(coords)[-1]
            
            if angle < -45:
                angle = 90 + angle
            
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            return rotated
        except:
            return image
    
    def _enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """Enhance image contrast using CLAHE."""
        try:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(image)
            return enhanced
        except:
            return image
    
    def _apply_morphological_operations(self, image: np.ndarray, field_type: str) -> np.ndarray:
        """Apply morphological operations based on field type."""
        try:
            if field_type in ['base_rent', 'leased_square_feet', 'lease_term']:
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
            else:
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 1))
            
            closed = cv2.morphologyEx(image, cv2.MORPH_CLOSE, kernel)
            opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel)
            
            return opened
        except:
            return image
    
    def _perform_multi_engine_ocr(self, image: np.ndarray, field_type: str) -> List[Dict[str, Any]]:
        """Perform OCR using multiple engines and configurations."""
        results = []
        
        try:
            # Try different Tesseract configurations
            for engine_name, engine_config in self.config.ocr.engines.items():
                if not engine_config['enabled']:
                    continue
                
                if engine_name == 'tesseract':
                    for config in engine_config['configs']:
                        try:
                            text = pytesseract.image_to_string(image, config=config)
                            confidence = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
                            
                            # Calculate average confidence
                            conf_values = [int(conf) for conf in confidence['conf'] if int(conf) > 0]
                            avg_confidence = np.mean(conf_values) / 100.0 if conf_values else 0.0
                            
                            if text.strip():
                                results.append({
                                    'text': text.strip(),
                                    'confidence': avg_confidence,
                                    'engine': 'tesseract',
                                    'config': config
                                })
                        except Exception as e:
                            logger.error(f"Tesseract OCR failed with config {config}: {e}")
                            continue
            
            # Sort results by confidence
            results.sort(key=lambda x: x['confidence'], reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in multi-engine OCR: {e}")
            return []
    
    def _select_best_ocr_result(self, ocr_results: List[Dict[str, Any]], field_type: str) -> Optional[Dict[str, Any]]:
        """Select the best OCR result based on confidence and validation."""
        if not ocr_results:
            return None
        
        best_result = None
        best_score = 0.0
        
        for result in ocr_results:
            # Validate the text
            validation = self._validate_extracted_text(result['text'], field_type)
            
            # Calculate composite score
            confidence_score = result['confidence']
            validation_score = validation['confidence']
            
            # Weight the scores
            composite_score = (confidence_score * 0.6 + validation_score * 0.4)
            
            if composite_score > best_score:
                best_score = composite_score
                best_result = result
                best_result['validation'] = validation
                best_result['composite_score'] = composite_score
        
        return best_result
    
    def _validate_extracted_text(self, text: str, field_type: str) -> Dict[str, Any]:
        """Validate extracted text against field-specific rules."""
        field_config = self.config.get_field_patterns(field_type)
        
        if not field_config:
            return {'valid': False, 'confidence': 0.0, 'issues': ['Unknown field type']}
        
        issues = []
        confidence = 0.0
        
        # Check pattern matching
        pattern_matches = 0
        for pattern in field_config['patterns']:
            if re.search(pattern, text, re.IGNORECASE):
                pattern_matches += 1
        
        if pattern_matches > 0:
            confidence = min(1.0, (pattern_matches / len(field_config['patterns'])) * field_config['confidence_threshold'])
        
        # Check validation rules
        for rule in field_config.get('validation_rules', []):
            if not self._apply_validation_rule(text, rule):
                issues.append(f"Failed validation rule: {rule}")
        
        return {
            'valid': len(issues) == 0 and confidence >= field_config['confidence_threshold'],
            'confidence': confidence,
            'issues': issues,
            'pattern_matches': pattern_matches
        }
    
    def _apply_validation_rule(self, text: str, rule: str) -> bool:
        """Apply a specific validation rule to text."""
        if rule == 'must_contain_number':
            return bool(re.search(r'\d', text))
        elif rule == 'must_contain_numbers':
            return bool(re.search(r'\d+', text))
        elif rule == 'must_be_positive':
            numbers = re.findall(r'\d+(?:\.\d+)?', text)
            return all(float(n) > 0 for n in numbers) if numbers else False
        elif rule == 'must_start_with_capital':
            return bool(text and text[0].isupper())
        elif rule == 'must_not_contain_numbers':
            return not bool(re.search(r'\d', text))
        elif rule == 'must_not_exceed_100_chars':
            return len(text) <= 100
        elif rule == 'must_not_exceed_50_chars':
            return len(text) <= 50
        elif rule.startswith('reasonable_range_'):
            range_parts = rule.split('_')
            if len(range_parts) >= 4:
                min_val = float(range_parts[2])
                max_val = float(range_parts[3])
                numbers = re.findall(r'\d+(?:\.\d+)?', text)
                return all(min_val <= float(num) <= max_val for num in numbers) if numbers else False
        
        return True
    
    def test_capabilities(self) -> Dict[str, Any]:
        """Test OCR capabilities and return status."""
        try:
            # Test Tesseract
            try:
                version = pytesseract.get_tesseract_version()
                tesseract_available = True
                tesseract_version = str(version)
            except Exception as e:
                tesseract_available = False
                tesseract_version = str(e)
            
            # Test OpenCV
            try:
                cv_version = cv2.__version__
                opencv_available = True
            except Exception as e:
                opencv_available = False
                cv_version = str(e)
            
            # Test OCR functionality
            ocr_test_result = "Not tested"
            if tesseract_available:
                try:
                    # Create a simple test image
                    test_image = Image.new('RGB', (200, 50), color='white')
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(test_image)
                    draw.text((10, 10), "Test OCR", fill='black')
                    
                    # Try OCR
                    test_text = pytesseract.image_to_string(test_image)
                    ocr_test_result = "Working" if test_text.strip() else "No text detected"
                except Exception as e:
                    ocr_test_result = f"Error: {str(e)}"
            
            return {
                'tesseract_available': tesseract_available,
                'tesseract_version': tesseract_version,
                'opencv_available': opencv_available,
                'opencv_version': cv_version,
                'ocr_test_result': ocr_test_result
            }
            
        except Exception as e:
            logger.error(f"Error testing OCR capabilities: {e}")
            return {
                'tesseract_available': False,
                'tesseract_version': str(e),
                'opencv_available': False,
                'opencv_version': str(e),
                'ocr_test_result': f"Error: {str(e)}"
            }
