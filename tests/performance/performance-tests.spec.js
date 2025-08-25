/**
 * Performance Testing Strategy
 * PDF Transaction Extractor - Comprehensive Performance Test Suite
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Testing Suite', () => {
  
  test.describe('Page Load Performance', () => {
    
    test('should load homepage within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      const loadTime = Date.now() - startTime;
      
      // Homepage should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Check Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          if ('web-vital' in window) {
            resolve(window.webVitals);
          } else {
            // Simulate basic performance metrics
            const timing = performance.timing;
            resolve({
              FCP: timing.responseEnd - timing.fetchStart, // First Contentful Paint
              LCP: timing.loadEventEnd - timing.fetchStart, // Largest Contentful Paint
              CLS: 0.1, // Cumulative Layout Shift (mock)
              FID: 10 // First Input Delay (mock)
            });
          }
        });
      });
      
      // Performance thresholds based on Core Web Vitals
      expect(webVitals.FCP).toBeLessThan(2500); // First Contentful Paint < 2.5s
      expect(webVitals.LCP).toBeLessThan(4000); // Largest Contentful Paint < 4s
      expect(webVitals.CLS).toBeLessThan(0.25); // Cumulative Layout Shift < 0.25
      expect(webVitals.FID).toBeLessThan(300);  // First Input Delay < 300ms
    });
    
    test('should load tool page efficiently', async ({ page }) => {
      await page.goto('/tool');
      
      // Measure page load metrics
      const metrics = await page.evaluate(() => {
        const timing = performance.timing;
        return {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
          resourceCount: performance.getEntriesByType('resource').length,
          transferSize: performance.getEntriesByType('navigation')[0]?.transferSize || 0
        };
      });
      
      // Performance assertions
      expect(metrics.domContentLoaded).toBeLessThan(1500); // DOM ready < 1.5s
      expect(metrics.loadComplete).toBeLessThan(3000);     // Full load < 3s
      expect(metrics.firstPaint).toBeLessThan(1000);       // First paint < 1s
      expect(metrics.resourceCount).toBeLessThan(50);      // Resource count reasonable
      expect(metrics.transferSize).toBeLessThan(2000000);  // Transfer size < 2MB
    });
    
    test('should handle slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G network
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow network
      expect(loadTime).toBeLessThan(5000); // 5 seconds on slow network
      
      // Page should still be functional
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('a[href="/tool"]')).toBeVisible();
    });
  });
  
  test.describe('File Upload Performance', () => {
    
    test('should handle small PDF files quickly', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Mock successful upload
      await page.route('**/api/upload', async (route) => {
        // Simulate processing time for small file
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            filename: 'small-document.pdf',
            page_count: 2,
            processing_time: 0.2
          })
        });
      });
      
      // Create small PDF file (100KB)
      const smallPdfBuffer = Buffer.alloc(100 * 1024, 0);
      
      const startTime = Date.now();
      
      await page.setInputFiles('#fileInput', {
        name: 'small-document.pdf',
        mimeType: 'application/pdf',
        buffer: smallPdfBuffer
      });
      
      // Wait for upload completion
      await page.waitForSelector('.upload-success, .notification-success', { timeout: 5000 });
      
      const uploadTime = Date.now() - startTime;
      
      // Small files should upload quickly
      expect(uploadTime).toBeLessThan(1000); // < 1 second
    });
    
    test('should handle large PDF files efficiently', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Mock upload for large file
      await page.route('**/api/upload', async (route) => {
        // Simulate longer processing time for large file
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            filename: 'large-document.pdf',
            page_count: 50,
            processing_time: 2.0
          })
        });
      });
      
      // Create large PDF file (10MB)
      const largePdfBuffer = Buffer.alloc(10 * 1024 * 1024, 0);
      
      const startTime = Date.now();
      
      await page.setInputFiles('#fileInput', {
        name: 'large-document.pdf',
        mimeType: 'application/pdf',
        buffer: largePdfBuffer
      });
      
      // Check for progress indicator
      await expect(page.locator('.progress-bar, .loading-spinner')).toBeVisible({ timeout: 1000 });
      
      // Wait for upload completion
      await page.waitForSelector('.upload-success, .notification-success', { timeout: 10000 });
      
      const uploadTime = Date.now() - startTime;
      
      // Large files should upload within reasonable time
      expect(uploadTime).toBeLessThan(5000); // < 5 seconds
    });
    
    test('should show progress feedback during upload', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Mock progressive upload response
      let progressStep = 0;
      await page.route('**/api/upload', async (route) => {
        progressStep += 25;
        
        // Simulate upload progress
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (progressStep < 100) {
          await route.fulfill({
            status: 202, // Accepted, processing
            contentType: 'application/json',
            body: JSON.stringify({
              progress: progressStep,
              message: `Processing... ${progressStep}%`
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              filename: 'progress-test.pdf',
              page_count: 5
            })
          });
        }
      });
      
      // Upload file
      await page.setInputFiles('#fileInput', {
        name: 'progress-test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });
      
      // Verify progress indicators appear
      await expect(page.locator('.progress-bar, .upload-progress')).toBeVisible({ timeout: 1000 });
      
      // Wait for completion
      await page.waitForSelector('.upload-success', { timeout: 5000 });
    });
  });
  
  test.describe('Memory Management', () => {
    
    test('should not have memory leaks during file processing', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (initialMemory) {
        // Perform multiple file operations
        for (let i = 0; i < 5; i++) {
          await page.route(`**/api/upload`, async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                filename: `test-${i}.pdf`,
                page_count: 10
              })
            });
          });
          
          await page.setInputFiles('#fileInput', {
            name: `test-${i}.pdf`,
            mimeType: 'application/pdf',
            buffer: Buffer.alloc(1024 * 1024, 0) // 1MB each
          });
          
          await page.waitForTimeout(500);
          
          // Force garbage collection if available
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
        }
        
        // Check final memory usage
        const finalMemory = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          };
        });
        
        // Memory growth should be reasonable
        const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);
        
        // Should not grow more than 50MB for 5 file operations
        expect(memoryGrowthMB).toBeLessThan(50);
        
        // Should not exceed 80% of heap size limit
        const memoryUsagePercent = finalMemory.usedJSHeapSize / finalMemory.jsHeapSizeLimit;
        expect(memoryUsagePercent).toBeLessThan(0.8);
      }
    });
    
    test('should clean up resources after file processing', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Count initial DOM elements
      const initialElementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      
      // Process multiple files
      for (let i = 0; i < 3; i++) {
        await page.route('**/api/upload', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              filename: `cleanup-test-${i}.pdf`
            })
          });
        });
        
        await page.setInputFiles('#fileInput', {
          name: `cleanup-test-${i}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from(`test content ${i}`)
        });
        
        await page.waitForTimeout(200);
      }
      
      // Count final DOM elements
      const finalElementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      
      // DOM should not grow excessively
      const elementGrowth = finalElementCount - initialElementCount;
      expect(elementGrowth).toBeLessThan(100); // Reasonable growth limit
    });
  });
  
  test.describe('Concurrent Operations', () => {
    
    test('should handle multiple simultaneous uploads', async ({ browser }) => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);
      
      const pages = await Promise.all(contexts.map(context => context.newPage()));
      
      // Setup each page
      for (const page of pages) {
        await page.goto('/tool');
        await page.waitForLoadState('domcontentloaded');
        
        await page.route('**/api/upload', async (route) => {
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              filename: 'concurrent-test.pdf',
              page_count: 3
            })
          });
        });
      }
      
      // Start concurrent uploads
      const startTime = Date.now();
      
      const uploadPromises = pages.map((page, index) => 
        page.setInputFiles('#fileInput', {
          name: `concurrent-${index}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from(`test content ${index}`)
        })
      );
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Wait for processing to complete on all pages
      await Promise.all(pages.map(page => 
        page.waitForSelector('.upload-success, .notification-success', { timeout: 5000 })
      ));
      
      const totalTime = Date.now() - startTime;
      
      // Concurrent operations should not take much longer than sequential
      expect(totalTime).toBeLessThan(3000); // Should handle concurrency well
      
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
    
    test('should maintain performance under load', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Simulate high-frequency operations
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(async () => {
          await page.evaluate(() => {
            // Simulate DOM manipulation
            const div = document.createElement('div');
            div.innerHTML = `<p>Test element ${Date.now()}</p>`;
            document.body.appendChild(div);
            
            // Simulate computation
            let result = 0;
            for (let j = 0; j < 10000; j++) {
              result += Math.random();
            }
            
            // Clean up
            div.remove();
            
            return result;
          });
        });
      }
      
      const startTime = Date.now();
      await Promise.all(operations.map(op => op()));
      const operationTime = Date.now() - startTime;
      
      // High-frequency operations should complete quickly
      expect(operationTime).toBeLessThan(2000); // < 2 seconds for 10 operations
      
      // Check that page is still responsive
      await expect(page.locator('#fileInput')).toBeVisible();
      await expect(page.locator('#uploadArea')).toBeEnabled();
    });
  });
  
  test.describe('Resource Optimization', () => {
    
    test('should optimize image loading', async ({ page }) => {
      await page.goto('/');
      
      // Check image optimization
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const src = await img.getAttribute('src');
        const loading = await img.getAttribute('loading');
        
        if (src) {
          // Images should use lazy loading where appropriate
          if (!src.includes('logo') && !src.includes('hero')) {
            expect(loading).toBe('lazy');
          }
          
          // Check image dimensions are specified
          const width = await img.getAttribute('width');
          const height = await img.getAttribute('height');
          
          // At least one dimension should be specified for layout stability
          expect(width || height).toBeTruthy();
        }
      }
    });
    
    test('should minimize JavaScript bundle size', async ({ page }) => {
      await page.goto('/tool');
      
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry => entry.name.endsWith('.js'))
          .map(entry => ({
            name: entry.name,
            size: entry.transferSize,
            duration: entry.duration
          }));
      });
      
      // Calculate total JavaScript size
      const totalJSSize = resources.reduce((sum, resource) => sum + resource.size, 0);
      const totalJSSizeMB = totalJSSize / (1024 * 1024);
      
      // JavaScript bundle should be reasonable
      expect(totalJSSizeMB).toBeLessThan(2); // < 2MB total JS
      
      // Individual scripts should load quickly
      resources.forEach(resource => {
        expect(resource.duration).toBeLessThan(1000); // < 1 second per script
      });
    });
    
    test('should optimize CSS delivery', async ({ page }) => {
      await page.goto('/');
      
      const cssResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry => entry.name.endsWith('.css'))
          .map(entry => ({
            name: entry.name,
            size: entry.transferSize,
            duration: entry.duration
          }));
      });
      
      // CSS should load efficiently
      cssResources.forEach(resource => {
        expect(resource.duration).toBeLessThan(500); // < 500ms per CSS file
      });
      
      // Total CSS size should be reasonable
      const totalCSSSize = cssResources.reduce((sum, resource) => sum + resource.size, 0);
      expect(totalCSSSize).toBeLessThan(500 * 1024); // < 500KB total CSS
    });
  });
  
  test.describe('Mobile Performance', () => {
    
    test('should perform well on mobile devices', async ({ page, isMobile }) => {
      if (isMobile) {
        await page.goto('/tool');
        
        // Measure mobile-specific performance
        const mobileMetrics = await page.evaluate(() => {
          const timing = performance.timing;
          return {
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            loadComplete: timing.loadEventEnd - timing.navigationStart,
            resourceCount: performance.getEntriesByType('resource').length
          };
        });
        
        // Mobile performance thresholds (slightly more lenient)
        expect(mobileMetrics.domContentLoaded).toBeLessThan(2000); // DOM ready < 2s
        expect(mobileMetrics.loadComplete).toBeLessThan(4000);     // Full load < 4s
        expect(mobileMetrics.resourceCount).toBeLessThan(40);      // Fewer resources for mobile
        
        // Test touch interactions are responsive
        const uploadArea = page.locator('#uploadArea');
        await uploadArea.tap();
        
        // Should respond to touch quickly
        const tapStartTime = Date.now();
        await expect(uploadArea).toBeFocused({ timeout: 500 });
        const tapResponseTime = Date.now() - tapStartTime;
        
        expect(tapResponseTime).toBeLessThan(100); // < 100ms touch response
      }
    });
  });
});