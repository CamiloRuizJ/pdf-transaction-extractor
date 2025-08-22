/**
 * Quality Scoring Module
 * Handles data quality assessment and scoring
 */

// Quality Scoring Configuration
const QUALITY_CONFIG = {
    enabled: true,
    autoScore: true,
    thresholds: {
        excellent: 0.9,
        good: 0.7,
        fair: 0.5,
        poor: 0.3
    }
};

// Quality Scoring State
let qualityScores = {};
let overallQuality = 0;

/**
 * Initialize quality scoring
 */
function initializeQualityScoring() {
    console.log('Initializing quality scoring...');
    
    // Set up quality indicators
    setupQualityIndicators();
    
    // Set up auto-scoring
    if (QUALITY_CONFIG.autoScore) {
        setupAutoScoring();
    }
    
    console.log('Quality scoring initialized');
}

/**
 * Setup quality indicators
 */
function setupQualityIndicators() {
    const qualityOverlay = document.getElementById('qualityScoreOverlay');
    const qualityFill = document.getElementById('qualityFill');
    const qualityScore = document.getElementById('qualityScore');
    
    if (qualityOverlay && qualityFill && qualityScore) {
        // Initialize with 0 score
        updateQualityDisplay(0);
    }
}

/**
 * Setup auto-scoring
 */
function setupAutoScoring() {
    // Listen for data extraction events
    document.addEventListener('dataExtracted', handleDataExtracted);
    document.addEventListener('regionAdded', handleRegionAdded);
    document.addEventListener('regionRemoved', handleRegionRemoved);
}

/**
 * Handle data extraction for quality scoring
 */
function handleDataExtracted(event) {
    const data = event.detail;
    if (data && Array.isArray(data)) {
        calculateQualityScore(data);
    }
}

/**
 * Handle region added for quality scoring
 */
function handleRegionAdded(event) {
    const region = event.detail;
    if (region) {
        updateRegionQuality(region);
    }
}

/**
 * Handle region removed for quality scoring
 */
function handleRegionRemoved(event) {
    const regionName = event.detail;
    if (regionName) {
        removeRegionQuality(regionName);
    }
}

/**
 * Calculate quality score for extracted data
 */
function calculateQualityScore(data) {
    if (!QUALITY_CONFIG.enabled || !data || data.length === 0) {
        return 0;
    }
    
    let totalScore = 0;
    let totalFields = 0;
    
    data.forEach((item, index) => {
        const itemScore = calculateItemQuality(item);
        totalScore += itemScore;
        totalFields += Object.keys(item).length - 1; // Exclude 'page' field
    });
    
    overallQuality = totalFields > 0 ? totalScore / totalFields : 0;
    
    // Update display
    updateQualityDisplay(overallQuality);
    
    // Store scores
    qualityScores = {
        overall: overallQuality,
        items: data.map((item, index) => ({
            index,
            score: calculateItemQuality(item)
        }))
    };
    
    // Trigger quality update event
    document.dispatchEvent(new CustomEvent('qualityUpdated', {
        detail: { scores: qualityScores }
    }));
    
    return overallQuality;
}

/**
 * Calculate quality score for a single data item
 */
function calculateItemQuality(item) {
    if (!item || typeof item !== 'object') {
        return 0;
    }
    
    let totalScore = 0;
    let fieldCount = 0;
    
    for (const [key, value] of Object.entries(item)) {
        if (key === 'page') continue; // Skip page number
        
        const fieldScore = calculateFieldQuality(key, value);
        totalScore += fieldScore;
        fieldCount++;
    }
    
    return fieldCount > 0 ? totalScore / fieldCount : 0;
}

/**
 * Calculate quality score for a single field
 */
function calculateFieldQuality(fieldName, value) {
    if (value === null || value === undefined) {
        return 0;
    }
    
    const text = String(value).trim();
    
    if (text.length === 0) {
        return 0;
    }
    
    let score = 1.0;
    
    // Length penalty (too short or too long)
    if (text.length < 2) {
        score -= 0.3;
    } else if (text.length > 1000) {
        score -= 0.2;
    }
    
    // Character quality penalty
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s.,$%()-]/g) || []).length / text.length;
    if (specialCharRatio > 0.3) {
        score -= 0.2;
    }
    
    // OCR error patterns
    const ocrErrors = countOCRErrors(text);
    score -= ocrErrors * 0.1;
    
    // Field-specific validation
    const fieldScore = validateFieldByType(fieldName, text);
    score = Math.min(score, fieldScore);
    
    return Math.max(0, score);
}

/**
 * Count OCR errors in text
 */
function countOCRErrors(text) {
    let errorCount = 0;
    
    // Common OCR error patterns
    const errorPatterns = [
        /[0O]{2,}/g, // Multiple zeros/Os
        /[1Il]{2,}/g, // Multiple ones/Is/ls
        /[5S]{2,}/g,  // Multiple fives/Ss
        /[8B]{2,}/g,  // Multiple eights/Bs
        /[6G]{2,}/g,  // Multiple sixes/Gs
        /\s{3,}/g,    // Multiple spaces
        /[^\x00-\x7F]/g // Non-ASCII characters
    ];
    
    errorPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            errorCount += matches.length;
        }
    });
    
    return errorCount;
}

/**
 * Validate field by type
 */
function validateFieldByType(fieldName, value) {
    const fieldNameLower = fieldName.toLowerCase();
    
    // Email validation
    if (fieldNameLower.includes('email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? 1.0 : 0.3;
    }
    
    // Phone validation
    if (fieldNameLower.includes('phone') || fieldNameLower.includes('tel')) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        return phoneRegex.test(cleanPhone) ? 1.0 : 0.5;
    }
    
    // Date validation
    if (fieldNameLower.includes('date')) {
        const dateRegex = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/;
        return dateRegex.test(value) ? 1.0 : 0.4;
    }
    
    // Currency validation
    if (fieldNameLower.includes('price') || fieldNameLower.includes('rent') || fieldNameLower.includes('amount')) {
        const currencyRegex = /^[\$]?[\d,]+(\.\d{2})?$/;
        return currencyRegex.test(value) ? 1.0 : 0.6;
    }
    
    // Address validation
    if (fieldNameLower.includes('address')) {
        const addressRegex = /^\d+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|place|pl|court|ct)/i;
        return addressRegex.test(value) ? 1.0 : 0.7;
    }
    
    // Default validation
    return 1.0;
}

/**
 * Update quality display
 */
function updateQualityDisplay(score) {
    const qualityFill = document.getElementById('qualityFill');
    const qualityScore = document.getElementById('qualityScore');
    const qualityOverlay = document.getElementById('qualityScoreOverlay');
    
    if (!qualityFill || !qualityScore || !qualityOverlay) {
        return;
    }
    
    // Update fill width
    const percentage = Math.round(score * 100);
    qualityFill.style.width = `${percentage}%`;
    
    // Update score text
    qualityScore.textContent = `${percentage}%`;
    
    // Update color based on score
    const qualityLevel = getQualityLevel(score);
    qualityFill.className = `quality-fill ${qualityLevel}`;
    
    // Show/hide overlay based on score
    if (score > 0) {
        qualityOverlay.style.display = 'block';
    } else {
        qualityOverlay.style.display = 'none';
    }
}

/**
 * Get quality level based on score
 */
function getQualityLevel(score) {
    if (score >= QUALITY_CONFIG.thresholds.excellent) {
        return 'excellent';
    } else if (score >= QUALITY_CONFIG.thresholds.good) {
        return 'good';
    } else if (score >= QUALITY_CONFIG.thresholds.fair) {
        return 'fair';
    } else if (score >= QUALITY_CONFIG.thresholds.poor) {
        return 'poor';
    } else {
        return 'very-poor';
    }
}

/**
 * Update region quality
 */
function updateRegionQuality(region) {
    if (!region || !region.name) {
        return;
    }
    
    // Calculate region quality based on size and position
    const quality = calculateRegionQuality(region);
    
    // Store region quality
    qualityScores[region.name] = quality;
    
    // Update overall quality if needed
    updateOverallQuality();
}

/**
 * Calculate region quality
 */
function calculateRegionQuality(region) {
    let score = 1.0;
    
    // Size validation
    if (region.width < 10 || region.height < 10) {
        score -= 0.3; // Too small
    } else if (region.width > 1000 || region.height > 1000) {
        score -= 0.2; // Too large
    }
    
    // Position validation
    if (region.x < 0 || region.y < 0) {
        score -= 0.5; // Invalid position
    }
    
    // Aspect ratio validation
    const aspectRatio = region.width / region.height;
    if (aspectRatio < 0.1 || aspectRatio > 10) {
        score -= 0.2; // Unusual aspect ratio
    }
    
    return Math.max(0, score);
}

/**
 * Remove region quality
 */
function removeRegionQuality(regionName) {
    if (qualityScores[regionName]) {
        delete qualityScores[regionName];
        updateOverallQuality();
    }
}

/**
 * Update overall quality
 */
function updateOverallQuality() {
    const scores = Object.values(qualityScores);
    if (scores.length > 0) {
        overallQuality = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        updateQualityDisplay(overallQuality);
    }
}

/**
 * Get quality report
 */
function getQualityReport() {
    return {
        overall: overallQuality,
        level: getQualityLevel(overallQuality),
        scores: qualityScores,
        recommendations: getQualityRecommendations()
    };
}

/**
 * Get quality recommendations
 */
function getQualityRecommendations() {
    const recommendations = [];
    
    if (overallQuality < QUALITY_CONFIG.thresholds.good) {
        recommendations.push('Consider reviewing and adjusting region selections');
    }
    
    if (overallQuality < QUALITY_CONFIG.thresholds.fair) {
        recommendations.push('Check OCR settings and document quality');
    }
    
    // Check for specific issues
    Object.entries(qualityScores).forEach(([name, score]) => {
        if (score < QUALITY_CONFIG.thresholds.fair) {
            recommendations.push(`Review region "${name}" - low quality detected`);
        }
    });
    
    return recommendations;
}

/**
 * Reset quality scores
 */
function resetQualityScores() {
    qualityScores = {};
    overallQuality = 0;
    updateQualityDisplay(0);
}

/**
 * Enable/disable quality scoring
 */
function setQualityScoringEnabled(enabled) {
    QUALITY_CONFIG.enabled = enabled;
    
    if (!enabled) {
        resetQualityScores();
    }
}

// Export functions for global access
window.initializeQualityScoring = initializeQualityScoring;
window.calculateQualityScore = calculateQualityScore;
window.getQualityReport = getQualityReport;
window.resetQualityScores = resetQualityScores;
window.setQualityScoringEnabled = setQualityScoringEnabled;
