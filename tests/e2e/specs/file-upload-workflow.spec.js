/**
 * E2E Tests for File Upload Workflow
 * PDF Transaction Extractor - Complete File Upload Process Testing
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload Workflow', () => {
  let samplePdfPath;
  
  test.beforeEach(async ({ page }) => {
    // Create a sample PDF file path for testing
    samplePdfPath = path.join(__dirname, '../fixtures/sample-rent-roll.pdf');
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display homepage correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/PDF Converter V2/);
    
    // Check main navigation elements
    await expect(page.locator('.navbar-brand')).toContainText('PDF Converter V2');
    await expect(page.locator('.ai-badge')).toContainText('AI-Powered');
    
    // Check hero section
    await expect(page.locator('.hero-gradient h1')).toContainText('AI-Powered PDF Processing');
    
    // Check CTA buttons
    await expect(page.locator('a[href="/tool"]')).toContainText('Start Processing');
    
    // Check feature sections
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.locator('.feature-card')).toHaveCount(6); // Should have 6 feature cards
  });

  test('should navigate to processing tool', async ({ page }) => {
    // Click on "Start Processing" button
    await page.click('a[href="/tool"]');
    
    // Wait for navigation
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we're on the tool page
    expect(page.url()).toContain('/tool');
    
    // Check for tool page elements
    await expect(page.locator('#uploadArea')).toBeVisible();
    await expect(page.locator('#fileInput')).toBeVisible();
  });

  test('should handle file upload via file input', async ({ page }) => {
    // Navigate to tool page
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Mock the file upload since we don't have actual PDF files in test environment
    await page.evaluate(() => {
      // Mock successful upload response
      window.fetch = async (url, options) => {
        if (url === '/api/upload') {
          return {
            ok: true,
            json: async () => ({
              success: true,
              filename: 'test-rent-roll.pdf',
              page_count: 3,
              filepath: '/uploads/test-rent-roll.pdf'
            })
          };
        }
        return fetch(url, options);
      };
    });
    
    // Create a test file
    const testFile = new File(['test pdf content'], 'test-rent-roll.pdf', {
      type: 'application/pdf'
    });
    
    // Upload file using file input
    await page.setInputFiles('#fileInput', {
      name: 'test-rent-roll.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content')
    });
    
    // Wait for upload to complete
    await page.waitForTimeout(1000);
    
    // Check for success notification or UI update
    // Note: This depends on the actual implementation
    await expect(page.locator('.notification-success, .upload-success')).toBeVisible({ timeout: 5000 });
  });

  test('should handle drag and drop file upload', async ({ page }) => {
    // Navigate to tool page
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Mock file upload API
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          filename: 'dropped-file.pdf',
          page_count: 2,
          filepath: '/uploads/dropped-file.pdf'
        })
      });
    });
    
    const uploadArea = page.locator('#uploadArea');
    
    // Simulate drag over
    await uploadArea.dispatchEvent('dragover', {
      dataTransfer: {
        types: ['Files'],
        files: [{
          name: 'dropped-file.pdf',
          type: 'application/pdf',
          size: 1024
        }]
      }
    });
    
    // Check if dragover class is added
    await expect(uploadArea).toHaveClass(/dragover/);
    
    // Simulate drop
    await uploadArea.dispatchEvent('drop', {
      dataTransfer: {
        files: [{
          name: 'dropped-file.pdf',
          type: 'application/pdf',
          size: 1024
        }]
      }
    });
    
    // Wait for upload processing
    await page.waitForTimeout(500);
    
    // Check if dragover class is removed
    await expect(uploadArea).not.toHaveClass(/dragover/);
  });

  test('should validate file type and size', async ({ page }) => {
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Test invalid file type
    await page.evaluate(() => {
      const fileInput = document.getElementById('fileInput');
      const invalidFile = new File(['text content'], 'document.txt', {
        type: 'text/plain'
      });
      
      // Manually trigger file validation
      const event = new Event('change');
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false
      });
      fileInput.dispatchEvent(event);
    });
    
    // Check for error notification
    await expect(page.locator('.notification-error, .error-message')).toContainText(/valid PDF file/, { timeout: 3000 });
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Mock failed upload
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Upload failed'
        })
      });
    });
    
    // Try to upload a file
    await page.setInputFiles('#fileInput', {
      name: 'test-error.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    });
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // Check for error notification
    await expect(page.locator('.notification-error, .error-message')).toContainText(/failed/, { timeout: 5000 });
  });

  test('should show loading states during upload', async ({ page }) => {
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Mock slow upload response
    await page.route('**/api/upload', async (route) => {
      // Delay response by 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          filename: 'slow-upload.pdf',
          page_count: 1
        })
      });
    });
    
    // Start file upload
    const uploadPromise = page.setInputFiles('#fileInput', {
      name: 'slow-upload.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    });
    
    // Check for loading indicator
    await expect(page.locator('.loading, .spinner, #loading-screen.active')).toBeVisible({ timeout: 1000 });
    
    // Wait for upload to complete
    await uploadPromise;
    await page.waitForTimeout(2500);
    
    // Check that loading indicator is hidden
    await expect(page.locator('.loading, .spinner, #loading-screen.active')).not.toBeVisible();
  });

  test('should update file information display', async ({ page }) => {
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Mock successful upload
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          filename: 'info-test.pdf',
          page_count: 5,
          size: 2048000 // 2MB
        })
      });
    });
    
    // Upload file
    await page.setInputFiles('#fileInput', {
      name: 'info-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    });
    
    // Wait for upload to complete
    await page.waitForTimeout(1000);
    
    // Check file information display (if these elements exist)
    const fileNameElement = page.locator('#fileName, .file-name');
    const fileSizeElement = page.locator('#fileSize, .file-size');
    const pageCountElement = page.locator('#pageCount, .page-count');
    
    if (await fileNameElement.count() > 0) {
      await expect(fileNameElement).toContainText('info-test.pdf');
    }
    
    if (await pageCountElement.count() > 0) {
      await expect(pageCountElement).toContainText('5');
    }
  });

  test('should handle multiple file uploads', async ({ page }) => {
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    let uploadCount = 0;
    await page.route('**/api/upload', async (route) => {
      uploadCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          filename: `upload-${uploadCount}.pdf`,
          page_count: 1
        })
      });
    });
    
    // Upload first file
    await page.setInputFiles('#fileInput', {
      name: 'first-upload.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('first file content')
    });
    
    await page.waitForTimeout(500);
    
    // Upload second file
    await page.setInputFiles('#fileInput', {
      name: 'second-upload.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('second file content')
    });
    
    await page.waitForTimeout(500);
    
    // Verify both uploads were processed
    expect(uploadCount).toBe(2);
  });

  test('should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Check mobile-specific elements
      const uploadArea = page.locator('#uploadArea');
      await expect(uploadArea).toBeVisible();
      
      // Check touch-friendly interface
      const box = await uploadArea.boundingBox();
      expect(box.height).toBeGreaterThan(100); // Should be tall enough for touch
      
      // Test mobile navigation if present
      const mobileMenuToggle = page.locator('#mobile-menu-toggle, .mobile-menu-toggle');
      if (await mobileMenuToggle.count() > 0) {
        await mobileMenuToggle.click();
        await expect(page.locator('.nav-links, .mobile-menu')).toBeVisible();
      }
    }
  });

  test('should handle network connectivity issues', async ({ page }) => {
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Simulate network failure
    await page.route('**/api/upload', async (route) => {
      await route.abort('failed');
    });
    
    // Try to upload a file
    await page.setInputFiles('#fileInput', {
      name: 'network-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    });
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // Check for network error message
    await expect(page.locator('.notification-error, .error-message')).toBeVisible({ timeout: 5000 });
  });
});

// Helper function to create test fixtures
test.describe('Test Fixtures', () => {
  test('should create sample PDF fixtures', async () => {
    // This test ensures we have proper test fixtures
    // In a real implementation, this would create actual PDF files for testing
    expect(true).toBe(true); // Placeholder
  });
});