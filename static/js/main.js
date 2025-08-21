// Smooth scroll for in-page anchors
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const el = document.querySelector(a.getAttribute('href'));
  if (el) { e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
});

// Placeholder tool functions so the page doesn't error if your real JS isn't loaded yet.
window.zoomIn = window.zoomIn || function(){ console.log('zoomIn() placeholder'); };
window.zoomOut = window.zoomOut || function(){ console.log('zoomOut() placeholder'); };
window.resetZoom = window.resetZoom || function(){ console.log('resetZoom() placeholder'); };
window.togglePanMode = (function(orig){
  return function(){
    if (typeof orig === 'function') orig();
    const btn = document.getElementById('panBtn');
    if (btn) btn.classList.toggle('active');
    console.log('togglePanMode() placeholder');
  }
})(window.togglePanMode);

window.togglePreview = window.togglePreview || function(){ console.log('togglePreview() placeholder'); };
window.addColumn = window.addColumn || function(){ console.log('addColumn() placeholder'); };
window.removeColumn = window.removeColumn || function(){ console.log('removeColumn() placeholder'); };
window.clearAllData = window.clearAllData || function(){ console.log('clearAllData() placeholder'); };
window.resetExcelPreview = window.resetExcelPreview || function(){ console.log('resetExcelPreview() placeholder'); };
window.testOcr = window.testOcr || function(){ alert('OCR test placeholder'); };
window.closeRegionModal = window.closeRegionModal || function(){ document.getElementById('regionModal').style.display='none'; };
window.saveRegionName = window.saveRegionName || function(){ alert('Saved region name (placeholder)'); };
window.updateRegionNameInput = window.updateRegionNameInput || function(){ /* no-op */ };
