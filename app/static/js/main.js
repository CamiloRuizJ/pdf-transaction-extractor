/**
 * CRE PDF Extractor - Main JavaScript
 * Enhanced AI-Powered Commercial Real Estate Document Processing
 */

// ========================================
// Global Variables and State Management
// ========================================

const AppState = {
  // AI Configuration
  aiEnabled: false,
  aiModel: null,
  aiFeatures: {
    smartDetection: false,
    dataValidation: false,
    qualityScoring: false
  },
  
  // UI State
  loading: false,
  currentView: 'home',
  mobileMenuOpen: false,
  
  // Security
  securityEnabled: true,
  rateLimitInfo: null,
  
  // Performance
  lastActivity: Date.now(),
  sessionStart: Date.now()
};

// ========================================
// Core Initialization
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 CRE PDF Extractor - Enhanced Version Initializing...');
  
  initializeApp();
  setupEventListeners();
  checkAIStatus();
  initializeSecurity();
  setupPerformanceMonitoring();
  
  console.log('✅ CRE PDF Extractor initialized successfully');
});

/**
 * Initialize the main application
 */
function initializeApp() {
  // Hide loading screen
  hideLoadingScreen();
  
  // Initialize animations
  initializeAnimations();
  
  // Setup mobile menu
  setupMobileMenu();
  
  // Initialize AI features
  initializeAIFeatures();
  
  // Setup smooth scrolling
  setupSmoothScrolling();
  
  // Initialize tooltips and help
  initializeTooltips();
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
  }
  
  // Close mobile menu on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.site-nav') && AppState.mobileMenuOpen) {
      closeMobileMenu();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Window resize handling
  window.addEventListener('resize', debounce(handleWindowResize, 250));
  
  // Page visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Before unload warning
  window.addEventListener('beforeunload', handleBeforeUnload);
}

// ========================================
// Loading Screen Management
// ========================================

/**
 * Show loading screen with custom message
 */
function showLoadingScreen(message = 'Loading...') {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingText = loadingScreen?.querySelector('.loading-text');
  
  if (loadingScreen && loadingText) {
    loadingText.textContent = message;
    loadingScreen.classList.add('active');
    AppState.loading = true;
  }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  
  if (loadingScreen) {
    loadingScreen.classList.remove('active');
    AppState.loading = false;
  }
}

// ========================================
// AI Features Management
// ========================================

/**
 * Check AI status and update UI
 */
async function checkAIStatus() {
  try {
    showLoadingScreen('Checking AI status...');
    
    const response = await fetch('/api/ai/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateAIStatus(data.enabled, data.model, data.features);
    } else {
      updateAIStatus(false);
    }
  } catch (error) {
    console.warn('AI status check failed:', error);
    updateAIStatus(false);
  } finally {
    hideLoadingScreen();
  }
}

/**
 * Update AI status in UI
 */
function updateAIStatus(enabled, model = null, features = {}) {
  AppState.aiEnabled = enabled;
  AppState.aiModel = model;
  AppState.aiFeatures = features;
  
  // Update status indicators
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
  
  // Update AI badges
  const aiBadges = document.querySelectorAll('.ai-badge');
  aiBadges.forEach(badge => {
    if (enabled) {
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  });
  
  // Update feature toggles
  updateAIFeatureToggles(features);
  
  // Trigger custom event
  document.dispatchEvent(new CustomEvent('aiStatusChanged', {
    detail: { enabled, model, features }
  }));
}

/**
 * Update AI feature toggles
 */
function updateAIFeatureToggles(features) {
  Object.keys(features).forEach(feature => {
    const toggle = document.querySelector(`[data-ai-feature="${feature}"]`);
    if (toggle) {
      toggle.checked = features[feature];
      toggle.disabled = !AppState.aiEnabled;
    }
  });
}

/**
 * Initialize AI features
 */
function initializeAIFeatures() {
  // AI feature animations
  const aiElements = document.querySelectorAll('.ai-feature-card, .ai-badge, .ai-icon');
  aiElements.forEach(element => {
    element.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.05)';
    });
    
    element.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
    });
  });
  
  // AI processing indicators
  setupAIProcessingIndicators();
}

/**
 * Setup AI processing indicators
 */
function setupAIProcessingIndicators() {
  const processingElements = document.querySelectorAll('.ai-processing');
  
  processingElements.forEach(element => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('processing-active');
        } else {
          entry.target.classList.remove('processing-active');
        }
      });
    });
    
    observer.observe(element);
  });
}

// ========================================
// Security Management
// ========================================

/**
 * Initialize security features
 */
function initializeSecurity() {
  if (!AppState.securityEnabled) return;
  
  // Setup rate limiting monitoring
  setupRateLimitMonitoring();
  
  // Setup activity tracking
  setupActivityTracking();
  
  // Setup security headers validation
  validateSecurityHeaders();
  
  console.log('🔒 Security features initialized');
}

/**
 * Setup rate limiting monitoring
 */
function setupRateLimitMonitoring() {
  // Monitor API calls for rate limiting
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Check for rate limit headers
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      if (rateLimitRemaining !== null) {
        AppState.rateLimitInfo = {
          remaining: parseInt(rateLimitRemaining),
          reset: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : null
        };
        
        updateRateLimitUI();
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };
}

/**
 * Update rate limit UI
 */
function updateRateLimitUI() {
  if (!AppState.rateLimitInfo) return;
  
  const { remaining, reset } = AppState.rateLimitInfo;
  
  // Show warning if rate limit is low
  if (remaining < 10) {
    showRateLimitWarning(remaining, reset);
  }
}

/**
 * Show rate limit warning
 */
function showRateLimitWarning(remaining, reset) {
  const warning = document.createElement('div');
  warning.className = 'rate-limit-warning';
  warning.innerHTML = `
    <div class="warning-content">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">
        Rate limit warning: ${remaining} requests remaining
        ${reset ? `until ${reset.toLocaleTimeString()}` : ''}
      </span>
    </div>
  `;
  
  document.body.appendChild(warning);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    warning.remove();
  }, 5000);
}

/**
 * Setup activity tracking
 */
function setupActivityTracking() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  events.forEach(event => {
    document.addEventListener(event, () => {
      AppState.lastActivity = Date.now();
    }, { passive: true });
  });
  
  // Check for inactivity every minute
  setInterval(() => {
    const inactiveTime = Date.now() - AppState.lastActivity;
    if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
      handleInactivity();
    }
  }, 60000);
}

/**
 * Handle user inactivity
 */
function handleInactivity() {
  console.log('User inactive for 30 minutes');
  // Could implement session timeout or other inactivity handling
}

/**
 * Validate security headers
 */
function validateSecurityHeaders() {
  // Check for security headers in response
  fetch('/api/security/headers', { method: 'HEAD' })
    .then(response => {
      const headers = response.headers;
      const securityHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security'
      ];
      
      securityHeaders.forEach(header => {
        if (!headers.get(header)) {
          console.warn(`Missing security header: ${header}`);
        }
      });
    })
    .catch(error => {
      console.warn('Security headers check failed:', error);
    });
}

// ========================================
// Performance Monitoring
// ========================================

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
  // Monitor page load performance
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      console.log('📊 Page load performance:', {
        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart
      });
    });
  }
  
  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memory = performance.memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        console.warn('High memory usage detected');
      }
    }, 30000);
  }
}

// ========================================
// UI Management
// ========================================

/**
 * Initialize animations
 */
function initializeAnimations() {
  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  // Observe elements with animation classes
  const animatedElements = document.querySelectorAll('.fade-in, .slide-in, .scale-in');
  animatedElements.forEach(element => observer.observe(element));
}

/**
 * Setup mobile menu
 */
function setupMobileMenu() {
  const mobileMenu = document.querySelector('.nav-links');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  
  if (mobileMenu && mobileMenuToggle) {
    // Close menu on link click
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
  }
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.nav-links');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  
  if (mobileMenu && mobileMenuToggle) {
    if (AppState.mobileMenuOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
}

/**
 * Open mobile menu
 */
function openMobileMenu() {
  const mobileMenu = document.querySelector('.nav-links');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  
  if (mobileMenu && mobileMenuToggle) {
    mobileMenu.classList.add('mobile-open');
    mobileMenuToggle.classList.add('active');
    AppState.mobileMenuOpen = true;
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
  const mobileMenu = document.querySelector('.nav-links');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  
  if (mobileMenu && mobileMenuToggle) {
    mobileMenu.classList.remove('mobile-open');
    mobileMenuToggle.classList.remove('active');
    AppState.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }
}

/**
 * Setup smooth scrolling
 */
function setupSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * Initialize tooltips and help
 */
function initializeTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
  });
}

/**
 * Show tooltip
 */
function showTooltip(event) {
  const tooltipText = event.target.getAttribute('data-tooltip');
  if (!tooltipText) return;
  
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = tooltipText;
  
  document.body.appendChild(tooltip);
  
  const rect = event.target.getBoundingClientRect();
  tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
  tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
  
  event.target.tooltip = tooltip;
}

/**
 * Hide tooltip
 */
function hideTooltip(event) {
  if (event.target.tooltip) {
    event.target.tooltip.remove();
    event.target.tooltip = null;
  }
}

// ========================================
// Event Handlers
// ========================================

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + K: Focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    const searchInput = document.querySelector('input[type="search"]');
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  // Escape: Close modals and mobile menu
  if (event.key === 'Escape') {
    closeMobileMenu();
    closeAllModals();
  }
  
  // Ctrl/Cmd + /: Toggle help
  if ((event.ctrlKey || event.metaKey) && event.key === '/') {
    event.preventDefault();
    toggleHelp();
  }
}

/**
 * Handle window resize
 */
function handleWindowResize() {
  // Close mobile menu on resize to desktop
  if (window.innerWidth > 768 && AppState.mobileMenuOpen) {
    closeMobileMenu();
  }
  
  // Trigger resize event for components
  document.dispatchEvent(new CustomEvent('windowResize', {
    detail: { width: window.innerWidth, height: window.innerHeight }
  }));
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('Page hidden');
    // Could pause animations or reduce resource usage
  } else {
    console.log('Page visible');
    // Could resume animations or refresh data
  }
}

/**
 * Handle before unload
 */
function handleBeforeUnload(event) {
  // Warn user if they have unsaved changes
  if (AppState.hasUnsavedChanges) {
    event.preventDefault();
    event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return event.returnValue;
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Debounce function
 */
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

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Close all modals
 */
function closeAllModals() {
  const modals = document.querySelectorAll('.modal.show');
  modals.forEach(modal => {
    modal.classList.remove('show');
  });
}

/**
 * Toggle help panel
 */
function toggleHelp() {
  const helpPanel = document.getElementById('help-panel');
  if (helpPanel) {
    helpPanel.classList.toggle('show');
  }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = 5000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-text">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
}

/**
 * Get notification icon
 */
function getNotificationIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

// ========================================
// Export for use in other modules
// ========================================

window.CREApp = {
  AppState,
  showLoadingScreen,
  hideLoadingScreen,
  checkAIStatus,
  updateAIStatus,
  showNotification,
  formatFileSize,
  formatDate,
  debounce,
  throttle
};

console.log('🎯 CRE PDF Extractor - Main JavaScript loaded successfully');

/**
 * Setup enhanced upload functionality
 */
function setupEnhancedUpload() {
    console.log('Setting up enhanced upload...');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) {
        console.warn('Upload elements not found');
        return;
    }
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    console.log('Enhanced upload setup complete');
}

/**
 * Handle file upload
 */
async function handleFileUpload(file) {
    try {
        // Validate file
        if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Please select a valid PDF file', 'error');
            return;
        }
        
        // Check file size (16MB limit)
        if (file.size > 16 * 1024 * 1024) {
            showNotification('File too large. Maximum size is 16MB.', 'error');
            return;
        }
        
        // Show loading state
        showNotification('Uploading PDF...', 'info');
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload file
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`PDF uploaded successfully! ${data.page_count} pages detected.`, 'success');
            
            // Update UI
            updateFileInfo(data.filename, data.page_count);
            
            // Show PDF viewer
            showPDFViewer();
            
            // Load first page
            loadPage(0);
            
        } else {
            showNotification(data.error || 'Upload failed', 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed. Please try again.', 'error');
    }
}

/**
 * Update file information display
 */
function updateFileInfo(filename, pageCount) {
    const fileNameElement = document.getElementById('fileName');
    const pageCountElement = document.getElementById('pageCount');
    
    if (fileNameElement) {
        fileNameElement.textContent = filename;
    }
    
    if (pageCountElement) {
        pageCountElement.textContent = pageCount;
    }
}

/**
 * Show PDF viewer
 */
function showPDFViewer() {
    const uploadSection = document.getElementById('uploadSection');
    const pdfViewer = document.getElementById('pdfViewer');
    
    if (uploadSection && pdfViewer) {
        uploadSection.style.display = 'none';
        pdfViewer.style.display = 'block';
    }
}

/**
 * Load a specific page
 */
async function loadPage(pageNum) {
    try {
        const response = await fetch(`/render_page/${pageNum}`);
        const data = await response.json();
        
        if (data.success) {
            // Update current page display
            const currentPageElement = document.getElementById('currentPage');
            if (currentPageElement) {
                currentPageElement.textContent = pageNum + 1;
            }
            
            // Load image
            loadPDFImage(data.image_path, data.width, data.height);
            
        } else {
            showNotification('Failed to load page', 'error');
        }
        
    } catch (error) {
        console.error('Page load error:', error);
        showNotification('Failed to load page', 'error');
    }
}

/**
 * Load PDF image
 */
function loadPDFImage(imagePath, width, height) {
    const canvas = document.getElementById('pdfCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Enable region drawing
        enableRegionDrawing();
    };
    
    img.src = imagePath;
}

/**
 * Enable region drawing
 */
function enableRegionDrawing() {
    // This would be implemented in the region-management.js file
    console.log('Region drawing enabled');
}

// Export the function for global access
window.setupEnhancedUpload = setupEnhancedUpload;
