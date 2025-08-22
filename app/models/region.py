"""
Region model for representing document regions.
"""

from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class Region:
    """Represents a region on a document page."""
    
    name: str
    x: int
    y: int
    w: int
    h: int
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Region':
        """Create a Region from a dictionary."""
        return cls(
            name=data.get('name', ''),
            x=data.get('x', 0),
            y=data.get('y', 0),
            w=data.get('width', data.get('w', 0)),
            h=data.get('height', data.get('h', 0))
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert Region to dictionary."""
        return {
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'width': self.w,
            'height': self.h
        }
