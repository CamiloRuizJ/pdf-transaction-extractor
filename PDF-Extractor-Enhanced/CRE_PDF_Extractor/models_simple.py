"""
Simplified Models for CRE PDF Extractor
Basic data structures for the enhanced application.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class Region:
    """Represents a region on a PDF page for data extraction."""
    
    id: str
    name: str
    x: int
    y: int
    width: int
    height: int
    page: int = 1
    created_at: Optional[datetime] = None
    named_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert region to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'page': self.page,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'named_at': self.named_at.isoformat() if self.named_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Region':
        """Create region from dictionary."""
        created_at = None
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'])
            except ValueError:
                pass
        
        named_at = None
        if data.get('named_at'):
            try:
                named_at = datetime.fromisoformat(data['named_at'])
            except ValueError:
                pass
        
        return cls(
            id=data['id'],
            name=data['name'],
            x=data['x'],
            y=data['y'],
            width=data['width'],
            height=data['height'],
            page=data.get('page', 1),
            created_at=created_at,
            named_at=named_at
        )
    
    def area(self) -> int:
        """Calculate region area."""
        return self.width * self.height
    
    def contains_point(self, x: int, y: int) -> bool:
        """Check if point is within region."""
        return (self.x <= x <= self.x + self.width and 
                self.y <= y <= self.y + self.height)
    
    def overlaps(self, other: 'Region') -> bool:
        """Check if region overlaps with another region."""
        return not (self.x + self.width <= other.x or 
                   other.x + other.width <= self.x or
                   self.y + self.height <= other.y or 
                   other.y + other.height <= self.y)


@dataclass
class ExtractionResult:
    """Represents the result of extracting data from a region."""
    
    region_id: str
    region_name: str
    extracted_text: str
    confidence: float
    page: int = 1
    ai_enhanced: bool = False
    quality_score: float = 0.5
    error: Optional[str] = None
    extracted_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.extracted_at is None:
            self.extracted_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert extraction result to dictionary."""
        return {
            'region_id': self.region_id,
            'region_name': self.region_name,
            'extracted_text': self.extracted_text,
            'confidence': self.confidence,
            'page': self.page,
            'ai_enhanced': self.ai_enhanced,
            'quality_score': self.quality_score,
            'error': self.error,
            'extracted_at': self.extracted_at.isoformat() if self.extracted_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExtractionResult':
        """Create extraction result from dictionary."""
        extracted_at = None
        if data.get('extracted_at'):
            try:
                extracted_at = datetime.fromisoformat(data['extracted_at'])
            except ValueError:
                pass
        
        return cls(
            region_id=data['region_id'],
            region_name=data['region_name'],
            extracted_text=data['extracted_text'],
            confidence=data['confidence'],
            page=data.get('page', 1),
            ai_enhanced=data.get('ai_enhanced', False),
            quality_score=data.get('quality_score', 0.5),
            error=data.get('error'),
            extracted_at=extracted_at
        )
    
    def is_successful(self) -> bool:
        """Check if extraction was successful."""
        return self.error is None and self.confidence > 0
    
    def get_quality_level(self) -> str:
        """Get quality level based on score."""
        if self.quality_score >= 0.8:
            return 'high'
        elif self.quality_score >= 0.6:
            return 'medium'
        else:
            return 'low'


@dataclass
class PDFInfo:
    """Represents information about a PDF file."""
    
    filename: str
    page_count: int
    file_size: int
    uploaded_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.uploaded_at is None:
            self.uploaded_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert PDF info to dictionary."""
        return {
            'filename': self.filename,
            'page_count': self.page_count,
            'file_size': self.file_size,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PDFInfo':
        """Create PDF info from dictionary."""
        uploaded_at = None
        if data.get('uploaded_at'):
            try:
                uploaded_at = datetime.fromisoformat(data['uploaded_at'])
            except ValueError:
                pass
        
        processed_at = None
        if data.get('processed_at'):
            try:
                processed_at = datetime.fromisoformat(data['processed_at'])
            except ValueError:
                pass
        
        return cls(
            filename=data['filename'],
            page_count=data['page_count'],
            file_size=data['file_size'],
            uploaded_at=uploaded_at,
            processed_at=processed_at
        )
    
    def get_file_size_mb(self) -> float:
        """Get file size in megabytes."""
        return self.file_size / (1024 * 1024)
    
    def get_file_size_formatted(self) -> str:
        """Get formatted file size string."""
        size_mb = self.get_file_size_mb()
        if size_mb < 1:
            return f"{self.file_size / 1024:.1f} KB"
        else:
            return f"{size_mb:.1f} MB"


@dataclass
class SessionData:
    """Represents the current session data."""
    
    pdf_info: Optional[PDFInfo] = None
    regions: List[Region] = None
    extraction_results: List[ExtractionResult] = None
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.regions is None:
            self.regions = []
        if self.extraction_results is None:
            self.extraction_results = []
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert session data to dictionary."""
        return {
            'pdf_info': self.pdf_info.to_dict() if self.pdf_info else None,
            'regions': [region.to_dict() for region in self.regions],
            'extraction_results': [result.to_dict() for result in self.extraction_results],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionData':
        """Create session data from dictionary."""
        pdf_info = None
        if data.get('pdf_info'):
            pdf_info = PDFInfo.from_dict(data['pdf_info'])
        
        regions = []
        if data.get('regions'):
            regions = [Region.from_dict(region_data) for region_data in data['regions']]
        
        extraction_results = []
        if data.get('extraction_results'):
            extraction_results = [ExtractionResult.from_dict(result_data) for result_data in data['extraction_results']]
        
        created_at = None
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'])
            except ValueError:
                pass
        
        return cls(
            pdf_info=pdf_info,
            regions=regions,
            extraction_results=extraction_results,
            created_at=created_at
        )
    
    def add_region(self, region: Region) -> None:
        """Add a region to the session."""
        self.regions.append(region)
    
    def remove_region(self, region_id: str) -> bool:
        """Remove a region from the session."""
        for i, region in enumerate(self.regions):
            if region.id == region_id:
                self.regions.pop(i)
                return True
        return False
    
    def get_regions_for_page(self, page: int) -> List[Region]:
        """Get regions for a specific page."""
        return [region for region in self.regions if region.page == page]
    
    def add_extraction_result(self, result: ExtractionResult) -> None:
        """Add an extraction result to the session."""
        self.extraction_results.append(result)
    
    def get_extraction_results_for_page(self, page: int) -> List[ExtractionResult]:
        """Get extraction results for a specific page."""
        return [result for result in self.extraction_results if result.page == page]
    
    def clear(self) -> None:
        """Clear all session data."""
        self.pdf_info = None
        self.regions.clear()
        self.extraction_results.clear()
    
    def has_data(self) -> bool:
        """Check if session has any data."""
        return (self.pdf_info is not None or 
                len(self.regions) > 0 or 
                len(self.extraction_results) > 0)


@dataclass
class AIInsight:
    """Represents an AI-generated insight about extracted data."""
    
    title: str
    message: str
    type: str = 'info'  # info, warning, error, success
    confidence: float = 0.5
    icon: Optional[str] = None
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert AI insight to dictionary."""
        return {
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'confidence': self.confidence,
            'icon': self.icon,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AIInsight':
        """Create AI insight from dictionary."""
        created_at = None
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'])
            except ValueError:
                pass
        
        return cls(
            title=data['title'],
            message=data['message'],
            type=data.get('type', 'info'),
            confidence=data.get('confidence', 0.5),
            icon=data.get('icon'),
            created_at=created_at
        )


@dataclass
class QualityMetrics:
    """Represents quality metrics for extracted data."""
    
    overall_score: float
    text_quality: float
    confidence_score: float
    ai_enhancement_score: float
    total_regions: int
    successful_extractions: int
    failed_extractions: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert quality metrics to dictionary."""
        return {
            'overall_score': self.overall_score,
            'text_quality': self.text_quality,
            'confidence_score': self.confidence_score,
            'ai_enhancement_score': self.ai_enhancement_score,
            'total_regions': self.total_regions,
            'successful_extractions': self.successful_extractions,
            'failed_extractions': self.failed_extractions
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'QualityMetrics':
        """Create quality metrics from dictionary."""
        return cls(
            overall_score=data['overall_score'],
            text_quality=data['text_quality'],
            confidence_score=data['confidence_score'],
            ai_enhancement_score=data['ai_enhancement_score'],
            total_regions=data['total_regions'],
            successful_extractions=data['successful_extractions'],
            failed_extractions=data['failed_extractions']
        )
    
    def get_success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_regions == 0:
            return 0.0
        return self.successful_extractions / self.total_regions
    
    def get_quality_level(self) -> str:
        """Get overall quality level."""
        if self.overall_score >= 0.8:
            return 'excellent'
        elif self.overall_score >= 0.6:
            return 'good'
        elif self.overall_score >= 0.4:
            return 'fair'
        else:
            return 'poor'
