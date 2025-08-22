"""
Extraction result model.
"""

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class ExtractionResult:
    """Represents the result of text extraction from a region."""
    
    region_name: str
    text: str
    confidence: float
    page: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'region_name': self.region_name,
            'text': self.text,
            'confidence': self.confidence,
            'page': self.page
        }
