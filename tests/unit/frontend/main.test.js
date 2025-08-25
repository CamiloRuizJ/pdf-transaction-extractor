/**
 * Unit Tests for Main JavaScript Module
 * PDF Transaction Extractor - Frontend Core Functionality
 */

import { JSDOM } from 'jsdom';

// Mock the main.js file content
const mainJsContent = `
// Simulate main.js content for testing
const AppState = {
  aiEnabled: false,
  aiModel: null,
  aiFeatures: {
    smartDetection: false,
    dataValidation: false,
    qualityScoring: false
  },
  loading: false,
  currentView: 'home',
  mobileMenuOpen: false,
  securityEnabled: true,
  rateLimitInfo: null,
  lastActivity: Date.now(),
  sessionStart: Date.now()
};

function showLoadingScreen(message = 'Loading...') {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingText = loadingScreen?.querySelector('.loading-text');
  
  if (loadingScreen && loadingText) {
    loadingText.textContent = message;
    loadingScreen.classList.add('active');
    AppState.loading = true;
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  
  if (loadingScreen) {
    loadingScreen.classList.remove('active');
    AppState.loading = false;
  }
}

function updateAIStatus(enabled, model = null, features = {}) {
  AppState.aiEnabled = enabled;
  AppState.aiModel = model;
  AppState.aiFeatures = features;
  
  const statusElements = document.querySelectorAll('[data-ai-status]');
  statusElements.forEach(element => {
    if (enabled) {
      element.classList.add('ai-active');
      element.classList.remove('ai-inactive');
    } else {
      element.classList.add('ai-inactive');
      element.classList.remove('ai-active');
    }
  });
}

function showNotification(message, type = 'info', duration = 5000) {
  const notification = document.createElement('div');
  notification.className = \`notification notification-\${type}\`;
  notification.innerHTML = \`
    <div class="notification-content">
      <span class="notification-text">\${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  \`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for testing
window.CREApp = {
  AppState,
  showLoadingScreen,
  hideLoadingScreen,
  updateAIStatus,
  showNotification,
  formatFileSize,
  debounce
};
`;

// Set up DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
  <body>
    <div id="loading-screen" class="loading-screen">
      <div class="loading-text">Loading...</div>
    </div>
    <div data-ai-status class="ai-status"></div>
    <div data-ai-status class="ai-status-2"></div>
  </body>
</html>
`, { 
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Execute the main.js content
eval(mainJsContent);

describe('Main JavaScript Module', () => {
  beforeEach(() => {
    // Reset DOM state
    document.body.innerHTML = `
      <div id="loading-screen" class="loading-screen">
        <div class="loading-text">Loading...</div>
      </div>
      <div data-ai-status class="ai-status"></div>
      <div data-ai-status class="ai-status-2"></div>
    `;
    
    // Reset AppState
    window.CREApp.AppState.loading = false;
    window.CREApp.AppState.aiEnabled = false;
    window.CREApp.AppState.aiModel = null;
    window.CREApp.AppState.aiFeatures = {
      smartDetection: false,
      dataValidation: false,
      qualityScoring: false
    };
    
    // Clear any existing notifications
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(n => n.remove());
  });

  describe('AppState Management', () => {
    test('should initialize with correct default values', () => {
      expect(window.CREApp.AppState.aiEnabled).toBe(false);
      expect(window.CREApp.AppState.loading).toBe(false);
      expect(window.CREApp.AppState.currentView).toBe('home');
      expect(window.CREApp.AppState.mobileMenuOpen).toBe(false);
      expect(window.CREApp.AppState.securityEnabled).toBe(true);
    });
  });

  describe('Loading Screen Management', () => {
    test('showLoadingScreen should display loading screen with custom message', () => {
      const customMessage = 'Processing PDF...';
      
      window.CREApp.showLoadingScreen(customMessage);
      
      const loadingScreen = document.getElementById('loading-screen');
      const loadingText = loadingScreen.querySelector('.loading-text');
      
      expect(loadingScreen.classList.contains('active')).toBe(true);
      expect(loadingText.textContent).toBe(customMessage);
      expect(window.CREApp.AppState.loading).toBe(true);
    });

    test('showLoadingScreen should use default message when none provided', () => {
      window.CREApp.showLoadingScreen();
      
      const loadingText = document.querySelector('.loading-text');
      expect(loadingText.textContent).toBe('Loading...');
    });

    test('hideLoadingScreen should hide loading screen', () => {
      // First show it
      window.CREApp.showLoadingScreen();
      expect(window.CREApp.AppState.loading).toBe(true);
      
      // Then hide it
      window.CREApp.hideLoadingScreen();
      
      const loadingScreen = document.getElementById('loading-screen');
      expect(loadingScreen.classList.contains('active')).toBe(false);
      expect(window.CREApp.AppState.loading).toBe(false);
    });

    test('should handle missing loading screen elements gracefully', () => {
      // Remove loading screen from DOM
      document.getElementById('loading-screen').remove();
      
      // Should not throw error
      expect(() => {
        window.CREApp.showLoadingScreen('Test');
        window.CREApp.hideLoadingScreen();
      }).not.toThrow();
    });
  });

  describe('AI Status Management', () => {
    test('updateAIStatus should enable AI and update UI elements', () => {
      const model = 'gpt-4';
      const features = {
        smartDetection: true,
        dataValidation: true,
        qualityScoring: false
      };
      
      window.CREApp.updateAIStatus(true, model, features);
      
      expect(window.CREApp.AppState.aiEnabled).toBe(true);
      expect(window.CREApp.AppState.aiModel).toBe(model);
      expect(window.CREApp.AppState.aiFeatures).toEqual(features);
      
      // Check UI elements
      const statusElements = document.querySelectorAll('[data-ai-status]');
      statusElements.forEach(element => {
        expect(element.classList.contains('ai-active')).toBe(true);
        expect(element.classList.contains('ai-inactive')).toBe(false);
      });
    });

    test('updateAIStatus should disable AI and update UI elements', () => {
      // First enable AI
      window.CREApp.updateAIStatus(true, 'gpt-4', {});
      
      // Then disable AI
      window.CREApp.updateAIStatus(false);
      
      expect(window.CREApp.AppState.aiEnabled).toBe(false);
      expect(window.CREApp.AppState.aiModel).toBe(null);
      
      // Check UI elements
      const statusElements = document.querySelectorAll('[data-ai-status]');
      statusElements.forEach(element => {
        expect(element.classList.contains('ai-active')).toBe(false);
        expect(element.classList.contains('ai-inactive')).toBe(true);
      });
    });

    test('should handle missing AI status elements gracefully', () => {
      // Remove all AI status elements
      const statusElements = document.querySelectorAll('[data-ai-status]');
      statusElements.forEach(element => element.remove());
      
      // Should not throw error
      expect(() => {
        window.CREApp.updateAIStatus(true, 'gpt-4', {});
      }).not.toThrow();
    });
  });

  describe('Notification System', () => {
    test('showNotification should create notification with correct styling', () => {
      const message = 'Test notification';
      const type = 'success';
      
      window.CREApp.showNotification(message, type, 1000);
      
      const notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();
      expect(notification.classList.contains(`notification-${type}`)).toBe(true);
      
      const text = notification.querySelector('.notification-text');
      expect(text.textContent).toBe(message);
    });

    test('showNotification should use default type when none provided', () => {
      const message = 'Default notification';
      
      window.CREApp.showNotification(message);
      
      const notification = document.querySelector('.notification');
      expect(notification.classList.contains('notification-info')).toBe(true);
    });

    test('showNotification should auto-remove after duration', (done) => {
      const message = 'Auto-remove test';
      const duration = 100; // Short duration for testing
      
      window.CREApp.showNotification(message, 'info', duration);
      
      // Should exist immediately
      expect(document.querySelector('.notification')).toBeTruthy();
      
      // Should be removed after duration
      setTimeout(() => {
        expect(document.querySelector('.notification')).toBeFalsy();
        done();
      }, duration + 50);
    });

    test('notification close button should remove notification', () => {
      window.CREApp.showNotification('Closeable notification');
      
      const notification = document.querySelector('.notification');
      const closeButton = notification.querySelector('.notification-close');
      
      expect(notification).toBeTruthy();
      
      // Click close button
      closeButton.click();
      
      expect(document.querySelector('.notification')).toBeFalsy();
    });
  });

  describe('Utility Functions', () => {
    describe('formatFileSize', () => {
      test('should format bytes correctly', () => {
        expect(window.CREApp.formatFileSize(0)).toBe('0 Bytes');
        expect(window.CREApp.formatFileSize(1024)).toBe('1 KB');
        expect(window.CREApp.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(window.CREApp.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      });

      test('should handle decimal values', () => {
        expect(window.CREApp.formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
        expect(window.CREApp.formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
      });

      test('should handle large file sizes', () => {
        const result = window.CREApp.formatFileSize(5 * 1024 * 1024 * 1024);
        expect(result).toBe('5 GB');
      });
    });

    describe('debounce', () => {
      jest.useFakeTimers();

      test('should delay function execution', () => {
        const mockFn = jest.fn();
        const debouncedFn = window.CREApp.debounce(mockFn, 100);
        
        debouncedFn('test');
        expect(mockFn).not.toHaveBeenCalled();
        
        jest.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledWith('test');
      });

      test('should cancel previous calls when called multiple times', () => {
        const mockFn = jest.fn();
        const debouncedFn = window.CREApp.debounce(mockFn, 100);
        
        debouncedFn('first');
        debouncedFn('second');
        debouncedFn('third');
        
        jest.advanceTimersByTime(100);
        
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('third');
      });

      afterEach(() => {
        jest.clearAllTimers();
      });
    });
  });
});