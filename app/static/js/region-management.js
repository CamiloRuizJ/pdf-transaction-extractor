/**
 * Region Management JavaScript for RExeli
 * Handles region creation, editing, deletion, and naming
 */

// ========================================
// Region Management State
// ========================================

const RegionManager = {
  // Region State
  regions: [],
  selectedRegion: null,
  editingRegion: null,
  
  // Modal State
  modalOpen: false,
  currentRegionData: null,
  
  // UI State
  regionListElement: null,
  modalElement: null,
  
  // AI Integration
  aiSuggestions: [],
  aiEnabled: false
};

// ========================================
// Region Data Management
// ========================================

/**
 * Initialize region manager
 */
function initRegionManager() {
  RegionManager.regionListElement = document.getElementById('regionList');
  RegionManager.modalElement = document.getElementById('regionModal');
  
  // Initialize regions array
  if (!window.regions) {
    window.regions = [];
  }
  
  // Set up event listeners
  setupRegionEventListeners();
  
  // Update region list display
  updateRegionList();
  
  console.log('Region Manager initialized');
}

/**
 * Add a new region
 */
function addRegion(regionData) {
  // Add page information
  regionData.page = window.PDFViewer ? window.PDFViewer.currentPage : 1;
  regionData.id = generateRegionId();
  regionData.createdAt = new Date().toISOString();
  
  // Add to regions array
  window.regions.push(regionData);
  
  // Open naming modal
  openRegionModal(regionData);
  
  // Update UI
  updateRegionList();
  updateRegionButtons();
  
  console.log('Region added:', regionData);
}

/**
 * Update region data
 */
function updateRegion(regionId, updates) {
  const regionIndex = window.regions.findIndex(r => r.id === regionId);
  
  if (regionIndex !== -1) {
    window.regions[regionIndex] = { ...window.regions[regionIndex], ...updates };
    updateRegionList();
    updateRegionButtons();
    
    // Redraw regions on canvas
    if (window.PDFViewer && window.PDFViewer.renderPDF) {
      window.PDFViewer.renderPDF(window.getCurrentFilename());
    }
    
    console.log('Region updated:', window.regions[regionIndex]);
  }
}

/**
 * Delete region
 */
function deleteRegion(regionId) {
  const regionIndex = window.regions.findIndex(r => r.id === regionId);
  
  if (regionIndex !== -1) {
    const deletedRegion = window.regions.splice(regionIndex, 1)[0];
    updateRegionList();
    updateRegionButtons();
    
    // Redraw regions on canvas
    if (window.PDFViewer && window.PDFViewer.renderPDF) {
      window.PDFViewer.renderPDF(window.getCurrentFilename());
    }
    
    console.log('Region deleted:', deletedRegion);
  }
}

/**
 * Clear all regions
 */
function clearAllRegions() {
  if (confirm('Are you sure you want to clear all regions? This action cannot be undone.')) {
    window.regions = [];
    updateRegionList();
    updateRegionButtons();
    
    // Redraw canvas
    if (window.PDFViewer && window.PDFViewer.renderPDF) {
      window.PDFViewer.renderPDF(window.getCurrentFilename());
    }
    
    console.log('All regions cleared');
  }
}

/**
 * Save regions to server
 */
async function saveRegions() {
  if (!window.regions || window.regions.length === 0) {
    showError('No regions to save');
    return;
  }
  
  try {
    showLoading('Saving regions...');
    
    const response = await fetch('/save_regions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: window.getCurrentFilename(),
        regions: window.regions
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save regions');
    }
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('Regions saved successfully');
      console.log('Regions saved:', result);
    } else {
      throw new Error(result.error || 'Failed to save regions');
    }
  } catch (error) {
    console.error('Error saving regions:', error);
    showError('Failed to save regions: ' + error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Load regions from server
 */
async function loadRegions(filename) {
  try {
    const response = await fetch(`/load_regions?filename=${filename}`);
    
    if (!response.ok) {
      throw new Error('Failed to load regions');
    }
    
    const result = await response.json();
    
    if (result.success && result.regions) {
      window.regions = result.regions;
      updateRegionList();
      updateRegionButtons();
      
      // Redraw regions on canvas
      if (window.PDFViewer && window.PDFViewer.renderPDF) {
        window.PDFViewer.renderPDF(filename);
      }
      
      console.log('Regions loaded:', result.regions);
    }
  } catch (error) {
    console.error('Error loading regions:', error);
    // Don't show error for missing regions (first time use)
    if (error.message !== 'Failed to load regions') {
      showError('Failed to load regions: ' + error.message);
    }
  }
}

// ========================================
// Region Modal Management
// ========================================

/**
 * Open region naming modal
 */
function openRegionModal(regionData) {
  RegionManager.currentRegionData = regionData;
  RegionManager.modalOpen = true;
  
  // Reset form
  const nameSelect = document.getElementById('regionNameSelect');
  const nameInput = document.getElementById('regionNameInput');
  
  if (nameSelect) nameSelect.value = '';
  if (nameInput) nameInput.value = '';
  
  // Show modal
  if (RegionManager.modalElement) {
    RegionManager.modalElement.classList.add('show');
  }
  
  // Focus on input
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 100);
  
  // Get AI suggestions if enabled
  if (RegionManager.aiEnabled) {
    getAISuggestions(regionData);
  }
}

/**
 * Close region modal
 */
function closeRegionModal() {
  RegionManager.modalOpen = false;
  RegionManager.currentRegionData = null;
  
  if (RegionManager.modalElement) {
    RegionManager.modalElement.classList.remove('show');
  }
}

/**
 * Save region name
 */
function saveRegionName() {
  const nameInput = document.getElementById('regionNameInput');
  const regionName = nameInput ? nameInput.value.trim() : '';
  
  if (!regionName) {
    showError('Please enter a region name');
    return;
  }
  
  if (RegionManager.currentRegionData) {
    // Update region with name
    updateRegion(RegionManager.currentRegionData.id, {
      name: regionName,
      namedAt: new Date().toISOString()
    });
    
    closeRegionModal();
    
    // Show success message
    showSuccess(`Region "${regionName}" created successfully`);
  }
}

/**
 * Update region name input based on select
 */
function updateRegionNameInput() {
  const nameSelect = document.getElementById('regionNameSelect');
  const nameInput = document.getElementById('regionNameInput');
  
  if (nameSelect && nameInput) {
    const selectedValue = nameSelect.value;
    
    if (selectedValue === 'Custom Field') {
      nameInput.value = '';
      nameInput.placeholder = 'Enter custom field name...';
      nameInput.focus();
    } else if (selectedValue) {
      nameInput.value = selectedValue;
    }
  }
}

// ========================================
// AI Integration
// ========================================

/**
 * Get AI suggestions for region
 */
async function getAISuggestions(regionData) {
  try {
    const response = await fetch('/ai_suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: window.getCurrentFilename(),
        region: regionData
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI suggestions');
    }
    
    const result = await response.json();
    
    if (result.success && result.suggestions) {
      RegionManager.aiSuggestions = result.suggestions;
      updateAISuggestions();
    }
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    // Don't show error - AI suggestions are optional
  }
}

/**
 * Update AI suggestions in modal
 */
function updateAISuggestions() {
  const suggestionsContainer = document.querySelector('.ai-field-suggestions');
  
  if (!suggestionsContainer || !RegionManager.aiSuggestions.length) return;
  
  const suggestionsList = suggestionsContainer.querySelector('.suggestions-list');
  
  if (suggestionsList) {
    suggestionsList.innerHTML = '';
    
    RegionManager.aiSuggestions.forEach(suggestion => {
      const button = document.createElement('button');
      button.textContent = suggestion.name;
      button.onclick = () => {
        const nameInput = document.getElementById('regionNameInput');
        if (nameInput) {
          nameInput.value = suggestion.name;
        }
      };
      suggestionsList.appendChild(button);
    });
  }
}

// ========================================
// UI Updates
// ========================================

/**
 * Update region list display
 */
function updateRegionList() {
  if (!RegionManager.regionListElement) return;
  
  if (!window.regions || window.regions.length === 0) {
    RegionManager.regionListElement.innerHTML = `
      <div class="region-placeholder">
        <div class="placeholder-text">No regions defined yet</div>
        <div class="placeholder-help">
          Draw regions on the PDF to extract data from specific areas
        </div>
      </div>
    `;
    return;
  }
  
  // Filter regions for current page
  const currentPage = window.PDFViewer ? window.PDFViewer.currentPage : 1;
  const pageRegions = window.regions.filter(r => r.page === currentPage);
  
  if (pageRegions.length === 0) {
    RegionManager.regionListElement.innerHTML = `
      <div class="region-placeholder">
        <div class="placeholder-text">No regions on this page</div>
        <div class="placeholder-help">
          Switch pages or draw new regions to see them here
        </div>
      </div>
    `;
    return;
  }
  
  // Create region list
  const regionHTML = pageRegions.map(region => createRegionListItem(region)).join('');
  
  RegionManager.regionListElement.innerHTML = regionHTML;
}

/**
 * Create region list item HTML
 */
function createRegionListItem(region) {
  const hasName = region.name && region.name.trim();
  const name = hasName ? region.name : 'Unnamed Region';
  const nameClass = hasName ? 'region-named' : 'region-unnamed';
  
  return `
    <div class="region-item" data-region-id="${region.id}">
      <div class="region-info">
        <div class="region-name ${nameClass}">${name}</div>
        <div class="region-details">
          <span class="region-size">${Math.round(region.width)} × ${Math.round(region.height)}</span>
          <span class="region-position">(${Math.round(region.x)}, ${Math.round(region.y)})</span>
        </div>
      </div>
      <div class="region-actions">
        <button class="btn-edit" onclick="editRegion('${region.id}')" title="Edit Region">
          ✏️
        </button>
        <button class="btn-delete" onclick="deleteRegion('${region.id}')" title="Delete Region">
          🗑️
        </button>
      </div>
    </div>
  `;
}

/**
 * Update region buttons state
 */
function updateRegionButtons() {
  const saveBtn = document.getElementById('saveRegionsBtn');
  const clearBtn = document.getElementById('clearRegionsBtn');
  
  const hasRegions = window.regions && window.regions.length > 0;
  
  if (saveBtn) {
    saveBtn.disabled = !hasRegions;
  }
  
  if (clearBtn) {
    clearBtn.disabled = !hasRegions;
  }
}

/**
 * Edit region
 */
function editRegion(regionId) {
  const region = window.regions.find(r => r.id === regionId);
  
  if (region) {
    RegionManager.editingRegion = region;
    openRegionModal(region);
    
    // Pre-fill the form
    const nameInput = document.getElementById('regionNameInput');
    if (nameInput && region.name) {
      nameInput.value = region.name;
    }
  }
}

// ========================================
// Event Listeners
// ========================================

/**
 * Set up region event listeners
 */
function setupRegionEventListeners() {
  // Modal close button
  const closeBtn = document.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeRegionModal);
  }
  
  // Modal backdrop click
  if (RegionManager.modalElement) {
    RegionManager.modalElement.addEventListener('click', (event) => {
      if (event.target === RegionManager.modalElement) {
        closeRegionModal();
      }
    });
  }
  
  // Save regions button
  const saveBtn = document.getElementById('saveRegionsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveRegions);
  }
  
  // Clear regions button
  const clearBtn = document.getElementById('clearRegionsBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllRegions);
  }
  
  // Modal form submission
  const modalForm = RegionManager.modalElement?.querySelector('form');
  if (modalForm) {
    modalForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveRegionName();
    });
  }
  
  // Keyboard shortcuts for modal
  document.addEventListener('keydown', (event) => {
    if (RegionManager.modalOpen) {
      if (event.key === 'Escape') {
        closeRegionModal();
      } else if (event.key === 'Enter' && event.ctrlKey) {
        saveRegionName();
      }
    }
  });
}

// ========================================
// Utility Functions
// ========================================

/**
 * Generate unique region ID
 */
function generateRegionId() {
  return 'region_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Show success message
 */
function showSuccess(message) {
  // You can implement a toast notification system here
  console.log('Success:', message);
  
  // Simple alert for now
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
 * Show error message
 */
function showError(message) {
  console.error('Error:', message);
  alert(message);
}

/**
 * Show loading indicator
 */
function showLoading(message = 'Loading...') {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'flex';
    const text = loading.querySelector('div:last-child');
    if (text) {
      text.textContent = message;
    }
  }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

// ========================================
// Export Functions
// ========================================

// Make functions available globally
window.RegionManager = RegionManager;
window.initRegionManager = initRegionManager;
window.addRegion = addRegion;
window.updateRegion = updateRegion;
window.deleteRegion = deleteRegion;
window.clearAllRegions = clearAllRegions;
window.saveRegions = saveRegions;
window.loadRegions = loadRegions;
window.openRegionModal = openRegionModal;
window.closeRegionModal = closeRegionModal;
window.saveRegionName = saveRegionName;
window.updateRegionNameInput = updateRegionNameInput;
window.editRegion = editRegion;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initRegionManager();
});
