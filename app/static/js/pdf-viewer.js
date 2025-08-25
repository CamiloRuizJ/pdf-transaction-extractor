/**
 * PDF Viewer JavaScript for RExeli
 * Handles PDF rendering, zooming, panning, and canvas interactions
 */

// ========================================
// PDF Viewer State Management
// ========================================

const PDFViewer = {
  // PDF State
  pdfDoc: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.0,
  minScale: 0.5,
  maxScale: 3.0,
  
  // Canvas State
  canvas: null,
  ctx: null,
  canvasContainer: null,
  
  // Interaction State
  isPanning: false,
  isDrawing: false,
  panStart: { x: 0, y: 0 },
  panOffset: { x: 0, y: 0 },
  
  // Zoom State
  zoomLevel: 1.0,
  zoomStep: 0.2,
  
  // Region Drawing State
  drawingStart: { x: 0, y: 0 },
  currentRegion: null,
  
  // Performance
  renderQueue: [],
  isRendering: false
};

// ========================================
// PDF Loading and Rendering
// ========================================

/**
 * Initialize PDF viewer
 */
function initPDFViewer() {
  PDFViewer.canvas = document.getElementById('pdfCanvas');
  PDFViewer.ctx = PDFViewer.canvas.getContext('2d');
  PDFViewer.canvasContainer = document.getElementById('canvasContainer');
  
  // Set up canvas event listeners
  setupCanvasEventListeners();
  
  // Set up keyboard shortcuts
  setupKeyboardShortcuts();
  
  console.log('PDF Viewer initialized');
}

/**
 * Load PDF file
 */
async function loadPDF(file) {
  try {
    showLoading('Loading PDF...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload PDF');
    }
    
    const result = await response.json();
    
    if (result.success) {
      await renderPDF(result.filename);
      updateFileInfo(result.filename, result.pageCount);
      showPDFViewer();
      hideLoading();
    } else {
      throw new Error(result.error || 'Failed to process PDF');
    }
  } catch (error) {
    console.error('Error loading PDF:', error);
    hideLoading();
    showError('Failed to load PDF: ' + error.message);
  }
}

/**
 * Render PDF page
 */
async function renderPDF(filename) {
  try {
    const response = await fetch(`/render_pdf?filename=${filename}&page=${PDFViewer.currentPage}&scale=${PDFViewer.scale}`);
    
    if (!response.ok) {
      throw new Error('Failed to render PDF');
    }
    
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    
    await loadImageAndRender(imageUrl);
    
    updatePageInfo();
    updateZoomLevel();
    
  } catch (error) {
    console.error('Error rendering PDF:', error);
    showError('Failed to render PDF page');
  }
}

/**
 * Load image and render to canvas
 */
function loadImageAndRender(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Set canvas dimensions
      PDFViewer.canvas.width = img.width;
      PDFViewer.canvas.height = img.height;
      
      // Clear canvas
      PDFViewer.ctx.clearRect(0, 0, PDFViewer.canvas.width, PDFViewer.canvas.height);
      
      // Draw image
      PDFViewer.ctx.drawImage(img, 0, 0);
      
      // Draw existing regions
      drawAllRegions();
      
      // Clean up
      URL.revokeObjectURL(imageUrl);
      resolve();
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

// ========================================
// Zoom and Pan Controls
// ========================================

/**
 * Zoom in
 */
function zoomIn() {
  const newScale = Math.min(PDFViewer.scale + PDFViewer.zoomStep, PDFViewer.maxScale);
  if (newScale !== PDFViewer.scale) {
    PDFViewer.scale = newScale;
    renderPDF(getCurrentFilename());
  }
}

/**
 * Zoom out
 */
function zoomOut() {
  const newScale = Math.max(PDFViewer.scale - PDFViewer.zoomStep, PDFViewer.minScale);
  if (newScale !== PDFViewer.scale) {
    PDFViewer.scale = newScale;
    renderPDF(getCurrentFilename());
  }
}

/**
 * Reset zoom
 */
function resetZoom() {
  PDFViewer.scale = 1.0;
  PDFViewer.panOffset = { x: 0, y: 0 };
  renderPDF(getCurrentFilename());
}

/**
 * Update zoom level display
 */
function updateZoomLevel() {
  const zoomElement = document.getElementById('zoomLevel');
  if (zoomElement) {
    zoomElement.textContent = Math.round(PDFViewer.scale * 100) + '%';
  }
}

/**
 * Toggle pan mode
 */
function togglePanMode() {
  PDFViewer.isPanning = !PDFViewer.isPanning;
  const panBtn = document.getElementById('panBtn');
  
  if (panBtn) {
    if (PDFViewer.isPanning) {
      panBtn.classList.add('active');
      panBtn.title = 'Pan Mode Active (Click to disable)';
      PDFViewer.canvas.style.cursor = 'grab';
    } else {
      panBtn.classList.remove('active');
      panBtn.title = 'Toggle Pan Mode (or hold Space)';
      PDFViewer.canvas.style.cursor = 'crosshair';
    }
  }
}

// ========================================
// Page Navigation
// ========================================

/**
 * Go to next page
 */
function nextPage() {
  if (PDFViewer.currentPage < PDFViewer.totalPages) {
    PDFViewer.currentPage++;
    renderPDF(getCurrentFilename());
  }
}

/**
 * Go to previous page
 */
function previousPage() {
  if (PDFViewer.currentPage > 1) {
    PDFViewer.currentPage--;
    renderPDF(getCurrentFilename());
  }
}

/**
 * Go to specific page
 */
function goToPage(pageNumber) {
  if (pageNumber >= 1 && pageNumber <= PDFViewer.totalPages) {
    PDFViewer.currentPage = pageNumber;
    renderPDF(getCurrentFilename());
  }
}

/**
 * Update page information display
 */
function updatePageInfo() {
  const currentPageElement = document.getElementById('currentPage');
  const pageCountElement = document.getElementById('pageCount');
  
  if (currentPageElement) {
    currentPageElement.textContent = PDFViewer.currentPage;
  }
  
  if (pageCountElement) {
    pageCountElement.textContent = PDFViewer.totalPages;
  }
}

// ========================================
// Canvas Event Handling
// ========================================

/**
 * Set up canvas event listeners
 */
function setupCanvasEventListeners() {
  if (!PDFViewer.canvas) return;
  
  // Mouse events for region drawing
  PDFViewer.canvas.addEventListener('mousedown', handleMouseDown);
  PDFViewer.canvas.addEventListener('mousemove', handleMouseMove);
  PDFViewer.canvas.addEventListener('mouseup', handleMouseUp);
  
  // Touch events for mobile
  PDFViewer.canvas.addEventListener('touchstart', handleTouchStart);
  PDFViewer.canvas.addEventListener('touchmove', handleTouchMove);
  PDFViewer.canvas.addEventListener('touchend', handleTouchEnd);
  
  // Wheel event for zooming
  PDFViewer.canvas.addEventListener('wheel', handleWheel);
  
  // Context menu
  PDFViewer.canvas.addEventListener('contextmenu', handleContextMenu);
}

/**
 * Handle mouse down event
 */
function handleMouseDown(event) {
  event.preventDefault();
  
  const rect = PDFViewer.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / PDFViewer.scale;
  const y = (event.clientY - rect.top) / PDFViewer.scale;
  
  if (event.button === 0) { // Left click
    if (PDFViewer.isPanning) {
      // Start panning
      PDFViewer.panStart = { x: event.clientX, y: event.clientY };
      PDFViewer.canvas.style.cursor = 'grabbing';
    } else {
      // Start drawing region
      PDFViewer.isDrawing = true;
      PDFViewer.drawingStart = { x, y };
      PDFViewer.currentRegion = {
        x: x,
        y: y,
        width: 0,
        height: 0
      };
    }
  }
}

/**
 * Handle mouse move event
 */
function handleMouseMove(event) {
  event.preventDefault();
  
  const rect = PDFViewer.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / PDFViewer.scale;
  const y = (event.clientY - rect.top) / PDFViewer.scale;
  
  if (PDFViewer.isPanning && PDFViewer.panStart) {
    // Handle panning
    const deltaX = event.clientX - PDFViewer.panStart.x;
    const deltaY = event.clientY - PDFViewer.panStart.y;
    
    PDFViewer.panOffset.x += deltaX;
    PDFViewer.panOffset.y += deltaY;
    
    PDFViewer.panStart = { x: event.clientX, y: event.clientY };
    
    // Apply pan transform
    PDFViewer.ctx.save();
    PDFViewer.ctx.translate(PDFViewer.panOffset.x, PDFViewer.panOffset.y);
    renderPDF(getCurrentFilename());
    PDFViewer.ctx.restore();
  } else if (PDFViewer.isDrawing && PDFViewer.currentRegion) {
    // Update current region
    PDFViewer.currentRegion.width = x - PDFViewer.drawingStart.x;
    PDFViewer.currentRegion.height = y - PDFViewer.drawingStart.y;
    
    // Redraw canvas with current region
    redrawCanvasWithCurrentRegion();
  }
}

/**
 * Handle mouse up event
 */
function handleMouseUp(event) {
  event.preventDefault();
  
  if (PDFViewer.isPanning) {
    PDFViewer.canvas.style.cursor = 'grab';
  } else if (PDFViewer.isDrawing && PDFViewer.currentRegion) {
    // Finish drawing region
    PDFViewer.isDrawing = false;
    
    // Ensure positive dimensions
    if (PDFViewer.currentRegion.width < 0) {
      PDFViewer.currentRegion.x += PDFViewer.currentRegion.width;
      PDFViewer.currentRegion.width = Math.abs(PDFViewer.currentRegion.width);
    }
    if (PDFViewer.currentRegion.height < 0) {
      PDFViewer.currentRegion.y += PDFViewer.currentRegion.height;
      PDFViewer.currentRegion.height = Math.abs(PDFViewer.currentRegion.height);
    }
    
    // Only add region if it has minimum size
    if (PDFViewer.currentRegion.width > 10 && PDFViewer.currentRegion.height > 10) {
      addRegion(PDFViewer.currentRegion);
    }
    
    PDFViewer.currentRegion = null;
  }
}

/**
 * Handle wheel event for zooming
 */
function handleWheel(event) {
  event.preventDefault();
  
  if (event.ctrlKey || event.metaKey) {
    const delta = event.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(PDFViewer.minScale, 
                             Math.min(PDFViewer.maxScale, 
                                     PDFViewer.scale + (delta * PDFViewer.zoomStep)));
    
    if (newScale !== PDFViewer.scale) {
      PDFViewer.scale = newScale;
      renderPDF(getCurrentFilename());
    }
  }
}

/**
 * Handle context menu
 */
function handleContextMenu(event) {
  event.preventDefault();
  // Could add context menu for region management
}

// ========================================
// Touch Event Handling
// ========================================

/**
 * Handle touch start event
 */
function handleTouchStart(event) {
  event.preventDefault();
  
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    const rect = PDFViewer.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / PDFViewer.scale;
    const y = (touch.clientY - rect.top) / PDFViewer.scale;
    
    PDFViewer.drawingStart = { x, y };
    PDFViewer.isDrawing = true;
    PDFViewer.currentRegion = {
      x: x,
      y: y,
      width: 0,
      height: 0
    };
  }
}

/**
 * Handle touch move event
 */
function handleTouchMove(event) {
  event.preventDefault();
  
  if (event.touches.length === 1 && PDFViewer.isDrawing) {
    const touch = event.touches[0];
    const rect = PDFViewer.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / PDFViewer.scale;
    const y = (touch.clientY - rect.top) / PDFViewer.scale;
    
    PDFViewer.currentRegion.width = x - PDFViewer.drawingStart.x;
    PDFViewer.currentRegion.height = y - PDFViewer.drawingStart.y;
    
    redrawCanvasWithCurrentRegion();
  }
}

/**
 * Handle touch end event
 */
function handleTouchEnd(event) {
  event.preventDefault();
  
  if (PDFViewer.isDrawing && PDFViewer.currentRegion) {
    PDFViewer.isDrawing = false;
    
    // Ensure positive dimensions
    if (PDFViewer.currentRegion.width < 0) {
      PDFViewer.currentRegion.x += PDFViewer.currentRegion.width;
      PDFViewer.currentRegion.width = Math.abs(PDFViewer.currentRegion.width);
    }
    if (PDFViewer.currentRegion.height < 0) {
      PDFViewer.currentRegion.y += PDFViewer.currentRegion.height;
      PDFViewer.currentRegion.height = Math.abs(PDFViewer.currentRegion.height);
    }
    
    // Only add region if it has minimum size
    if (PDFViewer.currentRegion.width > 10 && PDFViewer.currentRegion.height > 10) {
      addRegion(PDFViewer.currentRegion);
    }
    
    PDFViewer.currentRegion = null;
  }
}

// ========================================
// Region Drawing and Management
// ========================================

/**
 * Redraw canvas with current region
 */
function redrawCanvasWithCurrentRegion() {
  if (!PDFViewer.currentRegion) return;
  
  // Redraw the PDF page
  renderPDF(getCurrentFilename()).then(() => {
    // Draw current region
    drawRegion(PDFViewer.currentRegion, '#6366f1', 2, true);
  });
}

/**
 * Draw a region on canvas
 */
function drawRegion(region, color = '#6366f1', lineWidth = 2, isCurrent = false) {
  if (!PDFViewer.ctx) return;
  
  PDFViewer.ctx.save();
  
  // Set line style
  PDFViewer.ctx.strokeStyle = color;
  PDFViewer.ctx.lineWidth = lineWidth;
  PDFViewer.ctx.setLineDash(isCurrent ? [5, 5] : []);
  
  // Draw rectangle
  PDFViewer.ctx.strokeRect(
    region.x * PDFViewer.scale,
    region.y * PDFViewer.scale,
    region.width * PDFViewer.scale,
    region.height * PDFViewer.scale
  );
  
  // Fill with semi-transparent color
  PDFViewer.ctx.fillStyle = color + '20';
  PDFViewer.ctx.fillRect(
    region.x * PDFViewer.scale,
    region.y * PDFViewer.scale,
    region.width * PDFViewer.scale,
    region.height * PDFViewer.scale
  );
  
  PDFViewer.ctx.restore();
}

/**
 * Draw all regions
 */
function drawAllRegions() {
  if (!window.regions || !window.regions.length) return;
  
  window.regions.forEach(region => {
    if (region.page === PDFViewer.currentPage) {
      drawRegion(region, '#6366f1', 2, false);
    }
  });
}

// ========================================
// Utility Functions
// ========================================

/**
 * Get current filename
 */
function getCurrentFilename() {
  return window.currentPDFFilename || '';
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

/**
 * Show PDF viewer
 */
function showPDFViewer() {
  const viewer = document.getElementById('pdfViewer');
  const upload = document.getElementById('uploadSection');
  
  if (viewer) viewer.style.display = 'block';
  if (upload) upload.style.display = 'none';
}

/**
 * Update file information
 */
function updateFileInfo(filename, pageCount) {
  window.currentPDFFilename = filename;
  PDFViewer.totalPages = pageCount;
  
  const fileNameElement = document.getElementById('fileName');
  if (fileNameElement) {
    fileNameElement.textContent = filename;
  }
}

/**
 * Show error message
 */
function showError(message) {
  // You can implement a toast notification system here
  console.error(message);
  alert(message);
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Space bar to toggle pan mode
    if (event.code === 'Space' && !event.target.matches('input, textarea')) {
      event.preventDefault();
      togglePanMode();
    }
    
    // Arrow keys for page navigation
    if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      event.preventDefault();
      nextPage();
    }
    
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      event.preventDefault();
      previousPage();
    }
    
    // Plus/Minus for zoom
    if (event.code === 'Equal' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      zoomIn();
    }
    
    if (event.code === 'Minus' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      zoomOut();
    }
    
    // Reset zoom
    if (event.code === 'Digit0' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      resetZoom();
    }
  });
  
  // Release pan mode when space is released
  document.addEventListener('keyup', (event) => {
    if (event.code === 'Space' && PDFViewer.isPanning) {
      togglePanMode();
    }
  });
}

// ========================================
// Export Functions
// ========================================

// Make functions available globally
window.PDFViewer = PDFViewer;
window.initPDFViewer = initPDFViewer;
window.loadPDF = loadPDF;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.togglePanMode = togglePanMode;
window.nextPage = nextPage;
window.previousPage = previousPage;
window.goToPage = goToPage;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initPDFViewer();
});
