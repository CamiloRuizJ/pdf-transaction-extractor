"""
Simplified Utilities for PDF Transaction Extractor
Easy-to-use helper functions.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional
from werkzeug.utils import secure_filename
from PIL import Image
import cv2
import numpy as np

def setup_logger(name: str) -> logging.Logger:
    """Setup a simple logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

def validate_file(file, allowed_extensions: set, max_size: int) -> tuple[bool, str]:
    """Validate uploaded file."""
    if not file:
        return False, "No file provided"
    
    filename = secure_filename(file.filename)
    if not filename:
        return False, "Invalid filename"
    
    # Check extension
    if '.' not in filename:
        return False, "No file extension"
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in allowed_extensions:
        return False, f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
    
    # Check file size
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    
    if size > max_size:
        return False, f"File too large. Max size: {max_size // (1024*1024)}MB"
    
    return True, "File is valid"

def preprocess_image(image: Image.Image) -> Image.Image:
    """Simple image preprocessing for better OCR."""
    # Convert to numpy array
    img_array = np.array(image)
    
    # Convert to grayscale if needed
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Apply basic preprocessing
    # 1. Denoise
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # 2. Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    
    # 3. Threshold
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Convert back to PIL Image
    return Image.fromarray(thresh)

def correct_ocr_text(text: str, corrections: Dict[str, str]) -> str:
    """Apply common OCR corrections."""
    corrected = text
    for wrong, right in corrections.items():
        corrected = corrected.replace(wrong, right)
    return corrected

def extract_patterns(text: str, patterns: Dict[str, str]) -> Dict[str, List[str]]:
    """Extract patterns from text using regex."""
    results = {}
    for pattern_name, pattern in patterns.items():
        matches = re.findall(pattern, text)
        if matches:
            results[pattern_name] = matches
    return results

def safe_filename(filename: str) -> str:
    """Create a safe filename."""
    return secure_filename(filename)

def ensure_directory(path: str) -> None:
    """Ensure directory exists."""
    os.makedirs(path, exist_ok=True)
