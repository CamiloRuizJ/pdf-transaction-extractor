"""
SQLAlchemy models for RExeli production database.
Database models for Supabase PostgreSQL integration.
"""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import Column, String, Integer, Text, DateTime, Numeric, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

db = SQLAlchemy()

class Document(db.Model):
    """Document model for storing uploaded PDF information."""
    __tablename__ = 'documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    document_type = Column(String(100))
    upload_timestamp = Column(DateTime(timezone=True), default=func.now())
    processing_status = Column(String(50), default='uploaded')
    pdf_info = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    processing_sessions = relationship("ProcessingSession", back_populates="document", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            'id': str(self.id),
            'filename': self.filename,
            'original_name': self.original_name,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'document_type': self.document_type,
            'upload_timestamp': self.upload_timestamp.isoformat() if self.upload_timestamp else None,
            'processing_status': self.processing_status,
            'pdf_info': self.pdf_info,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ProcessingSession(db.Model):
    """Processing session model for tracking document processing workflows."""
    __tablename__ = 'processing_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    session_status = Column(String(50), default='started')
    progress = Column(Integer, default=0)
    current_stage = Column(String(100))
    stage_message = Column(Text)
    classification_results = Column(JSONB)
    quality_score = Column(Numeric(5, 2))
    started_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="processing_sessions")
    regions = relationship("DocumentRegion", back_populates="processing_session", cascade="all, delete-orphan")
    exports = relationship("ExportHistory", back_populates="processing_session", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            'id': str(self.id),
            'document_id': str(self.document_id),
            'session_status': self.session_status,
            'progress': self.progress,
            'current_stage': self.current_stage,
            'stage_message': self.stage_message,
            'classification_results': self.classification_results,
            'quality_score': float(self.quality_score) if self.quality_score else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DocumentRegion(db.Model):
    """Document region model for storing region information."""
    __tablename__ = 'document_regions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    processing_session_id = Column(UUID(as_uuid=True), ForeignKey('processing_sessions.id', ondelete='CASCADE'), nullable=False)
    region_name = Column(String(255), nullable=False)
    page_number = Column(Integer, nullable=False)
    x_coordinate = Column(Integer, nullable=False)
    y_coordinate = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    region_type = Column(String(100))
    confidence_score = Column(Numeric(5, 2))
    is_suggested = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    processing_session = relationship("ProcessingSession", back_populates="regions")
    extraction_results = relationship("ExtractionResult", back_populates="region", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            'id': str(self.id),
            'processing_session_id': str(self.processing_session_id),
            'region_name': self.region_name,
            'page_number': self.page_number,
            'x': self.x_coordinate,
            'y': self.y_coordinate,
            'width': self.width,
            'height': self.height,
            'region_type': self.region_type,
            'confidence_score': float(self.confidence_score) if self.confidence_score else None,
            'is_suggested': self.is_suggested,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def from_region_dict(cls, region_data: Dict[str, Any], processing_session_id: str, page_number: int = 1) -> 'DocumentRegion':
        """Create DocumentRegion from region dictionary data."""
        return cls(
            processing_session_id=processing_session_id,
            region_name=region_data.get('name', ''),
            page_number=page_number,
            x_coordinate=region_data.get('x', 0),
            y_coordinate=region_data.get('y', 0),
            width=region_data.get('width', region_data.get('w', 0)),
            height=region_data.get('height', region_data.get('h', 0)),
            region_type=region_data.get('type'),
            confidence_score=region_data.get('confidence'),
            is_suggested=region_data.get('suggested', False)
        )

class ExtractionResult(db.Model):
    """Extraction result model for storing OCR and AI extraction results."""
    __tablename__ = 'extraction_results'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_id = Column(UUID(as_uuid=True), ForeignKey('document_regions.id', ondelete='CASCADE'), nullable=False)
    extracted_text = Column(Text)
    confidence_score = Column(Numeric(5, 2))
    processing_method = Column(String(100))  # 'ocr', 'ai', 'hybrid'
    validation_status = Column(String(50), default='pending')
    corrected_text = Column(Text)
    metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    region = relationship("DocumentRegion", back_populates="extraction_results")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            'id': str(self.id),
            'region_id': str(self.region_id),
            'extracted_text': self.extracted_text,
            'confidence_score': float(self.confidence_score) if self.confidence_score else None,
            'processing_method': self.processing_method,
            'validation_status': self.validation_status,
            'corrected_text': self.corrected_text,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ExportHistory(db.Model):
    """Export history model for tracking Excel exports."""
    __tablename__ = 'export_history'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    processing_session_id = Column(UUID(as_uuid=True), ForeignKey('processing_sessions.id', ondelete='CASCADE'), nullable=False)
    export_type = Column(String(50), default='excel')
    file_path = Column(Text)
    download_url = Column(Text)
    export_metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=func.now())
    
    # Relationships
    processing_session = relationship("ProcessingSession", back_populates="exports")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            'id': str(self.id),
            'processing_session_id': str(self.processing_session_id),
            'export_type': self.export_type,
            'file_path': self.file_path,
            'download_url': self.download_url,
            'export_metadata': self.export_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Analytics(db.Model):
    """Analytics model for tracking usage and performance metrics."""
    __tablename__ = 'analytics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('processing_sessions.id', ondelete='CASCADE'))
    event_type = Column(String(100), nullable=False)
    event_data = Column(JSONB)
    processing_time_ms = Column(Integer)
    timestamp = Column(DateTime(timezone=True), default=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            'id': str(self.id),
            'session_id': str(self.session_id) if self.session_id else None,
            'event_type': self.event_type,
            'event_data': self.event_data,
            'processing_time_ms': self.processing_time_ms,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }


def init_db(app):
    """Initialize database with Flask app."""
    db.init_app(app)
    
    with app.app_context():
        # Create all tables
        db.create_all()

def get_or_create_processing_session(document_id: str) -> ProcessingSession:
    """Get existing or create new processing session for a document."""
    session = ProcessingSession.query.filter_by(
        document_id=document_id,
        session_status='started'
    ).first()
    
    if not session:
        session = ProcessingSession(
            document_id=document_id,
            session_status='started',
            progress=0,
            current_stage='initialization'
        )
        db.session.add(session)
        db.session.commit()
    
    return session

def log_analytics_event(event_type: str, event_data: Optional[Dict[str, Any]] = None, 
                       session_id: Optional[str] = None, processing_time_ms: Optional[int] = None):
    """Log analytics event."""
    analytics = Analytics(
        session_id=session_id,
        event_type=event_type,
        event_data=event_data,
        processing_time_ms=processing_time_ms
    )
    
    db.session.add(analytics)
    db.session.commit()
    
    return analytics