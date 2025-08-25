import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { createError, ErrorCodes, logError, type AppError } from '../../utils/errorHandling';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = createError(
      ErrorCodes.UNKNOWN_ERROR,
      error.message,
      { stack: error.stack, name: error.name }
    );

    logError(appError);

    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log additional context
    const appError = createError(
      ErrorCodes.UNKNOWN_ERROR,
      error.message,
      {
        stack: error.stack,
        name: error.name,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    );

    logError(appError);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: AppError;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="text-center py-12">
          <div className="mb-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-error-500 mx-auto" />
          </div>
          
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">
            Something went wrong
          </h1>
          
          <p className="text-neutral-600 mb-6">
            {error.message || 'An unexpected error occurred while processing your request.'}
          </p>

          {!isProduction && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-700">
                Technical Details (Development)
              </summary>
              <div className="mt-2 p-4 bg-neutral-100 rounded text-xs font-mono text-neutral-800">
                <div><strong>Code:</strong> {error.code}</div>
                <div><strong>Timestamp:</strong> {error.timestamp.toISOString()}</div>
                <div><strong>Severity:</strong> {error.severity}</div>
                {error.details && (
                  <div className="mt-2">
                    <strong>Details:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {typeof error.details === 'string' 
                        ? error.details 
                        : JSON.stringify(error.details, null, 2)
                      }
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="space-y-3">
            <Button
              onClick={onReset}
              variant="primary"
              className="w-full"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="w-full"
            >
              Reload Page
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Go Home
            </Button>
          </div>

          <div className="mt-6 text-xs text-neutral-500">
            <p>Error ID: {error.code}-{error.timestamp.getTime()}</p>
            <p>If this problem persists, please contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for throwing errors that will be caught by ErrorBoundary
export function useErrorHandler() {
  return (error: Error | AppError | string) => {
    // Convert to Error object if needed
    let errorToThrow: Error;
    
    if (typeof error === 'string') {
      errorToThrow = new Error(error);
    } else if ('code' in error) {
      // AppError - convert to regular Error
      errorToThrow = new Error(error.message);
      (errorToThrow as any).appError = error;
    } else {
      errorToThrow = error;
    }
    
    // Throw in next tick to avoid issues with React event handling
    setTimeout(() => {
      throw errorToThrow;
    }, 0);
  };
}

export { ErrorBoundary };
export type { ErrorBoundaryProps };