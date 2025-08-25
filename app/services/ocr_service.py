"""
OCR Service
Enhanced OCR service with text extraction and correction capabilities.
"""

import os
import re
import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
from typing import Dict, Any, List, Optional, Tuple, Union
import structlog
from pathlib import Path
import hashlib
import tempfile

logger = structlog.get_logger()

class OCRService:
    """Enhanced OCR service for text extraction from images with specialized real estate document optimization"""
    
    def __init__(self, tesseract_path: str = None, confidence_threshold: float = 60, cache_results: bool = True, 
                 allowed_directories: List[str] = None, max_file_size: int = 50 * 1024 * 1024):
        """
        Initialize OCR service with configurable parameters
        
        Args:
            tesseract_path: Path to tesseract executable
            confidence_threshold: Minimum confidence threshold for OCR results
            cache_results: Whether to cache OCR results for performance
            allowed_directories: List of allowed directories for file access (security)
            max_file_size: Maximum file size in bytes (default 50MB)
        """
        self.tesseract_path = tesseract_path or self._get_tesseract_path()
        self.confidence_threshold = confidence_threshold
        self.cache_results = cache_results
        self._result_cache = {} if cache_results else None
        
        # Security configuration
        self.allowed_directories = allowed_directories or [
            tempfile.gettempdir(),
            os.getcwd(),
        ]
        self.max_file_size = max_file_size
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.pdf'}
        
        # OCR configurations optimized for different document types
        self.ocr_configs = {
            'default': '--oem 3 --psm 6',
            'sparse_text': '--oem 3 --psm 8',
            'single_line': '--oem 3 --psm 7',
            'single_word': '--oem 3 --psm 8',
            'single_char': '--oem 3 --psm 10',
            'real_estate': '--oem 3 --psm 6',  # Removed character whitelist to prevent confidence issues
            'financial': '--oem 3 --psm 6'     # Removed character whitelist to prevent confidence issues
        }
        
        # Set tesseract path if provided
        if self.tesseract_path and os.path.exists(self.tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_path
        
        logger.info("OCR Service initialized", 
                   confidence_threshold=self.confidence_threshold,
                   max_file_size=self.max_file_size)
    
    def _get_tesseract_path(self) -> str:
        """Auto-detect tesseract installation path"""
        possible_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
            'tesseract'  # Assume it's in PATH
        ]
        
        for path in possible_paths:
            if os.path.exists(path) or path == 'tesseract':
                return path
        
        logger.warning("Tesseract not found in common locations")
        return 'tesseract'
    
    def _sanitize_file_path(self, file_path: str) -> Tuple[str, bool]:
        """
        Sanitize and validate file path to prevent security vulnerabilities
        
        Args:
            file_path: Input file path to validate
            
        Returns:
            Tuple of (sanitized_path, is_valid)
        """
        try:
            if not file_path or not isinstance(file_path, str):
                return "", False
            
            # Resolve path to prevent traversal attacks
            resolved_path = os.path.abspath(os.path.normpath(file_path))
            
            # Check if path exists
            if not os.path.exists(resolved_path):
                return "", False
            
            # Validate file extension
            _, ext = os.path.splitext(resolved_path.lower())
            if ext not in self.allowed_extensions:
                return "", False
            
            # Check if file is within allowed directories
            is_allowed = False
            for allowed_dir in self.allowed_directories:
                allowed_abs = os.path.abspath(allowed_dir)
                if resolved_path.startswith(allowed_abs):
                    is_allowed = True
                    break
            
            if not is_allowed:
                return "", False
            
            # Check file size
            if os.path.getsize(resolved_path) > self.max_file_size:
                return "", False
            
            return resolved_path, True
            
        except Exception as e:
            logger.warning("Path validation failed", error_type=type(e).__name__)
            return "", False
    
    def _get_secure_file_identifier(self, file_path: str) -> str:
        """
        Generate secure file identifier for logging without exposing full path
        
        Args:
            file_path: Full file path
            
        Returns:
            Secure identifier for logging
        """
        try:
            filename = os.path.basename(file_path)
            # Create hash of directory path for identification without exposure
            dir_path = os.path.dirname(file_path)
            dir_hash = hashlib.md5(dir_path.encode()).hexdigest()[:8]
            return f"{filename}[{dir_hash}]"
        except Exception:
            return "unknown_file"
    
    def _create_secure_error_response(self, error_type: str, operation: str, 
                                    file_identifier: str = None) -> Dict[str, Any]:
        """
        Create secure error response without exposing system information
        
        Args:
            error_type: Type of error (e.g., 'file_not_found', 'invalid_image')
            operation: Operation being performed
            file_identifier: Safe file identifier
            
        Returns:
            Secure error response dictionary
        """
        error_messages = {
            'file_not_found': 'The specified file could not be accessed',
            'invalid_image': 'The file is not a valid image format',
            'processing_failed': 'Text extraction failed due to processing error',
            'invalid_input': 'Invalid input parameters provided',
            'access_denied': 'File access not permitted',
            'file_too_large': 'File size exceeds maximum allowed limit'
        }
        
        return {
            'text': '', 
            'confidence': 0.0, 
            'words': [], 
            'success': False,
            'error_code': error_type,
            'error_message': error_messages.get(error_type, 'An error occurred during processing'),
            'operation': operation
        }
    
    def _log_security_event(self, event_type: str, details: Dict[str, Any] = None):
        """
        Log security-related events with sanitized information
        
        Args:
            event_type: Type of security event
            details: Additional sanitized details
        """
        safe_details = details or {}
        # Remove any potentially sensitive information
        sanitized_details = {k: v for k, v in safe_details.items() 
                           if k not in ['full_path', 'file_path', 'directory']}
        
        logger.warning("Security event", 
                      event_type=event_type, 
                      **sanitized_details)
    
    def extract_text_from_region(self, image_path: str, region: Dict[str, int]) -> Dict[str, Any]:
        """
        Extract text from specific region coordinates in an image
        
        Args:
            image_path: Path to the image file
            region: Dictionary with keys 'x', 'y', 'width', 'height'
            
        Returns:
            Dictionary containing extracted text, confidence, and metadata
        """
        # Validate and sanitize file path
        sanitized_path, is_valid = self._sanitize_file_path(image_path)
        
        if not is_valid:
            self._log_security_event("invalid_file_access", {
                "operation": "extract_text_from_region",
                "file_identifier": self._get_secure_file_identifier(image_path) if image_path else "unknown"
            })
            return self._create_secure_error_response('file_not_found', 'extract_text_from_region')
        
        try:
            # Load image using validated path
            image = cv2.imread(sanitized_path)
            if image is None:
                return self._create_secure_error_response('invalid_image', 'extract_text_from_region')
            
            # Extract region with bounds validation
            x, y, w, h = region.get('x', 0), region.get('y', 0), region.get('width', 0), region.get('height', 0)
            
            # Validate region bounds
            img_height, img_width = image.shape[:2]
            x = max(0, min(x, img_width))
            y = max(0, min(y, img_height))
            w = max(1, min(w, img_width - x))
            h = max(1, min(h, img_height - y))
            
            region_image = image[y:y+h, x:x+w]
            
            return self.extract_text_from_image(region_image, region)
            
        except Exception as e:
            file_id = self._get_secure_file_identifier(sanitized_path)
            logger.error("Error extracting text from region", 
                        error_type=type(e).__name__, 
                        file_identifier=file_id,
                        region_size=f"{region.get('width', 0)}x{region.get('height', 0)}")
            return self._create_secure_error_response('processing_failed', 'extract_text_from_region')
    
    def extract_text_from_image(self, image: Union[np.ndarray, str], region: Dict[str, int] = None) -> Dict[str, Any]:
        """
        Extract text from image using OCR with preprocessing and optimization
        
        Args:
            image: Image as numpy array or file path
            region: Optional region information for context
            
        Returns:
            Dictionary containing extracted text, confidence, and detailed results
        """
        import time
        start_time = time.time()
        
        try:
            # Handle different input types with security validation
            if isinstance(image, str):
                sanitized_path, is_valid = self._sanitize_file_path(image)
                if not is_valid:
                    return self._create_secure_error_response('file_not_found', 'extract_text_from_image')
                cv_image = cv2.imread(sanitized_path)
            else:
                cv_image = image.copy() if image is not None else None
            
            if cv_image is None:
                return self._create_secure_error_response('invalid_image', 'extract_text_from_image')
            
            # Try multiple preprocessing approaches for better OCR accuracy
            best_result = None
            best_confidence = 0.0
            preprocessing_levels = ['standard', 'aggressive']
            
            for prep_level in preprocessing_levels:
                try:
                    # Preprocess image
                    processed_image = self.preprocess_image(cv_image, prep_level)
                    
                    # Convert to PIL Image for pytesseract
                    pil_image = Image.fromarray(cv2.cvtColor(processed_image, cv2.COLOR_BGR2RGB))
                    
                    # Determine best OCR configuration
                    ocr_config = self._select_ocr_config(processed_image)
                    
                    # Extract text with detailed data
                    ocr_data = pytesseract.image_to_data(pil_image, config=ocr_config, output_type=pytesseract.Output.DICT)
                    text = pytesseract.image_to_string(pil_image, config=ocr_config).strip()
                    
                    # Calculate confidence for this attempt
                    confidence = self.calculate_confidence(ocr_data)
                    
                    # Keep the best result
                    if confidence > best_confidence or best_result is None:
                        best_result = {
                            'ocr_data': ocr_data,
                            'text': text,
                            'confidence': confidence,
                            'preprocessing': prep_level
                        }
                        best_confidence = confidence
                    
                    # If we get good confidence, no need to try more aggressive preprocessing
                    if confidence > 80:
                        break
                        
                except Exception as e:
                    logger.warning(f"Error with {prep_level} preprocessing", error=str(e))
                    continue
            
            if best_result is None:
                return self._create_secure_error_response('processing_failed', 'extract_text_from_image')
            
            # Use the best result
            ocr_data = best_result['ocr_data']
            text = best_result['text']
            confidence = best_result['confidence']
            preprocessing_used = best_result['preprocessing']
            
            # Extract word-level data
            words = self._extract_word_data(ocr_data)
            
            # Apply post-processing corrections
            corrected_text = self._apply_corrections(text)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            result = {
                'text': corrected_text,
                'raw_text': text,
                'confidence': confidence,
                'words': words,
                'region': region,
                'success': True,
                'word_count': len([w for w in words if w['confidence'] > self.confidence_threshold]),
                'processing_notes': [],
                'processing_time': processing_time,
                'preprocessing_used': preprocessing_used
            }
            
            # Add quality indicators
            if confidence < self.confidence_threshold:
                result['processing_notes'].append(f"Low confidence: {confidence:.1f}%")
            
            if len(corrected_text) != len(text):
                result['processing_notes'].append("Text corrections applied")
            
            if preprocessing_used == 'aggressive':
                result['processing_notes'].append("Used aggressive preprocessing for better OCR")
            
            logger.debug("Text extracted successfully", 
                        text_length=len(corrected_text),
                        confidence=confidence,
                        word_count=len(words))
            
            # Validate the result and add quality metrics
            result = self.validate_ocr_result(result)
            
            return result
            
        except Exception as e:
            logger.error("Error extracting text from image", 
                        error_type=type(e).__name__,
                        has_region=region is not None)
            return self._create_secure_error_response('processing_failed', 'extract_text_from_image')
    
    def preprocess_image(self, image: np.ndarray, preprocessing_level: str = 'standard') -> np.ndarray:
        """
        Apply preprocessing techniques to improve OCR accuracy
        
        Args:
            image: Input image as numpy array
            preprocessing_level: 'light', 'standard', or 'aggressive'
            
        Returns:
            Preprocessed image optimized for OCR
        """
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Detect if image is already binary (black and white)
            unique_values = np.unique(gray)
            is_binary = len(unique_values) <= 2
            
            if preprocessing_level == 'light' and not is_binary:
                # Light preprocessing for good quality images
                enhanced = cv2.equalizeHist(gray)
                result = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
                
            elif preprocessing_level == 'aggressive' or is_binary:
                # Aggressive preprocessing for poor quality scanned documents
                
                # Resize if too small (improves OCR accuracy)
                height, width = gray.shape
                if width < 300 or height < 300:
                    scale_factor = max(300 / width, 300 / height)
                    new_width = int(width * scale_factor)
                    new_height = int(height * scale_factor)
                    gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
                
                # Apply strong denoising
                denoised = cv2.medianBlur(gray, 3)
                
                # Multiple threshold attempts
                # Try Otsu thresholding first
                _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                
                # Try adaptive thresholding
                adaptive = cv2.adaptiveThreshold(
                    denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 10
                )
                
                # Choose the better result based on white pixel ratio
                otsu_white_ratio = np.sum(otsu == 255) / otsu.size
                adaptive_white_ratio = np.sum(adaptive == 255) / adaptive.size
                
                # Prefer the one with more reasonable white/black ratio (0.3-0.7)
                if abs(otsu_white_ratio - 0.5) < abs(adaptive_white_ratio - 0.5):
                    binary = otsu
                else:
                    binary = adaptive
                
                # Morphological operations to clean up text
                kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 1))
                cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_close)
                
                # Remove small noise
                kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
                cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel_open)
                
                result = cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)
                
            else:
                # Standard preprocessing
                # Apply adaptive histogram equalization
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                
                # Light denoising
                denoised = cv2.fastNlMeansDenoising(enhanced, h=10)
                
                # Apply adaptive thresholding
                binary = cv2.adaptiveThreshold(
                    denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
                )
                
                # Light morphological cleanup
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
                cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
                
                result = cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)
            
            return result
            
        except Exception as e:
            logger.warning("Error in image preprocessing, using original", error=str(e))
            return image
    
    def calculate_confidence(self, ocr_data: Dict[str, List]) -> float:
        """
        Calculate overall confidence score from OCR data
        
        Args:
            ocr_data: OCR data dictionary from pytesseract
            
        Returns:
            Average confidence score as percentage
        """
        try:
            # Get valid confidence and text pairs
            confidences = ocr_data['conf']
            texts = ocr_data['text']
            
            if not confidences or len(confidences) != len(texts):
                return 0.0
            
            # Weight confidence by text length for valid entries
            weighted_sum = 0
            total_weight = 0
            
            for i, (conf, text) in enumerate(zip(confidences, texts)):
                if conf > 0 and text.strip():
                    weight = len(text.strip())
                    weighted_sum += conf * weight
                    total_weight += weight
            
            if total_weight == 0:
                # Fallback to simple average of valid confidences
                valid_confidences = [conf for conf in confidences if conf > 0]
                return np.mean(valid_confidences) if valid_confidences else 0.0
            
            return weighted_sum / total_weight
            
        except Exception as e:
            logger.warning("Error calculating confidence", error=str(e))
            return 0.0
    
    def _extract_word_data(self, ocr_data: Dict[str, List]) -> List[Dict[str, Any]]:
        """Extract word-level data from OCR results"""
        words = []
        try:
            for i in range(len(ocr_data['text'])):
                if ocr_data['text'][i].strip() and ocr_data['conf'][i] > 0:
                    word_data = {
                        'text': ocr_data['text'][i],
                        'confidence': ocr_data['conf'][i],
                        'bbox': {
                            'left': ocr_data['left'][i],
                            'top': ocr_data['top'][i],
                            'width': ocr_data['width'][i],
                            'height': ocr_data['height'][i]
                        },
                        'level': ocr_data['level'][i]
                    }
                    words.append(word_data)
        except Exception as e:
            logger.warning("Error extracting word data", error=str(e))
        
        return words
    
    def _select_ocr_config(self, image: np.ndarray) -> str:
        """
        Select optimal OCR configuration based on image characteristics
        
        Args:
            image: Input image for analysis
            
        Returns:
            OCR configuration string
        """
        try:
            # Analyze image characteristics
            height, width = image.shape[:2]
            aspect_ratio = width / height
            
            # Convert to grayscale for analysis
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Detect text density
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (width * height)
            
            # Select configuration based on characteristics
            if edge_density < 0.01:  # Very sparse text
                return self.ocr_configs['sparse_text']
            elif aspect_ratio > 10:  # Very wide, likely single line
                return self.ocr_configs['single_line']
            elif width < 100 and height < 100:  # Small region, likely single word
                return self.ocr_configs['single_word']
            else:
                return self.ocr_configs['real_estate']  # Default for real estate docs
                
        except Exception as e:
            logger.warning("Error selecting OCR config, using default", error=str(e))
            return self.ocr_configs['default']
    
    def _apply_corrections(self, text: str) -> str:
        """
        Apply common OCR error corrections for real estate documents
        
        Args:
            text: Raw OCR text
            
        Returns:
            Corrected text
        """
        if not text:
            return text
        
        corrections = {
            # Common OCR mistakes in real estate documents
            r'\b0(?=\d)': 'O',  # 0 at start of word should be O
            r'(?<=\d)O(?=\d)': '0',  # O between digits should be 0
            r'\bl(?=\d)': '1',  # l before digit should be 1
            r'(?<=\d)l\b': '1',  # l after digit should be 1
            r'\bS(?=\d)': '5',  # S before digit should be 5
            r'(?<=\d)S\b': '5',  # S after digit should be 5
            r'\bB(?=\d)': '8',  # B before digit should be 8
            r'(?<=\d)B\b': '8',  # B after digit should be 8
            
            # Common symbol corrections
            r'§': '$',  # Section symbol often mistaken for dollar
            r'[|]': '1',  # Pipe often mistaken for 1
            r'(?<=\$)\s+(?=\d)': '',  # Remove space after dollar sign
            
            # Address corrections
            r'\bSt\.?\b': 'Street',
            r'\bAve\.?\b': 'Avenue',
            r'\bRd\.?\b': 'Road',
            r'\bBlvd\.?\b': 'Boulevard',
            r'\bDr\.?\b': 'Drive',
            
            # Multiple spaces to single space
            r'\s+': ' ',
        }
        
        corrected = text
        for pattern, replacement in corrections.items():
            corrected = re.sub(pattern, replacement, corrected)
        
        return corrected.strip()
    
    def validate_ocr_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and enhance OCR result with quality checks
        
        Args:
            result: OCR result dictionary
            
        Returns:
            Enhanced result with validation information
        """
        try:
            validation = {
                'is_valid': True,
                'quality_score': 0.0,
                'issues': [],
                'recommendations': []
            }
            
            confidence = result.get('confidence', 0.0)
            text = result.get('text', '')
            word_count = result.get('word_count', 0)
            
            # Calculate quality score (0-100)
            quality_factors = []
            
            # Confidence factor (40% weight)
            confidence_factor = min(confidence / 100.0, 1.0) * 0.4
            quality_factors.append(confidence_factor)
            
            # Text length factor (30% weight)
            text_length_factor = min(len(text) / 100.0, 1.0) * 0.3
            quality_factors.append(text_length_factor)
            
            # Word count factor (30% weight)
            word_count_factor = min(word_count / 20.0, 1.0) * 0.3
            quality_factors.append(word_count_factor)
            
            validation['quality_score'] = sum(quality_factors) * 100
            
            # Identify issues
            if confidence < 50:
                validation['issues'].append('Low OCR confidence')
                validation['recommendations'].append('Consider image preprocessing or manual review')
            
            if len(text) < 10:
                validation['issues'].append('Very short extracted text')
                validation['recommendations'].append('Verify image contains readable text')
            
            if word_count == 0:
                validation['issues'].append('No words detected above confidence threshold')
                validation['recommendations'].append('Lower confidence threshold or improve image quality')
            
            # Special characters that often indicate OCR errors
            error_indicators = ['�', '©', '®', '™']
            if any(indicator in text for indicator in error_indicators):
                validation['issues'].append('Potential OCR encoding errors detected')
                validation['recommendations'].append('Review extracted text for accuracy')
            
            # Mark as invalid if critical issues
            if validation['quality_score'] < 20:
                validation['is_valid'] = False
                validation['recommendations'].append('Consider re-scanning document or manual data entry')
            
            result['validation'] = validation
            return result
            
        except Exception as e:
            logger.warning("Error validating OCR result", error=str(e))
            result['validation'] = {
                'is_valid': False,
                'quality_score': 0.0,
                'issues': ['Validation failed'],
                'recommendations': ['Manual review required']
            }
            return result
    
    def extract_text_from_pdf_page(self, page_image: np.ndarray, regions: List[Dict[str, int]] = None) -> Dict[str, Any]:
        """
        Extract text from PDF page with optional region-specific extraction
        
        Args:
            page_image: PDF page as image array
            regions: List of regions to extract text from
            
        Returns:
            Dictionary containing full page text and region-specific text
        """
        try:
            # Extract full page text
            full_page_result = self.extract_text_from_image(page_image)
            
            region_results = {}
            if regions:
                for i, region in enumerate(regions):
                    region_key = f"region_{i}"
                    try:
                        # Extract region from page image
                        x, y, w, h = region['x'], region['y'], region['width'], region['height']
                        img_height, img_width = page_image.shape[:2]
                        
                        # Validate and clip region bounds
                        x = max(0, min(x, img_width))
                        y = max(0, min(y, img_height))
                        w = max(1, min(w, img_width - x))
                        h = max(1, min(h, img_height - y))
                        
                        region_image = page_image[y:y+h, x:x+w]
                        region_result = self.extract_text_from_image(region_image, region)
                        region_results[region_key] = region_result
                        
                    except Exception as e:
                        logger.warning(f"Error extracting region {i}", 
                                     error_type=type(e).__name__,
                                     region_index=i)
                        region_results[region_key] = self._create_secure_error_response(
                            'processing_failed', f'extract_region_{i}')
            
            return {
                'text': full_page_result['text'],
                'regions': region_results,
                'confidence': full_page_result['confidence'],
                'success': True,
                'word_count': full_page_result.get('word_count', 0)
            }
            
        except Exception as e:
            logger.error("Error extracting text from PDF page", 
                        error_type=type(e).__name__,
                        region_count=len(regions) if regions else 0)
            error_response = self._create_secure_error_response('processing_failed', 'extract_text_from_pdf_page')
            error_response.update({
                'regions': {},
                'word_count': 0
            })
            return error_response
    
    def extract_structured_data(self, image: np.ndarray, field_patterns: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Extract structured data using regex patterns optimized for real estate documents
        
        Args:
            image: Input image
            field_patterns: Custom patterns to extract specific fields
            
        Returns:
            Dictionary containing extracted structured fields
        """
        try:
            # Extract text first
            ocr_result = self.extract_text_from_image(image)
            text = ocr_result['text']
            
            if not text:
                return {'extracted_fields': {}, 'confidence': 0.0, 'success': False}
            
            # Default real estate patterns
            default_patterns = {
                'property_address': r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct)\b',
                'rent_amount': r'\$\s*[\d,]+(?:\.\d{2})?',
                'square_footage': r'(?:SF|sq\s*ft|square\s*feet?)\s*:?\s*[\d,]+',
                'lease_term': r'(?:lease|term)\s*(?:of\s*)?(\d+)\s*(?:years?|months?)',
                'phone': r'\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})',
                'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
                'date': r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',
                'dollar_amount': r'\$\s*[\d,]+(?:\.\d{2})?',
                'percentage': r'\d+(?:\.\d+)?%',
                'property_type': r'(?i)\b(?:office|retail|industrial|warehouse|apartment|residential|commercial|mixed.use)\b'
            }
            
            # Merge custom patterns with defaults
            patterns = {**default_patterns, **(field_patterns or {})}
            
            extracted_fields = {}
            total_matches = 0
            
            for field_name, pattern in patterns.items():
                try:
                    matches = re.finditer(pattern, text, re.IGNORECASE)
                    field_matches = []
                    
                    for match in matches:
                        field_matches.append({
                            'value': match.group().strip(),
                            'start': match.start(),
                            'end': match.end(),
                            'confidence': 0.8  # Base confidence for pattern matches
                        })
                        total_matches += 1
                    
                    if field_matches:
                        extracted_fields[field_name] = field_matches
                        
                except Exception as e:
                    logger.warning(f"Error processing pattern for {field_name}", error=str(e))
            
            # Calculate overall confidence based on OCR confidence and pattern matches
            base_confidence = ocr_result['confidence']
            pattern_bonus = min(total_matches * 5, 20)  # Bonus for successful pattern matches
            overall_confidence = min(base_confidence + pattern_bonus, 100)
            
            return {
                'extracted_fields': extracted_fields,
                'confidence': overall_confidence,
                'success': True,
                'total_matches': total_matches,
                'text_length': len(text),
                'ocr_confidence': base_confidence
            }
            
        except Exception as e:
            logger.error("Error extracting structured data", 
                        error_type=type(e).__name__,
                        pattern_count=len(field_patterns) if field_patterns else 0)
            error_response = self._create_secure_error_response('processing_failed', 'extract_structured_data')
            error_response.update({
                'extracted_fields': {},
                'total_matches': 0,
                'text_length': 0,
                'ocr_confidence': 0.0
            })
            return error_response
