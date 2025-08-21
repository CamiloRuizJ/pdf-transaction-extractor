"""
Region model for PDF Transaction Extractor.
Represents a region on a PDF page for text extraction.
"""

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class Region:
    """Represents a region on a PDF page for text extraction."""
    
    name: str
    x: int
    y: int
    width: int
    height: int
    
    @property
    def coordinates(self) -> tuple:
        """Get coordinates as a tuple."""
        return (self.x, self.y, self.width, self.height)
    
    @property
    def area(self) -> int:
        """Calculate the area of the region."""
        return self.width * self.height
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert region to dictionary."""
        return {
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Region':
        """Create region from dictionary."""
        return cls(
            name=data['name'],
            x=data['x'],
            y=data['y'],
            width=data['width'],
            height=data['height']
        )
    
    def is_valid(self, min_width: int = 5, min_height: int = 5) -> bool:
        """Check if the region is valid."""
        return (
            self.width >= min_width and
            self.height >= min_height and
            self.x >= 0 and
            self.y >= 0
        )
    
    def contains_point(self, point_x: int, point_y: int) -> bool:
        """Check if a point is within this region."""
        return (
            self.x <= point_x <= self.x + self.width and
            self.y <= point_y <= self.y + self.height
        )
    
    def overlaps_with(self, other: 'Region') -> bool:
        """Check if this region overlaps with another region."""
        return not (
            self.x + self.width <= other.x or
            other.x + other.width <= self.x or
            self.y + self.height <= other.y or
            other.y + other.height <= self.y
        )
