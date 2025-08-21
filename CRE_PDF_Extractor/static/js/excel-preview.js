/**
 * Excel Preview JavaScript for CRE PDF Extractor
 * Handles spreadsheet-like preview interface and data display
 */

// ========================================
// Excel Preview State Management
// ========================================

const ExcelPreview = {
  // Data State
  data: [],
  columns: [],
  currentPage: 1,
  
  // UI State
  container: null,
  table: null,
  isVisible: true,
  isDraggable: false,
  
  // Column Management
  selectedColumn: null,
  editingCell: null,
  
  // Performance
  renderQueue: [],
  isRendering: false,
  
  // AI Integration
  aiEnhanced: false,
  qualityScores: {}
};

// ========================================
// Excel Preview Initialization
// ========================================

/**
 * Initialize Excel preview
 */
function initExcelPreview() {
  ExcelPreview.container = document.getElementById('excelPreviewContainer');
  ExcelPreview.table = document.getElementById('excelPreview');
  
  // Set up event listeners
  setupExcelEventListeners();
  
  // Initialize data structure
  initializeDataStructure();
  
  // Update display
  updateExcelPreview();
  
  console.log('Excel Preview initialized');
}

/**
 * Initialize data structure
 */
function initializeDataStructure() {
  ExcelPreview.data = [];
  ExcelPreview.columns = [];
  ExcelPreview.qualityScores = {};
}

// ========================================
// Data Management
// ========================================

/**
 * Update data from extracted regions
 */
function updateDataFromRegions(regions, extractedData) {
  if (!regions || !extractedData) return;
  
  // Create columns from regions
  const newColumns = regions
    .filter(region => region.name && region.name.trim())
    .map(region => ({
      id: region.id,
      name: region.name,
      region: region,
      type: 'text',
      width: 150
    }));
  
  // Update columns if they've changed
  if (JSON.stringify(ExcelPreview.columns) !== JSON.stringify(newColumns)) {
    ExcelPreview.columns = newColumns;
    updateColumnControls();
  }
  
  // Update data
  ExcelPreview.data = extractedData || [];
  
  // Update display
  updateExcelPreview();
  
  console.log('Data updated from regions:', { columns: ExcelPreview.columns.length, rows: ExcelPreview.data.length });
}

/**
 * Add new column
 */
function addColumn() {
  const columnName = prompt('Enter column name:');
  if (!columnName || !columnName.trim()) return;
  
  const newColumn = {
    id: 'col_' + Date.now(),
    name: columnName.trim(),
    type: 'text',
    width: 150
  };
  
  ExcelPreview.columns.push(newColumn);
  
  // Add empty data for new column
  ExcelPreview.data.forEach(row => {
    row[newColumn.id] = '';
  });
  
  updateExcelPreview();
  updateColumnControls();
  
  console.log('Column added:', newColumn);
}

/**
 * Remove selected column
 */
function removeColumn() {
  if (!ExcelPreview.selectedColumn) {
    showError('Please select a column to remove');
    return;
  }
  
  if (confirm(`Are you sure you want to remove column "${ExcelPreview.selectedColumn.name}"?`)) {
    const columnIndex = ExcelPreview.columns.findIndex(col => col.id === ExcelPreview.selectedColumn.id);
    
    if (columnIndex !== -1) {
      const removedColumn = ExcelPreview.columns.splice(columnIndex, 1)[0];
      
      // Remove data for this column
      ExcelPreview.data.forEach(row => {
        delete row[removedColumn.id];
      });
      
      ExcelPreview.selectedColumn = null;
      updateExcelPreview();
      updateColumnControls();
      
      console.log('Column removed:', removedColumn);
    }
  }
}

/**
 * Clear all data
 */
function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    ExcelPreview.data = [];
    updateExcelPreview();
    console.log('All data cleared');
  }
}

/**
 * Reset Excel preview
 */
function resetExcelPreview() {
  if (confirm('Are you sure you want to reset the Excel preview? This will clear all data and columns.')) {
    initializeDataStructure();
    updateExcelPreview();
    updateColumnControls();
    console.log('Excel preview reset');
  }
}

// ========================================
// UI Management
// ========================================

/**
 * Toggle preview visibility
 */
function togglePreview() {
  ExcelPreview.isVisible = !ExcelPreview.isVisible;
  
  const container = ExcelPreview.container;
  const toggleBtn = document.getElementById('previewToggle');
  
  if (container) {
    container.style.display = ExcelPreview.isVisible ? 'block' : 'none';
  }
  
  if (toggleBtn) {
    toggleBtn.textContent = ExcelPreview.isVisible ? 'Hide Preview' : 'Show Preview';
    toggleBtn.classList.toggle('active', ExcelPreview.isVisible);
  }
  
  console.log('Preview visibility toggled:', ExcelPreview.isVisible);
}

/**
 * Update Excel preview display
 */
function updateExcelPreview() {
  if (!ExcelPreview.table) return;
  
  if (!ExcelPreview.columns.length || !ExcelPreview.data.length) {
    showPlaceholder();
    return;
  }
  
  const tableHTML = createTableHTML();
  ExcelPreview.table.innerHTML = tableHTML;
  
  // Set up table event listeners
  setupTableEventListeners();
  
  console.log('Excel preview updated');
}

/**
 * Show placeholder when no data
 */
function showPlaceholder() {
  if (!ExcelPreview.table) return;
  
  ExcelPreview.table.innerHTML = `
    <div class="preview-placeholder">
      <div class="placeholder-icon">📊</div>
      <div class="placeholder-title">Excel Preview</div>
      <div class="placeholder-subtitle">
        This is where your extracted data will appear<br>
        in a spreadsheet format once you define regions
      </div>
      <div class="placeholder-features">
        <span class="feature">📝 Editable Cells</span>
        <span class="feature">📋 Copy/Paste</span>
        <span class="feature">📤 Export Ready</span>
        <span class="feature">🤖 AI Enhanced</span>
      </div>
    </div>
  `;
}

/**
 * Create table HTML
 */
function createTableHTML() {
  if (!ExcelPreview.columns.length) return '';
  
  const headerRow = createHeaderRow();
  const dataRows = createDataRows();
  
  return `
    <table class="excel-table">
      <thead>
        ${headerRow}
      </thead>
      <tbody>
        ${dataRows}
      </tbody>
    </table>
  `;
}

/**
 * Create header row HTML
 */
function createHeaderRow() {
  const headerCells = ExcelPreview.columns.map(column => {
    const isSelected = ExcelPreview.selectedColumn?.id === column.id;
    const selectedClass = isSelected ? 'selected' : '';
    
    return `
      <th class="excel-header ${selectedClass}" 
          data-column-id="${column.id}"
          style="width: ${column.width}px;"
          onclick="selectColumn('${column.id}')">
        <div class="header-content">
          <span class="header-text">${column.name}</span>
          <div class="header-actions">
            <button class="btn-sort" onclick="sortColumn('${column.id}')" title="Sort">↕️</button>
            <button class="btn-filter" onclick="filterColumn('${column.id}')" title="Filter">🔍</button>
          </div>
        </div>
      </th>
    `;
  }).join('');
  
  return `<tr>${headerCells}</tr>`;
}

/**
 * Create data rows HTML
 */
function createDataRows() {
  if (!ExcelPreview.data.length) return '';
  
  return ExcelPreview.data.map((row, rowIndex) => {
    const cells = ExcelPreview.columns.map(column => {
      const cellValue = row[column.id] || '';
      const qualityScore = ExcelPreview.qualityScores[`${rowIndex}_${column.id}`];
      const qualityClass = qualityScore ? `quality-${getQualityClass(qualityScore)}` : '';
      
      return `
        <td class="excel-cell ${qualityClass}" 
            data-column-id="${column.id}"
            data-row-index="${rowIndex}"
            onclick="editCell('${column.id}', ${rowIndex})"
            onblur="saveCell('${column.id}', ${rowIndex}, this.textContent)">
          <div class="cell-content">
            <span class="cell-text">${cellValue}</span>
            ${qualityScore ? `<div class="quality-indicator" title="Quality: ${Math.round(qualityScore * 100)}%">${getQualityIcon(qualityScore)}</div>` : ''}
          </div>
        </td>
      `;
    }).join('');
    
    return `<tr>${cells}</tr>`;
  }).join('');
}

// ========================================
// Column Management
// ========================================

/**
 * Select column
 */
function selectColumn(columnId) {
  ExcelPreview.selectedColumn = ExcelPreview.columns.find(col => col.id === columnId);
  
  // Update UI
  document.querySelectorAll('.excel-header').forEach(header => {
    header.classList.remove('selected');
  });
  
  const selectedHeader = document.querySelector(`[data-column-id="${columnId}"]`);
  if (selectedHeader) {
    selectedHeader.classList.add('selected');
  }
  
  updateColumnControls();
  
  console.log('Column selected:', ExcelPreview.selectedColumn);
}

/**
 * Sort column
 */
function sortColumn(columnId) {
  const column = ExcelPreview.columns.find(col => col.id === columnId);
  if (!column) return;
  
  // Toggle sort direction
  const currentDirection = column.sortDirection || 'asc';
  const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
  
  // Update all columns
  ExcelPreview.columns.forEach(col => {
    col.sortDirection = col.id === columnId ? newDirection : null;
  });
  
  // Sort data
  ExcelPreview.data.sort((a, b) => {
    const aVal = a[columnId] || '';
    const bVal = b[columnId] || '';
    
    if (newDirection === 'asc') {
      return aVal.localeCompare(bVal);
    } else {
      return bVal.localeCompare(aVal);
    }
  });
  
  updateExcelPreview();
  
  console.log(`Column "${column.name}" sorted ${newDirection}`);
}

/**
 * Filter column
 */
function filterColumn(columnId) {
  const column = ExcelPreview.columns.find(col => col.id === columnId);
  if (!column) return;
  
  const filterValue = prompt(`Filter "${column.name}" (leave empty to clear filter):`);
  
  if (filterValue === null) return; // User cancelled
  
  if (!filterValue.trim()) {
    // Clear filter
    ExcelPreview.data.forEach(row => {
      row._filtered = false;
    });
  } else {
    // Apply filter
    ExcelPreview.data.forEach(row => {
      const cellValue = (row[columnId] || '').toLowerCase();
      row._filtered = !cellValue.includes(filterValue.toLowerCase());
    });
  }
  
  updateExcelPreview();
  
  console.log(`Column "${column.name}" filtered with: "${filterValue}"`);
}

/**
 * Update column controls
 */
function updateColumnControls() {
  const controlsContainer = document.getElementById('columnControls');
  if (!controlsContainer) return;
  
  const hasColumns = ExcelPreview.columns.length > 0;
  const hasSelectedColumn = ExcelPreview.selectedColumn !== null;
  
  controlsContainer.style.display = hasColumns ? 'block' : 'none';
  
  // Update button states
  const removeBtn = controlsContainer.querySelector('button[onclick="removeColumn()"]');
  if (removeBtn) {
    removeBtn.disabled = !hasSelectedColumn;
  }
}

// ========================================
// Cell Editing
// ========================================

/**
 * Edit cell
 */
function editCell(columnId, rowIndex) {
  if (ExcelPreview.editingCell) {
    // Save previous cell
    saveCell(ExcelPreview.editingCell.columnId, ExcelPreview.editingCell.rowIndex, ExcelPreview.editingCell.element.textContent);
  }
  
  const cell = document.querySelector(`[data-column-id="${columnId}"][data-row-index="${rowIndex}"]`);
  if (!cell) return;
  
  ExcelPreview.editingCell = {
    columnId,
    rowIndex,
    element: cell
  };
  
  // Make cell editable
  cell.contentEditable = true;
  cell.focus();
  
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(cell);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  console.log('Cell editing started:', { columnId, rowIndex });
}

/**
 * Save cell
 */
function saveCell(columnId, rowIndex, value) {
  if (!ExcelPreview.editingCell || 
      ExcelPreview.editingCell.columnId !== columnId || 
      ExcelPreview.editingCell.rowIndex !== rowIndex) {
    return;
  }
  
  // Update data
  if (ExcelPreview.data[rowIndex]) {
    ExcelPreview.data[rowIndex][columnId] = value;
  }
  
  // Make cell non-editable
  const cell = ExcelPreview.editingCell.element;
  cell.contentEditable = false;
  
  // Clear editing state
  ExcelPreview.editingCell = null;
  
  console.log('Cell saved:', { columnId, rowIndex, value });
}

// ========================================
// AI Integration
// ========================================

/**
 * Enable AI enhancement
 */
function enableAIEnhancement() {
  ExcelPreview.aiEnhanced = true;
  
  // Update UI to show AI features
  const aiBadge = document.querySelector('.ai-badge');
  if (aiBadge) {
    aiBadge.style.display = 'inline-block';
  }
  
  console.log('AI enhancement enabled');
}

/**
 * Update quality scores
 */
function updateQualityScores(scores) {
  ExcelPreview.qualityScores = scores;
  updateExcelPreview();
  
  console.log('Quality scores updated:', scores);
}

/**
 * Get quality class for score
 */
function getQualityClass(score) {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/**
 * Get quality icon for score
 */
function getQualityIcon(score) {
  if (score >= 0.8) return '🟢';
  if (score >= 0.6) return '🟡';
  return '🔴';
}

// ========================================
// Event Listeners
// ========================================

/**
 * Set up Excel event listeners
 */
function setupExcelEventListeners() {
  // Preview toggle
  const toggleBtn = document.getElementById('previewToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', togglePreview);
  }
  
  // Column control buttons
  const addBtn = document.querySelector('button[onclick="addColumn()"]');
  if (addBtn) {
    addBtn.addEventListener('click', addColumn);
  }
  
  const removeBtn = document.querySelector('button[onclick="removeColumn()"]');
  if (removeBtn) {
    removeBtn.addEventListener('click', removeColumn);
  }
  
  const clearBtn = document.querySelector('button[onclick="clearAllData()"]');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllData);
  }
  
  const resetBtn = document.querySelector('button[onclick="resetExcelPreview()"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetExcelPreview);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ExcelPreview.editingCell) {
      // Cancel editing
      const cell = ExcelPreview.editingCell.element;
      cell.contentEditable = false;
      ExcelPreview.editingCell = null;
    }
  });
}

/**
 * Set up table event listeners
 */
function setupTableEventListeners() {
  // Cell click events are handled inline for better performance
  // Additional table-wide events can be added here
}

// ========================================
// Export Functions
// ========================================

/**
 * Export data to CSV
 */
function exportToCSV() {
  if (!ExcelPreview.columns.length || !ExcelPreview.data.length) {
    showError('No data to export');
    return;
  }
  
  try {
    // Create CSV content
    const headers = ExcelPreview.columns.map(col => col.name).join(',');
    const rows = ExcelPreview.data.map(row => {
      return ExcelPreview.columns.map(col => {
        const value = row[col.id] || '';
        // Escape commas and quotes
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');
    
    const csvContent = headers + '\n' + rows;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted_data.csv';
    link.click();
    
    URL.revokeObjectURL(url);
    
    console.log('Data exported to CSV');
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    showError('Failed to export data');
  }
}

/**
 * Export data to Excel
 */
function exportToExcel() {
  if (!ExcelPreview.columns.length || !ExcelPreview.data.length) {
    showError('No data to export');
    return;
  }
  
  // This would typically make a request to the server to generate an Excel file
  // For now, we'll show a message
  showSuccess('Excel export feature coming soon!');
  console.log('Excel export requested');
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

// ========================================
// Export Functions
// ========================================

// Make functions available globally
window.ExcelPreview = ExcelPreview;
window.initExcelPreview = initExcelPreview;
window.updateDataFromRegions = updateDataFromRegions;
window.togglePreview = togglePreview;
window.addColumn = addColumn;
window.removeColumn = removeColumn;
window.clearAllData = clearAllData;
window.resetExcelPreview = resetExcelPreview;
window.selectColumn = selectColumn;
window.sortColumn = sortColumn;
window.filterColumn = filterColumn;
window.editCell = editCell;
window.saveCell = saveCell;
window.enableAIEnhancement = enableAIEnhancement;
window.updateQualityScores = updateQualityScores;
window.exportToCSV = exportToCSV;
window.exportToExcel = exportToExcel;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initExcelPreview();
});
