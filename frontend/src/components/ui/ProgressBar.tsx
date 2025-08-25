import React from 'react'
import { cn } from '../../lib/utils'
import type { ProgressBarProps } from '../../types'

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'primary',
  size = 'md',
  showPercentage = true,
  className,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)
  
  const variantClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  }
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }
  
  return (
    <div className={cn('w-full', className)}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-neutral-700">Progress</span>
          <span className="text-sm text-neutral-600">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-neutral-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar