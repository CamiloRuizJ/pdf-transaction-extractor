import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Dashboard Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    
    // Mock some processed documents for dashboard data
    await page.addInitScript(() => {
      // Mock localStorage with sample data
      const mockResults = {
        'result-1': {
          id: 'result-1',
          fileId: 'file-1',
          documentType: 'rent_roll',
          confidence: 0.94,
          qualityScore: 0.87,
          createdAt: new Date().toISOString(),
        },
        'result-2': {
          id: 'result-2',
          fileId: 'file-2',
          documentType: 'lease_agreement',
          confidence: 0.89,
          qualityScore: 0.91,
          createdAt: new Date().toISOString(),
        },
        'result-3': {
          id: 'result-3',
          fileId: 'file-3',
          documentType: 'offering_memo',
          confidence: 0.76,
          qualityScore: 0.68,
          createdAt: new Date().toISOString(),
        },
      };
      
      window.localStorage.setItem('processing_results', JSON.stringify(mockResults));
    });
    
    // Navigate to dashboard
    await page.locator('button', { hasText: 'Dashboard' }).click();
  });

  test('displays overview statistics correctly', async ({ page }) => {
    await test.step('Check overview cards', async () => {
      // Total documents card
      const totalCard = page.locator('[data-testid="total-documents-card"]');
      await expect(totalCard).toContainText('Total Documents');
      await expect(totalCard.locator('.stat-value')).toContainText('3');

      // Completed documents card
      const completedCard = page.locator('[data-testid="completed-documents-card"]');
      await expect(completedCard).toContainText('Completed');
      await expect(completedCard.locator('.stat-value')).toContainText('3');

      // Average confidence card
      const confidenceCard = page.locator('[data-testid="average-confidence-card"]');
      await expect(confidenceCard).toContainText('Average Confidence');
      await expect(confidenceCard.locator('.stat-value')).toContainText(/\d+%/);
    });
  });

  test('shows real-time system health metrics', async ({ page }) => {
    await test.step('Check system health section', async () => {
      const healthSection = page.locator('[data-testid="system-health-section"]');
      await expect(healthSection).toBeVisible();

      // System status
      const systemStatus = page.locator('[data-testid="system-status"]');
      await expect(systemStatus).toContainText('System Status');
      await expect(systemStatus.locator('.status-indicator')).toBeVisible();

      // AI Service status
      const aiStatus = page.locator('[data-testid="ai-service-status"]');
      await expect(aiStatus).toContainText('AI Service');
      await expect(aiStatus.locator('.status-indicator')).toBeVisible();
    });

    await test.step('Check performance metrics', async () => {
      // CPU usage
      const cpuCard = page.locator('[data-testid="cpu-usage-card"]');
      await expect(cpuCard).toContainText('CPU Usage');
      await expect(cpuCard.locator('.circular-progress')).toBeVisible();

      // Memory usage
      const memoryCard = page.locator('[data-testid="memory-usage-card"]');
      await expect(memoryCard).toContainText('Memory Usage');
      await expect(memoryCard.locator('.progress-bar')).toBeVisible();

      // API latency
      await expect(page.locator('[data-testid="api-latency"]')).toContainText(/\d+ms/);
    });
  });

  test('displays recent activity table', async ({ page }) => {
    const activitySection = page.locator('[data-testid="recent-activity-section"]');
    await expect(activitySection).toBeVisible();

    // Check table headers
    await expect(activitySection.locator('th')).toContainText(['File', 'Type', 'Status', 'Confidence', 'Started']);

    // Check activity rows
    const activityRows = activitySection.locator('tbody tr');
    await expect(activityRows).toHaveCount(3);

    // Check first row details
    const firstRow = activityRows.first();
    await expect(firstRow.locator('td').first()).toContainText('file-1');
    await expect(firstRow.locator('.status-badge')).toBeVisible();
  });

  test('updates metrics in real-time', async ({ page }) => {
    // Check initial CPU value
    const cpuProgress = page.locator('[data-testid="cpu-usage"] .circular-progress');
    const initialCpuValue = await cpuProgress.getAttribute('aria-valuenow');

    // Wait for update (metrics update every 5 seconds in simulation)
    await page.waitForTimeout(6000);

    // Check if value has changed
    const updatedCpuValue = await cpuProgress.getAttribute('aria-valuenow');
    // Values should be different due to simulated updates
    expect(updatedCpuValue).not.toBe(initialCpuValue);
  });

  test('handles different document types in analytics', async ({ page }) => {
    // Check document type distribution
    const documentTypes = ['rent_roll', 'lease_agreement', 'offering_memo'];
    
    for (const type of documentTypes) {
      await expect(page.locator(`[data-testid="activity-row-${type}"]`)).toBeVisible();
    }

    // Filter by document type
    const typeFilter = page.locator('[data-testid="document-type-filter"]');
    await typeFilter.selectOption('rent_roll');

    // Should show only rent roll documents
    await expect(page.locator('[data-testid="activity-row-rent_roll"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-row-lease_agreement"]')).not.toBeVisible();
  });

  test('shows confidence and quality score distributions', async ({ page }) => {
    // Check confidence indicators
    const highConfidenceItems = page.locator('.confidence-high'); // > 90%
    const mediumConfidenceItems = page.locator('.confidence-medium'); // 70-90%
    const lowConfidenceItems = page.locator('.confidence-low'); // < 70%

    await expect(highConfidenceItems).toHaveCount(2); // 94% and 89%
    await expect(lowConfidenceItems).toHaveCount(1); // 76%

    // Check quality score colors
    const qualityIndicators = page.locator('.quality-score');
    await expect(qualityIndicators).toHaveCount(3);
  });

  test('provides system health alerts', async ({ page }) => {
    // Simulate high CPU usage alert
    await page.evaluate(() => {
      // Mock high CPU usage
      window.dispatchEvent(new CustomEvent('system-alert', {
        detail: {
          type: 'warning',
          message: 'High CPU usage detected: 85%',
          metric: 'cpu',
          value: 85,
        }
      }));
    });

    // Check for alert notification
    const alert = page.locator('[data-testid="system-alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('High CPU usage detected');
    await expect(alert).toHaveClass(/alert-warning/);
  });

  test('exports dashboard data', async ({ page }) => {
    const exportButton = page.locator('button', { hasText: 'Export Dashboard Data' });
    await expect(exportButton).toBeVisible();

    // Click export
    await exportButton.click();

    // Should show export options
    const exportOptions = page.locator('[data-testid="export-options"]');
    await expect(exportOptions).toBeVisible();

    // Select CSV export
    const csvOption = page.locator('button', { hasText: 'Export as CSV' });
    await csvOption.click();

    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/dashboard-data.*\.csv$/);
  });

  test('supports time range filtering', async ({ page }) => {
    const timeRangeSelector = page.locator('[data-testid="time-range-selector"]');
    await expect(timeRangeSelector).toBeVisible();

    // Test different time ranges
    await timeRangeSelector.selectOption('24h');
    await expect(page.locator('.stats-value')).toContainText('3'); // All in last 24h

    await timeRangeSelector.selectOption('7d');
    await expect(page.locator('.stats-value')).toContainText('3'); // All in last 7 days

    await timeRangeSelector.selectOption('30d');
    await expect(page.locator('.stats-value')).toContainText('3'); // All in last 30 days

    // Custom date range
    await timeRangeSelector.selectOption('custom');
    
    const datePickerStart = page.locator('[data-testid="date-picker-start"]');
    const datePickerEnd = page.locator('[data-testid="date-picker-end"]');
    
    await expect(datePickerStart).toBeVisible();
    await expect(datePickerEnd).toBeVisible();
  });

  test('handles empty dashboard state', async ({ page }) => {
    // Clear data
    await page.evaluate(() => {
      window.localStorage.removeItem('processing_results');
    });

    await page.reload();
    await page.locator('button', { hasText: 'Dashboard' }).click();

    // Should show empty state
    const emptyState = page.locator('[data-testid="dashboard-empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No data available');
    
    // Should show call-to-action
    const uploadButton = page.locator('button', { hasText: 'Upload Documents' });
    await expect(uploadButton).toBeVisible();
  });

  test('displays processing trends', async ({ page }) => {
    // Mock historical data for trends
    await page.addInitScript(() => {
      const trendData = {
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
          documents: Math.floor(Math.random() * 10) + 1,
          avgConfidence: 0.8 + Math.random() * 0.2,
        })),
      };
      
      window.localStorage.setItem('dashboard_trends', JSON.stringify(trendData));
    });

    const trendsSection = page.locator('[data-testid="processing-trends"]');
    await expect(trendsSection).toBeVisible();

    // Check chart elements
    const chart = page.locator('[data-testid="trends-chart"]');
    await expect(chart).toBeVisible();

    // Check trend indicators
    const trendUp = page.locator('.trend-up');
    const trendDown = page.locator('.trend-down');
    
    // Should have trend indicators
    await expect(page.locator('.trend-indicator')).toHaveCount(2); // Documents and confidence trends
  });

  test('provides performance insights', async ({ page }) => {
    const insightsSection = page.locator('[data-testid="performance-insights"]');
    await expect(insightsSection).toBeVisible();

    // Check insights cards
    const insights = page.locator('.insight-card');
    await expect(insights).toHaveCount.toBeGreaterThan(0);

    // Check insight types
    await expect(page.locator('.insight-performance')).toBeVisible();
    await expect(page.locator('.insight-quality')).toBeVisible();
    await expect(page.locator('.insight-efficiency')).toBeVisible();

    // Each insight should have an action
    const insightActions = page.locator('.insight-action');
    await expect(insightActions.first()).toContainText(/View|Optimize|Configure/);
  });

  test('maintains accessibility standards', async ({ page }) => {
    // Check ARIA labels on dashboard elements
    const cpuChart = page.locator('[data-testid="cpu-usage-chart"]');
    await expect(cpuChart).toHaveAttribute('aria-label', expect.stringContaining('CPU usage'));

    const memoryChart = page.locator('[data-testid="memory-usage-chart"]');
    await expect(memoryChart).toHaveAttribute('aria-label', expect.stringContaining('Memory usage'));

    // Check table accessibility
    const activityTable = page.locator('[data-testid="activity-table"]');
    await expect(activityTable).toHaveAttribute('role', 'table');

    // Check focus management
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Run full accessibility check
    await checkA11y(page);
  });

  test('supports keyboard navigation', async ({ page }) => {
    // Tab through dashboard elements
    let tabCount = 0;
    const maxTabs = 10;

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      if (await focusedElement.count() > 0) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        
        // Should be focusable elements
        expect(['button', 'select', 'input', 'a', 'div']).toContain(tagName);
        
        // Test activation on interactive elements
        if (['button', 'select'].includes(tagName)) {
          const isDisabled = await focusedElement.isDisabled();
          if (!isDisabled) {
            // Element should be activatable
            await expect(focusedElement).not.toHaveAttribute('aria-disabled', 'true');
          }
        }
      }
      
      tabCount++;
    }
  });

  test('handles responsive layout on different screen sizes', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Stats should stack vertically
    const statsGrid = page.locator('[data-testid="stats-grid"]');
    const statsBox = await statsGrid.boundingBox();
    expect(statsBox?.height).toBeGreaterThan(statsBox?.width || 0);

    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Should show 2x2 grid
    const statsCards = page.locator('.stat-card');
    await expect(statsCards).toHaveCount(4);

    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Should show all stats in a single row
    const desktopStatsBox = await statsGrid.boundingBox();
    expect(desktopStatsBox?.width).toBeGreaterThan(desktopStatsBox?.height || 0);
  });
});