import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { Progress, CircularProgress, StepProgress } from './Progress';

describe('Progress', () => {
  it('renders with default props', () => {
    render(<Progress value={50} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('calculates percentage correctly', () => {
    render(<Progress value={75} max={150} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuemax', '150');
    
    // The visual progress should be 50% (75/150)
    const progressFill = progressBar.querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveStyle({ width: '50%' });
  });

  it('clamps values to maximum', () => {
    render(<Progress value={120} max={100} />);
    
    const progressFill = screen.getByRole('progressbar').querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Progress value={50} size="xs" />);
    expect(screen.getByRole('progressbar')).toHaveClass('h-1');

    rerender(<Progress value={50} size="sm" />);
    expect(screen.getByRole('progressbar')).toHaveClass('h-2');

    rerender(<Progress value={50} size="lg" />);
    expect(screen.getByRole('progressbar')).toHaveClass('h-4');

    rerender(<Progress value={50} size="xl" />);
    expect(screen.getByRole('progressbar')).toHaveClass('h-6');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Progress value={50} variant="primary" />);
    let progressFill = screen.getByRole('progressbar').querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveClass('bg-primary-600');

    rerender(<Progress value={50} variant="success" />);
    progressFill = screen.getByRole('progressbar').querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveClass('bg-success-600');

    rerender(<Progress value={50} variant="warning" />);
    progressFill = screen.getByRole('progressbar').querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveClass('bg-warning-600');

    rerender(<Progress value={50} variant="error" />);
    progressFill = screen.getByRole('progressbar').querySelector('[data-testid="progress-fill"]');
    expect(progressFill).toHaveClass('bg-error-600');
  });

  it('shows label when requested', () => {
    render(<Progress value={75} showLabel />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows custom label', () => {
    render(<Progress value={75} showLabel label="Loading" />);
    
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Progress value={60} max={200} aria-label="File upload progress" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'File upload progress');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    expect(progressBar).toHaveAttribute('aria-valuemax', '200');
  });
});

describe('CircularProgress', () => {
  it('renders with default props', () => {
    render(<CircularProgress value={50} />);
    
    const progressCircle = screen.getByRole('progressbar');
    expect(progressCircle).toBeInTheDocument();
    expect(progressCircle).toHaveAttribute('aria-valuenow', '50');
  });

  it('calculates stroke-dashoffset correctly', () => {
    render(<CircularProgress value={25} />);
    
    const circle = screen.getByRole('progressbar').querySelector('circle[data-testid="progress-circle"]');
    
    // For 25% progress, stroke-dashoffset should be 75% of circumference
    // Default circumference is ~251.327 (radius 40), so 75% is ~188.495
    expect(circle).toHaveAttribute('stroke-dashoffset', expect.stringMatching(/188\./));
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<CircularProgress value={50} size="sm" />);
    expect(screen.getByRole('progressbar')).toHaveClass('w-16', 'h-16');

    rerender(<CircularProgress value={50} size="lg" />);
    expect(screen.getByRole('progressbar')).toHaveClass('w-32', 'h-32');

    rerender(<CircularProgress value={50} size="xl" />);
    expect(screen.getByRole('progressbar')).toHaveClass('w-48', 'h-48');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<CircularProgress value={50} variant="success" />);
    let circle = screen.getByRole('progressbar').querySelector('circle[data-testid="progress-circle"]');
    expect(circle).toHaveClass('stroke-success-600');

    rerender(<CircularProgress value={50} variant="warning" />);
    circle = screen.getByRole('progressbar').querySelector('circle[data-testid="progress-circle"]');
    expect(circle).toHaveClass('stroke-warning-600');

    rerender(<CircularProgress value={50} variant="error" />);
    circle = screen.getByRole('progressbar').querySelector('circle[data-testid="progress-circle"]');
    expect(circle).toHaveClass('stroke-error-600');
  });

  it('shows percentage text by default', () => {
    render(<CircularProgress value={75} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows custom label when provided', () => {
    render(<CircularProgress value={50} label={<span>Custom Label</span>} />);
    
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('hides text when showText is false', () => {
    render(<CircularProgress value={75} showText={false} />);
    
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<CircularProgress value={80} aria-label="Download progress" />);
    
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-label', 'Download progress');
    expect(progress).toHaveAttribute('aria-valuenow', '80');
  });
});

describe('StepProgress', () => {
  const steps = [
    { id: '1', label: 'Step 1', description: 'First step' },
    { id: '2', label: 'Step 2', description: 'Second step' },
    { id: '3', label: 'Step 3', description: 'Third step' },
  ];

  it('renders all steps', () => {
    render(<StepProgress steps={steps} currentStep={0} />);
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('shows correct step states', () => {
    render(<StepProgress steps={steps} currentStep={1} />);
    
    const step1 = screen.getByText('Step 1').closest('[data-testid="step-item"]');
    const step2 = screen.getByText('Step 2').closest('[data-testid="step-item"]');
    const step3 = screen.getByText('Step 3').closest('[data-testid="step-item"]');
    
    expect(step1).toHaveClass('completed');
    expect(step2).toHaveClass('current');
    expect(step3).toHaveClass('upcoming');
  });

  it('renders step descriptions when provided', () => {
    render(<StepProgress steps={steps} currentStep={0} />);
    
    expect(screen.getByText('First step')).toBeInTheDocument();
    expect(screen.getByText('Second step')).toBeInTheDocument();
    expect(screen.getByText('Third step')).toBeInTheDocument();
  });

  it('handles clickable steps', async () => {
    const onStepClick = vi.fn();
    render(
      <StepProgress 
        steps={steps} 
        currentStep={1} 
        onStepClick={onStepClick}
        clickable
      />
    );
    
    await user.click(screen.getByText('Step 1'));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('renders vertical layout', () => {
    render(<StepProgress steps={steps} currentStep={0} orientation="vertical" />);
    
    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('flex-col');
  });

  it('renders horizontal layout by default', () => {
    render(<StepProgress steps={steps} currentStep={0} />);
    
    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('flex-row');
  });

  it('shows correct progress percentage', () => {
    render(<StepProgress steps={steps} currentStep={1} />); // Step 2 of 3
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    expect(progressBar).toHaveAttribute('aria-valuemax', '2'); // 3 steps = max index 2
  });

  it('has proper accessibility attributes', () => {
    render(<StepProgress steps={steps} currentStep={1} aria-label="Setup progress" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Setup progress');
    expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    expect(progressBar).toHaveAttribute('aria-valuemax', '2');
  });

  it('supports keyboard navigation when clickable', async () => {
    const onStepClick = vi.fn();
    render(
      <StepProgress 
        steps={steps} 
        currentStep={1} 
        onStepClick={onStepClick}
        clickable
      />
    );
    
    const step1Button = screen.getByText('Step 1').closest('button');
    step1Button?.focus();
    
    await user.keyboard('{Enter}');
    expect(onStepClick).toHaveBeenCalledWith(0);
    
    await user.keyboard(' ');
    expect(onStepClick).toHaveBeenCalledWith(0);
  });
});