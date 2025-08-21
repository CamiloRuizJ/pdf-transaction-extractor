// PDF Viewer functionality
let currentRegions = [];
let selectedRegion = null;
let isDrawing = false;
let startX, startY;
let currentPage = 0;
let totalPages = 0;
let canvas, ctx;
let pdfImage = null;

// Zoom and pan variables
let zoomLevel = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let originalImageWidth = 0;
let originalImageHeight = 0;

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const pdfViewer = document.getElementById('pdfViewer');
const pdfCanvas = document.getElementById('pdfCanvas');
const loading = document.getElementById('loading');

// Initialize canvas
function initCanvas() {
    canvas = pdfCanvas;
    ctx = canvas.getContext('2d');
    
    // Force canvas to recognize full screen size
    const container = document.getElementById('canvasContainer');
    if (container) {
        // Get the actual computed dimensions
        const computedStyle = window.getComputedStyle(container);
        const width = parseInt(computedStyle.width);
        const height = parseInt(computedStyle.height);
        
        // Set canvas size with device pixel ratio for high resolution
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        
        // Set CSS size to maintain display size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Scale context to account for device pixel ratio
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        console.log('Canvas initialized with size:', width, 'x', height, 'device ratio:', devicePixelRatio);
    } else {
        // Fallback sizes
        canvas.width = 1200;
        canvas.height = 800;
        console.log('Canvas initialized with fallback size');
    }
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', selectRegion);
    
    // Set initial canvas state for cursor behavior
    const canvasContainer = document.getElementById('canvasContainer');
    if (canvasContainer) {
        canvasContainer.classList.add('selecting');
    }
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    if (container) {
        // Get the actual computed dimensions
        const computedStyle = window.getComputedStyle(container);
        const newWidth = parseInt(computedStyle.width);
        const newHeight = parseInt(computedStyle.height);
        
        // Get current canvas display size
        const currentDisplayWidth = parseInt(canvas.style.width) || canvas.width;
        const currentDisplayHeight = parseInt(canvas.style.height) || canvas.height;
        
        // Only resize if dimensions actually changed
        if (currentDisplayWidth !== newWidth || currentDisplayHeight !== newHeight) {
            // Set canvas size with device pixel ratio for high resolution
            const devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = newWidth * devicePixelRatio;
            canvas.height = newHeight * devicePixelRatio;
            
            // Set CSS size to maintain display size
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
            
            // Reset context and scale for device pixel ratio
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(devicePixelRatio, devicePixelRatio);
            
            console.log('Canvas resized to:', newWidth, 'x', newHeight, 'device ratio:', devicePixelRatio);
            
            // Only redraw if we have a PDF image loaded
            if (pdfImage) {
                redrawCanvas();
            }
        }
    }
}

// Enhanced zoom functions for better accuracy
function zoomIn() {
    const oldZoom = zoomLevel;
    zoomLevel = Math.min(zoomLevel * 1.25, 8.0); // Increased max zoom to 800%
    
    // Zoom towards mouse position for better UX
    if (zoomLevel !== oldZoom) {
        updateZoom();
    }
}

function zoomOut() {
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(zoomLevel / 1.25, 0.1); // Minimum 10% zoom
    
    if (zoomLevel !== oldZoom) {
        updateZoom();
    }
}

function resetZoom() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    updateZoom();
}

function updateZoom() {
    const zoomLevelElement = document.getElementById('zoomLevel');
    zoomLevelElement.textContent = Math.round(zoomLevel * 100) + '%';
    
    // Add visual feedback for zoom changes
    zoomLevelElement.style.transform = 'scale(1.2)';
    zoomLevelElement.style.color = '#007bff';
    setTimeout(() => {
        zoomLevelElement.style.transform = 'scale(1)';
        zoomLevelElement.style.color = '#495057';
    }, 200);
    
    redrawCanvas();
}

// Enhanced pan functions with proper button behavior
let isPanButtonPressed = false;

function togglePanMode() {
    isPanning = !isPanning;
    const panBtn = document.getElementById('panBtn');
    const canvasContainer = document.getElementById('canvasContainer');
    
    if (isPanning) {
        panBtn.classList.add('active');
        canvas.classList.add('panning');
        canvasContainer.classList.add('panning');
        panBtn.textContent = '🖐️';
        panBtn.title = 'Pan Mode Active - Click to disable';
    } else {
        panBtn.classList.remove('active');
        canvas.classList.remove('panning');
        canvasContainer.classList.remove('panning');
        canvasContainer.classList.add('selecting');
        panBtn.textContent = '🖐️';
        panBtn.title = 'Pan Mode (Hold Space + Drag)';
    }
}

// Unified mouse event handlers
function handleMouseDown(e) {
    if (isPanning) {
        // Pan mode - start panning
        e.preventDefault();
        e.stopPropagation();
        isPanButtonPressed = true;
        panStartX = e.clientX - panX;
        panStartY = e.clientY - panY;
    } else {
        // Drawing mode - start drawing region
        startDrawing(e);
    }
}

function handleMouseMove(e) {
    if (isPanning && isPanButtonPressed) {
        // Pan mode - continue panning
        e.preventDefault();
        e.stopPropagation();
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        redrawCanvas();
    } else if (!isPanning && isDrawing) {
        // Drawing mode - continue drawing
        draw(e);
    }
}

function handleMouseUp(e) {
    if (isPanning) {
        // Pan mode - stop panning
        isPanButtonPressed = false;
    } else if (isDrawing) {
        // Drawing mode - stop drawing
        endDrawing(e);
    }
}

// Coordinate conversion helper functions
function screenToImageCoordinates(screenX, screenY) {
    const displayWidth = parseInt(canvas.style.width) || canvas.width;
    const displayHeight = parseInt(canvas.style.height) || canvas.height;
    const scale = Math.min(displayWidth / originalImageWidth, displayHeight / originalImageHeight);
    const scaledWidth = originalImageWidth * scale * zoomLevel;
    const scaledHeight = originalImageHeight * scale * zoomLevel;
    const x = (displayWidth - scaledWidth) / 2 + panX;
    const y = (displayHeight - scaledHeight) / 2 + panY;
    
    return {
        x: (screenX - x) / zoomLevel,
        y: (screenY - y) / zoomLevel
    };
}

function imageToScreenCoordinates(imageX, imageY) {
    const displayWidth = parseInt(canvas.style.width) || canvas.width;
    const displayHeight = parseInt(canvas.style.height) || canvas.height;
    const scale = Math.min(displayWidth / originalImageWidth, displayHeight / originalImageHeight);
    const scaledWidth = originalImageWidth * scale * zoomLevel;
    const scaledHeight = originalImageHeight * scale * zoomLevel;
    const x = (displayWidth - scaledWidth) / 2 + panX;
    const y = (displayHeight - scaledHeight) / 2 + panY;
    
    return {
        x: x + imageX * zoomLevel,
        y: y + imageY * zoomLevel
    };
}

function redrawCanvas() {
    if (!pdfImage) {
        console.log('No PDF image to draw');
        return;
    }
    
    console.log('Redrawing canvas...');
    
    // Get canvas display dimensions (not the high-res internal size)
    const displayWidth = parseInt(canvas.style.width) || canvas.width;
    const displayHeight = parseInt(canvas.style.height) || canvas.height;
    
    // Clear canvas using display dimensions
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // Calculate scaled dimensions based on display size
    const scale = Math.min(displayWidth / originalImageWidth, displayHeight / originalImageHeight);
    const scaledWidth = originalImageWidth * scale * zoomLevel;
    const scaledHeight = originalImageHeight * scale * zoomLevel;
    
    // Calculate position with pan offset
    const x = (displayWidth - scaledWidth) / 2 + panX;
    const y = (displayHeight - scaledHeight) / 2 + panY;
    
    console.log('Drawing image at:', x, y, 'with size:', scaledWidth, 'x', scaledHeight);
    console.log('Canvas display size:', displayWidth, 'x', displayHeight);
    console.log('Canvas internal size:', canvas.width, 'x', canvas.height);
    console.log('Original image size:', originalImageWidth, 'x', originalImageHeight);
    console.log('Scale:', scale, 'Zoom:', zoomLevel);
    
    // Save context, apply transformations, draw image, restore context
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.drawImage(pdfImage, 0, 0, originalImageWidth * scale, originalImageHeight * scale);
    ctx.restore();
    
    // Draw regions with zoom and pan adjustments
    drawRegions();
    
    console.log('Canvas redraw complete');
}

// File upload handling
fileInput.addEventListener('change', handleFileSelect);

uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        fileInput.files = files;
        handleFileSelect();
    }
});

async function handleFileSelect() {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        uploadSection.style.display = 'none';
        loading.style.display = 'block';

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            totalPages = data.page_count;
            currentPage = 0;
            currentRegions = [];
            
            document.getElementById('fileName').textContent = data.filename;
            document.getElementById('pageCount').textContent = totalPages;
            document.getElementById('currentPage').textContent = currentPage + 1;
            
            // Ensure canvas is properly initialized before loading page
            if (!canvas || !ctx) {
                initCanvas();
            }
            
            // Force canvas to recognize full screen size
            setTimeout(() => {
                resizeCanvas();
            }, 50);
            
            // Longer delay to ensure DOM is fully updated
            await new Promise(resolve => setTimeout(resolve, 200));
            
            await loadPage(currentPage);
            updateRegionList();
            enableButtons();
            
            // Show Excel preview and data extraction sections
            document.getElementById('excelPreviewSection').style.display = 'block';
            document.getElementById('dataExtractionSection').style.display = 'block';
            
            // Setup Excel preview drag and drop
            setupExcelPreviewDragAndDrop();
        } else {
            showStatus('Error: ' + data.error, 'error');
            uploadSection.style.display = 'block';
            loading.style.display = 'none';
        }
    } catch (error) {
        showStatus('Error uploading file: ' + error.message, 'error');
        uploadSection.style.display = 'block';
        loading.style.display = 'none';
    }
}

async function loadPage(pageNum) {
    try {
        console.log('Loading page:', pageNum);
        const response = await fetch(`/render_page/${pageNum}`);
        const data = await response.json();

        if (data.success) {
            console.log('Page data received:', data);
            pdfImage = new Image();
            pdfImage.onload = () => {
                console.log('PDF image loaded successfully');
                // Store original image dimensions
                originalImageWidth = data.width;
                originalImageHeight = data.height;
                
                // Reset zoom and pan
                zoomLevel = 1.0;
                panX = 0;
                panY = 0;
                
                // Force canvas resize to ensure proper dimensions
                setTimeout(() => {
                    resizeCanvas();
                    redrawCanvas();
                }, 50);
                
                loading.style.display = 'none';
                pdfViewer.style.display = 'block';
                
                console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
                console.log('Canvas display size:', canvas.style.width, 'x', canvas.style.height);
                console.log('Image dimensions:', originalImageWidth, 'x', originalImageHeight);
            };
            pdfImage.onerror = (error) => {
                console.error('Error loading PDF image:', error);
                showStatus('Error loading PDF image', 'error');
                loading.style.display = 'none';
            };
            pdfImage.src = data.image_path;
        } else {
            console.error('Error loading page:', data.error);
            showStatus('Error loading page: ' + data.error, 'error');
            loading.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in loadPage:', error);
        showStatus('Error loading page: ' + error.message, 'error');
        loading.style.display = 'none';
    }
}

// Enhanced drawing functionality for better accuracy with zoom
function startDrawing(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse coordinates to image coordinates with proper zoom handling
    const imageCoords = screenToImageCoordinates(mouseX, mouseY);
    startX = imageCoords.x;
    startY = imageCoords.y;
    isDrawing = true;
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse coordinates to image coordinates with proper zoom handling
    const imageCoords = screenToImageCoordinates(mouseX, mouseY);
    const currentX = imageCoords.x;
    const currentY = imageCoords.y;

    // Redraw canvas
    redrawCanvas();

    // Draw current selection with enhanced visual feedback
    const screenCoords = imageToScreenCoordinates(startX, startY);
    const screenEndCoords = imageToScreenCoordinates(currentX, currentY);
    
    ctx.save();
    
    // Draw selection rectangle
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    const rectX = Math.min(screenCoords.x, screenEndCoords.x);
    const rectY = Math.min(screenCoords.y, screenEndCoords.y);
    const rectWidth = Math.abs(screenEndCoords.x - screenCoords.x);
    const rectHeight = Math.abs(screenEndCoords.y - screenCoords.y);
    
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    
    // Draw semi-transparent fill
    ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    
    // Draw size indicator
    const imageWidth = Math.abs(currentX - startX);
    const imageHeight = Math.abs(currentY - startY);
    const scale = Math.min(canvas.width / originalImageWidth, canvas.height / originalImageHeight);
    const actualWidth = Math.round(imageWidth / scale);
    const actualHeight = Math.round(imageHeight / scale);
    
    ctx.fillStyle = '#007bff';
    ctx.font = '12px Arial';
    ctx.setLineDash([]);
    ctx.fillText(`${actualWidth} × ${actualHeight} px`, rectX + 5, rectY - 5);
    
    ctx.restore();
}

function endDrawing(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse coordinates to image coordinates with proper zoom handling
    const imageCoords = screenToImageCoordinates(mouseX, mouseY);
    const endX = imageCoords.x;
    const endY = imageCoords.y;

    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    console.log('Drawing ended - width:', width, 'height:', height);

    // Minimum size threshold adjusted for zoom level
    const minSize = 5; // Minimum 5 pixels in image coordinates
    if (width > minSize && height > minSize) {
        const region = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: width,
            height: height,
            name: ''
        };

        // Validate coordinates are within image bounds
        if (region.x < 0 || region.y < 0 || 
            region.x + region.width > originalImageWidth || 
            region.y + region.height > originalImageHeight) {
            console.log('Region outside image bounds, adjusting...');
            region.x = Math.max(0, region.x);
            region.y = Math.max(0, region.y);
            region.width = Math.min(region.width, originalImageWidth - region.x);
            region.height = Math.min(region.height, originalImageHeight - region.y);
        }

        console.log('Created region:', region);
        selectedRegion = region;
        openRegionModal();
    } else {
        console.log('Region too small, ignoring');
    }

    isDrawing = false;
}

function selectRegion(e) {
    // Don't process region selection if modal is open or if panning
    if (document.getElementById('regionModal').style.display === 'block' || isPanning) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click coordinates to image coordinates
    const imageCoords = screenToImageCoordinates(clickX, clickY);

    // Check if click is within any region (in image coordinates)
    for (let i = currentRegions.length - 1; i >= 0; i--) {
        const region = currentRegions[i];
        if (imageCoords.x >= region.x && imageCoords.x <= region.x + region.width &&
            imageCoords.y >= region.y && imageCoords.y <= region.y + region.height) {
            selectRegionByIndex(i);
            return;
        }
    }

    // Deselect if clicking outside regions
    selectedRegion = null;
    drawRegions();
}

function selectRegionByIndex(index) {
    selectedRegion = currentRegions[index];
    drawRegions();
}

function drawRegions() {
    currentRegions.forEach((region, index) => {
        const isSelected = selectedRegion === region;
        
        // Convert region coordinates to screen coordinates
        const screenCoords = imageToScreenCoordinates(region.x, region.y);
        const screenEndCoords = imageToScreenCoordinates(region.x + region.width, region.y + region.height);
        
        const rectX = screenCoords.x;
        const rectY = screenCoords.y;
        const rectWidth = screenEndCoords.x - screenCoords.x;
        const rectHeight = screenEndCoords.y - screenCoords.y;
        
        ctx.save();
        
        // Draw region rectangle
        ctx.strokeStyle = isSelected ? '#28a745' : '#007bff';
        ctx.lineWidth = 2;
        ctx.fillStyle = isSelected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)';
        
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

        // Draw label with better positioning
        const labelText = region.name;
        const labelWidth = ctx.measureText(labelText).width + 10;
        const labelHeight = 20;
        
        ctx.fillStyle = isSelected ? '#28a745' : '#007bff';
        ctx.fillRect(rectX, rectY - labelHeight, labelWidth, labelHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(labelText, rectX + 5, rectY - 5);
        
        // Draw region size indicator for selected regions
        if (isSelected) {
            const scale = Math.min(canvas.width / originalImageWidth, canvas.height / originalImageHeight);
            const actualWidth = Math.round(region.width / scale);
            const actualHeight = Math.round(region.height / scale);
            
            ctx.fillStyle = '#28a745';
            ctx.font = '10px Arial';
            ctx.fillText(`${actualWidth} × ${actualHeight} px`, rectX + rectWidth + 5, rectY + 15);
        }
        
        ctx.restore();
    });
}

// Initialize
initCanvas();
