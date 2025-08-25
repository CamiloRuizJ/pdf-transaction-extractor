/**
 * Playwright Global Setup
 * PDF Transaction Extractor - Global test setup and teardown
 */

import { chromium, firefox, webkit } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

let appServer;
let browsers = {};

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Create test directories
  const testDirectories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'uploads/test'
  ];
  
  for (const dir of testDirectories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Start the application server
  console.log('🌐 Starting application server...');
  await startApplicationServer();
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await waitForServer('http://localhost:5000/health', 30000);
  
  // Pre-launch browsers for faster test execution
  console.log('🌏 Pre-launching browsers...');
  await preLaunchBrowsers();
  
  // Setup test data
  console.log('📊 Setting up test data...');
  await setupTestData();
  
  // Verify application health
  console.log('🏥 Verifying application health...');
  await verifyApplicationHealth();
  
  console.log('✅ Global setup completed successfully');
}

async function startApplicationServer() {
  return new Promise((resolve, reject) => {
    appServer = spawn('python', ['app.py'], {
      env: {
        ...process.env,
        FLASK_ENV: 'testing',
        PORT: '5000',
        TESTING: 'true'
      },
      stdio: 'pipe'
    });
    
    appServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[App] ${output}`);
      
      if (output.includes('Running on') || output.includes('Serving Flask app')) {
        setTimeout(resolve, 2000); // Give it a moment to fully start
      }
    });
    
    appServer.stderr.on('data', (data) => {
      console.error(`[App Error] ${data}`);
    });
    
    appServer.on('error', (error) => {
      console.error('Failed to start application server:', error);
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Application server failed to start within 30 seconds'));
    }, 30000);
  });
}

async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Server is ready at ${url}`);
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} failed to respond within ${timeout}ms`);
}

async function preLaunchBrowsers() {
  try {
    // Launch browsers in parallel for faster setup
    const browserPromises = [
      chromium.launch({ headless: true }),
      firefox.launch({ headless: true }),
      webkit.launch({ headless: true })
    ];
    
    const [chromiumBrowser, firefoxBrowser, webkitBrowser] = await Promise.all(browserPromises);
    
    browsers = {
      chromium: chromiumBrowser,
      firefox: firefoxBrowser,
      webkit: webkitBrowser
    };
    
    console.log('✅ All browsers pre-launched successfully');
  } catch (error) {
    console.warn('⚠️ Failed to pre-launch some browsers:', error.message);
    // Continue with setup even if browser pre-launch fails
  }
}

async function setupTestData() {
  // Create sample test files
  const testFilesDir = path.join(process.cwd(), 'tests', 'fixtures');
  
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
  }
  
  // Create sample PDF files for testing
  const samplePdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Sample Test Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
398
%%EOF`;

  const testFiles = [
    { name: 'sample-rent-roll.pdf', content: samplePdfContent },
    { name: 'sample-offering-memo.pdf', content: samplePdfContent },
    { name: 'sample-lease-agreement.pdf', content: samplePdfContent },
    { name: 'sample-comparable-sales.pdf', content: samplePdfContent }
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(testFilesDir, file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
    }
  }
  
  console.log('✅ Test data setup completed');
}

async function verifyApplicationHealth() {
  try {
    // Check main health endpoint
    const healthResponse = await fetch('http://localhost:5000/health');
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    if (healthData.status !== 'healthy') {
      throw new Error(`Application is not healthy: ${JSON.stringify(healthData)}`);
    }
    
    // Check if main pages load
    const mainPageResponse = await fetch('http://localhost:5000/');
    if (!mainPageResponse.ok) {
      throw new Error(`Main page failed to load: ${mainPageResponse.status}`);
    }
    
    const toolPageResponse = await fetch('http://localhost:5000/tool');
    if (!toolPageResponse.ok) {
      throw new Error(`Tool page failed to load: ${toolPageResponse.status}`);
    }
    
    console.log('✅ Application health verification passed');
  } catch (error) {
    console.error('❌ Application health verification failed:', error.message);
    throw error;
  }
}

// Global teardown function
async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // Close pre-launched browsers
  console.log('🌏 Closing pre-launched browsers...');
  for (const [name, browser] of Object.entries(browsers)) {
    try {
      await browser.close();
      console.log(`✅ Closed ${name} browser`);
    } catch (error) {
      console.warn(`⚠️ Failed to close ${name} browser:`, error.message);
    }
  }
  
  // Stop application server
  if (appServer) {
    console.log('🛑 Stopping application server...');
    appServer.kill('SIGTERM');
    
    // Give it a moment to shut down gracefully
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!appServer.killed) {
      console.log('🔨 Force killing application server...');
      appServer.kill('SIGKILL');
    }
    
    console.log('✅ Application server stopped');
  }
  
  // Clean up temporary test files (optional)
  console.log('🧹 Cleaning up temporary files...');
  try {
    const tempFiles = ['test.db', 'test.log'];
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean up some temporary files:', error.message);
  }
  
  console.log('✅ Global teardown completed');
}

export { globalSetup, globalTeardown };