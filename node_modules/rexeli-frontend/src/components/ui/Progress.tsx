import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  className,
}: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-neutral-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-neutral-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-neutral-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: ReactNode;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  variant = 'primary',
  showLabel = true,
  label,
  className,
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variantClasses = {
    primary: 'stroke-primary-500',
    success: 'stroke-success-500',
    warning: 'stroke-warning-500',
    error: 'stroke-error-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-neutral-200"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn('transition-all duration-300 ease-out', variantClasses[variant])}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          {label || (
            <span className="text-sm font-medium text-neutral-700">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Step Progress
interface Step {
  id: string;
  label: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  description?: string;
}

interface StepProgressProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function StepProgress({
  steps,
  orientation = 'horizontal',
  className,
}: StepProgressProps) {
  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex-shrink-0 relative">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step.status === 'completed' && 'bg-success-500 text-white',
                step.status === 'current' && 'bg-primary-500 text-white',
                step.status === 'error' && 'bg-error-500 text-white',
                step.status === 'pending' && 'bg-neutral-200 text-neutral-600'
              )}>
                {step.status === 'completed' ? '✓' : index + 1}
              </div>
              
              {index < steps.length - 1 && (
                <div className="absolute top-8 left-4 w-0.5 h-6 bg-neutral-200" />
              )}
            </div>
            
            <div className="ml-4 min-w-0 flex-1">
              <h4 className={cn(
                'text-sm font-medium',
                step.status === 'current' && 'text-primary-600',
                step.status === 'completed' && 'text-success-600',
                step.status === 'error' && 'text-error-600',
                step.status === 'pending' && 'text-neutral-500'
              )}>
                {step.label}
              </h4>
              
              {step.description && (
                <p className="text-sm text-neutral-500 mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step.status === 'completed' && 'bg-success-500 text-white',
              step.status === 'current' && 'bg-primary-500 text-white',
              step.status === 'error' && 'bg-error-500 text-white',
              step.status === 'pending' && 'bg-neutral-200 text-neutral-600'
            )}>
              {step.status === 'completed' ? '✓' : index + 1}
            </div>
            
            <div className="mt-2 text-center">
              <h4 className={cn(
                'text-sm font-medium',
                step.status === 'current' && 'text-primary-600',
                step.status === 'completed' && 'text-success-600',
                step.status === 'error' && 'text-error-600',
                step.status === 'pending' && 'text-neutral-500'
              )}>
                {step.label}
              </h4>
            </div>
          </div>
          
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-neutral-200 mx-4 mb-8" />
          )}
        </div>
      ))}
    </div>
  );
}