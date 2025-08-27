import React, { useState, useEffect } from 'react';
import { FileUpload } from '../features/FileUpload';
import { DocumentPreview } from '../features/DocumentPreview';
import { ExcelPreview } from '../features/ExcelPreview';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { PlayIcon, ArrowDownTrayIcon, CheckCircleIcon, ClockIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { useDocumentProcessing } from '../../hooks/useDocumentProcessing';
import { useExport } from '../../hooks/useExport';
import { useSystemStatus } from '../../contexts';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import { cn } from '../../utils/cn';
import type { UploadedFile } from '../../types';

export default function ProcessingTool() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const { aiServiceStatus } = useSystemStatus();
  const { dispatch } = useApp();
  
  const { 
    processingSteps, 
    isProcessing, 
    currentStep, 
    results, 
    processMultipleDocuments,
    clearResults 
  } = useDocumentProcessing();
  
  const { 
    exportStatus, 
    exportToExcel,
    clearExportStatus 
  } = useExport();

  // Fetch system status on component mount
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const healthResponse = await apiService.healthCheck();
        if (healthResponse.success) {
          dispatch({
            type: 'SET_AI_SERVICE_STATUS',
            payload: {
              configured: healthResponse.data.openai_available || false,
              model: healthResponse.data.ai_model,
              status: healthResponse.data.openai_available ? 'connected' : 'disconnected'
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
        dispatch({
          type: 'SET_AI_SERVICE_STATUS',
          payload: {
            configured: false,
            status: 'error'
          }
        });
      }
    };

    fetchSystemStatus();
  }, [dispatch]);

  const handleFilesSelected = (selectedFiles: UploadedFile[]) => {
    setFiles(selectedFiles);
    // Auto-select the first completed file for preview
    const completedFile = selectedFiles.find(f => f.status === 'completed' && f.url);
    if (completedFile && !selectedFile) {
      setSelectedFile(completedFile);
    }
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) return;
    
    try {
      const completedFiles = files.filter(f => f.status === 'completed' && f.url);
      await processMultipleDocuments(completedFiles);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const handleExportResults = async () => {
    const resultsList = Object.values(results);
    if (resultsList.length === 0) return;

    try {
      await exportToExcel(resultsList);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const allFilesCompleted = files.length > 0 && files.every(file => file.status === 'completed');
  const hasFiles = files.length > 0;
  const hasCompletedFiles = files.some(file => file.status === 'completed' && file.url);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          PDF Processing Tool
        </h1>
        <p className="text-neutral-600 mb-4">
          Upload your real estate documents and let AI extract the data automatically
        </p>
        
        {/* AI Service Status */}
        <div className="inline-flex items-center px-3 py-2 bg-neutral-50 rounded-lg border space-x-2">
          <div className={cn(
            'h-2 w-2 rounded-full',
            aiServiceStatus.status === 'connected' && 'bg-success-500',
            aiServiceStatus.status === 'disconnected' && 'bg-neutral-400',
            aiServiceStatus.status === 'error' && 'bg-error-500'
          )} />
          <span className="text-sm font-medium text-neutral-700">
            AI Service: {aiServiceStatus.status === 'connected' ? 'Ready' : 
                       aiServiceStatus.status === 'error' ? 'Error' : 'Connecting...'}
          </span>
          {aiServiceStatus.model && (
            <span className="text-xs text-neutral-500">
              ({aiServiceStatus.model})
            </span>
          )}
        </div>
      </div>

      {/* Processing Steps */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Upload Files</h3>
            <p className="text-sm text-neutral-600">
              Drop your PDF documents or click to select files
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">AI Processing</h3>
            <p className="text-sm text-neutral-600">
              Our AI classifies and extracts data from your documents
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">3</span>
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Preview & Export</h3>
            <p className="text-sm text-neutral-600">
              Preview extracted data and download Excel report
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - File Management */}
        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFilesSelected={handleFilesSelected} />
            </CardContent>
          </Card>

          {/* File List with Selection */}
          {hasFiles && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        'p-3 rounded border cursor-pointer transition-colors',
                        selectedFile?.id === file.id 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-neutral-200 hover:border-neutral-300',
                        file.status === 'completed' && 'hover:bg-neutral-50'
                      )}
                      onClick={() => {
                        if (file.status === 'completed' && file.url) {
                          setSelectedFile(file);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {file.status === 'completed' ? 'Ready for processing' : file.status}
                          </p>
                        </div>
                        <div className={cn(
                          'h-2 w-2 rounded-full',
                          file.status === 'completed' && 'bg-success-500',
                          file.status === 'uploading' && 'bg-primary-500',
                          file.status === 'error' && 'bg-error-500'
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - PDF Preview */}
        <div className="space-y-6">
          {hasCompletedFiles ? (
            <DocumentPreview
              documentUrl={selectedFile?.url}
              className="min-h-[600px]"
            />
          ) : (
            <Card className="min-h-[600px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-neutral-500">
                  <svg className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">PDF Preview</p>
                  <p className="text-sm">Upload and select a PDF to view it here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Processing Controls */}
      {hasFiles && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Step 2: Process Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-600">
                {files.length} file{files.length > 1 ? 's' : ''} ready for processing
              </div>
              
              <Button
                onClick={handleStartProcessing}
                disabled={isProcessing || Object.keys(results).length === files.length}
                loading={isProcessing}
                variant={Object.keys(results).length === files.length ? 'success' : 'primary'}
              >
                {Object.keys(results).length === files.length ? (
                  <>Processing Complete</>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Processing
                  </>
                )}
              </Button>
            </div>

            {/* Processing Steps */}
            {isProcessing && (
              <div className="space-y-3">
                <h4 className="font-medium text-neutral-900 mb-3">Processing Status</h4>
                {processingSteps.map((step) => (
                  <div key={step.id} className="flex items-center">
                    <div className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3',
                      step.status === 'completed' && 'bg-success-500',
                      step.status === 'processing' && 'bg-primary-500',
                      step.status === 'error' && 'bg-error-500',
                      step.status === 'pending' && 'bg-neutral-300'
                    )}>
                      {step.status === 'completed' ? (
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      ) : step.status === 'processing' ? (
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      ) : (
                        <ClockIcon className="h-4 w-4 text-neutral-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-sm font-medium',
                          step.id === currentStep && 'text-primary-600',
                          step.status === 'completed' && 'text-success-600',
                          step.status === 'error' && 'text-error-600'
                        )}>
                          {step.name}
                        </span>
                        {step.status === 'processing' && (
                          <span className="text-xs text-primary-600">{step.progress}%</span>
                        )}
                      </div>
                      
                      {step.message && (
                        <p className="text-xs text-neutral-500 mt-1">{step.message}</p>
                      )}
                      
                      {step.error && (
                        <p className="text-xs text-error-600 mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Excel Preview */}
      {Object.keys(results).length > 0 && (
        <ExcelPreview 
          results={Object.values(results)}
          className="mb-8"
        />
      )}

      {/* Export Results */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-5 w-5" />
              Step 3: Export Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-600">
                {Object.keys(results).length} document{Object.keys(results).length > 1 ? 's' : ''} processed successfully
              </div>
              
              <Button 
                onClick={handleExportResults}
                variant="success"
                loading={exportStatus.isExporting}
                disabled={exportStatus.isExporting}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                {exportStatus.isExporting ? 'Exporting...' : 'Download Excel Report'}
              </Button>
            </div>

            {/* Export Progress */}
            {exportStatus.isExporting && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600">{exportStatus.message}</span>
                  <span className="text-primary-600">{exportStatus.progress}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportStatus.progress}%` }}
                  />
                </div>
              </div>
            )}

            {exportStatus.error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-error-800 text-sm">{exportStatus.error}</p>
              </div>
            )}
            
            <div className="p-4 bg-success-50 rounded-lg">
              <h4 className="font-medium text-success-800 mb-2">Processing Summary</h4>
              <ul className="text-sm text-success-700 space-y-1">
                <li>• {Object.keys(results).length} documents processed</li>
                <li>• Average confidence: {Math.round(
                  Object.values(results).reduce((acc, result) => acc + (result.confidence || 0), 0) / 
                  Object.values(results).length * 100
                )}%</li>
                <li>• Quality scores available</li>
                <li>• Ready for export</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}