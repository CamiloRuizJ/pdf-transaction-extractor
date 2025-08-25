/**
 * Data Extraction JavaScript for RExeli
 * Handles OCR processing, data extraction, and AI integration
 */

// ========================================
// Data Extraction State Management
// ========================================

const DataExtraction = {
  // Extraction State
  isExtracting: false,
  currentProgress: 0,
  totalRegions: 0,
  
  // Results State
  extractedData: [],
  qualityScores: {},
  aiInsights: [],
  
  // Configuration
  ocrEnabled: true,
  aiEnabled: false,
  batchProcessing: false,
  
  // Performance
  processingQueue: [],
  isProcessing: false
};

// ========================================
// Data Extraction Initialization
// ========================================

/**
 * Initialize data extraction
 */
function initDataExtraction() {
  // Set up event listeners
  setupExtractionEventListeners();
  
  // Check AI availability
  checkAIAvailability();
  
  console.log('Data Extraction initialized');
}

/**
 * Check AI availability
 */
async function checkAIAvailability() {
  try {
    const response = await fetch('/ai_status');
    if (response.ok) {
      const result = await response.json();
      DataExtraction.aiEnabled = result.available;
      
      if (DataExtraction.aiEnabled) {
        console.log('AI features available');
        enableAIFeatures();
      } else {
        console.log('AI features not available');
      }
    }
  } catch (error) {
    console.log('AI status check failed:', error);
    DataExtraction.aiEnabled = false;
  }
}

/**
 * Enable AI features
 */
function enableAIFeatures() {
  DataExtraction.aiEnabled = true;
  
  // Update UI to show AI features
  const aiBadge = document.querySelector('.ai-badge');
  if (aiBadge) {
    aiBadge.style.display = 'inline-block';
  }
  
  // Enable AI enhancement in Excel preview
  if (window.enableAIEnhancement) {
    window.enableAIEnhancement();
  }
  
  console.log('AI features enabled');
}

// ========================================
// Data Extraction Process
// ========================================

/**
 * Extract data from regions
 */
async function extractData() {
  if (!window.regions || window.regions.length === 0) {
    showError('No regions defined. Please draw regions on the PDF first.');
    return;
  }
  
  if (DataExtraction.isExtracting) {
    showError('Extraction already in progress. Please wait.');
    return;
  }
  
  try {
    DataExtraction.isExtracting = true;
    DataExtraction.currentProgress = 0;
    DataExtraction.totalRegions = window.regions.length;
    
    // Update UI
    updateExtractionStatus('Starting data extraction...');
    updateExtractionProgress(0);
    
    // Get current page regions
    const currentPage = window.PDFViewer ? window.PDFViewer.currentPage : 1;
    const pageRegions = window.regions.filter(r => r.page === currentPage);
    
    if (pageRegions.length === 0) {
      showError('No regions defined on the current page.');
      return;
    }
    
    // Start extraction process
    const extractedData = await processRegions(pageRegions);
    
    // Process results
    await processExtractionResults(extractedData);
    
    // Update Excel preview
    if (window.updateDataFromRegions) {
      window.updateDataFromRegions(pageRegions, extractedData);
    }
    
    // Show success message
    showSuccess(`Successfully extracted data from ${extractedData.length} regions`);
    
    console.log('Data extraction completed:', extractedData);
    
  } catch (error) {
    console.error('Data extraction failed:', error);
    showError('Data extraction failed: ' + error.message);
  } finally {
    DataExtraction.isExtracting = false;
    updateExtractionStatus('Extraction completed');
    updateExtractionProgress(100);
  }
}

/**
 * Process regions for data extraction
 */
async function processRegions(regions) {
  const results = [];
  
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    
    try {
      // Update progress
      DataExtraction.currentProgress = ((i + 1) / regions.length) * 100;
      updateExtractionProgress(DataExtraction.currentProgress);
      updateExtractionStatus(`Processing region ${i + 1} of ${regions.length}: ${region.name || 'Unnamed'}`);
      
      // Extract data from region
      const regionData = await extractRegionData(region);
      
      if (regionData) {
        results.push(regionData);
      }
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error processing region ${region.name}:`, error);
      // Continue with other regions
    }
  }
  
  return results;
}

/**
 * Extract data from a single region
 */
async function extractRegionData(region) {
  try {
    const response = await fetch('/extract_region', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: window.getCurrentFilename(),
        region: region,
        page: window.PDFViewer ? window.PDFViewer.currentPage : 1,
        ai_enabled: DataExtraction.aiEnabled
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to extract region data');
    }
    
    const result = await response.json();
    
    if (result.success) {
      return {
        regionId: region.id,
        regionName: region.name,
        extractedText: result.text,
        confidence: result.confidence,
        aiEnhanced: result.ai_enhanced || false,
        qualityScore: result.quality_score || 0.5
      };
    } else {
      throw new Error(result.error || 'Failed to extract region data');
    }
    
  } catch (error) {
    console.error('Error extracting region data:', error);
    return {
      regionId: region.id,
      regionName: region.name,
      extractedText: '',
      confidence: 0,
      aiEnhanced: false,
      qualityScore: 0,
      error: error.message
    };
  }
}

/**
 * Process extraction results
 */
async function processExtractionResults(extractedData) {
  // Store results
  DataExtraction.extractedData = extractedData;
  
  // Calculate quality scores
  DataExtraction.qualityScores = {};
  extractedData.forEach((data, index) => {
    if (data.regionId) {
      DataExtraction.qualityScores[`${index}_${data.regionId}`] = data.qualityScore;
    }
  });
  
  // Update quality scores in Excel preview
  if (window.updateQualityScores) {
    window.updateQualityScores(DataExtraction.qualityScores);
  }
  
  // Get AI insights if enabled
  if (DataExtraction.aiEnabled) {
    await getAIInsights(extractedData);
  }
  
  console.log('Extraction results processed:', extractedData);
}

/**
 * Get AI insights for extracted data
 */
async function getAIInsights(extractedData) {
  try {
    const response = await fetch('/ai_insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        extracted_data: extractedData,
        filename: window.getCurrentFilename()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI insights');
    }
    
    const result = await response.json();
    
    if (result.success && result.insights) {
      DataExtraction.aiInsights = result.insights;
      updateAIInsights(result.insights);
    }
    
  } catch (error) {
    console.error('Error getting AI insights:', error);
    // Don't show error - AI insights are optional
  }
}

/**
 * Update AI insights display
 */
function updateAIInsights(insights) {
  const insightsContainer = document.querySelector('.ai-insights-panel');
  
  if (!insightsContainer || !insights.length) return;
  
  const insightsContent = insightsContainer.querySelector('.insights-content');
  
  if (insightsContent) {
    const insightsHTML = insights.map(insight => `
      <div class="insight-item">
        <div class="insight-icon">${insight.icon || '💡'}</div>
        <div class="insight-text">
          <strong>${insight.title}</strong>: ${insight.message}
        </div>
      </div>
    `).join('');
    
    insightsContent.innerHTML = insightsHTML;
  }
  
  console.log('AI insights updated:', insights);
}

// ========================================
// OCR Testing
// ========================================

/**
 * Test OCR functionality
 */
async function testOcr() {
  try {
    updateExtractionStatus('Testing OCR...');
    
    const response = await fetch('/test_ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: window.getCurrentFilename(),
        page: window.PDFViewer ? window.PDFViewer.currentPage : 1
      })
    });
    
    if (!response.ok) {
      throw new Error('OCR test failed');
    }
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`OCR test successful! Detected ${result.text_length} characters with ${Math.round(result.confidence * 100)}% confidence.`);
      console.log('OCR test result:', result);
    } else {
      throw new Error(result.error || 'OCR test failed');
    }
    
  } catch (error) {
    console.error('OCR test failed:', error);
    showError('OCR test failed: ' + error.message);
  } finally {
    updateExtractionStatus('OCR test completed');
  }
}

// ========================================
// Batch Processing
// ========================================

/**
 * Start batch processing
 */
async function startBatchProcessing() {
  if (!window.regions || window.regions.length === 0) {
    showError('No regions defined for batch processing.');
    return;
  }
  
  if (DataExtraction.isProcessing) {
    showError('Batch processing already in progress.');
    return;
  }
  
  try {
    DataExtraction.isProcessing = true;
    DataExtraction.batchProcessing = true;
    
    updateExtractionStatus('Starting batch processing...');
    
    // Get all pages with regions
    const pagesWithRegions = [...new Set(window.regions.map(r => r.page))].sort();
    
    const allResults = [];
    
    for (let pageIndex = 0; pageIndex < pagesWithRegions.length; pageIndex++) {
      const page = pagesWithRegions[pageIndex];
      
      // Navigate to page
      if (window.PDFViewer && window.PDFViewer.currentPage !== page) {
        window.PDFViewer.currentPage = page;
        await window.PDFViewer.renderPDF(window.getCurrentFilename());
      }
      
      updateExtractionStatus(`Processing page ${page} of ${pagesWithRegions.length}...`);
      
      // Get regions for this page
      const pageRegions = window.regions.filter(r => r.page === page);
      
      // Process regions on this page
      const pageResults = await processRegions(pageRegions);
      allResults.push(...pageResults);
      
      // Update progress
      const progress = ((pageIndex + 1) / pagesWithRegions.length) * 100;
      updateExtractionProgress(progress);
    }
    
    // Process all results
    await processExtractionResults(allResults);
    
    // Update Excel preview with all data
    if (window.updateDataFromRegions) {
      window.updateDataFromRegions(window.regions, allResults);
    }
    
    showSuccess(`Batch processing completed! Processed ${allResults.length} regions across ${pagesWithRegions.length} pages.`);
    
    console.log('Batch processing completed:', allResults);
    
  } catch (error) {
    console.error('Batch processing failed:', error);
    showError('Batch processing failed: ' + error.message);
  } finally {
    DataExtraction.isProcessing = false;
    DataExtraction.batchProcessing = false;
    updateExtractionStatus('Batch processing completed');
    updateExtractionProgress(100);
  }
}

// ========================================
// UI Updates
// ========================================

/**
 * Update extraction status
 */
function updateExtractionStatus(message) {
  const statusElement = document.getElementById('extractionStatus');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Update extraction progress
 */
function updateExtractionProgress(percentage) {
  const progressElement = document.querySelector('.extraction-progress');
  if (progressElement) {
    progressElement.style.width = percentage + '%';
  }
  
  // Update progress text
  const progressText = document.querySelector('.extraction-progress-text');
  if (progressText) {
    progressText.textContent = Math.round(percentage) + '%';
  }
}

/**
 * Update extraction buttons
 */
function updateExtractionButtons() {
  const extractBtn = document.getElementById('extractDataBtn');
  const testBtn = document.getElementById('testOcrBtn');
  const batchBtn = document.getElementById('batchProcessBtn');
  
  const hasRegions = window.regions && window.regions.length > 0;
  const hasFile = window.getCurrentFilename && window.getCurrentFilename();
  const isProcessing = DataExtraction.isExtracting || DataExtraction.isProcessing;
  
  if (extractBtn) {
    extractBtn.disabled = !hasRegions || !hasFile || isProcessing;
  }
  
  if (testBtn) {
    testBtn.disabled = !hasFile || isProcessing;
  }
  
  if (batchBtn) {
    batchBtn.disabled = !hasRegions || !hasFile || isProcessing;
  }
}

// ========================================
// Event Listeners
// ========================================

/**
 * Set up extraction event listeners
 */
function setupExtractionEventListeners() {
  // Extract data button
  const extractBtn = document.getElementById('extractDataBtn');
  if (extractBtn) {
    extractBtn.addEventListener('click', extractData);
  }
  
  // Test OCR button
  const testBtn = document.getElementById('testOcrBtn');
  if (testBtn) {
    testBtn.addEventListener('click', testOcr);
  }
  
  // Batch process button (if exists)
  const batchBtn = document.getElementById('batchProcessBtn');
  if (batchBtn) {
    batchBtn.addEventListener('click', startBatchProcessing);
  }
  
  // Clear session button
  const clearBtn = document.getElementById('clearSessionBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearSession);
  }
  
  // Listen for region changes
  document.addEventListener('regionsUpdated', () => {
    updateExtractionButtons();
  });
  
  // Listen for file changes
  document.addEventListener('fileLoaded', () => {
    updateExtractionButtons();
  });
}

/**
 * Clear session
 */
function clearSession() {
  if (confirm('Are you sure you want to clear the current session? This will remove all regions and extracted data.')) {
    // Clear regions
    if (window.regions) {
      window.regions = [];
    }
    
    // Clear extracted data
    DataExtraction.extractedData = [];
    DataExtraction.qualityScores = {};
    DataExtraction.aiInsights = [];
    
    // Update UI
    if (window.updateRegionList) {
      window.updateRegionList();
    }
    
    if (window.updateDataFromRegions) {
      window.updateDataFromRegions([], []);
    }
    
    // Reset extraction state
    DataExtraction.isExtracting = false;
    DataExtraction.isProcessing = false;
    DataExtraction.currentProgress = 0;
    
    updateExtractionStatus('Session cleared');
    updateExtractionProgress(0);
    updateExtractionButtons();
    
    console.log('Session cleared');
  }
}

// ========================================
// Export Functions
// ========================================

/**
 * Export extracted data
 */
async function exportExtractedData(format = 'csv') {
  if (!DataExtraction.extractedData || DataExtraction.extractedData.length === 0) {
    showError('No extracted data to export.');
    return;
  }
  
  try {
    updateExtractionStatus('Exporting data...');
    
    const response = await fetch('/export_data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: DataExtraction.extractedData,
        format: format,
        filename: window.getCurrentFilename()
      })
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    if (format === 'csv') {
      // Handle CSV download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted_data_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Handle other formats
      const result = await response.json();
      if (result.success) {
        showSuccess(`Data exported successfully to ${format.toUpperCase()}`);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    }
    
    console.log('Data exported successfully');
    
  } catch (error) {
    console.error('Export failed:', error);
    showError('Export failed: ' + error.message);
  } finally {
    updateExtractionStatus('Export completed');
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Show error message
 */
function showError(message) {
  console.error('Error:', message);
  alert(message);
}

/**
 * Show success message
 */
function showSuccess(message) {
  console.log('Success:', message);
  
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

/**
 * Get current filename
 */
function getCurrentFilename() {
  return window.getCurrentFilename ? window.getCurrentFilename() : '';
}

// ========================================
// Export Functions
// ========================================

// Make functions available globally
window.DataExtraction = DataExtraction;
window.initDataExtraction = initDataExtraction;
window.extractData = extractData;
window.testOcr = testOcr;
window.startBatchProcessing = startBatchProcessing;
window.clearSession = clearSession;
window.exportExtractedData = exportExtractedData;
window.enableAIFeatures = enableAIFeatures;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initDataExtraction();
});
