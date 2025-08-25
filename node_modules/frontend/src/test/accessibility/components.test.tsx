import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmationModal, AlertModal } from '../../components/ui/Modal';
import { Toast, ToastProvider } from '../../components/ui/Toast';
import { Progress, CircularProgress, StepProgress } from '../../components/ui/Progress';
import { DataTable, Column } from '../../components/ui/DataTable';
import { mockToasts } from '../mocks';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Tests - UI Components', () => {
  describe('Button Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible when disabled', async () => {
      const { container } = render(<Button disabled>Disabled Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible when loading', async () => {
      const { container } = render(<Button loading>Loading Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with different variants', async () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'success', 'warning', 'error'] as const;
      
      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>{variant} Button</Button>);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    it('should be accessible as different HTML elements', async () => {
      const { container } = render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal Components', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible when closed', async () => {
      const { container } = render(
        <Modal isOpen={false} onClose={() => {}} title="Closed Modal">
          <p>Modal content</p>
        </Modal>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible without close button', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="No Close Button" showCloseButton={false}>
          <p>Modal content</p>
        </Modal>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('ConfirmationModal should be accessible', async () => {
      const { container } = render(
        <ConfirmationModal
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm Action"
          message="Are you sure?"
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AlertModal should be accessible', async () => {
      const { container } = render(
        <AlertModal
          isOpen={true}
          onClose={() => {}}
          title="Alert"
          message="Important message"
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with different sizes', async () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const;
      
      for (const size of sizes) {
        const { container } = render(
          <Modal isOpen={true} onClose={() => {}} title="Sized Modal" size={size}>
            <p>Content for {size} modal</p>
          </Modal>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });
  });

  describe('Toast Components', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ToastProvider>
          <Toast toast={mockToasts[0]} />
        </ToastProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with different types', async () => {
      const types = ['success', 'error', 'warning', 'info'] as const;
      
      for (const type of types) {
        const toast = { ...mockToasts[0], type };
        const { container } = render(
          <ToastProvider>
            <Toast toast={toast} />
          </ToastProvider>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    it('should be accessible with action buttons', async () => {
      const toastWithAction = {
        ...mockToasts[0],
        action: {
          label: 'Undo',
          onClick: () => {},
        },
      };
      
      const { container } = render(
        <ToastProvider>
          <Toast toast={toastWithAction} />
        </ToastProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('ToastProvider should be accessible', async () => {
      function TestComponent() {
        return <div>Test content</div>;
      }
      
      const { container } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Progress Components', () => {
    it('Progress should not have accessibility violations', async () => {
      const { container } = render(<Progress value={50} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Progress should be accessible with labels', async () => {
      const { container } = render(<Progress value={75} showLabel label="Loading" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Progress should be accessible with different variants', async () => {
      const variants = ['primary', 'success', 'warning', 'error'] as const;
      
      for (const variant of variants) {
        const { container } = render(<Progress value={60} variant={variant} />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    it('CircularProgress should be accessible', async () => {
      const { container } = render(<CircularProgress value={80} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('CircularProgress should be accessible with custom labels', async () => {
      const { container } = render(
        <CircularProgress 
          value={60} 
          label={<span aria-label="Loading progress">Custom Label</span>} 
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('StepProgress should be accessible', async () => {
      const steps = [
        { id: '1', label: 'Step 1', description: 'First step' },
        { id: '2', label: 'Step 2', description: 'Second step' },
        { id: '3', label: 'Step 3', description: 'Third step' },
      ];
      
      const { container } = render(<StepProgress steps={steps} currentStep={1} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('StepProgress should be accessible when clickable', async () => {
      const steps = [
        { id: '1', label: 'Step 1', description: 'First step' },
        { id: '2', label: 'Step 2', description: 'Second step' },
        { id: '3', label: 'Step 3', description: 'Third step' },
      ];
      
      const { container } = render(
        <StepProgress 
          steps={steps} 
          currentStep={1} 
          clickable 
          onStepClick={() => {}} 
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('DataTable Component', () => {
    interface TestData {
      id: number;
      name: string;
      email: string;
      role: string;
    }

    const testData: TestData[] = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
    ];

    const columns: Column<TestData>[] = [
      {
        key: 'name',
        header: 'Name',
        accessor: 'name',
        sortable: true,
      },
      {
        key: 'email',
        header: 'Email',
        accessor: 'email',
        sortable: true,
      },
      {
        key: 'role',
        header: 'Role',
        accessor: 'role',
        sortable: true,
      },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(<DataTable data={testData} columns={columns} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible when empty', async () => {
      const { container } = render(<DataTable data={[]} columns={columns} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible when loading', async () => {
      const { container } = render(<DataTable data={[]} columns={columns} loading />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with search', async () => {
      const { container } = render(<DataTable data={testData} columns={columns} searchable />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with selection', async () => {
      const { container } = render(
        <DataTable 
          data={testData} 
          columns={columns} 
          selectable 
          onSelectionChange={() => {}}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with pagination', async () => {
      const moreData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: 'user',
      }));

      const { container } = render(
        <DataTable data={moreData} columns={columns} pagination pageSize={10} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be accessible with custom renderers', async () => {
      const columnsWithRenderer: Column<TestData>[] = [
        ...columns,
        {
          key: 'actions',
          header: 'Actions',
          accessor: () => null,
          render: (_, item) => (
            <button aria-label={`Edit ${item.name}`}>
              Edit
            </button>
          ),
        },
      ];

      const { container } = render(
        <DataTable data={testData} columns={columnsWithRenderer} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast Tests', () => {
    it('should meet color contrast requirements for buttons', async () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'success', 'warning', 'error'] as const;
      
      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>Test Button</Button>);
        
        // This would be more comprehensive with actual color contrast checking
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true },
          },
        });
        expect(results).toHaveNoViolations();
      }
    });

    it('should meet color contrast requirements for progress indicators', async () => {
      const variants = ['primary', 'success', 'warning', 'error'] as const;
      
      for (const variant of variants) {
        const { container } = render(<Progress value={50} variant={variant} />);
        
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true },
          },
        });
        expect(results).toHaveNoViolations();
      }
    });
  });

  describe('Focus Management Tests', () => {
    it('should handle focus properly in modals', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Focus Test">
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );
      
      const results = await axe(container, {
        rules: {
          'focus-order-semantics': { enabled: true },
          'focusable-content': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should handle focus properly in data tables', async () => {
      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
      ];
      
      const columns: Column<typeof testData[0]>[] = [
        {
          key: 'name',
          header: 'Name',
          accessor: 'name',
          sortable: true,
        },
        {
          key: 'actions',
          header: 'Actions',
          accessor: () => null,
          render: (_, item) => (
            <button tabIndex={0} aria-label={`Actions for ${item.name}`}>
              Actions
            </button>
          ),
        },
      ];

      const { container } = render(
        <DataTable data={testData} columns={columns} onRowClick={() => {}} />
      );
      
      const results = await axe(container, {
        rules: {
          'focusable-content': { enabled: true },
          'tab-index': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Labels and Roles Tests', () => {
    it('should have proper ARIA labels for progress elements', async () => {
      const { container } = render(
        <Progress 
          value={75} 
          aria-label="File upload progress"
          showLabel 
          label="Uploading files" 
        />
      );
      
      const results = await axe(container, {
        rules: {
          'aria-valid-attr-value': { enabled: true },
          'aria-valid-attr': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper roles for interactive elements', async () => {
      const steps = [
        { id: '1', label: 'Step 1', description: 'First step' },
        { id: '2', label: 'Step 2', description: 'Second step' },
      ];
      
      const { container } = render(
        <StepProgress 
          steps={steps} 
          currentStep={0} 
          clickable 
          onStepClick={() => {}}
          aria-label="Process steps"
        />
      );
      
      const results = await axe(container, {
        rules: {
          'button-name': { enabled: true },
          'aria-valid-attr': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation Tests', () => {
    it('should support keyboard navigation for buttons', async () => {
      const { container } = render(
        <div>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Button disabled>Disabled Button</Button>
        </div>
      );
      
      const results = await axe(container, {
        rules: {
          'keyboard': { enabled: true },
          'focus-order-semantics': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation for data tables', async () => {
      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
      ];
      
      const columns: Column<typeof testData[0]>[] = [
        {
          key: 'name',
          header: 'Name',
          accessor: 'name',
          sortable: true,
        },
        {
          key: 'email',
          header: 'Email',
          accessor: 'email',
          sortable: true,
        },
      ];

      const { container } = render(
        <DataTable data={testData} columns={columns} sortable />
      );
      
      const results = await axe(container, {
        rules: {
          'keyboard': { enabled: true },
          'focusable-content': { enabled: true },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });
});