import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests - Components', () => {
  test.beforeEach(async ({ page }) => {
    // Set up consistent environment
    await page.addInitScript(() => {
      // Mock Date for consistent timestamps
      const mockDate = new Date('2024-01-15T12:00:00Z');
      Date.now = () => mockDate.getTime();
      Date.prototype.getTime = () => mockDate.getTime();
    });

    await page.goto('/');
  });

  test('Button component variations', async ({ page }) => {
    // Navigate to component showcase (would need to be created)
    // For now, test buttons in the main interface
    
    await test.step('Primary buttons', async () => {
      const uploadButton = page.locator('button', { hasText: 'Upload Files' });
      await expect(uploadButton).toHaveScreenshot('button-primary.png');
    });

    await test.step('Button states', async () => {
      // Hover state
      const processButton = page.locator('button', { hasText: 'Process Documents' });
      await processButton.hover();
      await expect(processButton).toHaveScreenshot('button-hover.png');

      // Disabled state
      await processButton.evaluate(btn => btn.setAttribute('disabled', 'true'));
      await expect(processButton).toHaveScreenshot('button-disabled.png');
    });
  });

  test('Upload zone component', async ({ page }) => {
    const uploadZone = page.locator('[data-testid="upload-zone"]');
    
    await test.step('Default state', async () => {
      await expect(uploadZone).toHaveScreenshot('upload-zone-default.png');
    });

    await test.step('Drag over state', async () => {
      // Simulate drag over
      await uploadZone.dispatchEvent('dragenter');
      await expect(uploadZone).toHaveScreenshot('upload-zone-dragover.png');
    });

    await test.step('With uploaded files', async () => {
      // Mock uploaded file
      await page.evaluate(() => {
        const mockFile = {
          id: 'test-file',
          name: 'test-document.pdf',
          size: 1024000,
          status: 'uploaded',
          progress: 100,
        };
        localStorage.setItem('uploaded_files', JSON.stringify([mockFile]));
      });
      
      await page.reload();
      await expect(uploadZone).toHaveScreenshot('upload-zone-with-files.png');
    });
  });

  test('Progress indicators', async ({ page }) => {
    // Mock processing state
    await page.evaluate(() => {
      const mockFiles = [{
        id: 'processing-file',
        name: 'processing-document.pdf',
        status: 'processing',
        progress: 65,
      }];
      localStorage.setItem('uploaded_files', JSON.stringify(mockFiles));
    });

    await page.reload();

    await test.step('Linear progress bar', async () => {
      const progressBar = page.locator('.progress-bar').first();
      await expect(progressBar).toHaveScreenshot('progress-linear.png');
    });

    await test.step('Circular progress indicator', async () => {
      const circularProgress = page.locator('.circular-progress').first();
      await expect(circularProgress).toHaveScreenshot('progress-circular.png');
    });
  });

  test('Modal dialogs', async ({ page }) => {
    await test.step('Standard modal', async () => {
      // Open settings modal
      await page.locator('button', { hasText: 'Settings' }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('modal-standard.png');
    });

    await test.step('Confirmation modal', async () => {
      // Trigger confirmation modal (e.g., delete action)
      await page.locator('button', { hasText: 'Clear All' }).click();
      const confirmModal = page.locator('[role="dialog"]');
      await expect(confirmModal).toHaveScreenshot('modal-confirmation.png');
    });

    await test.step('Modal with form content', async () => {
      // Navigate to a form modal if available
      const formModal = page.locator('[role="dialog"]');
      if (await formModal.count() > 0) {
        await expect(formModal).toHaveScreenshot('modal-form.png');
      }
    });
  });

  test('Toast notifications', async ({ page }) => {
    await test.step('Success toast', async () => {
      // Trigger success notification
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            title: 'Success',
            message: 'Operation completed successfully',
          }
        }));
      });

      const toast = page.locator('.toast-success');
      await expect(toast).toHaveScreenshot('toast-success.png');
    });

    await test.step('Error toast', async () => {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            title: 'Error',
            message: 'Something went wrong',
          }
        }));
      });

      const toast = page.locator('.toast-error');
      await expect(toast).toHaveScreenshot('toast-error.png');
    });

    await test.step('Warning toast with action', async () => {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'warning',
            title: 'Warning',
            message: 'This action cannot be undone',
            action: { label: 'Undo' },
          }
        }));
      });

      const toast = page.locator('.toast-warning');
      await expect(toast).toHaveScreenshot('toast-warning-with-action.png');
    });
  });

  test('Data table component', async ({ page }) => {
    // Mock table data
    await page.evaluate(() => {
      const mockResults = {
        'result-1': {
          id: 'result-1',
          documentType: 'rent_roll',
          confidence: 0.94,
          qualityScore: 0.87,
          createdAt: '2024-01-15T12:00:00Z',
          regions: [{}, {}, {}], // 3 regions
        },
        'result-2': {
          id: 'result-2', 
          documentType: 'lease_agreement',
          confidence: 0.89,
          qualityScore: 0.91,
          createdAt: '2024-01-15T11:30:00Z',
          regions: [{}, {}], // 2 regions
        },
      };
      localStorage.setItem('processing_results', JSON.stringify(mockResults));
    });

    // Navigate to results
    await page.locator('button', { hasText: 'Results' }).click();

    await test.step('Table view', async () => {
      await page.locator('button[aria-label="Table view"]').click();
      const table = page.locator('.results-table');
      await expect(table).toHaveScreenshot('data-table-view.png');
    });

    await test.step('Grid view', async () => {
      await page.locator('button[aria-label="Grid view"]').click();
      const grid = page.locator('.results-grid');
      await expect(grid).toHaveScreenshot('data-grid-view.png');
    });

    await test.step('Table with sorting indicators', async () => {
      await page.locator('button[aria-label="Table view"]').click();
      await page.locator('th', { hasText: 'Confidence' }).click();
      const table = page.locator('.results-table');
      await expect(table).toHaveScreenshot('data-table-sorted.png');
    });

    await test.step('Table with filters applied', async () => {
      await page.selectOption('select[data-testid="type-filter"]', 'rent_roll');
      const table = page.locator('.results-table');
      await expect(table).toHaveScreenshot('data-table-filtered.png');
    });
  });

  test('Dashboard components', async ({ page }) => {
    // Navigate to dashboard
    await page.locator('button', { hasText: 'Dashboard' }).click();

    await test.step('Statistics cards', async () => {
      const statsSection = page.locator('[data-testid="stats-section"]');
      await expect(statsSection).toHaveScreenshot('dashboard-stats.png');
    });

    await test.step('System health indicators', async () => {
      const healthSection = page.locator('[data-testid="system-health"]');
      await expect(healthSection).toHaveScreenshot('dashboard-health.png');
    });

    await test.step('Performance metrics', async () => {
      const metricsSection = page.locator('[data-testid="performance-metrics"]');
      await expect(metricsSection).toHaveScreenshot('dashboard-metrics.png');
    });

    await test.step('Recent activity table', async () => {
      const activitySection = page.locator('[data-testid="recent-activity"]');
      await expect(activitySection).toHaveScreenshot('dashboard-activity.png');
    });
  });

  test('Document preview component', async ({ page }) => {
    // Mock document with regions
    await page.evaluate(() => {
      const mockRegions = [
        { id: 'region-1', x: 100, y: 150, width: 200, height: 50, confidence: 0.95 },
        { id: 'region-2', x: 150, y: 250, width: 180, height: 40, confidence: 0.88 },
      ];
      sessionStorage.setItem('preview_regions', JSON.stringify(mockRegions));
    });

    // Navigate to document preview
    await page.locator('button', { hasText: 'Preview' }).click();

    await test.step('Document with regions overlay', async () => {
      const preview = page.locator('[data-testid="document-preview"]');
      await expect(preview).toHaveScreenshot('document-preview-with-regions.png');
    });

    await test.step('Preview controls', async () => {
      const controls = page.locator('[data-testid="preview-controls"]');
      await expect(controls).toHaveScreenshot('document-preview-controls.png');
    });

    await test.step('Zoomed preview', async () => {
      await page.locator('button[aria-label="Zoom in"]').click();
      const preview = page.locator('[data-testid="document-preview"]');
      await expect(preview).toHaveScreenshot('document-preview-zoomed.png');
    });
  });

  test('Form components', async ({ page }) => {
    // Navigate to settings to see form components
    await page.locator('button', { hasText: 'Settings' }).click();

    await test.step('Form inputs', async () => {
      const form = page.locator('form');
      await expect(form).toHaveScreenshot('form-inputs.png');
    });

    await test.step('Form validation states', async () => {
      // Trigger validation
      await page.locator('input[type="email"]').fill('invalid-email');
      await page.locator('button[type="submit"]').click();
      
      const form = page.locator('form');
      await expect(form).toHaveScreenshot('form-validation-errors.png');
    });

    await test.step('Form success state', async () => {
      // Fill form correctly
      await page.locator('input[type="email"]').fill('valid@example.com');
      await page.locator('input[name="name"]').fill('Test User');
      
      const form = page.locator('form');
      await expect(form).toHaveScreenshot('form-valid-state.png');
    });
  });

  test('Loading states', async ({ page }) => {
    await test.step('Loading skeleton', async () => {
      // Mock loading state
      await page.evaluate(() => {
        // Add loading class to trigger skeleton
        document.body.classList.add('loading');
      });
      
      const loadingSkeleton = page.locator('.loading-skeleton');
      await expect(loadingSkeleton).toHaveScreenshot('loading-skeleton.png');
    });

    await test.step('Spinner loading', async () => {
      const spinner = page.locator('.loading-spinner');
      await expect(spinner).toHaveScreenshot('loading-spinner.png');
    });

    await test.step('Button loading state', async () => {
      const loadingButton = page.locator('button.loading');
      await expect(loadingButton).toHaveScreenshot('button-loading.png');
    });
  });

  test('Empty states', async ({ page }) => {
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();

    await test.step('Empty upload state', async () => {
      const emptyState = page.locator('[data-testid="empty-upload"]');
      await expect(emptyState).toHaveScreenshot('empty-upload-state.png');
    });

    await test.step('Empty results state', async () => {
      await page.locator('button', { hasText: 'Results' }).click();
      const emptyResults = page.locator('[data-testid="empty-results"]');
      await expect(emptyResults).toHaveScreenshot('empty-results-state.png');
    });

    await test.step('Empty dashboard state', async () => {
      await page.locator('button', { hasText: 'Dashboard' }).click();
      const emptyDashboard = page.locator('[data-testid="empty-dashboard"]');
      await expect(emptyDashboard).toHaveScreenshot('empty-dashboard-state.png');
    });
  });

  test('Responsive design breakpoints', async ({ page }) => {
    await test.step('Mobile layout', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page).toHaveScreenshot('layout-mobile.png');
    });

    await test.step('Tablet layout', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page).toHaveScreenshot('layout-tablet.png');
    });

    await test.step('Desktop layout', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page).toHaveScreenshot('layout-desktop.png');
    });

    await test.step('Ultra-wide layout', async () => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await expect(page).toHaveScreenshot('layout-ultrawide.png');
    });
  });

  test('Theme variations', async ({ page }) => {
    await test.step('Light theme', async () => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await expect(page).toHaveScreenshot('theme-light.png');
    });

    await test.step('Dark theme', async () => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await expect(page).toHaveScreenshot('theme-dark.png');
    });

    await test.step('High contrast theme', async () => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'high-contrast');
      });
      await expect(page).toHaveScreenshot('theme-high-contrast.png');
    });
  });

  test('Focus states', async ({ page }) => {
    await test.step('Button focus', async () => {
      await page.keyboard.press('Tab');
      const focusedButton = page.locator(':focus');
      await expect(focusedButton).toHaveScreenshot('focus-button.png');
    });

    await test.step('Input focus', async () => {
      await page.locator('input').first().focus();
      const focusedInput = page.locator(':focus');
      await expect(focusedInput).toHaveScreenshot('focus-input.png');
    });

    await test.step('Link focus', async () => {
      const link = page.locator('a').first();
      if (await link.count() > 0) {
        await link.focus();
        await expect(link).toHaveScreenshot('focus-link.png');
      }
    });
  });
});