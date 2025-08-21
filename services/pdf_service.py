"""
PDF Service for PDF Transaction Extractor
Handles all PDF processing functionality with clean separation of concerns.
"""

import os
import PyPDF2
from typing import Dict, List, Optional, Tuple
from PIL import Image
from pdf2image import convert_from_path

from utils.logger import get_logger

logger = get_logger(__name__)

class PDFService:
    """Service for handling PDF operations."""
    
    def __init__(self, config):
        self.config = config
    
    def get_page_count(self, pdf_path: str) -> int:
        """Get the number of pages in a PDF file."""
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                return len(pdf_reader.pages)
        except Exception as e:
            logger.error(f"Error getting page count for {pdf_path}: {e}")
            return 0
    
    def render_page(self, pdf_path: str, page_num: int, temp_folder: str) -> Tuple[str, Dict[str, int]]:
        """Render a specific page of the PDF as an image."""
        try:
            # Convert PDF page to image
            poppler_path = os.path.join(os.getcwd(), 'poppler', 'poppler-23.11.0', 'Library', 'bin')
            
            images = convert_from_path(
                pdf_path, 
                first_page=page_num + 1, 
                last_page=page_num + 1, 
                poppler_path=poppler_path,
                dpi=self.config.pdf.dpi
            )
            
            if not images:
                raise Exception("Failed to render page")
            
            image = images[0]
            
            # Resize for display (maintain aspect ratio)
            max_width, max_height = self.config.pdf.max_page_size
            
            # Calculate new dimensions
            width, height = image.size
            if width > max_width or height > max_height:
                ratio = min(max_width / width, max_height / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save image to temp folder
            image_path = os.path.join(temp_folder, f'page_{page_num}.png')
            image.save(image_path, 'PNG')
            
            dimensions = {
                'width': image.width,
                'height': image.height
            }
            
            logger.info(f"Rendered page {page_num} with dimensions {dimensions}")
            
            return image_path, dimensions
            
        except Exception as e:
            logger.error(f"Error rendering page {page_num}: {e}")
            raise
    
    def extract_text_from_page(self, pdf_path: str, page_num: int) -> str:
        """Extract all text from a specific page using PyPDF2."""
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                if page_num >= len(pdf_reader.pages):
                    return ""
                
                page = pdf_reader.pages[page_num]
                return page.extract_text()
                
        except Exception as e:
            logger.error(f"Error extracting text from page {page_num}: {e}")
            return ""
    
    def get_pdf_info(self, pdf_path: str) -> Dict[str, any]:
        """Get PDF metadata and information."""
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                info = {
                    'page_count': len(pdf_reader.pages),
                    'file_size': os.path.getsize(pdf_path),
                    'metadata': pdf_reader.metadata or {}
                }
                
                return info
                
        except Exception as e:
            logger.error(f"Error getting PDF info for {pdf_path}: {e}")
            return {}
    
    def validate_pdf(self, pdf_path: str) -> bool:
        """Validate that a PDF file is readable and not corrupted."""
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                
                # Check if we can read at least the first page
                if len(pdf_reader.pages) > 0:
                    first_page = pdf_reader.pages[0]
                    # Try to extract some text to ensure the page is readable
                    text = first_page.extract_text()
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error validating PDF {pdf_path}: {e}")
            return False
