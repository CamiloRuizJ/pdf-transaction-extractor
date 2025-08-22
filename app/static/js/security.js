/**
 * Security Module
 * Handles security features and client-side validation
 */

// Security Configuration
const SECURITY_CONFIG = {
    enabled: true,
    validateInputs: true,
    sanitizeData: true,
    rateLimit: true
};

// Security State
let securityHeaders = {};
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

/**
 * Initialize security features
 */
function initializeSecurity() {
    console.log('Initializing security features...');
    
    // Set up security headers
    setupSecurityHeaders();
    
    // Set up input validation
    setupInputValidation();
    
    // Set up data sanitization
    setupDataSanitization();
    
    // Set up rate limiting
    setupRateLimiting();
    
    console.log('Security features initialized');
}

/**
 * Setup security headers
 */
async function setupSecurityHeaders() {
    try {
        const response = await fetch('/api/security/headers');
        if (response.ok) {
            securityHeaders = await response.json();
            console.log('Security headers loaded');
        }
    } catch (error) {
        console.log('Security headers not available');
    }
}

/**
 * Setup input validation
 */
function setupInputValidation() {
    if (!SECURITY_CONFIG.validateInputs) return;
    
    // Validate file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', validateFileInput);
    });
    
    // Validate text inputs
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', validateTextInput);
        input.addEventListener('blur', validateTextInput);
    });
}

/**
 * Setup data sanitization
 */
function setupDataSanitization() {
    if (!SECURITY_CONFIG.sanitizeData) return;
    
    // Override fetch to sanitize data
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        if (options.body && typeof options.body === 'string') {
            options.body = sanitizeData(options.body);
        }
        return originalFetch(url, options);
    };
}

/**
 * Setup rate limiting
 */
function setupRateLimiting() {
    if (!SECURITY_CONFIG.rateLimit) return;
    
    // Override fetch to add rate limiting
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        const now = Date.now();
        if (now - lastRequestTime < RATE_LIMIT_DELAY) {
            throw new Error('Rate limit exceeded. Please wait before making another request.');
        }
        lastRequestTime = now;
        return originalFetch(url, options);
    };
}

/**
 * Validate file input
 */
function validateFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!isValidFileType(file)) {
        showNotification('Invalid file type. Please upload a PDF file.', 'error');
        event.target.value = '';
        return false;
    }
    
    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
        showNotification('File too large. Maximum size is 16MB.', 'error');
        event.target.value = '';
        return false;
    }
    
    // Check for malicious content
    if (containsMaliciousContent(file)) {
        showNotification('File appears to contain malicious content.', 'error');
        event.target.value = '';
        return false;
    }
    
    return true;
}

/**
 * Validate text input
 */
function validateTextInput(event) {
    const input = event.target;
    const value = input.value;
    
    // Remove potentially dangerous characters
    const sanitized = sanitizeText(value);
    if (sanitized !== value) {
        input.value = sanitized;
    }
    
    // Check for XSS patterns
    if (containsXSSPatterns(value)) {
        showNotification('Input contains potentially dangerous content.', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Check if file type is valid
 */
function isValidFileType(file) {
    const allowedTypes = ['application/pdf'];
    return allowedTypes.includes(file.type);
}

/**
 * Check if file contains malicious content
 */
function containsMaliciousContent(file) {
    // Basic check for executable content
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif'];
    const fileName = file.name.toLowerCase();
    
    return dangerousExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Sanitize text input
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    
    // Remove script tags and event handlers
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '');
}

/**
 * Check for XSS patterns
 */
function containsXSSPatterns(text) {
    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i,
        /vbscript:/i
    ];
    
    return xssPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitize data for API requests
 */
function sanitizeData(data) {
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(sanitizeObject(parsed));
        } catch (e) {
            return sanitizeText(data);
        }
    }
    return data;
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? sanitizeText(obj) : obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
    }
    
    return sanitized;
}

/**
 * Validate region data
 */
function validateRegionData(region) {
    if (!region || typeof region !== 'object') {
        return false;
    }
    
    // Check required fields
    const requiredFields = ['name', 'x', 'y', 'width', 'height'];
    for (const field of requiredFields) {
        if (!(field in region)) {
            return false;
        }
    }
    
    // Validate coordinates
    if (region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0) {
        return false;
    }
    
    // Validate name
    if (typeof region.name !== 'string' || region.name.trim().length === 0) {
        return false;
    }
    
    // Sanitize name
    region.name = sanitizeText(region.name.trim());
    
    return true;
}

/**
 * Validate extraction data
 */
function validateExtractionData(data) {
    if (!Array.isArray(data)) {
        return false;
    }
    
    return data.every(item => {
        if (typeof item !== 'object' || item === null) {
            return false;
        }
        
        // Each item should have a page number
        if (!('page' in item) || typeof item.page !== 'number') {
            return false;
        }
        
        // Sanitize all string values
        for (const [key, value] of Object.entries(item)) {
            if (typeof value === 'string') {
                item[key] = sanitizeText(value);
            }
        }
        
        return true;
    });
}

/**
 * Get security headers for requests
 */
function getSecurityHeaders() {
    return {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    };
}

/**
 * Secure fetch wrapper
 */
async function secureFetch(url, options = {}) {
    try {
        // Add security headers
        options.headers = {
            ...getSecurityHeaders(),
            ...options.headers
        };
        
        // Sanitize request body
        if (options.body && typeof options.body === 'string') {
            options.body = sanitizeData(options.body);
        }
        
        // Rate limiting
        if (SECURITY_CONFIG.rateLimit) {
            const now = Date.now();
            if (now - lastRequestTime < RATE_LIMIT_DELAY) {
                throw new Error('Rate limit exceeded. Please wait before making another request.');
            }
            lastRequestTime = now;
        }
        
        const response = await fetch(url, options);
        
        // Validate response
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
    } catch (error) {
        console.error('Secure fetch error:', error);
        throw error;
    }
}

/**
 * Check if security features are enabled
 */
function isSecurityEnabled() {
    return SECURITY_CONFIG.enabled;
}

/**
 * Get security status
 */
function getSecurityStatus() {
    return {
        enabled: SECURITY_CONFIG.enabled,
        validateInputs: SECURITY_CONFIG.validateInputs,
        sanitizeData: SECURITY_CONFIG.sanitizeData,
        rateLimit: SECURITY_CONFIG.rateLimit,
        headers: Object.keys(securityHeaders).length > 0
    };
}

// Export functions for global access
window.initializeSecurity = initializeSecurity;
window.validateRegionData = validateRegionData;
window.validateExtractionData = validateExtractionData;
window.secureFetch = secureFetch;
window.isSecurityEnabled = isSecurityEnabled;
window.getSecurityStatus = getSecurityStatus;
