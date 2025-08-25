// Document Types
export type DocumentType = 
  | 'rent_roll' 
  | 'offering_memo' 
  | 'lease_agreement' 
  | 'comparable_sales' 
  | 'unknown';

// Processing Status
export type ProcessingStatus = 
  | 'idle' 
  | 'uploading' 
  | 'processing' 
  | 'completed' 
  | 'error';

// File Upload Types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
  status: ProcessingStatus;
  error?: string;
  progress?: number;
}

// Processing Results
export interface ProcessingResult {
  id: string;
  fileId: string;
  documentType: DocumentType;
  confidence: number;
  extractedData: Record<string, any>;
  regions?: Region[];
  qualityScore?: number;
  errors?: string[];
  warnings?: string[];
  createdAt: Date;
}

// Region Types
export interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  type: string;
  label: string;
  confidence?: number;
  extractedText?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Upload Progress
export interface UploadProgress {
  fileId: string;
  progress: number;
  status: ProcessingStatus;
  message?: string;
}

// Export Types
export type ExportFormat = 'excel' | 'csv' | 'json';

export interface ExportRequest {
  resultIds: string[];
  format: ExportFormat;
  options?: {
    includeMetadata?: boolean;
    includeRegions?: boolean;
    template?: string;
  };
}

// UI State Types
export interface UIState {
  selectedFiles: string[];
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'type' | 'status';
  sortOrder: 'asc' | 'desc';
  filterBy: DocumentType | 'all';
}