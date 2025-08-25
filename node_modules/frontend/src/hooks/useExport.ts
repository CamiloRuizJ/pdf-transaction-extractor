import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { ProcessingResult, ExportFormat, DocumentType } from '../types';

interface ExportStatus {
  isExporting: boolean;
  progress: number;
  message?: string;
  error?: string;
}

interface UseExportReturn {
  exportStatus: ExportStatus;
  exportToExcel: (results: ProcessingResult[], filename?: string) => Promise<void>;
  exportMultipleResults: (resultsByType: Record<DocumentType, ProcessingResult[]>) => Promise<void>;
  downloadFile: (filename: string) => Promise<void>;
  clearExportStatus: () => void;
}

export function useExport(): UseExportReturn {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    isExporting: false,
    progress: 0,
  });

  const updateStatus = useCallback((updates: Partial<ExportStatus>) => {
    setExportStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const exportToExcel = useCallback(async (results: ProcessingResult[], filename?: string) => {
    if (results.length === 0) {
      throw new Error('No results to export');
    }

    updateStatus({ 
      isExporting: true, 
      progress: 10, 
      message: 'Preparing export data...',
      error: undefined 
    });

    try {
      // Group results by document type for better organization
      const resultsByType = results.reduce((acc, result) => {
        const type = result.documentType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(result);
        return acc;
      }, {} as Record<DocumentType, ProcessingResult[]>);

      updateStatus({ progress: 30, message: 'Generating Excel file...' });

      // For now, we'll export each document type separately
      const exportPromises = Object.entries(resultsByType).map(async ([docType, docResults]) => {
        if (docResults.length === 0) return null;

        // Combine extracted data from all results of the same type
        const combinedData = docResults.reduce((acc, result) => {
          Object.keys(result.extractedData).forEach(key => {
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(...(Array.isArray(result.extractedData[key]) 
              ? result.extractedData[key] 
              : [result.extractedData[key]]));
          });
          return acc;
        }, {} as Record<string, any[]>);

        const exportFilename = filename || `${docType}_export_${new Date().toISOString().split('T')[0]}.xlsx`;

        const exportResult = await apiService.exportToExcel(
          combinedData,
          docType as DocumentType,
          exportFilename
        );

        return exportResult.data;
      });

      updateStatus({ progress: 70, message: 'Processing export...' });

      const exportResults = await Promise.all(exportPromises);
      const validResults = exportResults.filter(result => result !== null);

      if (validResults.length === 0) {
        throw new Error('Export failed - no valid results');
      }

      updateStatus({ 
        progress: 100, 
        message: `Successfully exported ${validResults.length} file(s)`,
        isExporting: false 
      });

      // Auto-download the first file
      if (validResults[0]?.download_url) {
        const filename = validResults[0].download_url.split('/').pop();
        if (filename) {
          await downloadFile(filename);
        }
      }

    } catch (error) {
      console.error('Export error:', error);
      updateStatus({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Export failed',
        message: 'Export failed'
      });
      throw error;
    }
  }, [updateStatus]);

  const exportMultipleResults = useCallback(async (resultsByType: Record<DocumentType, ProcessingResult[]>) => {
    updateStatus({ 
      isExporting: true, 
      progress: 0, 
      message: 'Starting bulk export...',
      error: undefined 
    });

    try {
      const totalTypes = Object.keys(resultsByType).length;
      let completedTypes = 0;

      for (const [docType, results] of Object.entries(resultsByType)) {
        if (results.length === 0) continue;

        updateStatus({ 
          progress: (completedTypes / totalTypes) * 80,
          message: `Exporting ${docType} documents...` 
        });

        await exportToExcel(results, `${docType}_bulk_export_${Date.now()}.xlsx`);
        completedTypes++;
      }

      updateStatus({ 
        progress: 100, 
        message: `Bulk export completed (${completedTypes} document types)`,
        isExporting: false 
      });

    } catch (error) {
      console.error('Bulk export error:', error);
      updateStatus({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Bulk export failed',
        message: 'Bulk export failed'
      });
      throw error;
    }
  }, [exportToExcel, updateStatus]);

  const downloadFile = useCallback(async (filename: string) => {
    try {
      updateStatus({ 
        isExporting: true, 
        progress: 50, 
        message: 'Downloading file...' 
      });

      const blob = await apiService.downloadFile(filename);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      updateStatus({ 
        progress: 100, 
        message: 'Download completed',
        isExporting: false 
      });

    } catch (error) {
      console.error('Download error:', error);
      updateStatus({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Download failed',
        message: 'Download failed'
      });
      throw error;
    }
  }, [updateStatus]);

  const clearExportStatus = useCallback(() => {
    setExportStatus({
      isExporting: false,
      progress: 0,
      message: undefined,
      error: undefined,
    });
  }, []);

  return {
    exportStatus,
    exportToExcel,
    exportMultipleResults,
    downloadFile,
    clearExportStatus,
  };
}