import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './visual',
  timeout: 30 * 1000,
  expect: {
    // Visual comparison threshold
    threshold: 0.2,
    // Animation handling
    toHaveScreenshot: {
      // Disable animations for consistent screenshots
      animations: 'disabled',
      // Wait for fonts to load
      fonts: 'ready',
      // Set consistent viewport
      fullPage: false,
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/visual' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Consistent browser settings for visual tests
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Disable web security for local testing
    launchOptions: {
      args: ['--disable-web-security'],
    },
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    // High DPI testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});