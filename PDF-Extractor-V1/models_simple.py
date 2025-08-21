"""
Simplified Models for PDF Transaction Extractor
Easy-to-use data structures for the application.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any

@dataclass
class Region:
    """Simple region definition for text extraction."""
    name: str
    x: int
    y: int
    width: int
    height: int
    
    @property
    def coordinates(self) -> Dict[str, int]:
        """Get coordinates as dictionary."""
        return {
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Region':
        """Create Region from dictionary."""
        return cls(
            name=data['name'],
            x=data['x'],
            y=data['y'],
            width=data['width'],
            height=data['height']
        )

@dataclass
class ExtractionResult:
    """Result of text extraction from a region."""
    region_name: str
    text: str
    confidence: float
    page: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'region_name': self.region_name,
            'text': self.text,
            'confidence': self.confidence,
            'page': self.page
        }

@dataclass
class PDFInfo:
    """Information about a PDF file."""
    filename: str
    page_count: int
    file_size: int
    upload_time: str
