"""
PDF Service
Service for PDF processing and conversion.
"""

import os
import PyPDF2
import pdf2image
import numpy as np
from typing import Dict, Any, List, Optional
from config import Config
import structlog

logger = structlog.get_logger()

class PDFService:
    """Service for handling PDF file operations"""
    
    def __init__(self):
        self.poppler_path = Config.POPPLER_PATH
        self.dpi = Config.OCR_DPI
    
    def get_pdf_info(self, pdf_path: str) -> Dict[str, Any]:
        """Get basic information about a PDF file"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                info = {
                    'page_count': len(pdf_reader.pages),
                    'file_size': os.path.getsize(pdf_path),
                    'filename': os.path.basename(pdf_path),
                    'metadata': pdf_reader.metadata or {}
                }
                
                logger.info("PDF info extracted", 
                           filename=info['filename'],
                           page_count=info['page_count'])
                
                return info
                
        except Exception as e:
            logger.error("Error getting PDF info", error=str(e), pdf_path=pdf_path)
            raise
    
    def convert_pdf_to_images(self, pdf_path: str, pages: List[int] = None) -> List[np.ndarray]:
        """Convert PDF pages to images"""
        try:
            if pages is None:
                pages = [0]  # Default to first page
            
            # Try with poppler first
            try:
                if self.poppler_path and os.path.exists(self.poppler_path):
                    # Convert pages to images
                    images = pdf2image.convert_from_path(
                        pdf_path,
                        dpi=self.dpi,
                        first_page=min(pages) + 1,
                        last_page=max(pages) + 1,
                        poppler_path=self.poppler_path
                    )
                else:
                    # Try without explicit poppler path
                    images = pdf2image.convert_from_path(
                        pdf_path,
                        dpi=self.dpi,
                        first_page=min(pages) + 1,
                        last_page=max(pages) + 1
                    )
                
                # Convert PIL images to numpy arrays
                numpy_images = [np.array(img) for img in images]
                
                logger.info("PDF converted to images", 
                           pdf_path=pdf_path,
                           pages=pages,
                           image_count=len(numpy_images))
                
                return numpy_images
                
            except Exception as poppler_error:
                logger.warning("Poppler conversion failed, trying fallback", error=str(poppler_error))
                
                # Fallback: Create dummy image from PDF text
                import cv2
                from PIL import Image, ImageDraw, ImageFont
                
                # Extract text as fallback
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page_num in pages:
                        if page_num < len(pdf_reader.pages):
                            page = pdf_reader.pages[page_num]
                            text += page.extract_text()
                
                # Create image with text
                img_width, img_height = 800, 1000
                img = Image.new('RGB', (img_width, img_height), color='white')
                draw = ImageDraw.Draw(img)
                
                # Use default font
                try:
                    font = ImageFont.load_default()
                except:
                    font = None
                
                # Draw text on image
                y_offset = 50
                for line in text[:1000].split('\n'):  # Limit text
                    if y_offset > img_height - 50:
                        break
                    draw.text((50, y_offset), line[:80], fill='black', font=font)
                    y_offset += 30
                
                numpy_img = np.array(img)
                
                logger.info("PDF converted using text fallback", 
                           pdf_path=pdf_path,
                           text_length=len(text))
                
                return [numpy_img]
                
        except Exception as e:
            logger.error("Error converting PDF to images", 
                        error=str(e), 
                        pdf_path=pdf_path)
            raise
    
    def extract_text_from_pdf(self, pdf_path: str, pages: List[int] = None) -> Dict[str, Any]:
        """Extract raw text from PDF using PyPDF2"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                if pages is None:
                    pages = [0]  # Default to first page
                
                extracted_text = ""
                page_texts = {}
                
                for page_num in pages:
                    if page_num < len(pdf_reader.pages):
                        page = pdf_reader.pages[page_num]
                        page_text = page.extract_text()
                        page_texts[f"page_{page_num}"] = page_text
                        extracted_text += page_text + "\n"
                
                result = {
                    'text': extracted_text.strip(),
                    'page_texts': page_texts,
                    'total_pages': len(pdf_reader.pages),
                    'extracted_pages': pages
                }
                
                logger.info("Text extracted from PDF", 
                           pdf_path=pdf_path,
                           pages=pages,
                           text_length=len(extracted_text))
                
                return result
                
        except Exception as e:
            logger.error("Error extracting text from PDF", 
                        error=str(e), 
                        pdf_path=pdf_path)
            raise
    
    def get_page_image(self, pdf_path: str, page_number: int) -> Optional[np.ndarray]:
        """Get a specific page as an image"""
        try:
            images = self.convert_pdf_to_images(pdf_path, [page_number])
            return images[0] if images else None
            
        except Exception as e:
            logger.error("Error getting page image", 
                        error=str(e), 
                        pdf_path=pdf_path,
                        page_number=page_number)
            return None
