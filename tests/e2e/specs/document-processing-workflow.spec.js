/**
 * E2E Tests for Document Processing Workflow
 * PDF Transaction Extractor - Complete Document Processing Pipeline Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Document Processing Workflow', () => {
  // Mock data for testing
  const mockProcessingData = {
    classification: {
      document_type: 'rent_roll',
      confidence: 0.95,
      processing_time: 1.2
    },
    suggestedRegions: [
      { name: 'unit_number', x: 100, y: 200, width: 80, height: 25 },
      { name: 'tenant_name', x: 200, y: 200, width: 150, height: 25 },
      { name: 'monthly_rent', x: 400, y: 200, width: 100, height: 25 },
      { name: 'lease_start', x: 520, y: 200, width: 90, height: 25 }
    ],
    extractedData: {
      'unit_number': ['101', '102', '103', '104'],
      'tenant_name': ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Brown'],
      'monthly_rent': ['$1,200', '$1,400', '$1,100', '$1,600'],
      'lease_start': ['01/01/2024', '02/15/2024', '03/01/2024', '01/15/2024']
    },
    validation: {
      is_valid: true,
      confidence: 0.92,
      issues: [],
      warnings: ['Unit 103 rent seems low compared to market rate']
    },
    qualityScore: {
      overall_score: 87.5,
      completeness: 95.0,
      accuracy: 88.0,
      consistency: 79.5
    }
  };

  test.beforeEach(async ({ page }) => {
    // Setup API mocking for consistent testing
    await setupAPIMocks(page, mockProcessingData);
    
    // Navigate to tool page
    await page.goto('/tool');
    await page.waitForLoadState('domcontentloaded');
    
    // Upload a test file to start the workflow
    await uploadTestFile(page, 'sample-rent-roll.pdf');
  });

  test('should complete full document processing workflow', async ({ page }) => {
    // Step 1: File Upload (already done in beforeEach)
    await expect(page.locator('.upload-success, .file-uploaded')).toBeVisible({ timeout: 5000 });
    
    // Step 2: Document Classification
    await page.click('.classify-button, [data-action="classify"]');
    await page.waitForTimeout(1000);
    
    // Verify classification results
    await expect(page.locator('.classification-result')).toContainText('rent_roll');
    await expect(page.locator('.confidence-score')).toContainText('95%');
    
    // Step 3: Region Suggestion
    await page.click('.suggest-regions-button, [data-action="suggest-regions"]');
    await page.waitForTimeout(1000);
    
    // Verify suggested regions are displayed
    await expect(page.locator('.suggested-region')).toHaveCount(4);
    await expect(page.locator('[data-region="unit_number"]')).toBeVisible();
    await expect(page.locator('[data-region="tenant_name"]')).toBeVisible();
    
    // Step 4: Data Extraction
    await page.click('.extract-data-button, [data-action="extract"]');
    await page.waitForTimeout(2000);
    
    // Verify extracted data
    await expect(page.locator('.extracted-data-table')).toBeVisible();
    await expect(page.locator('.data-row')).toHaveCount(4); // 4 units
    
    // Step 5: Data Validation
    await page.click('.validate-data-button, [data-action="validate"]');
    await page.waitForTimeout(1000);
    
    // Verify validation results
    await expect(page.locator('.validation-passed')).toBeVisible();
    await expect(page.locator('.validation-warnings')).toContainText('Unit 103 rent seems low');
    
    // Step 6: Quality Scoring
    await page.click('.quality-score-button, [data-action="quality-score"]');
    await page.waitForTimeout(1000);
    
    // Verify quality score
    await expect(page.locator('.quality-score')).toContainText('87.5');
    await expect(page.locator('.completeness-score')).toContainText('95.0');
    
    // Step 7: Export to Excel
    await page.click('.export-excel-button, [data-action="export"]');
    await page.waitForTimeout(1000);
    
    // Verify export success
    await expect(page.locator('.export-success')).toBeVisible();
    await expect(page.locator('.download-link')).toBeVisible();
  });

  test('should handle AI-powered document classification', async ({ page }) => {
    // Test different document types
    const documentTypes = [
      { file: 'offering-memo.pdf', expected: 'offering_memo' },
      { file: 'lease-agreement.pdf', expected: 'lease_agreement' },
      { file: 'comparable-sales.pdf', expected: 'comparable_sales' }
    ];

    for (const doc of documentTypes) {
      // Upload different document type
      await uploadTestFile(page, doc.file);
      
      // Update mock for this document type
      await page.route('**/api/classify-document', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            classification: {
              document_type: doc.expected,
              confidence: 0.92
            }
          })
        });
      });
      
      // Trigger classification
      await page.click('.classify-button, [data-action="classify"]');
      await page.waitForTimeout(1000);
      
      // Verify correct classification
      await expect(page.locator('.classification-result')).toContainText(doc.expected);
    }
  });

  test('should provide real-time processing status updates', async ({ page }) => {
    // Mock progressive status updates
    let statusStep = 0;
    const statusUpdates = [
      { status: 'uploading', progress: 25, message: 'Uploading document...' },
      { status: 'classifying', progress: 50, message: 'Classifying document type...' },
      { status: 'extracting', progress: 75, message: 'Extracting data...' },
      { status: 'validating', progress: 90, message: 'Validating results...' },
      { status: 'completed', progress: 100, message: 'Processing completed' }
    ];
    
    await page.route('**/api/process-status/**', async (route) => {
      const currentStatus = statusUpdates[Math.min(statusStep, statusUpdates.length - 1)];
      statusStep++;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentStatus)
      });
    });
    
    // Start processing
    await page.click('.process-button, [data-action="process"]');
    
    // Check for progress updates
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.status-message')).toContainText('Uploading');
    
    // Wait for completion
    await page.waitForFunction(() => {
      const progressBar = document.querySelector('.progress-bar, [data-progress]');
      return progressBar && progressBar.getAttribute('aria-valuenow') === '100';
    }, { timeout: 10000 });
    
    await expect(page.locator('.status-message')).toContainText('completed');
  });

  test('should allow manual region adjustment', async ({ page }) => {
    // Navigate to region selection interface
    await page.click('.suggest-regions-button, [data-action="suggest-regions"]');
    await page.waitForTimeout(1000);
    
    // Check if canvas/region selection is available
    const canvas = page.locator('#pdfCanvas, .region-canvas');
    if (await canvas.count() > 0) {
      // Test region creation via mouse interaction
      const canvasBox = await canvas.boundingBox();
      
      // Draw a new region
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 150);
      await page.mouse.up();
      
      // Verify new region was created
      await expect(page.locator('.custom-region, [data-custom="true"]')).toBeVisible();
    }
    
    // Test region editing
    const existingRegion = page.locator('.suggested-region').first();
    await existingRegion.hover();
    await existingRegion.click();
    
    // Check for region editing controls
    await expect(page.locator('.region-controls, .edit-region-panel')).toBeVisible();
    
    // Test region deletion
    await page.click('.delete-region-button, [data-action="delete-region"]');
    await expect(page.locator('.suggested-region')).toHaveCount(3); // One less than original
  });

  test('should handle data validation and error correction', async ({ page }) => {
    // Mock validation with errors
    await page.route('**/api/validate-data', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          validation: {
            is_valid: false,
            confidence: 0.75,
            issues: [
              { field: 'monthly_rent', message: 'Invalid currency format in row 2' },
              { field: 'lease_start', message: 'Date format inconsistent in row 4' }
            ],
            warnings: ['Some rent amounts seem unusually high']
          }
        })
      });
    });
    
    // Complete initial processing steps
    await completeProcessingSteps(page, ['classify', 'suggest-regions', 'extract']);
    
    // Trigger validation
    await page.click('.validate-data-button, [data-action="validate"]');
    await page.waitForTimeout(1000);
    
    // Check for validation errors
    await expect(page.locator('.validation-errors')).toBeVisible();
    await expect(page.locator('.validation-error')).toHaveCount(2);
    await expect(page.locator('.validation-warnings')).toContainText('unusually high');
    
    // Test error correction
    const errorItem = page.locator('.validation-error').first();
    await errorItem.click();
    
    // Check if correction interface appears
    await expect(page.locator('.correction-panel, .edit-data-modal')).toBeVisible();
    
    // Make correction
    await page.fill('.correction-input, [data-field="monthly_rent"]', '$1,250');
    await page.click('.save-correction-button, [data-action="save-correction"]');
    
    // Re-validate
    await page.click('.validate-data-button, [data-action="validate"]');
    await page.waitForTimeout(500);
    
    // Verify error is resolved
    await expect(page.locator('.validation-error')).toHaveCount(1); // One less error
  });

  test('should generate comprehensive quality reports', async ({ page }) => {
    // Complete full processing pipeline
    await completeProcessingSteps(page, ['classify', 'suggest-regions', 'extract', 'validate']);
    
    // Generate quality report
    await page.click('.quality-report-button, [data-action="quality-report"]');
    await page.waitForTimeout(1000);
    
    // Check report sections
    await expect(page.locator('.quality-report')).toBeVisible();
    await expect(page.locator('.quality-summary')).toBeVisible();
    await expect(page.locator('.completeness-section')).toBeVisible();
    await expect(page.locator('.accuracy-section')).toBeVisible();
    await expect(page.locator('.consistency-section')).toBeVisible();
    
    // Verify score visualization
    await expect(page.locator('.score-chart, .quality-gauge')).toBeVisible();
    await expect(page.locator('.overall-score')).toContainText('87.5');
    
    // Test detailed breakdown
    await page.click('.view-details-button, [data-action="view-details"]');
    await expect(page.locator('.detailed-metrics')).toBeVisible();
    
    // Test score export
    await page.click('.export-report-button, [data-action="export-report"]');
    await expect(page.locator('.report-download-link')).toBeVisible();
  });

  test('should export data in multiple formats', async ({ page }) => {
    // Complete processing pipeline
    await completeProcessingSteps(page, ['classify', 'extract', 'validate']);
    
    // Test Excel export
    await page.click('.export-excel-button, [data-action="export-excel"]');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('.excel-export-success')).toBeVisible();
    
    // Test CSV export (if available)
    const csvButton = page.locator('.export-csv-button, [data-format="csv"]');
    if (await csvButton.count() > 0) {
      await csvButton.click();
      await expect(page.locator('.csv-export-success')).toBeVisible();
    }
    
    // Test JSON export (if available)
    const jsonButton = page.locator('.export-json-button, [data-format="json"]');
    if (await jsonButton.count() > 0) {
      await jsonButton.click();
      await expect(page.locator('.json-export-success')).toBeVisible();
    }
    
    // Verify download links
    await expect(page.locator('.download-link')).toHaveCount(1, { timeout: 5000 });
  });

  test('should handle processing errors gracefully', async ({ page }) => {
    // Mock various error scenarios
    const errorScenarios = [
      { endpoint: 'classify-document', error: 'Classification service unavailable' },
      { endpoint: 'suggest-regions', error: 'Region detection failed' },
      { endpoint: 'extract-data', error: 'OCR service timeout' },
      { endpoint: 'validate-data', error: 'Validation service error' }
    ];
    
    for (const scenario of errorScenarios) {
      // Reset page state
      await page.reload();
      await uploadTestFile(page, 'test-document.pdf');
      
      // Mock error for specific endpoint
      await page.route(`**/api/${scenario.endpoint}`, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: scenario.error
          })
        });
      });
      
      // Trigger the action that should fail
      const actionMap = {
        'classify-document': '.classify-button',
        'suggest-regions': '.suggest-regions-button',
        'extract-data': '.extract-data-button',
        'validate-data': '.validate-data-button'
      };
      
      await page.click(actionMap[scenario.endpoint]);
      await page.waitForTimeout(1000);
      
      // Verify error handling
      await expect(page.locator('.error-message, .notification-error')).toBeVisible();
      await expect(page.locator('.error-message, .notification-error')).toContainText(scenario.error);
      
      // Verify retry option is available
      await expect(page.locator('.retry-button, [data-action="retry"]')).toBeVisible();
    }
  });

  test('should maintain processing state across page reloads', async ({ page }) => {
    // Complete some processing steps
    await completeProcessingSteps(page, ['classify', 'suggest-regions']);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Check if previous state is maintained
    // Note: This depends on implementation using sessionStorage/localStorage
    const hasState = await page.evaluate(() => {
      return localStorage.getItem('processingState') || sessionStorage.getItem('processingState');
    });
    
    if (hasState) {
      await expect(page.locator('.classification-result')).toBeVisible();
      await expect(page.locator('.suggested-region')).toHaveCount(4);
    }
  });

  test('should support keyboard navigation and accessibility', async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test keyboard shortcuts (if implemented)
    await page.keyboard.press('Control+k'); // Search/command palette
    await page.keyboard.press('Escape'); // Close modals
    
    // Test ARIA attributes and labels
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const hasText = await button.innerText();
      
      // Each button should have either aria-label or visible text
      expect(ariaLabel || hasText).toBeTruthy();
    }
    
    // Test screen reader announcements for status updates
    await page.click('.classify-button, [data-action="classify"]');
    await expect(page.locator('[aria-live="polite"], [aria-live="assertive"]')).toBeVisible();
  });
});

// Helper functions
async function setupAPIMocks(page, mockData) {
  await page.route('**/api/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        filename: 'test-document.pdf',
        page_count: 3
      })
    });
  });

  await page.route('**/api/classify-document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        classification: mockData.classification
      })
    });
  });

  await page.route('**/api/suggest-regions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        regions: mockData.suggestedRegions
      })
    });
  });

  await page.route('**/api/extract-data', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        extracted_data: mockData.extractedData
      })
    });
  });

  await page.route('**/api/validate-data', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        validation: mockData.validation
      })
    });
  });

  await page.route('**/api/quality-score', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        quality_score: mockData.qualityScore
      })
    });
  });

  await page.route('**/api/export-excel', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        excel_path: '/uploads/exported_data.xlsx',
        download_url: '/api/download/exported_data.xlsx'
      })
    });
  });
}

async function uploadTestFile(page, filename) {
  await page.setInputFiles('#fileInput', {
    name: filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('test pdf content')
  });
  await page.waitForTimeout(500);
}

async function completeProcessingSteps(page, steps) {
  for (const step of steps) {
    const buttonMap = {
      'classify': '.classify-button, [data-action="classify"]',
      'suggest-regions': '.suggest-regions-button, [data-action="suggest-regions"]',
      'extract': '.extract-data-button, [data-action="extract"]',
      'validate': '.validate-data-button, [data-action="validate"]'
    };
    
    await page.click(buttonMap[step]);
    await page.waitForTimeout(1000);
  }
}