// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Error codes
export enum ErrorCodes {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // File upload errors
  FILE_SIZE_ERROR = 'FILE_SIZE_ERROR',
  FILE_TYPE_ERROR = 'FILE_TYPE_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  
  // Processing errors
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  CLASSIFICATION_ERROR = 'CLASSIFICATION_ERROR',
  EXTRACTION_ERROR = 'EXTRACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Export errors
  EXPORT_ERROR = 'EXPORT_ERROR',
  DOWNLOAD_ERROR = 'DOWNLOAD_ERROR',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}

// Error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [ErrorCodes.API_ERROR]: 'Server error occurred. Please try again later.',
  [ErrorCodes.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ErrorCodes.FILE_SIZE_ERROR]: 'File size exceeds the maximum limit of 16MB.',
  [ErrorCodes.FILE_TYPE_ERROR]: 'Only PDF files are supported.',
  [ErrorCodes.UPLOAD_ERROR]: 'File upload failed. Please try again.',
  [ErrorCodes.PROCESSING_ERROR]: 'Document processing failed. Please try again.',
  [ErrorCodes.CLASSIFICATION_ERROR]: 'Document classification failed. Please try again.',
  [ErrorCodes.EXTRACTION_ERROR]: 'Data extraction failed. Please try again.',
  [ErrorCodes.VALIDATION_ERROR]: 'Data validation failed. Please check your document.',
  [ErrorCodes.EXPORT_ERROR]: 'Export failed. Please try again.',
  [ErrorCodes.DOWNLOAD_ERROR]: 'Download failed. Please try again.',
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCodes.PERMISSION_ERROR]: 'Permission denied. Please check your access rights.',
};

// Error severity mapping
const ERROR_SEVERITY: Record<string, AppError['severity']> = {
  [ErrorCodes.NETWORK_ERROR]: 'high',
  [ErrorCodes.API_ERROR]: 'high',
  [ErrorCodes.TIMEOUT_ERROR]: 'medium',
  [ErrorCodes.FILE_SIZE_ERROR]: 'low',
  [ErrorCodes.FILE_TYPE_ERROR]: 'low',
  [ErrorCodes.UPLOAD_ERROR]: 'medium',
  [ErrorCodes.PROCESSING_ERROR]: 'high',
  [ErrorCodes.CLASSIFICATION_ERROR]: 'medium',
  [ErrorCodes.EXTRACTION_ERROR]: 'medium',
  [ErrorCodes.VALIDATION_ERROR]: 'low',
  [ErrorCodes.EXPORT_ERROR]: 'medium',
  [ErrorCodes.DOWNLOAD_ERROR]: 'low',
  [ErrorCodes.UNKNOWN_ERROR]: 'high',
  [ErrorCodes.PERMISSION_ERROR]: 'high',
};

// Create standardized error
export function createError(
  code: ErrorCodes | string,
  message?: string,
  details?: any
): AppError {
  return {
    code,
    message: message || ERROR_MESSAGES[code] || 'An error occurred',
    details,
    timestamp: new Date(),
    severity: ERROR_SEVERITY[code] || 'medium',
  };
}

// Error classification
export function classifyError(error: any): AppError {
  // Network errors
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return createError(ErrorCodes.NETWORK_ERROR, undefined, error);
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return createError(ErrorCodes.TIMEOUT_ERROR, undefined, error);
  }
  
  // API errors with response
  if (error.response?.status) {
    const status = error.response.status;
    if (status >= 500) {
      return createError(ErrorCodes.API_ERROR, undefined, error.response);
    } else if (status === 403) {
      return createError(ErrorCodes.PERMISSION_ERROR, undefined, error.response);
    } else if (status === 413) {
      return createError(ErrorCodes.FILE_SIZE_ERROR, undefined, error.response);
    }
  }
  
  // File-related errors
  if (error.message?.includes('file size') || error.message?.includes('16MB')) {
    return createError(ErrorCodes.FILE_SIZE_ERROR, error.message, error);
  }
  
  if (error.message?.includes('PDF') || error.message?.includes('file type')) {
    return createError(ErrorCodes.FILE_TYPE_ERROR, error.message, error);
  }
  
  // Processing errors
  if (error.message?.includes('classification')) {
    return createError(ErrorCodes.CLASSIFICATION_ERROR, error.message, error);
  }
  
  if (error.message?.includes('extraction')) {
    return createError(ErrorCodes.EXTRACTION_ERROR, error.message, error);
  }
  
  if (error.message?.includes('validation')) {
    return createError(ErrorCodes.VALIDATION_ERROR, error.message, error);
  }
  
  // Export/download errors
  if (error.message?.includes('export')) {
    return createError(ErrorCodes.EXPORT_ERROR, error.message, error);
  }
  
  if (error.message?.includes('download')) {
    return createError(ErrorCodes.DOWNLOAD_ERROR, error.message, error);
  }
  
  // Default to unknown error
  return createError(ErrorCodes.UNKNOWN_ERROR, error.message, error);
}

// Retry logic
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = (error, attempt) => attempt < maxAttempts && isRetryableError(error),
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error, attempt)) {
        break;
      }
      
      if (attempt < maxAttempts) {
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

// Check if error is retryable
export function isRetryableError(error: any): boolean {
  // Network errors are usually retryable
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return true;
  }
  
  // 5xx server errors are retryable
  if (error.response?.status >= 500) {
    return true;
  }
  
  // Rate limiting (429) is retryable
  if (error.response?.status === 429) {
    return true;
  }
  
  return false;
}

// Error logging
export function logError(error: AppError): void {
  const logLevel = error.severity === 'critical' || error.severity === 'high' 
    ? 'error' 
    : error.severity === 'medium' 
    ? 'warn' 
    : 'info';

  console[logLevel](`[${error.code}] ${error.message}`, {
    timestamp: error.timestamp,
    severity: error.severity,
    details: error.details,
  });

  // In production, you might want to send errors to a logging service
  if (process.env.NODE_ENV === 'production' && error.severity === 'critical') {
    // Send to external logging service
    // sendToLoggingService(error);
  }
}

// User-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
  const baseMessage = error.message;
  
  // Add helpful suggestions based on error type
  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      return `${baseMessage} Please check your internet connection and try again.`;
    case ErrorCodes.FILE_SIZE_ERROR:
      return `${baseMessage} Please compress your PDF or split it into smaller files.`;
    case ErrorCodes.FILE_TYPE_ERROR:
      return `${baseMessage} Please convert your document to PDF format first.`;
    case ErrorCodes.PROCESSING_ERROR:
      return `${baseMessage} This might be due to document quality. Try scanning at higher resolution.`;
    default:
      return baseMessage;
  }
}