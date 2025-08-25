import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, user, waitFor } from '../../test/utils';
import { Toast, ToastProvider, useToast } from './Toast';
import { mockToasts } from '../../test/mocks';
import { ReactNode } from 'react';

// Test component to use the toast hook
function TestToastComponent() {
  const { addToast, clearToasts, toasts } = useToast();

  return (
    <div>
      <button onClick={() => addToast({
        type: 'success',
        title: 'Test Toast',
        message: 'This is a test toast',
      })}>
        Add Toast
      </button>
      <button onClick={() => addToast({
        type: 'error',
        title: 'Error Toast',
        message: 'This is an error toast',
        duration: 0, // Persistent
      })}>
        Add Error Toast
      </button>
      <button onClick={() => clearToasts()}>
        Clear Toasts
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

function renderWithToastProvider(ui: ReactNode) {
  return render(
    <ToastProvider>
      {ui}
    </ToastProvider>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('renders toast with all props', () => {
    const toast = mockToasts[0];
    render(<Toast toast={toast} />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('renders different toast types with correct icons', () => {
    const successToast = { ...mockToasts[0], type: 'success' as const };
    const errorToast = { ...mockToasts[1], type: 'error' as const };
    const warningToast = { ...mockToasts[0], type: 'warning' as const };
    const infoToast = { ...mockToasts[0], type: 'info' as const };

    const { rerender } = render(<Toast toast={successToast} />);
    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();

    rerender(<Toast toast={errorToast} />);
    expect(screen.getByTestId('XCircleIcon')).toBeInTheDocument();

    rerender(<Toast toast={warningToast} />);
    expect(screen.getByTestId('ExclamationTriangleIcon')).toBeInTheDocument();

    rerender(<Toast toast={infoToast} />);
    expect(screen.getByTestId('InformationCircleIcon')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Toast toast={mockToasts[0]} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledWith(mockToasts[0].id);
  });

  it('renders action button when provided', async () => {
    const onAction = vi.fn();
    const toastWithAction = {
      ...mockToasts[0],
      action: {
        label: 'Retry',
        onClick: onAction,
      },
    };

    render(<Toast toast={toastWithAction} />);

    const actionButton = screen.getByRole('button', { name: 'Retry' });
    expect(actionButton).toBeInTheDocument();

    await user.click(actionButton);
    expect(onAction).toHaveBeenCalled();
  });

  it('auto-dismisses after duration', async () => {
    const onClose = vi.fn();
    const toast = { ...mockToasts[0], duration: 1000 };
    
    render(<Toast toast={toast} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(toast.id);
    });
  });

  it('does not auto-dismiss when duration is 0', () => {
    const onClose = vi.fn();
    const toast = { ...mockToasts[1], duration: 0 }; // Persistent toast
    
    render(<Toast toast={toast} onClose={onClose} />);

    vi.advanceTimersByTime(10000); // Wait a long time
    expect(onClose).not.toHaveBeenCalled();
  });

  it('pauses timer on hover', async () => {
    const onClose = vi.fn();
    const toast = { ...mockToasts[0], duration: 1000 };
    
    render(<Toast toast={toast} onClose={onClose} />);
    
    const toastElement = screen.getByRole('alert');
    
    // Hover to pause
    await user.hover(toastElement);
    vi.advanceTimersByTime(500);
    
    // Should not close yet
    expect(onClose).not.toHaveBeenCalled();
    
    // Unhover to resume
    await user.unhover(toastElement);
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<Toast toast={mockToasts[0]} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('supports keyboard navigation', async () => {
    const onClose = vi.fn();
    render(<Toast toast={mockToasts[0]} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.focus();
    
    expect(closeButton).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('useToast hook', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('adds toast correctly', async () => {
    renderWithToastProvider(<TestToastComponent />);

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
  });

  it('removes toast automatically after duration', async () => {
    renderWithToastProvider(<TestToastComponent />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    vi.advanceTimersByTime(5000); // Default duration
    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  it('keeps persistent toasts', async () => {
    renderWithToastProvider(<TestToastComponent />);

    await user.click(screen.getByText('Add Error Toast'));
    expect(screen.getByText('Error Toast')).toBeInTheDocument();

    vi.advanceTimersByTime(10000); // Long time
    expect(screen.getByText('Error Toast')).toBeInTheDocument(); // Still there
  });

  it('clears all toasts', async () => {
    renderWithToastProvider(<TestToastComponent />);

    // Add multiple toasts
    await user.click(screen.getByText('Add Toast'));
    await user.click(screen.getByText('Add Error Toast'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

    // Clear all
    await user.click(screen.getByText('Clear Toasts'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
  });

  it('limits maximum number of toasts', async () => {
    renderWithToastProvider(<TestToastComponent />);

    // Try to add many toasts
    for (let i = 0; i < 8; i++) {
      await user.click(screen.getByText('Add Toast'));
    }

    // Should be limited to 5 (default max)
    expect(screen.getByTestId('toast-count')).toHaveTextContent('5');
  });

  it('removes oldest toast when limit is exceeded', async () => {
    renderWithToastProvider(<TestToastComponent />);

    // Add toasts up to limit
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByText('Add Toast'));
    }

    const firstToastText = screen.getAllByText('Test Toast')[0];
    
    // Add one more to exceed limit
    await user.click(screen.getByText('Add Error Toast'));
    
    // First toast should be removed
    expect(screen.getAllByText('Test Toast')).toHaveLength(4);
    expect(screen.getByText('Error Toast')).toBeInTheDocument();
  });

  it('throws error when used outside provider', () => {
    // Mock console.error to avoid test output noise
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestToastComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    console.error = originalError;
  });
});