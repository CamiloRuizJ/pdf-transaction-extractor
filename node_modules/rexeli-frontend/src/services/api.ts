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

// File upload constants - Now supports 50MB via direct cloud upload
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB - Supported via direct cloud upload
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
const DIRECT_UPLOAD_THRESHOLD = 25 * 1024 * 1024; // Files > 25MB use direct cloud upload

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

  // Get Upload URL (decides between direct cloud or server upload)
  async getUploadUrl(
    file: File
  ): Promise<ApiResponse<{
    upload_method: 'direct_cloud' | 'standard_server';
    upload_info: any;
    file_size_mb: number;
    expires_at?: string;
    instructions?: any;
    next_step: string;
  }>> {
    try {
      const response = await this.client.post('/upload-url', {
        filename: file.name,
        file_size: file.size,
        content_type: file.type || 'application/pdf',
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Direct Cloud Upload using presigned URL
  async uploadToCloud(
    file: File,
    uploadInfo: any,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    try {
      const formData = new FormData();
      
      // Add all required fields from the presigned POST
      Object.keys(uploadInfo.fields).forEach(key => {
        formData.append(key, uploadInfo.fields[key]);
      });
      
      // Add the file last
      formData.append('file', file);

      // Use XMLHttpRequest for better progress tracking with direct S3 upload
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded * 100) / event.total);
            onProgress({
              fileId: file.name,
              progress,
              status: 'uploading',
              message: `Uploading to cloud... ${progress}%`,
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'));
        });

        xhr.open('POST', uploadInfo.upload_url);
        xhr.send(formData);
      });
    } catch (error) {
      throw error;
    }
  }

  // Confirm Cloud Upload
  async confirmCloudUpload(
    s3Key: string,
    originalFilename: string,
    fileSize: number
  ): Promise<ApiResponse<{
    file_id: string;
    s3_key: string;
    original_filename: string;
    file_size: number;
    storage_location: string;
    next_step: string;
  }>> {
    try {
      const response = await this.client.post('/confirm-upload', {
        s3_key: s3Key,
        original_filename: originalFilename,
        file_size: fileSize,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Enhanced File Upload with automatic method selection
  async uploadFile(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<{ 
    file_id: string; 
    filename?: string; 
    filepath?: string; 
    s3_key?: string;
    storage_location: string;
    upload_method: string;
    next_step: string;
  }>> {
    try {
      // Validate file using utility function
      const validation = validatePdfFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get upload URL and method
      const uploadUrlResponse = await this.getUploadUrl(file);
      const { upload_method, upload_info, instructions } = uploadUrlResponse.data;

      if (upload_method === 'direct_cloud') {
        // Use direct cloud upload for large files
        onProgress?.({
          fileId: file.name,
          progress: 0,
          status: 'uploading',
          message: 'Preparing cloud upload...',
        });

        await this.uploadToCloud(file, upload_info, onProgress);

        onProgress?.({
          fileId: file.name,
          progress: 95,
          status: 'uploading',
          message: 'Confirming upload...',
        });

        // Confirm upload completion
        const confirmResponse = await this.confirmCloudUpload(
          upload_info.key,
          file.name,
          file.size
        );

        onProgress?.({
          fileId: file.name,
          progress: 100,
          status: 'completed',
          message: 'Upload completed successfully',
        });

        return {
          success: true,
          data: {
            file_id: confirmResponse.data.file_id,
            s3_key: confirmResponse.data.s3_key,
            filename: file.name,
            storage_location: 'cloud',
            upload_method: 'direct_cloud',
            next_step: 'process'
          },
        };

      } else {
        // Use standard server upload for smaller files
        const formData = new FormData();
        formData.append('file', file);

        const config: AxiosRequestConfig = {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes for file uploads
          maxContentLength: DIRECT_UPLOAD_THRESHOLD, // 25MB for server upload
          maxBodyLength: DIRECT_UPLOAD_THRESHOLD,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress({
                fileId: file.name,
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
          data: {
            file_id: response.data.file_id,
            filename: response.data.original_filename,
            filepath: response.data.file_id, // For compatibility
            storage_location: 'server',
            upload_method: 'standard_server',
            next_step: 'process'
          },
        };
      }
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

  // Complete Document Processing (supports both local and cloud files)
  async processDocument(
    fileInfo: { 
      file_id: string; 
      filepath?: string; 
      s3_key?: string; 
      storage_location?: string; 
    },
    regions?: any[],
    documentType?: DocumentType
  ): Promise<ApiResponse<{ processing_results: any }>> {
    try {
      const response = await this.client.post('/process', {
        file_id: fileInfo.file_id,
        s3_key: fileInfo.s3_key,
        storage_location: fileInfo.storage_location || 'server',
        filepath: fileInfo.filepath || fileInfo.file_id, // backward compatibility
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

  // Chunked Upload for extremely large files (future enhancement)
  async uploadFileInChunks(
    file: File,
    chunkSize: number = 10 * 1024 * 1024, // 10MB chunks
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<{ file_id: string; chunks_processed: number }>> {
    try {
      // This is a placeholder for chunked upload implementation
      // Currently not needed since we support 50MB via direct upload
      // but can be expanded if larger files are required
      
      const fileId = `chunked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      onProgress?.({
        fileId: file.name,
        progress: 0,
        status: 'uploading',
        message: `Preparing to upload ${totalChunks} chunks...`,
      });

      // For now, delegate to standard upload if file is within our limits
      if (file.size <= MAX_FILE_SIZE_BYTES) {
        const result = await this.uploadFile(file, onProgress);
        return {
          success: true,
          data: {
            file_id: result.data.file_id,
            chunks_processed: 1
          }
        };
      }

      throw new Error(`File too large: ${formatFileSize(file.size)}. Maximum supported: ${MAX_FILE_SIZE_MB}MB`);
      
    } catch (error) {
      throw error;
    }
  }

  // Batch File Upload
  async uploadFiles(
    files: File[],
    onProgress?: (fileId: string, progress: UploadProgress) => void
  ): Promise<ApiResponse<Array<{ 
    file_id: string; 
    filename?: string; 
    filepath?: string; 
    s3_key?: string;
    storage_location: string;
    upload_method: string;
  }>>> {
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
export { validatePdfFile, formatFileSize, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES, DIRECT_UPLOAD_THRESHOLD };
export default apiService;