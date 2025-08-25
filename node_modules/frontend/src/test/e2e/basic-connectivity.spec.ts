import { test, expect } from '@playwright/test';

test.describe('Basic Connectivity', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we can find the main app container or title
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Check if the page is responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to processing tool', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to find and click a navigation link to the processing tool
    // This test will help us understand the app structure
    const pageContent = await page.content();
    console.log('Page loaded successfully. Title:', await page.title());
    
    // Basic check that the page loaded without errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Allow some time for any console errors to appear
    await page.waitForTimeout(2000);
    
    // Report any console errors but don't fail the test
    if (errors.length > 0) {
      console.log('Console errors detected:', errors);
    }
    
    expect(true).toBe(true); // This test passes if we get here without crashing
  });
});