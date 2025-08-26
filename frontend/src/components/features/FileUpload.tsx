import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useFileUpload } from '../../hooks/useFileUpload';
import type { UploadedFile } from '../../types';

interface FileUploadProps {
  onFilesSelected?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB - Now supported via direct cloud upload
  acceptedTypes = ['application/pdf'],
  className
}: FileUploadProps) {
  const { files, isUploading, uploadFiles, removeFile, retryUpload } = useFileUpload();

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.error('Rejected files:', rejectedFiles);
      // You could show a toast notification here
    }

    if (acceptedFiles.length > 0) {
      try {
        await uploadFiles(acceptedFiles);
        // Notify parent component
        onFilesSelected?.(files);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [uploadFiles, files, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles,
    maxSize,
    multiple: true
  });

  const handleRemoveFile = (fileId: string) => {
    removeFile(fileId);
    onFilesSelected?.(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={cn(
          'cursor-pointer transition-colors border-dashed border-2 hover:border-primary-400',
          isDragActive && !isDragReject && 'border-primary-500 bg-primary-50',
          isDragReject && 'border-error-500 bg-error-50',
          !isDragActive && 'border-neutral-300'
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          
          <div className="mb-4">
            <CloudArrowUpIcon className={cn(
              'h-12 w-12',
              isDragActive && !isDragReject && 'text-primary-500',
              isDragReject && 'text-error-500',
              !isDragActive && 'text-neutral-400'
            )} />
          </div>

          <div className="text-center">
            {isDragActive ? (
              isDragReject ? (
                <p className="text-error-600 font-medium">
                  Some files are not supported
                </p>
              ) : (
                <p className="text-primary-600 font-medium">
                  Drop the files here...
                </p>
              )
            ) : (
              <>
                <p className="text-lg font-medium text-neutral-900 mb-2">
                  Drop PDF files here, or click to select
                </p>
                <p className="text-sm text-neutral-500 mb-2">
                  Upload up to {maxFiles} files, max {formatFileSize(maxSize)} each
                </p>
                <p className="text-xs text-blue-600 mb-4">
                  Files over 25MB are uploaded directly to cloud storage for faster processing
                </p>
                <Button variant="primary" size="sm">
                  Choose Files
                </Button>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
            <span className="bg-neutral-100 px-2 py-1 rounded">Rent Rolls</span>
            <span className="bg-neutral-100 px-2 py-1 rounded">Offering Memos</span>
            <span className="bg-neutral-100 px-2 py-1 rounded">Lease Agreements</span>
            <span className="bg-neutral-100 px-2 py-1 rounded">Comparable Sales</span>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">
              Files ({files.length})
            </h3>
            {isUploading && (
              <div className="text-sm text-primary-600 font-medium">
                Uploading...
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <DocumentIcon className="h-8 w-8 text-primary-500 mr-3 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-neutral-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className={cn(
                          'capitalize font-medium',
                          file.status === 'completed' && 'text-success-600',
                          file.status === 'processing' && 'text-primary-600',
                          file.status === 'error' && 'text-error-600',
                          file.status === 'idle' && 'text-neutral-500'
                        )}>
                          {file.status === 'idle' ? 'Ready' : file.status}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      {file.progress !== undefined && file.progress > 0 && (
                        <div className="mt-2 w-full bg-neutral-200 rounded-full h-1.5">
                          <div 
                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    {file.status === 'error' && (
                      <button
                        onClick={() => retryUpload(file.id)}
                        className="p-1 text-warning-500 hover:text-warning-600 transition-colors"
                        title="Retry upload"
                      >
                        <ExclamationCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1 text-neutral-400 hover:text-error-500 transition-colors"
                      title="Remove file"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}