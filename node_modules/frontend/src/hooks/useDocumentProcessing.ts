import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ProcessingResult, DocumentType, UploadedFile } from '../types';

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

interface UseDocumentProcessingReturn {
  processingSteps: ProcessingStep[];
  isProcessing: boolean;
  currentStep: string | null;
  results: Record<string, ProcessingResult>;
  processDocument: (file: UploadedFile) => Promise<void>;
  processMultipleDocuments: (files: UploadedFile[]) => Promise<void>;
  retryProcessing: (fileId: string) => Promise<void>;
  clearResults: () => void;
}

const DEFAULT_PROCESSING_STEPS: ProcessingStep[] = [
  { id: 'classification', name: 'Document Classification', status: 'pending', progress: 0 },
  { id: 'regions', name: 'Region Detection', status: 'pending', progress: 0 },
  { id: 'extraction', name: 'Data Extraction', status: 'pending', progress: 0 },
  { id: 'validation', name: 'Data Validation', status: 'pending', progress: 0 },
  { id: 'quality', name: 'Quality Assessment', status: 'pending', progress: 0 },
];

export function useDocumentProcessing(): UseDocumentProcessingReturn {
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(DEFAULT_PROCESSING_STEPS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ProcessingResult>>({});
  const processingRef = useRef<{ fileId: string | null; abortController: AbortController | null }>({
    fileId: null,
    abortController: null,
  });

  const updateStep = useCallback((stepId: string, updates: Partial<ProcessingStep>) => {
    setProcessingSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    );
  }, []);

  const resetSteps = useCallback(() => {
    setProcessingSteps(DEFAULT_PROCESSING_STEPS.map(step => ({
      ...step,
      status: 'pending',
      progress: 0,
      message: undefined,
      error: undefined,
    })));
  }, []);

  const processDocument = useCallback(async (file: UploadedFile) => {
    if (!file.url) {
      throw new Error('File must be uploaded first');
    }

    setIsProcessing(true);
    setCurrentStep('classification');
    resetSteps();

    const abortController = new AbortController();
    processingRef.current = { fileId: file.id, abortController };

    try {
      // Step 1: Document Classification
      updateStep('classification', { status: 'processing', progress: 10, message: 'Analyzing document...' });
      
      const classificationResult = await apiService.classifyDocument(file.url);
      
      if (!classificationResult.success) {
        throw new Error('Classification failed');
      }

      const documentType = classificationResult.data?.classification?.document_type as DocumentType || 'unknown';
      const confidence = classificationResult.data?.classification?.confidence || 0;

      updateStep('classification', { 
        status: 'completed', 
        progress: 100, 
        message: `Classified as ${documentType} (${Math.round(confidence * 100)}% confidence)` 
      });

      // Step 2: Region Detection
      setCurrentStep('regions');
      updateStep('regions', { status: 'processing', progress: 20, message: 'Detecting data regions...' });

      const regionsResult = await apiService.suggestRegions(file.url, documentType);
      
      if (!regionsResult.success) {
        throw new Error('Region detection failed');
      }

      const regions = regionsResult.data?.regions || [];
      
      updateStep('regions', { 
        status: 'completed', 
        progress: 100, 
        message: `Found ${regions.length} potential data regions` 
      });

      // Step 3: Data Extraction
      setCurrentStep('extraction');
      updateStep('extraction', { status: 'processing', progress: 40, message: 'Extracting data from regions...' });

      const extractionResult = await apiService.extractData(file.url, regions);
      
      if (!extractionResult.success) {
        throw new Error('Data extraction failed');
      }

      const extractedData = extractionResult.data?.extracted_data || {};
      
      updateStep('extraction', { 
        status: 'completed', 
        progress: 100, 
        message: `Extracted data from ${Object.keys(extractedData).length} regions` 
      });

      // Step 4: Data Validation
      setCurrentStep('validation');
      updateStep('validation', { status: 'processing', progress: 60, message: 'Validating extracted data...' });

      const validationResult = await apiService.validateData(extractedData, documentType);
      
      if (!validationResult.success) {
        throw new Error('Data validation failed');
      }

      const validation = validationResult.data?.validation || {};
      
      updateStep('validation', { 
        status: 'completed', 
        progress: 100, 
        message: 'Data validation completed' 
      });

      // Step 5: Quality Assessment
      setCurrentStep('quality');
      updateStep('quality', { status: 'processing', progress: 80, message: 'Calculating quality score...' });

      const qualityResult = await apiService.calculateQualityScore(extractedData, validation);
      
      if (!qualityResult.success) {
        throw new Error('Quality assessment failed');
      }

      const qualityScore = qualityResult.data?.quality_score || {};
      
      updateStep('quality', { 
        status: 'completed', 
        progress: 100, 
        message: `Quality score: ${Math.round((qualityScore.overall || 0) * 100)}%` 
      });

      // Store final result
      const processingResult: ProcessingResult = {
        id: crypto.randomUUID(),
        fileId: file.id,
        documentType,
        confidence,
        extractedData,
        regions,
        qualityScore: qualityScore.overall || 0,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
        createdAt: new Date(),
      };

      setResults(prevResults => ({
        ...prevResults,
        [file.id]: processingResult,
      }));

      setCurrentStep(null);

    } catch (error) {
      console.error('Processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      if (currentStep) {
        updateStep(currentStep, { 
          status: 'error', 
          error: errorMessage,
          message: errorMessage 
        });
      }
      
      throw error;
    } finally {
      setIsProcessing(false);
      processingRef.current = { fileId: null, abortController: null };
    }
  }, [updateStep, resetSteps, currentStep]);

  const processMultipleDocuments = useCallback(async (files: UploadedFile[]) => {
    const validFiles = files.filter(file => file.url && file.status === 'completed');
    
    if (validFiles.length === 0) {
      throw new Error('No valid files to process');
    }

    for (const file of validFiles) {
      try {
        await processDocument(file);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        // Continue processing other files even if one fails
      }
    }
  }, [processDocument]);

  const retryProcessing = useCallback(async (fileId: string) => {
    // Find the file in results or get it from somewhere
    // This is a simplified implementation
    console.log('Retry processing not fully implemented for fileId:', fileId);
  }, []);

  const clearResults = useCallback(() => {
    setResults({});
    resetSteps();
    setCurrentStep(null);
  }, [resetSteps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingRef.current.abortController) {
        processingRef.current.abortController.abort();
      }
    };
  }, []);

  return {
    processingSteps,
    isProcessing,
    currentStep,
    results,
    processDocument,
    processMultipleDocuments,
    retryProcessing,
    clearResults,
  };
}