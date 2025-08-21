// Keyboard shortcuts and event handling

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeRegionModal();
    }
    if (e.key === 'Enter' && document.getElementById('regionModal').style.display === 'block') {
        saveRegionName();
    }
    
    // Tab navigation in modal
    if (e.key === 'Tab' && document.getElementById('regionModal').style.display === 'block') {
        // Allow normal tab navigation
        return;
    }
    
    // Zoom shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '=':
            case '+':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                resetZoom();
                break;
        }
    }
    
    // Space bar for temporary pan mode (hold to pan)
    if (e.key === ' ' && !isPanning && !e.repeat && document.getElementById('regionModal').style.display !== 'block') {
        e.preventDefault();
        togglePanMode();
    }
});

// Release pan mode when space is released
document.addEventListener('keyup', (e) => {
    if (e.key === ' ' && isPanning) {
        togglePanMode();
    }
});
