import React from 'react'
import { CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import type { ProcessingWorkflow as ProcessingWorkflowType, ProcessingStep } from '../../types'

interface ProcessingWorkflowProps {
  workflow: ProcessingWorkflowType
  className?: string
}

const ProcessingWorkflow: React.FC<ProcessingWorkflowProps> = ({
  workflow,
  className,
}) => {
  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-success-500" />
      case 'error':
        return <XMarkIcon className="h-5 w-5 text-error-500" />
      case 'processing':
        return <div className="loading-spinner h-5 w-5" />
      default:
        return <ClockIcon className="h-5 w-5 text-neutral-400" />
    }
  }
  
  const getStepBadge = (step: ProcessingStep) => {
    const badgeConfig = {
      pending: { variant: 'warning' as const, text: 'Pending' },
      processing: { variant: 'primary' as const, text: 'Processing' },
      completed: { variant: 'success' as const, text: 'Completed' },
      error: { variant: 'error' as const, text: 'Error' },
    }
    
    const config = badgeConfig[step.status]
    return <Badge variant={config.variant} size="sm">{config.text}</Badge>
  }
  
  const getOverallProgress = () => {
    const completedSteps = workflow.steps.filter(step => step.status === 'completed').length
    return (completedSteps / workflow.steps.length) * 100
  }
  
  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return null
    const duration = (endTime || Date.now()) - startTime
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }
  
  const getWorkflowStatusBadge = () => {
    const badgeConfig = {
      idle: { variant: 'warning' as const, text: 'Idle' },
      processing: { variant: 'primary' as const, text: 'Processing' },
      completed: { variant: 'success' as const, text: 'Completed' },
      error: { variant: 'error' as const, text: 'Failed' },
    }
    
    const config = badgeConfig[workflow.status]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }
  
  return (
    <Card
      className={cn('', className)}
      header={
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            Processing Workflow
          </h3>
          {getWorkflowStatusBadge()}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overall Progress */}
        <div>
          <ProgressBar
            progress={getOverallProgress()}
            variant={workflow.status === 'error' ? 'error' : 'primary'}
            showPercentage={true}
          />
          {workflow.totalTime && (
            <p className="text-sm text-neutral-600 mt-2">
              Total time: {formatDuration(0, workflow.totalTime)}
            </p>
          )}
        </div>
        
        {/* Processing Steps */}
        <div className="space-y-3">
          {workflow.steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center space-x-4 p-4 rounded-lg border transition-colors',
                step.status === 'processing'
                  ? 'bg-primary-50 border-primary-200'
                  : step.status === 'completed'
                  ? 'bg-success-50 border-success-200'
                  : step.status === 'error'
                  ? 'bg-error-50 border-error-200'
                  : 'bg-neutral-50 border-neutral-200'
              )}
            >
              {/* Step Number & Icon */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                    step.status === 'processing'
                      ? 'bg-primary-500 text-white'
                      : step.status === 'completed'
                      ? 'bg-success-500 text-white'
                      : step.status === 'error'
                      ? 'bg-error-500 text-white'
                      : 'bg-neutral-300 text-neutral-700'
                  )}
                >
                  {index + 1}
                </div>
                {getStepIcon(step)}
              </div>
              
              {/* Step Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-neutral-900 truncate">
                    {step.name}
                  </h4>
                  {getStepBadge(step)}
                </div>
                
                {/* Timing Information */}
                <div className="mt-1 text-xs text-neutral-600 space-x-4">
                  {step.startTime && (
                    <span>
                      Duration: {formatDuration(step.startTime, step.endTime)}
                    </span>
                  )}
                </div>
                
                {/* Error Message */}
                {step.error && (
                  <div className="mt-2 p-2 bg-error-100 border border-error-200 rounded text-xs text-error-700">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Current Step Indicator */}
        {workflow.status === 'processing' && (
          <div className="flex items-center justify-center space-x-2 text-sm text-neutral-600">
            <div className="loading-spinner h-4 w-4" />
            <span>
              Processing step {workflow.currentStepIndex + 1} of {workflow.steps.length}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ProcessingWorkflow