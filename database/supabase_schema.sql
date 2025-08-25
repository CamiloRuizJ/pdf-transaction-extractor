-- RExeli Database Schema for Supabase PostgreSQL
-- PDF Transaction Extractor Production Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table to store uploaded PDF information
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    document_type VARCHAR(100),
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'uploaded',
    pdf_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing sessions table to track document processing workflows
CREATE TABLE IF NOT EXISTS processing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    session_status VARCHAR(50) DEFAULT 'started',
    progress INTEGER DEFAULT 0,
    current_stage VARCHAR(100),
    stage_message TEXT,
    classification_results JSONB,
    quality_score NUMERIC(5,2),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regions table to store document region information
CREATE TABLE IF NOT EXISTS document_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_session_id UUID NOT NULL REFERENCES processing_sessions(id) ON DELETE CASCADE,
    region_name VARCHAR(255) NOT NULL,
    page_number INTEGER NOT NULL,
    x_coordinate INTEGER NOT NULL,
    y_coordinate INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    region_type VARCHAR(100),
    confidence_score NUMERIC(5,2),
    is_suggested BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extraction results table to store OCR and AI extraction results
CREATE TABLE IF NOT EXISTS extraction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES document_regions(id) ON DELETE CASCADE,
    extracted_text TEXT,
    confidence_score NUMERIC(5,2),
    processing_method VARCHAR(100), -- 'ocr', 'ai', 'hybrid'
    validation_status VARCHAR(50) DEFAULT 'pending',
    corrected_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export history table to track Excel exports
CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_session_id UUID NOT NULL REFERENCES processing_sessions(id) ON DELETE CASCADE,
    export_type VARCHAR(50) DEFAULT 'excel',
    file_path TEXT,
    download_url TEXT,
    export_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table for tracking usage and performance metrics
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES processing_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    processing_time_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_processing_sessions_document_id ON processing_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON processing_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_created_at ON processing_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_document_regions_session_id ON document_regions(processing_session_id);
CREATE INDEX IF NOT EXISTS idx_document_regions_page ON document_regions(page_number);
CREATE INDEX IF NOT EXISTS idx_document_regions_type ON document_regions(region_type);

CREATE INDEX IF NOT EXISTS idx_extraction_results_region_id ON extraction_results(region_id);
CREATE INDEX IF NOT EXISTS idx_extraction_results_method ON extraction_results(processing_method);
CREATE INDEX IF NOT EXISTS idx_extraction_results_validation ON extraction_results(validation_status);

CREATE INDEX IF NOT EXISTS idx_export_history_session_id ON export_history(processing_session_id);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON export_history(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processing_sessions_updated_at BEFORE UPDATE ON processing_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_regions_updated_at BEFORE UPDATE ON document_regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_extraction_results_updated_at BEFORE UPDATE ON extraction_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) setup for multi-tenancy (optional)
-- Uncomment if you plan to add user authentication later
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_regions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

-- Insert initial data or configuration if needed
-- This section can be used for default document types, region templates, etc.

-- Example: Insert default document types
INSERT INTO analytics (event_type, event_data, timestamp) VALUES 
('system', '{"action": "schema_initialized", "version": "1.0"}', NOW())
ON CONFLICT DO NOTHING;