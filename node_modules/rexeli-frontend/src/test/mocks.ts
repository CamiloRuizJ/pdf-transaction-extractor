import { vi } from 'vitest';
import type { ProcessingResult, UploadedFile, DocumentType, Region } from '../types';

// Mock file data
export const mockFile: UploadedFile = {
  id: 'mock-file-1',
  name: 'test-document.pdf',
  size: 1024000,
  type: 'application/pdf',
  status: 'uploaded',
  uploadedAt: new Date(),
  progress: 100,
};

export const mockProcessingFile: UploadedFile = {
  ...mockFile,
  id: 'mock-processing-file',
  status: 'processing',
  progress: 65,
};

export const mockErrorFile: UploadedFile = {
  ...mockFile,
  id: 'mock-error-file',
  status: 'error',
  error: 'Failed to process document',
  progress: 0,
};

// Mock regions
export const mockRegion: Region = {
  id: 'region-1',
  x: 100,
  y: 150,
  width: 200,
  height: 50,
  confidence: 0.95,
  text: 'Sample extracted text',
  fieldType: 'rent_amount',
  page: 1,
};

export const mockRegions: Region[] = [
  mockRegion,
  {
    id: 'region-2',
    x: 150,
    y: 200,
    width: 180,
    height: 40,
    confidence: 0.88,
    text: '123 Main Street',
    fieldType: 'property_address',
    page: 1,
  },
  {
    id: 'region-3',
    x: 200,
    y: 300,
    width: 120,
    height: 30,
    confidence: 0.92,
    text: '2024-01-15',
    fieldType: 'lease_date',
    page: 1,
  },
];

// Mock processing results
export const mockProcessingResult: ProcessingResult = {
  id: 'result-1',
  fileId: 'mock-file-1',
  documentType: 'rent_roll' as DocumentType,
  confidence: 0.94,
  qualityScore: 0.87,
  extractedData: {
    property_name: 'Sunset Apartments',
    total_units: '24',
    rent_amounts: ['$1,200', '$1,350', '$1,180'],
    property_address: '123 Main Street, City, State 12345',
  },
  regions: mockRegions,
  createdAt: new Date(),
  warnings: ['Low confidence on unit 5 rent amount'],
  errors: [],
};

export const mockProcessingResults: Record<string, ProcessingResult> = {
  'result-1': mockProcessingResult,
  'result-2': {
    ...mockProcessingResult,
    id: 'result-2',
    fileId: 'mock-file-2',
    documentType: 'lease_agreement',
    confidence: 0.89,
    qualityScore: 0.91,
    extractedData: {
      tenant_name: 'John Doe',
      lease_start: '2024-01-01',
      lease_end: '2024-12-31',
      monthly_rent: '$1,500',
    },
    warnings: [],
    errors: ['Missing signature date'],
  },
};

// Mock API service
export const mockApiService = {
  uploadFile: vi.fn(),
  getUploadStatus: vi.fn(),
  processDocument: vi.fn(),
  getProcessingStatus: vi.fn(),
  getResults: vi.fn(),
  exportResults: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue({ success: true, status: 'healthy' }),
  getAIStatus: vi.fn().mockResolvedValue({ 
    success: true, 
    data: { configured: true, status: 'online' } 
  }),
};

// Mock hooks
export const mockUseToast = () => ({
  addToast: vi.fn(),
  removeToast: vi.fn(),
  clearToasts: vi.fn(),
  toasts: [],
});

export const mockUseExport = () => ({
  exportToExcel: vi.fn().mockResolvedValue(undefined),
  exportToCSV: vi.fn().mockResolvedValue(undefined),
  exportToPDF: vi.fn().mockResolvedValue(undefined),
  exportStatus: {
    isExporting: false,
    progress: 0,
    error: null,
  },
});

export const mockUsePolling = vi.fn();

// Mock Web APIs
export const mockPerformanceObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
};

export const mockIntersectionObserver = {
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
};

// Mock performance entries
export const mockPerformanceEntries = {
  navigation: [{
    name: 'navigation',
    entryType: 'navigation',
    startTime: 0,
    duration: 1000,
    responseStart: 100,
    responseEnd: 200,
  }],
  paint: [
    {
      name: 'first-contentful-paint',
      entryType: 'paint',
      startTime: 1200,
      duration: 0,
    },
    {
      name: 'first-paint',
      entryType: 'paint', 
      startTime: 1100,
      duration: 0,
    },
  ],
  'largest-contentful-paint': [{
    name: 'largest-contentful-paint',
    entryType: 'largest-contentful-paint',
    startTime: 2100,
    size: 1500,
  }],
};

// Mock toast notifications
export const mockToasts = [
  {
    id: 'toast-1',
    type: 'success' as const,
    title: 'Success',
    message: 'Operation completed successfully',
    duration: 5000,
    createdAt: new Date(),
  },
  {
    id: 'toast-2',
    type: 'error' as const,
    title: 'Error',
    message: 'Something went wrong',
    duration: 0,
    createdAt: new Date(),
  },
];

// Mock keyboard shortcuts
export const mockKeyboardShortcuts = [
  {
    key: 'u',
    ctrlKey: true,
    action: vi.fn(),
    description: 'Upload files',
  },
  {
    key: 'p',
    ctrlKey: true,
    action: vi.fn(), 
    description: 'Start processing',
  },
  {
    key: 'Escape',
    action: vi.fn(),
    description: 'Close modals',
  },
];

// Mock form validation
export const mockFormValidators = {
  required: (value: any) => value ? null : 'This field is required',
  email: (value: string) => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email address',
  minLength: (min: number) => (value: string) =>
    value.length >= min ? null : `Must be at least ${min} characters`,
};