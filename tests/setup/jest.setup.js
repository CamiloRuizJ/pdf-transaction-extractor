/**
 * Jest Test Setup Configuration
 * PDF Transaction Extractor - Test Suite Setup
 */

// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOMTestUtils'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('ComponentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock DOM APIs that aren't available in jsdom
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock file API for file upload tests
global.File = class MockFile extends Blob {
  constructor(fileBits, fileName, options) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = Date.now();
  }
};

// Mock FileReader
global.FileReader = class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:application/pdf;base64,mock-pdf-data';
      this.onload && this.onload();
    }, 100);
  }
  
  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(1024);
      this.onload && this.onload();
    }, 100);
  }
};

// Mock Canvas API for PDF rendering tests
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  translate: jest.fn(),
  clip: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  arc: jest.fn(),
  rect: jest.fn(),
  quadraticCurveTo: jest.fn(),
  bezierCurveTo: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch API
global.fetch = jest.fn();

// Mock performance API
global.performance = {
  ...global.performance,
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock notification API
global.Notification = {
  permission: 'granted',
  requestPermission: jest.fn(() => Promise.resolve('granted')),
};

// Set up global test constants
global.TEST_CONSTANTS = {
  SAMPLE_PDF_FILE: new File(['pdf content'], 'test.pdf', { type: 'application/pdf' }),
  SAMPLE_PDF_SIZE: 1024 * 1024, // 1MB
  SAMPLE_EXTRACTED_DATA: {
    'Unit Number': ['101', '102', '103'],
    'Tenant Name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
    'Monthly Rent': ['$1,200', '$1,400', '$1,100'],
  },
  SAMPLE_CLASSIFICATION: {
    document_type: 'rent_roll',
    confidence: 0.95,
    regions_suggested: 5,
  },
  API_ENDPOINTS: {
    UPLOAD: '/api/upload',
    CLASSIFY: '/api/classify-document',
    EXTRACT: '/api/extract-data',
    VALIDATE: '/api/validate-data',
    EXPORT: '/api/export-excel',
  },
};

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          if (callback()) {
            clearInterval(interval);
            resolve();
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }, timeout);
    });
  },
  
  // Create mock event
  createMockEvent: (type, properties = {}) => {
    const event = new Event(type);
    Object.assign(event, properties);
    return event;
  },
  
  // Create mock drag event
  createMockDragEvent: (type, files = []) => {
    const event = new Event(type);
    event.dataTransfer = {
      files,
      types: files.length > 0 ? ['Files'] : [],
      effectAllowed: 'all',
      dropEffect: 'copy',
    };
    return event;
  },
};

console.log('✅ Jest setup completed successfully');