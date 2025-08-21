"""
Extraction Result model for PDF Transaction Extractor.
Represents the result of text extraction from a region.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class ExtractionResult:
    """Represents the result of text extraction from a region."""
    
    region_name: str
    extracted_text: str
    confidence: float
    page_number: int
    field_type: str
    validation_passed: bool
    ai_enhancements: list
    processing_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert extraction result to dictionary."""
        return {
            'region_name': self.region_name,
            'extracted_text': self.extracted_text,
            'confidence': self.confidence,
            'page_number': self.page_number,
            'field_type': self.field_type,
            'validation_passed': self.validation_passed,
            'ai_enhancements': self.ai_enhancements,
            'processing_time': self.processing_time
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExtractionResult':
        """Create extraction result from dictionary."""
        return cls(
            region_name=data['region_name'],
            extracted_text=data['extracted_text'],
            confidence=data['confidence'],
            page_number=data['page_number'],
            field_type=data['field_type'],
            validation_passed=data['validation_passed'],
            ai_enhancements=data.get('ai_enhancements', []),
            processing_time=data.get('processing_time', 0.0)
        )
    
    def is_successful(self, min_confidence: float = 0.5) -> bool:
        """Check if the extraction was successful."""
        return (
            self.confidence >= min_confidence and
            self.validation_passed and
            bool(self.extracted_text.strip())
        )
    
    def get_quality_score(self) -> float:
        """Calculate a quality score for this extraction."""
        base_score = self.confidence
        
        # Bonus for validation passing
        if self.validation_passed:
            base_score += 0.1
        
        # Bonus for having AI enhancements
        if self.ai_enhancements:
            base_score += 0.05
        
        # Penalty for long processing time
        if self.processing_time > 5.0:  # More than 5 seconds
            base_score -= 0.1
        
        return min(1.0, max(0.0, base_score))
