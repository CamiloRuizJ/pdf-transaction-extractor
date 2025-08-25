import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { UploadedFile, ProcessingStatus, UploadProgress } from '../types';

interface UseFileUploadReturn {
  files: UploadedFile[];
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  uploadFile: (file: File) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  retryUpload: (fileId: string) => Promise<void>;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const updateFileStatus = useCallback((fileId: string, updates: Partial<UploadedFile>) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId ? { ...file, ...updates } : file
      )
    );
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const fileId = crypto.randomUUID();
    const newFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    };

    // Add file to list
    setFiles(prevFiles => [...prevFiles, newFile]);
    setIsUploading(true);

    try {
      const result = await apiService.uploadFile(file, (progress: UploadProgress) => {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: progress.progress,
        }));
        updateFileStatus(fileId, {
          progress: progress.progress,
          status: 'uploading',
        });
      });

      if (result.success && result.data) {
        updateFileStatus(fileId, {
          status: 'completed',
          progress: 100,
          url: result.data.filepath,
          preview: result.data.pdf_info?.thumbnail,
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      updateFileStatus(fileId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
        progress: 0,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    }
  }, [updateFileStatus]);

  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    setIsUploading(true);

    // Create file entries
    const newFiles: UploadedFile[] = filesToUpload.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as ProcessingStatus,
      progress: 0,
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileEntry = newFiles[i];

        try {
          const result = await apiService.uploadFile(file, (progress: UploadProgress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileEntry.id]: progress.progress,
            }));
            updateFileStatus(fileEntry.id, {
              progress: progress.progress,
              status: 'uploading',
            });
          });

          if (result.success && result.data) {
            updateFileStatus(fileEntry.id, {
              status: 'completed',
              progress: 100,
              url: result.data.filepath,
              preview: result.data.pdf_info?.thumbnail,
            });
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error);
          updateFileStatus(fileEntry.id, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
            progress: 0,
          });
        }

        // Clean up progress tracking
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileEntry.id];
          return newProgress;
        });
      }
    } finally {
      setIsUploading(false);
    }
  }, [updateFileStatus]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setUploadProgress({});
    setIsUploading(false);
  }, []);

  const retryUpload = useCallback(async (fileId: string) => {
    const fileToRetry = files.find(f => f.id === fileId);
    if (!fileToRetry) return;

    // Reset file status
    updateFileStatus(fileId, {
      status: 'uploading',
      progress: 0,
      error: undefined,
    });

    // This is a simplified retry - in a real app, you'd need to store the original File object
    // For now, we'll just update the status
    setTimeout(() => {
      updateFileStatus(fileId, {
        status: 'error',
        error: 'Retry not implemented - please re-upload the file',
      });
    }, 1000);
  }, [files, updateFileStatus]);

  return {
    files,
    isUploading,
    uploadProgress,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
    retryUpload,
  };
}