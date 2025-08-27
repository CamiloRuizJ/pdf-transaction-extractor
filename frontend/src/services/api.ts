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

// File upload constants - Enhanced 25MB upload support
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB - Supabase Free tier limit
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4MB - Above this uses Supabase direct upload

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(1)}KB`;
};

// Utility function to validate uploaded files
const validateUploadedFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${formatFileSize(file.size)}. Maximum allowed: ${MAX_FILE_SIZE_MB}MB. Please ensure your file is under 25MB.`
    };
  }

  // Check empty file
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty. Please select a valid document.'
    };
  }

  // Check file type - support multiple formats like backend
  const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
  const fileName = file.name.toLowerCase();
  const isValidType = allowedTypes.some(type => 
    file.type.includes(type) || fileName.endsWith(`.${type}`)
  );
  
  if (!isValidType) {
    return {
      valid: false,
      error: 'File type not supported. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.'
    };
  }

  return { valid: true };
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 300000, // 5 minutes for 25MB file uploads
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
  async healthCheck(): Promise<ApiResponse<{ 
    status: string; 
    timestamp: string; 
    version: string;
    openai_available: boolean;
    ai_model: string;
    supabase_available: boolean;
  }>> {
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

  // Get Upload Method - determines if file should use direct Supabase upload
  async getUploadMethod(
    file: File
  ): Promise<ApiResponse<{
    upload_method: 'server_upload' | 'direct_supabase';
    file_size_mb: number;
    threshold_mb: number;
    upload_info: any;
    next_step: string;
  }>> {
    try {
      const response = await this.client.post('/upload-method', {
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

  // Direct Supabase Upload using Supabase client
  async uploadToSupabase(
    file: File,
    uploadInfo: any,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        fileId: file.name,
        progress: 5,
        status: 'uploading',
        message: 'Initializing Supabase client...',
      });

      // Import Supabase client using singleton pattern
      const { getSupabaseClient } = await import('../lib/supabase');
      
      const supabase = getSupabaseClient(
        uploadInfo.supabase_url,
        uploadInfo.anon_key
      );

      onProgress?.({
        fileId: file.name,
        progress: 10,
        status: 'uploading',
        message: 'Starting direct upload to Supabase storage...',
      });

      // Upload directly to Supabase Storage
      const { data, error } = await supabase.storage
        .from(uploadInfo.bucket)
        .upload(uploadInfo.file_path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        
        // Provide specific error messages
        if (error.message.includes('The resource already exists')) {
          // Retry with upsert if file already exists
          const retryResult = await supabase.storage
            .from(uploadInfo.bucket)
            .upload(uploadInfo.file_path, file, {
              cacheControl: '3600',
              upsert: true  // Allow overwrite
            });
          
          if (retryResult.error) {
            throw new Error(`Supabase upload failed: ${retryResult.error.message}`);
          }
        } else if (error.message.includes('policy')) {
          throw new Error('Storage permission error. Please enable upload policies in Supabase dashboard.');
        } else if (error.message.includes('bucket')) {
          throw new Error('Storage bucket not found. Please create "documents" bucket in Supabase.');
        } else {
          throw new Error(`Supabase upload failed: ${error.message}`);
        }
      }

      onProgress?.({
        fileId: file.name,
        progress: 100,
        status: 'completed',
        message: 'Large file uploaded successfully via Supabase! 🎉',
      });

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Confirm Supabase Upload
  async confirmSupabaseUpload(
    filePath: string,
    originalFilename: string,
    fileSize: number,
    uploadToken: string
  ): Promise<ApiResponse<{
    document_id: string;
    file_path: string;
    original_filename: string;
    file_size: number;
    storage_location: string;
    upload_method: string;
  }>> {
    try {
      const response = await this.client.post('/confirm-upload', {
        file_path: filePath,
        original_filename: originalFilename,
        file_size: fileSize,
        upload_token: uploadToken,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw error;
    }
  }

  // Enhanced File Upload with intelligent routing
  async uploadFile(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<{ 
    file_id: string; 
    filename?: string; 
    filepath?: string; 
    document_id?: string;
    storage_location: string;
    upload_method: string;
    next_step: string;
  }>> {
    try {
      // Validate file using utility function
      const validation = validateUploadedFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Intelligent file size routing - bypass API decision if file is large
      let upload_method = 'server_upload';
      let upload_info: any = {};

      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        // Force direct Supabase upload for large files
        upload_method = 'direct_supabase';
        upload_info = {
          upload_method: 'direct_supabase',
          file_path: `uploads/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`,
          upload_token: Math.random().toString(36).substr(2, 16),
          supabase_url: 'https://lddwbkefiucimrkfskzt.supabase.co',
          bucket: 'documents',
          anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHdia2VmaXVjaW1ya2Zza3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODk0NTIsImV4cCI6MjA3MTQ2NTQ1Mn0.DP75WZ2UEyslCJxV9iHKiPOYzG9Sxbkj78eChMrYdQs'
        };
        console.log(`Large file detected (${formatFileSize(file.size)}), using direct Supabase upload`);
      } else {
        // Get upload method from API for smaller files
        try {
          const uploadMethodResponse = await this.getUploadMethod(file);
          upload_info = uploadMethodResponse.data.upload_info;
        } catch (error) {
          console.warn('API upload method check failed, using server upload:', error);
          upload_info = {
            endpoint: '/api/upload',
            method: 'POST',
            max_size_mb: 4
          };
        }
      }

      onProgress?.({
        fileId: file.name,
        progress: 5,
        status: 'uploading',
        message: `Using ${upload_method} method (${formatFileSize(file.size)})...`,
      });

      if (upload_method === 'direct_supabase') {
        // Use direct Supabase upload for large files
        try {
          await this.uploadToSupabase(file, upload_info, onProgress);
          
          // Generate signed URL for PDF viewing using singleton client
          const { getSupabaseClient } = await import('../lib/supabase');
          const supabase = getSupabaseClient(
            upload_info.supabase_url,
            upload_info.anon_key
          );

          const { data: signedUrlData } = await supabase.storage
            .from(upload_info.bucket)
            .createSignedUrl(upload_info.file_path, 3600); // 1 hour expiry

          // Confirm the upload with our API
          const confirmResponse = await this.confirmSupabaseUpload(
            upload_info.file_path,
            file.name,
            file.size,
            upload_info.upload_token
          );

          return {
            success: true,
            data: {
              file_id: confirmResponse.data.document_id,
              document_id: confirmResponse.data.document_id,
              filename: confirmResponse.data.original_filename,
              filepath: confirmResponse.data.file_path,
              url: signedUrlData?.signedUrl || upload_info.file_path, // Add signed URL for viewing
              storage_location: 'supabase',
              upload_method: 'direct_supabase',
              next_step: 'process'
            },
          };
        } catch (supabaseError) {
          console.error('Direct Supabase upload process failed:', supabaseError);
          
          // If the error is from confirmation (not the actual upload), still return success
          if (supabaseError instanceof Error && supabaseError.message.includes('confirm')) {
            return {
              success: true,
              data: {
                file_id: upload_info.file_path,
                document_id: 'pending-confirmation',
                filename: file.name,
                filepath: upload_info.file_path,
                storage_location: 'supabase',
                upload_method: 'direct_supabase',
                next_step: 'process'
              },
            };
          }
          
          // For other errors, don't fall back to chunked upload as it's not implemented
          throw new Error(`Large file upload failed: ${supabaseError.message}. Please try again or contact support.`);
        }
      } else {
        // Use server upload for smaller files
        try {
          const formData = new FormData();
          formData.append('file', file);

          const config: AxiosRequestConfig = {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 minutes for file uploads
            maxContentLength: upload_info.max_size_mb * 1024 * 1024,
            maxBodyLength: upload_info.max_size_mb * 1024 * 1024,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total && onProgress) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress({
                  fileId: file.name,
                  progress,
                  status: 'uploading',
                  message: `Uploading to server... ${progress}%`,
                });
              }
            },
          };

          const response = await this.client.post('/upload', formData, config);
          
          return {
            success: true,
            data: {
              file_id: response.data.document_id || response.data.file_id,
              filename: response.data.original_filename,
              filepath: response.data.file_id,
              storage_location: 'server',
              upload_method: 'server_upload',
              next_step: 'process'
            },
          };
        } catch (uploadError: any) {
          // If we get a 413 error, the file is too large for server upload
          if (uploadError?.response?.status === 413) {
            throw new Error(`File too large for server upload. The file will be routed through direct storage upload automatically.`);
          }
          
          throw uploadError;
        }
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

  // Chunked Upload for large files that can't use direct cloud upload
  async uploadFileInChunks(
    file: File,
    chunkSize: number = 4 * 1024 * 1024, // 4MB chunks to stay well under limits
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<{ 
    file_id: string; 
    filename?: string; 
    filepath?: string; 
    storage_location: string;
    upload_method: string;
    next_step: string;
  }>> {
    try {
      const fileId = `chunked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      onProgress?.({
        fileId: file.name,
        progress: 0,
        status: 'uploading',
        message: `Preparing to upload ${totalChunks} chunks...`,
      });

      let uploadedChunks = 0;
      
      // Upload each chunk
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunkBlob = file.slice(start, end);
        
        // Create form data for this chunk
        const formData = new FormData();
        formData.append('chunk', new File([chunkBlob], `chunk_${chunkIndex}.part`));
        formData.append('chunk_data', JSON.stringify({
          chunk_number: chunkIndex,
          total_chunks: totalChunks,
          file_id: fileId,
          original_filename: file.name
        }));

        try {
          const response = await this.client.post('/upload-chunk', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // 1 minute per chunk
            maxContentLength: chunkSize + 1024, // Chunk size + metadata
            maxBodyLength: chunkSize + 1024,
          });

          uploadedChunks++;
          const progress = Math.round((uploadedChunks / totalChunks) * 100);
          
          onProgress?.({
            fileId: file.name,
            progress,
            status: 'uploading',
            message: `Uploaded chunk ${uploadedChunks}/${totalChunks} (${progress}%)`,
          });

          // Check if upload is complete
          if (response.data.upload_complete) {
            onProgress?.({
              fileId: file.name,
              progress: 100,
              status: 'completed',
              message: 'Chunked upload completed successfully',
            });

            return {
              success: true,
              data: {
                file_id: response.data.file_id,
                filename: file.name,
                filepath: response.data.file_id, // For compatibility
                storage_location: 'server',
                upload_method: 'chunked_server',
                next_step: 'process'
              }
            };
          }
        } catch (chunkError) {
          throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
        }
      }

      throw new Error('Chunked upload completed but no completion confirmation received');
      
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
        const validation = validateUploadedFile(file);
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
export { validateUploadedFile, formatFileSize, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES, DIRECT_UPLOAD_THRESHOLD };
export default apiService;