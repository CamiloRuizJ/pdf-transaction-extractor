import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import type { 
  ApiResponse, 
  UploadedFile, 
  ProcessingResult, 
  DocumentType,
  ExportRequest,
  UploadProgress
} from '../types';

// API Configuration for Vercel deployment
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : `${window.location.origin}/api`;

// File upload constants - Aligned with Vercel serverless limits
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB - Vercel serverless compatible
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(1)}KB`;
};

// Utility function to validate PDF files
const validatePdfFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${formatFileSize(file.size)}. Maximum allowed: ${MAX_FILE_SIZE_MB}MB. Please compress or use a smaller PDF file.`
    };
  }

  // Check empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty. Please select a valid PDF document.'
    };
  }

  // Check file type
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: 'Only PDF files are supported. Please upload a PDF document.'
    };
  }

  return { valid: true };
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000, // 2 minutes for larger file uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp for cache busting
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Handle unauthorized
          console.error('Unauthorized access');
        } else if (error.response?.status === 413) {
          // Handle payload too large
          console.error('File too large:', error.message);
        } else if (error.response?.status >= 500) {
          // Handle server errors
          console.error('Server error:', error.message);
        } else if (error.code === 'ECONNABORTED') {
          // Handle timeout
          console.error('Request timeout');
        }
        
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private normalizeError(error: AxiosError): Error {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      return new Error(data.error || data.message || 'API Error');
    }
    return new Error(error.message || 'Network Error');
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; version: string }>> {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // AI Service Status
  async getAIStatus(): Promise<ApiResponse<{ ai_service: string; configured: boolean; model: string }>> {
    try {
      const response = await this.client.get('/ai/status');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // File Upload with Progress
  async uploadFile(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<{ filename: string; filepath: string; pdf_info: any }>> {
    try {
      // Validate file using utility function
      const validation = validatePdfFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const formData = new FormData();
      formData.append('file', file);

      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for file uploads
        maxContentLength: MAX_FILE_SIZE_BYTES, // 50MB
        maxBodyLength: MAX_FILE_SIZE_BYTES, // 50MB
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({
              fileId: file.name, // Using filename as temp ID
              progress,
              status: 'uploading',
              message: `Uploading... ${progress}%`,
            });
          }
        },
      };

      const response = await this.client.post('/upload', formData, config);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Document Classification
  async classifyDocument(filepath: string): Promise<ApiResponse<{ classification: any }>> {
    try {
      const response = await this.client.post('/classify-document', {
        filepath,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Region Suggestions
  async suggestRegions(
    filepath: string, 
    documentType: DocumentType
  ): Promise<ApiResponse<{ regions: any[] }>> {
    try {
      const response = await this.client.post('/suggest-regions', {
        filepath,
        document_type: documentType,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Data Extraction
  async extractData(
    filepath: string, 
    regions: any[]
  ): Promise<ApiResponse<{ extracted_data: Record<string, any> }>> {
    try {
      const response = await this.client.post('/extract-data', {
        filepath,
        regions,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Data Validation
  async validateData(
    extractedData: Record<string, any>, 
    documentType: DocumentType
  ): Promise<ApiResponse<{ validation: any }>> {
    try {
      const response = await this.client.post('/validate-data', {
        extracted_data: extractedData,
        document_type: documentType,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Quality Score
  async calculateQualityScore(
    extractedData: Record<string, any>,
    validationResults: Record<string, any>
  ): Promise<ApiResponse<{ quality_score: any }>> {
    try {
      const response = await this.client.post('/quality-score', {
        extracted_data: extractedData,
        validation_results: validationResults,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Complete Document Processing
  async processDocument(
    filepath: string,
    regions?: any[],
    documentType?: DocumentType
  ): Promise<ApiResponse<{ processing_results: any }>> {
    try {
      const response = await this.client.post('/process-document', {
        filepath,
        regions,
        document_type: documentType,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Processing Status
  async getProcessingStatus(
    processingId: string
  ): Promise<ApiResponse<{ processing_id: string; status: string; progress: number; stage: string; message: string }>> {
    try {
      const response = await this.client.get(`/process-status/${processingId}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Validate Processing Results
  async validateProcessing(
    processingResults: Record<string, any>
  ): Promise<ApiResponse<{ validation_report: any }>> {
    try {
      const response = await this.client.post('/validate-processing', {
        processing_results: processingResults,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate Report
  async generateReport(
    processingResults: Record<string, any>
  ): Promise<ApiResponse<{ report: any }>> {
    try {
      const response = await this.client.post('/generate-report', {
        processing_results: processingResults,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Excel Export
  async exportToExcel(
    extractedData: Record<string, any>,
    documentType: DocumentType,
    filename?: string
  ): Promise<ApiResponse<{ excel_path: string; download_url: string }>> {
    try {
      const response = await this.client.post('/export-excel', {
        extracted_data: extractedData,
        document_type: documentType,
        filename,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // File Download
  async downloadFile(filename: string): Promise<Blob> {
    try {
      const response = await this.client.get(`/download/${filename}`, {
        responseType: 'blob',
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Batch File Upload
  async uploadFiles(
    files: File[],
    onProgress?: (fileId: string, progress: UploadProgress) => void
  ): Promise<ApiResponse<Array<{ filename: string; filepath: string; pdf_info: any }>>> {
    try {
      // Validate all files first before uploading any
      const validationErrors: string[] = [];
      files.forEach((file, index) => {
        const validation = validatePdfFile(file);
        if (!validation.valid) {
          validationErrors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
        }
      });

      if (validationErrors.length > 0) {
        throw new Error(`File validation failed:\n${validationErrors.join('\n')}`);
      }

      const uploadPromises = files.map(file =>
        this.uploadFile(file, onProgress ? (progress) => onProgress(file.name, progress) : undefined)
          .then(result => result.data)
      );

      const results = await Promise.all(uploadPromises);
      
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance and utility functions
export const apiService = new ApiService();
export { validatePdfFile, formatFileSize, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES };
export default apiService;