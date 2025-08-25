import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, user, waitFor } from '../../test/utils';
import { Modal, ConfirmationModal, AlertModal } from './Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Mock focus methods
    HTMLElement.prototype.focus = vi.fn();
  });

  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked by default', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    // Click on the overlay (backdrop)
    const overlay = screen.getByRole('dialog').parentElement;
    await user.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when overlay is clicked if closeOnOverlayClick is false', async () => {
    const onClose = vi.fn();
    render(
      <Modal 
        isOpen={true} 
        onClose={onClose} 
        title="Test Modal"
        closeOnOverlayClick={false}
      >
        <p>Modal content</p>
      </Modal>
    );

    const overlay = screen.getByRole('dialog').parentElement;
    await user.click(overlay!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Small Modal" size="sm">
        <p>Small content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} title="Large Modal" size="lg">
        <p>Large content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl');

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} title="XL Modal" size="xl">
        <p>XL content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl');
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={vi.fn()} 
        title="No Close Button" 
        showCloseButton={false}
      >
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={vi.fn()} 
        title="Custom Modal" 
        className="custom-modal-class"
      >
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toHaveClass('custom-modal-class');
  });

  it('has proper accessibility attributes', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Accessible Modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    
    const title = screen.getByText('Accessible Modal');
    expect(title).toHaveAttribute('id', expect.stringContaining('headlessui-dialog-title'));
  });

  it('traps focus within modal', async () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Focus Trap Modal">
        <button>First Button</button>
        <button>Second Button</button>
      </Modal>
    );

    const firstButton = screen.getByText('First Button');
    const secondButton = screen.getByText('Second Button');
    const closeButton = screen.getByLabelText('Close modal');

    // Focus should start on close button (first focusable element)
    expect(closeButton).toHaveFocus();

    // Tab should move to first button
    await user.tab();
    expect(firstButton).toHaveFocus();

    // Tab should move to second button
    await user.tab();
    expect(secondButton).toHaveFocus();

    // Tab should wrap back to close button
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Shift+Tab should go back to second button
    await user.tab({ shift: true });
    expect(secondButton).toHaveFocus();
  });
});

describe('ConfirmationModal', () => {
  it('renders with confirm and cancel buttons', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Confirm Action"
        message="Confirm this action"
      />
    );

    await user.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Confirm this action"
      />
    );

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state on confirm button', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Confirm this action"
        confirmLoading={true}
      />
    );

    const confirmButton = screen.getByText('Confirming...');
    expect(confirmButton).toBeDisabled();
  });

  it('renders custom button text', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Item"
        message="This action cannot be undone"
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('applies correct variant to confirm button', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Item"
        message="This will delete the item"
        confirmVariant="error"
      />
    );

    expect(screen.getByText('Confirm')).toHaveClass('bg-error-600');
  });
});

describe('AlertModal', () => {
  it('renders with only close button', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={vi.fn()}
        title="Alert"
        message="This is an important message"
      />
    );

    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('This is an important message')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('calls onClose when OK button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <AlertModal
        isOpen={true}
        onClose={onClose}
        title="Alert"
        message="Alert message"
      />
    );

    await user.click(screen.getByText('OK'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders custom OK button text', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={vi.fn()}
        title="Success"
        message="Operation completed"
        okText="Got it!"
      />
    );

    expect(screen.getByText('Got it!')).toBeInTheDocument();
  });

  it('applies correct variant to OK button', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={vi.fn()}
        title="Error"
        message="Something went wrong"
        variant="error"
      />
    );

    expect(screen.getByText('OK')).toHaveClass('bg-error-600');
  });
});