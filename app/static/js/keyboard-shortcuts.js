/**
 * Keyboard Shortcuts JavaScript for CRE PDF Extractor
 * Handles global keyboard shortcuts and hotkeys
 */

// ========================================
// Keyboard Shortcuts State Management
// ========================================

const KeyboardShortcuts = {
  // Shortcut State
  enabled: true,
  modifiers: {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  },
  
  // Shortcut Definitions
  shortcuts: {
    // File Operations
    'ctrl+o': { action: 'openFile', description: 'Open PDF file' },
    'ctrl+s': { action: 'saveRegions', description: 'Save regions' },
    'ctrl+shift+s': { action: 'saveAs', description: 'Save as...' },
    
    // Navigation
    'arrowright': { action: 'nextPage', description: 'Next page' },
    'arrowleft': { action: 'previousPage', description: 'Previous page' },
    'home': { action: 'firstPage', description: 'First page' },
    'end': { action: 'lastPage', description: 'Last page' },
    'ctrl+g': { action: 'goToPage', description: 'Go to page' },
    
    // Zoom and View
    'ctrl+plus': { action: 'zoomIn', description: 'Zoom in' },
    'ctrl+minus': { action: 'zoomOut', description: 'Zoom out' },
    'ctrl+0': { action: 'resetZoom', description: 'Reset zoom' },
    'space': { action: 'togglePan', description: 'Toggle pan mode' },
    
    // Region Management
    'r': { action: 'startDrawing', description: 'Start drawing region' },
    'escape': { action: 'cancelDrawing', description: 'Cancel drawing' },
    'delete': { action: 'deleteSelectedRegion', description: 'Delete selected region' },
    'ctrl+z': { action: 'undo', description: 'Undo last action' },
    'ctrl+y': { action: 'redo', description: 'Redo last action' },
    
    // Data Extraction
    'ctrl+e': { action: 'extractData', description: 'Extract data' },
    'ctrl+shift+e': { action: 'batchExtract', description: 'Batch extract' },
    'f5': { action: 'testOcr', description: 'Test OCR' },
    
    // Excel Preview
    'ctrl+p': { action: 'togglePreview', description: 'Toggle Excel preview' },
    'ctrl+shift+c': { action: 'addColumn', description: 'Add column' },
    'ctrl+shift+r': { action: 'removeColumn', description: 'Remove column' },
    
    // Export
    'ctrl+shift+x': { action: 'exportCsv', description: 'Export to CSV' },
    'ctrl+shift+e': { action: 'exportExcel', description: 'Export to Excel' },
    
    // AI Features
    'ctrl+shift+a': { action: 'toggleAI', description: 'Toggle AI features' },
    'ctrl+shift+i': { action: 'aiInsights', description: 'Show AI insights' },
    
    // General
    'f1': { action: 'showHelp', description: 'Show help' },
    'ctrl+shift+h': { action: 'showShortcuts', description: 'Show shortcuts' },
    'ctrl+shift+r': { action: 'resetSession', description: 'Reset session' }
  },
  
  // History for undo/redo
  history: [],
  historyIndex: -1,
  maxHistory: 50
};

// ========================================
// Keyboard Shortcuts Initialization
// ========================================

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts() {
  // Set up event listeners
  setupKeyboardEventListeners();
  
  // Create help overlay
  createHelpOverlay();
  
  // Load user preferences
  loadShortcutPreferences();
  
  console.log('Keyboard shortcuts initialized');
}

/**
 * Set up keyboard event listeners
 */
function setupKeyboardEventListeners() {
  // Global keyboard events
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Prevent shortcuts in input fields
  document.addEventListener('keydown', (event) => {
    if (isInputField(event.target)) {
      return;
    }
  });
  
  // Track modifier keys
  document.addEventListener('keydown', (event) => {
    updateModifiers(event, true);
  });
  
  document.addEventListener('keyup', (event) => {
    updateModifiers(event, false);
  });
}

/**
 * Handle key down events
 */
function handleKeyDown(event) {
  if (!KeyboardShortcuts.enabled) return;
  
  // Don't trigger shortcuts in input fields
  if (isInputField(event.target)) return;
  
  // Get the shortcut key
  const shortcut = getShortcutKey(event);
  
  // Check if shortcut exists
  if (KeyboardShortcuts.shortcuts[shortcut]) {
    event.preventDefault();
    executeShortcut(shortcut);
  }
}

/**
 * Handle key up events
 */
function handleKeyUp(event) {
  // Update modifiers
  updateModifiers(event, false);
}

/**
 * Update modifier key states
 */
function updateModifiers(event, isPressed) {
  switch (event.key.toLowerCase()) {
    case 'control':
      KeyboardShortcuts.modifiers.ctrl = isPressed;
      break;
    case 'shift':
      KeyboardShortcuts.modifiers.shift = isPressed;
      break;
    case 'alt':
      KeyboardShortcuts.modifiers.alt = isPressed;
      break;
    case 'meta':
      KeyboardShortcuts.modifiers.meta = isPressed;
      break;
  }
}

/**
 * Get shortcut key string
 */
function getShortcutKey(event) {
  const modifiers = [];
  
  if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
  if (event.shiftKey) modifiers.push('shift');
  if (event.altKey) modifiers.push('alt');
  
  let key = event.key.toLowerCase();
  
  // Handle special keys
  switch (event.code) {
    case 'ArrowRight':
      key = 'arrowright';
      break;
    case 'ArrowLeft':
      key = 'arrowleft';
      break;
    case 'ArrowUp':
      key = 'arrowup';
      break;
    case 'ArrowDown':
      key = 'arrowdown';
      break;
    case 'Equal':
      key = 'plus';
      break;
    case 'Minus':
      key = 'minus';
      break;
    case 'Digit0':
      key = '0';
      break;
    case 'Space':
      key = 'space';
      break;
    case 'Escape':
      key = 'escape';
      break;
    case 'Delete':
      key = 'delete';
      break;
    case 'F1':
      key = 'f1';
      break;
    case 'F5':
      key = 'f5';
      break;
  }
  
  if (modifiers.length > 0) {
    return modifiers.join('+') + '+' + key;
  }
  
  return key;
}

/**
 * Check if element is an input field
 */
function isInputField(element) {
  if (!element) return false;
  
  const inputTypes = ['input', 'textarea', 'select'];
  const contentEditable = element.contentEditable === 'true';
  
  return inputTypes.includes(element.tagName.toLowerCase()) || contentEditable;
}

// ========================================
// Shortcut Execution
// ========================================

/**
 * Execute shortcut action
 */
function executeShortcut(shortcut) {
  const shortcutDef = KeyboardShortcuts.shortcuts[shortcut];
  
  if (!shortcutDef) return;
  
  console.log(`Executing shortcut: ${shortcut} - ${shortcutDef.description}`);
  
  // Add to history
  addToHistory(shortcutDef.action);
  
  // Execute the action
  switch (shortcutDef.action) {
    // File Operations
    case 'openFile':
      openFileDialog();
      break;
    case 'saveRegions':
      if (window.saveRegions) window.saveRegions();
      break;
    case 'saveAs':
      saveAsDialog();
      break;
    
    // Navigation
    case 'nextPage':
      if (window.nextPage) window.nextPage();
      break;
    case 'previousPage':
      if (window.previousPage) window.previousPage();
      break;
    case 'firstPage':
      if (window.goToPage) window.goToPage(1);
      break;
    case 'lastPage':
      if (window.PDFViewer && window.goToPage) {
        window.goToPage(window.PDFViewer.totalPages);
      }
      break;
    case 'goToPage':
      showGoToPageDialog();
      break;
    
    // Zoom and View
    case 'zoomIn':
      if (window.zoomIn) window.zoomIn();
      break;
    case 'zoomOut':
      if (window.zoomOut) window.zoomOut();
      break;
    case 'resetZoom':
      if (window.resetZoom) window.resetZoom();
      break;
    case 'togglePan':
      if (window.togglePanMode) window.togglePanMode();
      break;
    
    // Region Management
    case 'startDrawing':
      startRegionDrawing();
      break;
    case 'cancelDrawing':
      cancelRegionDrawing();
      break;
    case 'deleteSelectedRegion':
      deleteSelectedRegion();
      break;
    case 'undo':
      undoLastAction();
      break;
    case 'redo':
      redoLastAction();
      break;
    
    // Data Extraction
    case 'extractData':
      if (window.extractData) window.extractData();
      break;
    case 'batchExtract':
      if (window.startBatchProcessing) window.startBatchProcessing();
      break;
    case 'testOcr':
      if (window.testOcr) window.testOcr();
      break;
    
    // Excel Preview
    case 'togglePreview':
      if (window.togglePreview) window.togglePreview();
      break;
    case 'addColumn':
      if (window.addColumn) window.addColumn();
      break;
    case 'removeColumn':
      if (window.removeColumn) window.removeColumn();
      break;
    
    // Export
    case 'exportCsv':
      if (window.exportToCSV) window.exportToCSV();
      break;
    case 'exportExcel':
      if (window.exportToExcel) window.exportToExcel();
      break;
    
    // AI Features
    case 'toggleAI':
      toggleAIFeatures();
      break;
    case 'aiInsights':
      showAIInsights();
      break;
    
    // General
    case 'showHelp':
      showHelp();
      break;
    case 'showShortcuts':
      showShortcutsHelp();
      break;
    case 'resetSession':
      if (window.clearSession) window.clearSession();
      break;
  }
}

// ========================================
// Action Implementations
// ========================================

/**
 * Open file dialog
 */
function openFileDialog() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.click();
  }
}

/**
 * Save as dialog
 */
function saveAsDialog() {
  // This would typically open a save dialog
  console.log('Save as dialog requested');
}

/**
 * Show go to page dialog
 */
function showGoToPageDialog() {
  const pageNumber = prompt('Enter page number:');
  if (pageNumber && !isNaN(pageNumber)) {
    const page = parseInt(pageNumber);
    if (window.goToPage) {
      window.goToPage(page);
    }
  }
}

/**
 * Start region drawing
 */
function startRegionDrawing() {
  // This would typically start drawing mode
  console.log('Region drawing started');
}

/**
 * Cancel region drawing
 */
function cancelRegionDrawing() {
  // This would typically cancel drawing mode
  console.log('Region drawing cancelled');
}

/**
 * Delete selected region
 */
function deleteSelectedRegion() {
  // This would typically delete the currently selected region
  console.log('Selected region deleted');
}

/**
 * Undo last action
 */
function undoLastAction() {
  if (KeyboardShortcuts.historyIndex > 0) {
    KeyboardShortcuts.historyIndex--;
    const action = KeyboardShortcuts.history[KeyboardShortcuts.historyIndex];
    console.log('Undoing:', action);
    // Implement undo logic here
  }
}

/**
 * Redo last action
 */
function redoLastAction() {
  if (KeyboardShortcuts.historyIndex < KeyboardShortcuts.history.length - 1) {
    KeyboardShortcuts.historyIndex++;
    const action = KeyboardShortcuts.history[KeyboardShortcuts.historyIndex];
    console.log('Redoing:', action);
    // Implement redo logic here
  }
}

/**
 * Toggle AI features
 */
function toggleAIFeatures() {
  if (window.enableAIFeatures) {
    window.enableAIFeatures();
  }
}

/**
 * Show AI insights
 */
function showAIInsights() {
  // This would typically show AI insights panel
  console.log('AI insights shown');
}

/**
 * Show help
 */
function showHelp() {
  // This would typically show help documentation
  console.log('Help shown');
}

/**
 * Show shortcuts help
 */
function showShortcutsHelp() {
  const helpOverlay = document.getElementById('shortcutsHelp');
  if (helpOverlay) {
    helpOverlay.style.display = 'flex';
  }
}

// ========================================
// History Management
// ========================================

/**
 * Add action to history
 */
function addToHistory(action) {
  // Remove any actions after current index
  KeyboardShortcuts.history = KeyboardShortcuts.history.slice(0, KeyboardShortcuts.historyIndex + 1);
  
  // Add new action
  KeyboardShortcuts.history.push({
    action: action,
    timestamp: Date.now()
  });
  
  // Update index
  KeyboardShortcuts.historyIndex = KeyboardShortcuts.history.length - 1;
  
  // Limit history size
  if (KeyboardShortcuts.history.length > KeyboardShortcuts.maxHistory) {
    KeyboardShortcuts.history.shift();
    KeyboardShortcuts.historyIndex--;
  }
}

// ========================================
// Help Overlay
// ========================================

/**
 * Create help overlay
 */
function createHelpOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'shortcutsHelp';
  overlay.className = 'shortcuts-help-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.className = 'shortcuts-help-content';
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
  `;
  
  const title = document.createElement('h2');
  title.textContent = 'Keyboard Shortcuts';
  title.style.cssText = `
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
  `;
  closeBtn.onclick = () => {
    overlay.style.display = 'none';
  };
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const shortcutsList = document.createElement('div');
  shortcutsList.style.cssText = `
    display: grid;
    gap: 12px;
  `;
  
  // Group shortcuts by category
  const categories = {
    'File Operations': ['ctrl+o', 'ctrl+s', 'ctrl+shift+s'],
    'Navigation': ['arrowright', 'arrowleft', 'home', 'end', 'ctrl+g'],
    'Zoom & View': ['ctrl+plus', 'ctrl+minus', 'ctrl+0', 'space'],
    'Region Management': ['r', 'escape', 'delete', 'ctrl+z', 'ctrl+y'],
    'Data Extraction': ['ctrl+e', 'ctrl+shift+e', 'f5'],
    'Excel Preview': ['ctrl+p', 'ctrl+shift+c', 'ctrl+shift+r'],
    'Export': ['ctrl+shift+x', 'ctrl+shift+e'],
    'AI Features': ['ctrl+shift+a', 'ctrl+shift+i'],
    'General': ['f1', 'ctrl+shift+h', 'ctrl+shift+r']
  };
  
  Object.entries(categories).forEach(([category, shortcutKeys]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.style.cssText = `
      margin-bottom: 20px;
    `;
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.textContent = category;
    categoryTitle.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    `;
    
    categoryDiv.appendChild(categoryTitle);
    
    shortcutKeys.forEach(shortcutKey => {
      const shortcutDef = KeyboardShortcuts.shortcuts[shortcutKey];
      if (shortcutDef) {
        const shortcutDiv = document.createElement('div');
        shortcutDiv.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        `;
        
        const description = document.createElement('span');
        description.textContent = shortcutDef.description;
        description.style.cssText = `
          color: #4b5563;
          font-size: 0.875rem;
        `;
        
        const key = document.createElement('kbd');
        key.textContent = shortcutKey;
        key.style.cssText = `
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.75rem;
          font-family: monospace;
          color: #374151;
        `;
        
        shortcutDiv.appendChild(description);
        shortcutDiv.appendChild(key);
        categoryDiv.appendChild(shortcutDiv);
      }
    });
    
    shortcutsList.appendChild(categoryDiv);
  });
  
  content.appendChild(header);
  content.appendChild(shortcutsList);
  overlay.appendChild(content);
  
  // Close on backdrop click
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      overlay.style.display = 'none';
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.style.display === 'flex') {
      overlay.style.display = 'none';
    }
  });
  
  document.body.appendChild(overlay);
}

// ========================================
// Preferences Management
// ========================================

/**
 * Load shortcut preferences
 */
function loadShortcutPreferences() {
  try {
    const preferences = localStorage.getItem('cre_pdf_shortcuts');
    if (preferences) {
      const parsed = JSON.parse(preferences);
      KeyboardShortcuts.enabled = parsed.enabled !== false;
    }
  } catch (error) {
    console.error('Error loading shortcut preferences:', error);
  }
}

/**
 * Save shortcut preferences
 */
function saveShortcutPreferences() {
  try {
    const preferences = {
      enabled: KeyboardShortcuts.enabled
    };
    localStorage.setItem('cre_pdf_shortcuts', JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving shortcut preferences:', error);
  }
}

/**
 * Toggle shortcuts enabled/disabled
 */
function toggleShortcuts() {
  KeyboardShortcuts.enabled = !KeyboardShortcuts.enabled;
  saveShortcutPreferences();
  
  const status = KeyboardShortcuts.enabled ? 'enabled' : 'disabled';
  console.log(`Keyboard shortcuts ${status}`);
  
  // Show notification
  showNotification(`Keyboard shortcuts ${status}`, KeyboardShortcuts.enabled ? 'success' : 'warning');
}

// ========================================
// Utility Functions
// ========================================

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'shortcut-notification';
  notification.textContent = message;
  
  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10001;
    animation: slideIn 0.3s ease-out;
    font-size: 0.875rem;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ========================================
// Export Functions
// ========================================

// Make functions available globally
window.KeyboardShortcuts = KeyboardShortcuts;
window.initKeyboardShortcuts = initKeyboardShortcuts;
window.toggleShortcuts = toggleShortcuts;
window.showShortcutsHelp = showShortcutsHelp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initKeyboardShortcuts();
});
