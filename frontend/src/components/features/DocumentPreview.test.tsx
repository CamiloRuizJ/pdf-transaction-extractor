import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, user, waitFor } from '../../test/utils';
import { DocumentPreview } from './DocumentPreview';
import { mockRegions } from '../../test/mocks';

// Mock the Image component
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    forwardRef: vi.fn((component) => component),
  };
});

describe('DocumentPreview', () => {
  const mockProps = {
    documentUrl: 'https://example.com/document.pdf',
    regions: mockRegions,
    showRegions: true,
    onRegionClick: vi.fn(),
    onRegionCreate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock image loading
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      get: () => 800,
      configurable: true,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      get: () => 600,
      configurable: true,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'offsetHeight', {
      get: () => 400,
      configurable: true,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'offsetWidth', {
      get: () => 300,
      configurable: true,
    });
  });

  it('renders document preview container', () => {
    render(<DocumentPreview {...mockProps} />);

    expect(screen.getByText('Document Preview')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Document preview' })).toBeInTheDocument();
  });

  it('displays regions when showRegions is true', async () => {
    render(<DocumentPreview {...mockProps} />);

    await waitFor(() => {
      const regions = screen.getAllByTestId(/region-/);
      expect(regions).toHaveLength(mockRegions.length);
    });
  });

  it('hides regions when showRegions is false', () => {
    render(<DocumentPreview {...mockProps} showRegions={false} />);

    const regions = screen.queryAllByTestId(/region-/);
    expect(regions).toHaveLength(0);
  });

  it('handles region click events', async () => {
    render(<DocumentPreview {...mockProps} />);

    await waitFor(() => {
      const firstRegion = screen.getByTestId('region-region-1');
      expect(firstRegion).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('region-region-1'));
    expect(mockProps.onRegionClick).toHaveBeenCalledWith(mockRegions[0]);
  });

  it('shows region tooltips on hover', async () => {
    render(<DocumentPreview {...mockProps} />);

    await waitFor(() => {
      const firstRegion = screen.getByTestId('region-region-1');
      expect(firstRegion).toBeInTheDocument();
    });

    const firstRegion = screen.getByTestId('region-region-1');
    await user.hover(firstRegion);

    await waitFor(() => {
      expect(screen.getByText('Sample extracted text')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 95%')).toBeInTheDocument();
    });
  });

  it('implements zoom functionality', async () => {
    render(<DocumentPreview {...mockProps} />);

    const zoomInButton = screen.getByLabelText('Zoom in');
    const zoomOutButton = screen.getByLabelText('Zoom out');

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();

    // Test zoom in
    await user.click(zoomInButton);
    const container = screen.getByTestId('document-container');
    expect(container).toHaveStyle({ transform: expect.stringContaining('scale(1.2)') });

    // Test zoom out
    await user.click(zoomOutButton);
    expect(container).toHaveStyle({ transform: expect.stringContaining('scale(1)') });
  });

  it('implements fit-to-width functionality', async () => {
    render(<DocumentPreview {...mockProps} />);

    const fitToWidthButton = screen.getByLabelText('Fit to width');
    await user.click(fitToWidthButton);

    // Should adjust zoom to fit width
    const container = screen.getByTestId('document-container');
    expect(container).toHaveStyle({ transform: expect.stringMatching(/scale\([^)]+\)/) });
  });

  it('allows region creation when enabled', async () => {
    render(<DocumentPreview {...mockProps} allowRegionCreation />);

    const documentImage = screen.getByRole('img', { name: 'Document preview' });

    // Simulate mouse down to start region creation
    await user.pointer({ target: documentImage, coords: { x: 100, y: 150 } });
    await user.pointer({ keys: '[MouseLeft>]' });

    // Simulate mouse move and up to complete region
    await user.pointer({ target: documentImage, coords: { x: 200, y: 250 } });
    await user.pointer({ keys: '[/MouseLeft]' });

    expect(mockProps.onRegionCreate).toHaveBeenCalledWith({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('handles keyboard navigation', async () => {
    render(<DocumentPreview {...mockProps} />);

    await waitFor(() => {
      const firstRegion = screen.getByTestId('region-region-1');
      expect(firstRegion).toBeInTheDocument();
    });

    const firstRegion = screen.getByTestId('region-region-1');
    firstRegion.focus();

    await user.keyboard('{Enter}');
    expect(mockProps.onRegionClick).toHaveBeenCalledWith(mockRegions[0]);

    await user.keyboard(' ');
    expect(mockProps.onRegionClick).toHaveBeenCalledTimes(2);
  });

  it('supports zoom with keyboard shortcuts', async () => {
    render(<DocumentPreview {...mockProps} />);

    const container = screen.getByTestId('preview-container');
    container.focus();

    // Zoom in with Ctrl+Plus
    await user.keyboard('{Control>}+{/Control}');
    const documentContainer = screen.getByTestId('document-container');
    expect(documentContainer).toHaveStyle({ transform: expect.stringContaining('scale(1.2)') });

    // Zoom out with Ctrl+Minus
    await user.keyboard('{Control>}-{/Control}');
    expect(documentContainer).toHaveStyle({ transform: expect.stringContaining('scale(1)') });
  });

  it('handles image loading states', async () => {
    render(<DocumentPreview {...mockProps} />);

    // Initially should show loading
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

    // Simulate image load
    const image = screen.getByRole('img', { name: 'Document preview' });
    vi.spyOn(image, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(600);
    
    // Trigger load event
    image.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });
  });

  it('handles image loading errors', async () => {
    render(<DocumentPreview {...mockProps} />);

    const image = screen.getByRole('img', { name: 'Document preview' });
    
    // Trigger error event
    image.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load document')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('applies correct region styles based on confidence', async () => {
    const regionsWithDifferentConfidence = [
      { ...mockRegions[0], confidence: 0.95 },
      { ...mockRegions[1], confidence: 0.75 },
      { ...mockRegions[2], confidence: 0.45 },
    ];

    render(<DocumentPreview {...mockProps} regions={regionsWithDifferentConfidence} />);

    await waitFor(() => {
      const highConfidenceRegion = screen.getByTestId('region-region-1');
      const mediumConfidenceRegion = screen.getByTestId('region-region-2'); 
      const lowConfidenceRegion = screen.getByTestId('region-region-3');

      expect(highConfidenceRegion).toHaveClass('border-success-500');
      expect(mediumConfidenceRegion).toHaveClass('border-warning-500');
      expect(lowConfidenceRegion).toHaveClass('border-error-500');
    });
  });

  it('shows page navigation for multi-page documents', () => {
    const multiPageRegions = [
      { ...mockRegions[0], page: 1 },
      { ...mockRegions[1], page: 2 },
      { ...mockRegions[2], page: 2 },
    ];

    render(<DocumentPreview {...mockProps} regions={multiPageRegions} />);

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
  });

  it('filters regions by current page', async () => {
    const multiPageRegions = [
      { ...mockRegions[0], page: 1 },
      { ...mockRegions[1], page: 2 },
      { ...mockRegions[2], page: 2 },
    ];

    render(<DocumentPreview {...mockProps} regions={multiPageRegions} />);

    // Should show only page 1 region initially
    await waitFor(() => {
      expect(screen.getByTestId('region-region-1')).toBeInTheDocument();
      expect(screen.queryByTestId('region-region-2')).not.toBeInTheDocument();
    });

    // Navigate to page 2
    await user.click(screen.getByLabelText('Next page'));

    await waitFor(() => {
      expect(screen.queryByTestId('region-region-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('region-region-2')).toBeInTheDocument();
      expect(screen.getByTestId('region-region-3')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<DocumentPreview {...mockProps} />);

    const image = screen.getByRole('img', { name: 'Document preview' });
    expect(image).toHaveAttribute('alt', 'Document preview');

    const zoomInButton = screen.getByLabelText('Zoom in');
    expect(zoomInButton).toHaveAttribute('aria-label', 'Zoom in');

    const container = screen.getByTestId('preview-container');
    expect(container).toHaveAttribute('role', 'img');
    expect(container).toHaveAttribute('aria-label', 'Document preview with regions');
  });

  it('applies custom className', () => {
    render(<DocumentPreview {...mockProps} className="custom-preview" />);

    const container = screen.getByTestId('preview-container');
    expect(container).toHaveClass('custom-preview');
  });
});