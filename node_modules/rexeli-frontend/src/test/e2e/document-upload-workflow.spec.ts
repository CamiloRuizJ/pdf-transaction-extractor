import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Document Upload Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Inject axe for accessibility testing
    await injectAxe(page);
  });

  test('complete document upload and processing workflow', async ({ page }) => {
    // Test the complete workflow from upload to results

    // Step 1: Upload a document
    await test.step('Upload document', async () => {
      // Look for the upload zone
      const uploadZone = page.locator('[data-testid="upload-zone"]');
      await expect(uploadZone).toBeVisible();

      // Simulate file upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content'),
      });

      // Verify file appears in upload list
      await expect(page.locator('.uploaded-file')).toContainText('test-document.pdf');
    });

    // Step 2: Start processing
    await test.step('Start processing', async () => {
      const processButton = page.locator('button', { hasText: 'Process Documents' });
      await expect(processButton).toBeEnabled();
      
      await processButton.click();
      
      // Verify processing started
      await expect(page.locator('.processing-indicator')).toBeVisible();
    });

    // Step 3: Monitor processing progress
    await test.step('Monitor processing', async () => {
      // Wait for processing to begin
      await page.waitForSelector('.progress-bar', { timeout: 5000 });
      
      // Check progress updates
      const progressBar = page.locator('.progress-bar');
      await expect(progressBar).toBeVisible();
      
      // Wait for completion (with longer timeout for processing)
      await page.waitForSelector('.processing-complete', { timeout: 30000 });
    });

    // Step 4: View results
    await test.step('View results', async () => {
      // Navigate to results
      const resultsTab = page.locator('button', { hasText: 'Results' });
      await resultsTab.click();
      
      // Verify results are displayed
      await expect(page.locator('.results-table')).toBeVisible();
      await expect(page.locator('.result-row')).toHaveCount(1);
      
      // Check result details
      const resultRow = page.locator('.result-row').first();
      await expect(resultRow).toContainText('test-document.pdf');
      await expect(resultRow).toContainText('Completed');
    });

    // Step 5: View detailed results
    await test.step('View detailed results', async () => {
      const viewButton = page.locator('.result-row button', { hasText: 'View' }).first();
      await viewButton.click();
      
      // Verify modal opens
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Processing Result');
      
      // Check extracted data
      await expect(modal.locator('.extracted-data')).toBeVisible();
      
      // Close modal
      await modal.locator('button', { hasText: 'Close' }).click();
      await expect(modal).not.toBeVisible();
    });

    // Step 6: Export results
    await test.step('Export results', async () => {
      const exportButton = page.locator('button', { hasText: 'Export All' });
      await exportButton.click();
      
      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    });

    // Check accessibility throughout the workflow
    await checkA11y(page);
  });

  test('handles upload errors gracefully', async ({ page }) => {
    // Test error handling for invalid files

    await test.step('Upload invalid file type', async () => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Text content'),
      });

      // Verify error message
      await expect(page.locator('.error-message')).toContainText('Invalid file type');
    });

    await test.step('Upload oversized file', async () => {
      const fileInput = page.locator('input[type="file"]');
      
      // Create a large buffer (simulate oversized file)
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      
      await fileInput.setInputFiles({
        name: 'large.pdf',
        mimeType: 'application/pdf',
        buffer: largeBuffer,
      });

      // Verify error message
      await expect(page.locator('.error-message')).toContainText('File size exceeds limit');
    });
  });

  test('supports drag and drop upload', async ({ page }) => {
    const uploadZone = page.locator('[data-testid="upload-zone"]');
    
    // Simulate drag and drop
    await uploadZone.dispatchEvent('dragover', {
      dataTransfer: {
        items: [{
          kind: 'file',
          type: 'application/pdf',
        }],
      },
    });

    // Verify drag state
    await expect(uploadZone).toHaveClass(/drag-over/);

    // Simulate drop
    await uploadZone.dispatchEvent('drop', {
      dataTransfer: {
        files: [{
          name: 'dropped-document.pdf',
          type: 'application/pdf',
          size: 1024 * 1024,
        }],
      },
    });

    // Verify file was added
    await expect(page.locator('.uploaded-file')).toContainText('dropped-document.pdf');
  });

  test('processes multiple documents', async ({ page }) => {
    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      {
        name: 'document-1.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content 1'),
      },
      {
        name: 'document-2.pdf', 
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content 2'),
      },
    ]);

    // Verify both files appear
    await expect(page.locator('.uploaded-file')).toHaveCount(2);

    // Start processing
    await page.locator('button', { hasText: 'Process Documents' }).click();

    // Monitor progress for multiple files
    await expect(page.locator('.processing-indicator')).toBeVisible();
    
    // Wait for all to complete
    await page.waitForSelector('.processing-complete', { timeout: 60000 });
    
    // Check results
    await page.locator('button', { hasText: 'Results' }).click();
    await expect(page.locator('.result-row')).toHaveCount(2);
  });

  test('supports keyboard navigation', async ({ page }) => {
    // Test keyboard accessibility
    
    // Navigate to upload zone with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const uploadZone = page.locator('[data-testid="upload-zone"]');
    await expect(uploadZone).toBeFocused();
    
    // Activate with Enter/Space
    await page.keyboard.press('Enter');
    
    // Should open file dialog (we'll mock this)
    // In real scenario, file dialog would open
    
    // Tab through interface
    await page.keyboard.press('Tab');
    const processButton = page.locator('button', { hasText: 'Process Documents' });
    await expect(processButton).toBeFocused();
    
    // Test keyboard shortcuts
    await page.keyboard.press('Control+u'); // Upload shortcut
    await page.keyboard.press('Control+p'); // Process shortcut
    await page.keyboard.press('Escape'); // Close any modals
  });

  test('maintains responsive design across viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const uploadZone = page.locator('[data-testid="upload-zone"]');
    await expect(uploadZone).toBeVisible();
    
    // Should stack elements vertically on mobile
    const container = page.locator('.upload-container');
    const containerBox = await container.boundingBox();
    expect(containerBox?.height).toBeGreaterThan(containerBox?.width || 0);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(uploadZone).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(uploadZone).toBeVisible();
    
    // Should show side-by-side layout on desktop
    const dashboardLayout = page.locator('.dashboard-layout');
    await expect(dashboardLayout).toHaveClass(/grid-cols-2|flex-row/);
  });

  test('handles network connectivity issues', async ({ page }) => {
    // Simulate offline scenario
    await page.context().setOffline(true);
    
    // Try to upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content'),
    });
    
    const processButton = page.locator('button', { hasText: 'Process Documents' });
    await processButton.click();
    
    // Should show connection error
    await expect(page.locator('.connection-error')).toContainText('Connection failed');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should show retry option
    const retryButton = page.locator('button', { hasText: 'Retry' });
    await expect(retryButton).toBeVisible();
    
    await retryButton.click();
    
    // Should resume processing
    await expect(page.locator('.processing-indicator')).toBeVisible();
  });

  test('preserves data across browser refresh', async ({ page }) => {
    // Upload files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'persistent-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content'),
    });

    // Verify file is uploaded
    await expect(page.locator('.uploaded-file')).toContainText('persistent-test.pdf');
    
    // Refresh page
    await page.reload();
    
    // Should restore uploaded files from localStorage/sessionStorage
    await expect(page.locator('.uploaded-file')).toContainText('persistent-test.pdf');
    
    // Processing state should also be restored if it was in progress
  });

  test('provides clear feedback for processing states', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'feedback-test.pdf',
      mimeType: 'application/pdf', 
      buffer: Buffer.from('PDF content'),
    });

    // Start processing
    await page.locator('button', { hasText: 'Process Documents' }).click();
    
    // Check different states
    await expect(page.locator('.status-uploading')).toBeVisible();
    await expect(page.locator('.status-uploading')).toContainText('Uploading...');
    
    await page.waitForSelector('.status-processing', { timeout: 10000 });
    await expect(page.locator('.status-processing')).toContainText('Processing...');
    
    await page.waitForSelector('.status-extracting', { timeout: 20000 });
    await expect(page.locator('.status-extracting')).toContainText('Extracting data...');
    
    await page.waitForSelector('.status-completed', { timeout: 30000 });
    await expect(page.locator('.status-completed')).toContainText('Completed');
    
    // Verify progress percentage is shown
    const progressText = page.locator('.progress-text');
    await expect(progressText).toContainText(/\d+%/);
  });
});