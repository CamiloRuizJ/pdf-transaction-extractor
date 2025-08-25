import { useState, useCallback } from 'react'
import { generateId } from '../lib/utils'
import type { ProcessingWorkflow, ProcessingStep } from '../types'

const defaultSteps: Omit<ProcessingStep, 'id'>[] = [
  { name: 'Document Upload', status: 'pending' },
  { name: 'OCR Processing', status: 'pending' },
  { name: 'Document Classification', status: 'pending' },
  { name: 'Data Extraction', status: 'pending' },
  { name: 'Quality Scoring', status: 'pending' },
  { name: 'Excel Generation', status: 'pending' },
]

export const useProcessingWorkflow = () => {
  const [workflows, setWorkflows] = useState<ProcessingWorkflow[]>([])
  
  const createWorkflow = useCallback((fileId: string) => {
    const steps: ProcessingStep[] = defaultSteps.map(step => ({
      ...step,
      id: generateId('step'),
    }))
    
    const workflow: ProcessingWorkflow = {
      fileId,
      steps,
      currentStepIndex: 0,
      status: 'idle',
    }
    
    setWorkflows(prev => [...prev, workflow])
    return workflow
  }, [])
  
  const updateWorkflow = useCallback((fileId: string, updates: Partial<ProcessingWorkflow>) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.fileId === fileId ? { ...workflow, ...updates } : workflow
      )
    )
  }, [])
  
  const updateStep = useCallback((fileId: string, stepIndex: number, updates: Partial<ProcessingStep>) => {
    setWorkflows(prev =>
      prev.map(workflow => {
        if (workflow.fileId !== fileId) return workflow
        
        const updatedSteps = [...workflow.steps]
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...updates }
        
        return { ...workflow, steps: updatedSteps }
      })
    )
  }, [])
  
  const startProcessing = useCallback(async (fileId: string) => {
    const workflow = workflows.find(w => w.fileId === fileId)
    if (!workflow) return
    
    updateWorkflow(fileId, {
      status: 'processing',
      startTime: Date.now(),
    })
    
    // Simulate processing steps
    for (let i = 0; i < workflow.steps.length; i++) {
      updateWorkflow(fileId, { currentStepIndex: i })
      
      // Start step
      updateStep(fileId, i, {
        status: 'processing',
        startTime: Date.now(),
      })
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      // Complete step (with small chance of error for demo)
      const isError = Math.random() < 0.1 // 10% chance of error
      updateStep(fileId, i, {
        status: isError ? 'error' : 'completed',
        endTime: Date.now(),
        error: isError ? 'Processing failed - please try again' : undefined,
      })
      
      // If error, stop processing
      if (isError) {
        updateWorkflow(fileId, {
          status: 'error',
          endTime: Date.now(),
        })
        return
      }
    }
    
    // Complete workflow
    updateWorkflow(fileId, {
      status: 'completed',
      endTime: Date.now(),
    })
  }, [workflows, updateWorkflow, updateStep])
  
  const getWorkflowByFileId = useCallback((fileId: string) => {
    return workflows.find(workflow => workflow.fileId === fileId) || null
  }, [workflows])
  
  const removeWorkflow = useCallback((fileId: string) => {
    setWorkflows(prev => prev.filter(workflow => workflow.fileId !== fileId))
  }, [])
  
  return {
    workflows,
    createWorkflow,
    updateWorkflow,
    updateStep,
    startProcessing,
    getWorkflowByFileId,
    removeWorkflow,
  }
}