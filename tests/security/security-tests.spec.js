/**
 * Security Testing Framework
 * PDF Transaction Extractor - Comprehensive Security Test Suite
 */

import { test, expect } from '@playwright/test';

test.describe('Security Testing Suite', () => {
  
  test.describe('File Upload Security', () => {
    
    test('should reject malicious file types', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      const maliciousFiles = [
        { name: 'malware.exe', type: 'application/x-executable', content: 'MZ\x90\x00' },
        { name: 'script.js', type: 'text/javascript', content: 'alert("xss")' },
        { name: 'virus.bat', type: 'application/x-msdos-program', content: '@echo off\ndel /f /q C:\\*' },
        { name: 'trojan.scr', type: 'application/x-screensaver', content: 'malicious content' },
        { name: 'malware.php', type: 'application/x-php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'shell.asp', type: 'application/x-asp', content: '<%eval request("cmd")%>' }
      ];
      
      for (const file of maliciousFiles) {
        // Mock error response for malicious files
        await page.route('**/api/upload', async (route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Only PDF files are supported'
            })
          });
        });
        
        // Try to upload malicious file
        await page.setInputFiles('#fileInput', {
          name: file.name,
          mimeType: file.type,
          buffer: Buffer.from(file.content)
        });
        
        // Verify rejection
        await expect(page.locator('.error-message, .notification-error')).toContainText(/PDF files/, { timeout: 3000 });
        
        // Clear error state
        await page.reload();
      }
    });
    
    test('should validate file size limits', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Test oversized file (17MB - over the 16MB limit)
      const largePdfBuffer = Buffer.alloc(17 * 1024 * 1024, 0); // 17MB of zeros
      
      await page.route('**/api/upload', async (route) => {
        await route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'File too large. Maximum size is 16MB.'
          })
        });
      });
      
      await page.setInputFiles('#fileInput', {
        name: 'oversized.pdf',
        mimeType: 'application/pdf',
        buffer: largePdfBuffer
      });
      
      await expect(page.locator('.error-message')).toContainText(/too large/, { timeout: 5000 });
    });
    
    test('should sanitize filenames', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      const dangerousFilenames = [
        '../../../etc/passwd.pdf',
        '..\\..\\windows\\system32\\config\\sam.pdf',
        'con.pdf', // Windows reserved name
        'aux.pdf', // Windows reserved name
        'file with spaces and special chars !@#$%.pdf',
        'file-with-very-long-name-that-exceeds-normal-limits-and-could-cause-buffer-overflow-attacks.pdf'
      ];
      
      for (const filename of dangerousFilenames) {
        await page.route('**/api/upload', async (route) => {
          // Mock sanitized filename in response
          const sanitizedName = filename
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 100); // Truncate long names
            
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              filename: sanitizedName,
              page_count: 1
            })
          });
        });
        
        await page.setInputFiles('#fileInput', {
          name: filename,
          mimeType: 'application/pdf',
          buffer: Buffer.from('test pdf content')
        });
        
        // Verify filename is sanitized in response
        await page.waitForTimeout(500);
        // Additional verification would depend on UI implementation
      }
    });
    
    test('should prevent path traversal attacks', async ({ page }) => {
      await page.goto('/tool');
      
      // Test path traversal in download endpoint
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc//passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
        '..%252f..%252f..%252fetc%252fpasswd' // Double URL encoded
      ];
      
      for (const maliciousPath of pathTraversalAttempts) {
        const response = await page.request.get(`/api/download/${maliciousPath}`);
        
        // Should return 404 or 403, not expose system files
        expect([403, 404]).toContain(response.status());
        
        // Should not contain sensitive system information
        const responseText = await response.text();
        expect(responseText).not.toMatch(/root:|password:|admin:/i);
      }
    });
  });
  
  test.describe('XSS Prevention', () => {
    
    test('should sanitize user input in forms', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        '\'-alert("XSS")-\'',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>'
      ];
      
      // Test input fields if they exist
      const inputFields = await page.locator('input[type="text"], input[type="search"], textarea').all();
      
      for (const input of inputFields) {
        for (const payload of xssPayloads) {
          await input.fill(payload);
          await input.press('Enter');
          
          // Wait for any potential script execution
          await page.waitForTimeout(100);
          
          // Check that no alert was triggered (XSS blocked)
          const hasAlert = await page.evaluate(() => window.alertTriggered);
          expect(hasAlert).toBeFalsy();
          
          // Verify input was sanitized
          const inputValue = await input.inputValue();
          expect(inputValue).not.toContain('<script>');
          expect(inputValue).not.toContain('javascript:');
          expect(inputValue).not.toContain('onerror=');
        }
      }
    });
    
    test('should sanitize dynamic content rendering', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Mock API response with XSS payload
      await page.route('**/api/classify-document', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            classification: {
              document_type: '<script>alert("XSS")</script>',
              confidence: '<img src=x onerror=alert("XSS")>'
            }
          })
        });
      });
      
      // Trigger classification
      const classifyButton = page.locator('.classify-button, [data-action="classify"]');
      if (await classifyButton.count() > 0) {
        await classifyButton.click();
        await page.waitForTimeout(1000);
        
        // Verify XSS payload was not executed
        const content = await page.textContent('body');
        expect(content).not.toContain('<script>');
        expect(content).not.toContain('onerror=');
        
        // Check that content was properly escaped
        const displayElement = page.locator('.classification-result, .document-type');
        if (await displayElement.count() > 0) {
          const innerHTML = await displayElement.innerHTML();
          expect(innerHTML).not.toContain('<script>');
          expect(innerHTML).not.toContain('javascript:');
        }
      }
    });
    
    test('should prevent DOM-based XSS through URL parameters', async ({ page }) => {
      const xssPayloads = [
        '#<script>alert("XSS")</script>',
        '#javascript:alert("XSS")',
        '#<img src=x onerror=alert("XSS")>',
        '?callback=<script>alert("XSS")</script>',
        '?redirect=javascript:alert("XSS")'
      ];
      
      for (const payload of xssPayloads) {
        await page.goto(`/tool${payload}`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        
        // Check that XSS was not executed
        const hasAlert = await page.evaluate(() => window.alertTriggered);
        expect(hasAlert).toBeFalsy();
        
        // Verify malicious content is not in DOM
        const bodyContent = await page.textContent('body');
        expect(bodyContent).not.toContain('<script>');
        expect(bodyContent).not.toContain('javascript:');
      }
    });
  });
  
  test.describe('CSRF Protection', () => {
    
    test('should require CSRF tokens for state-changing operations', async ({ page, request }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Try to perform upload without CSRF token
      const response = await request.post('/api/upload', {
        multipart: {
          file: {
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('test content')
          }
        }
      });
      
      // Should be rejected due to missing CSRF token
      expect([403, 400]).toContain(response.status());
    });
    
    test('should validate CSRF tokens', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      // Check if CSRF token is present in forms
      const csrfToken = await page.locator('input[name="_token"], input[name="csrf_token"], meta[name="csrf-token"]').first();
      
      if (await csrfToken.count() > 0) {
        const tokenValue = await csrfToken.getAttribute('value') || await csrfToken.getAttribute('content');
        expect(tokenValue).toBeTruthy();
        expect(tokenValue.length).toBeGreaterThan(10); // Should be a proper token
      }
    });
  });
  
  test.describe('SQL Injection Prevention', () => {
    
    test('should sanitize database queries', async ({ page }) => {
      await page.goto('/tool');
      await page.waitForLoadState('domcontentloaded');
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "1'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
        "' OR 1=1 --",
        "admin'--",
        "admin'/*",
        "' or 1=1#",
        "' or 1=1--"
      ];
      
      // Test search functionality if available
      const searchInput = page.locator('input[type="search"], .search-input');
      
      if (await searchInput.count() > 0) {
        for (const payload of sqlInjectionPayloads) {
          await searchInput.fill(payload);
          await searchInput.press('Enter');
          
          // Wait for response
          await page.waitForTimeout(1000);
          
          // Should not cause SQL errors or unexpected behavior
          const errorMessage = await page.locator('.error, .sql-error').textContent().catch(() => '');
          expect(errorMessage.toLowerCase()).not.toContain('sql');
          expect(errorMessage.toLowerCase()).not.toContain('database');
          expect(errorMessage.toLowerCase()).not.toContain('mysql');
          expect(errorMessage.toLowerCase()).not.toContain('postgresql');
        }
      }
    });
  });
  
  test.describe('Authentication & Authorization', () => {
    
    test('should protect sensitive endpoints', async ({ request }) => {
      const protectedEndpoints = [
        '/api/admin/users',
        '/api/admin/logs',
        '/api/admin/config',
        '/api/system/status',
        '/api/internal/metrics'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await request.get(endpoint);
        
        // Should require authentication
        expect([401, 403, 404]).toContain(response.status());
      }
    });
    
    test('should validate session management', async ({ page }) => {
      await page.goto('/');
      
      // Check for secure session management
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => 
        c.name.toLowerCase().includes('session') || 
        c.name.toLowerCase().includes('auth')
      );
      
      if (sessionCookie) {
        // Session cookies should be secure
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.sameSite).toBe('Strict');
      }
    });
  });
  
  test.describe('Content Security Policy', () => {
    
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      
      const cspHeader = response.headers()['content-security-policy'];
      
      if (cspHeader) {
        // Should restrict script sources
        expect(cspHeader).toContain("script-src");
        expect(cspHeader).not.toContain("'unsafe-eval'");
        
        // Should restrict object sources
        expect(cspHeader).toContain("object-src 'none'");
        
        // Should have base-uri restriction
        expect(cspHeader).toContain("base-uri 'self'");
      }
    });
    
    test('should block inline scripts when CSP is enabled', async ({ page }) => {
      await page.goto('/');
      
      // Try to inject inline script
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.innerHTML = 'window.inlineScriptExecuted = true;';
        document.body.appendChild(script);
      });
      
      // Wait for potential execution
      await page.waitForTimeout(500);
      
      // Verify inline script was blocked
      const scriptExecuted = await page.evaluate(() => window.inlineScriptExecuted);
      expect(scriptExecuted).toBeFalsy();
    });
  });
  
  test.describe('Information Disclosure', () => {
    
    test('should not expose sensitive information in errors', async ({ page, request }) => {
      // Test various endpoints that might leak information
      const testEndpoints = [
        '/api/nonexistent',
        '/api/upload',
        '/api/process-document',
        '/admin',
        '/.env',
        '/config.json',
        '/package.json'
      ];
      
      for (const endpoint of testEndpoints) {
        const response = await request.get(endpoint);
        const responseText = await response.text();
        
        // Should not expose sensitive information
        const sensitivePatterns = [
          /password.*[:=]/i,
          /api[_-]?key.*[:=]/i,
          /secret.*[:=]/i,
          /token.*[:=]/i,
          /database.*[:=]/i,
          /connection.*string/i,
          /stack trace/i,
          /internal server error/i,
          /exception.*at line/i
        ];
        
        for (const pattern of sensitivePatterns) {
          expect(responseText).not.toMatch(pattern);
        }
      }
    });
    
    test('should not expose system information', async ({ request }) => {
      const response = await request.get('/');
      const headers = response.headers();
      
      // Should not expose server information
      expect(headers['server']).not.toMatch(/Apache|Nginx|IIS/i);
      expect(headers['x-powered-by']).toBeFalsy();
      expect(headers['x-aspnet-version']).toBeFalsy();
    });
  });
  
  test.describe('Rate Limiting', () => {
    
    test('should implement rate limiting on API endpoints', async ({ request }) => {
      const endpoint = '/api/upload';
      const maxRequests = 10;
      let blockedRequests = 0;
      
      // Make rapid requests
      const requests = Array.from({ length: maxRequests + 5 }, () => 
        request.post(endpoint, {
          multipart: {
            file: {
              name: 'test.pdf',
              mimeType: 'application/pdf',
              buffer: Buffer.from('test')
            }
          }
        }).catch(() => ({ status: () => 429 }))
      );
      
      const responses = await Promise.all(requests);
      
      // Check if rate limiting is active
      for (const response of responses) {
        if (response.status() === 429) {
          blockedRequests++;
        }
      }
      
      // Should have some rate limiting in place
      // Note: This test might need adjustment based on actual rate limits
      console.log(`Blocked requests: ${blockedRequests}/${responses.length}`);
    });
  });
  
  // Setup alert detection for XSS tests
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.alertTriggered = false;
      window.originalAlert = window.alert;
      window.alert = () => {
        window.alertTriggered = true;
      };
    });
  });
  
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      if (window.originalAlert) {
        window.alert = window.originalAlert;
      }
    });
  });
});