// Excel Preview functionality
let excelData = [];
let excelColumns = [];

// Excel preview drag and drop functionality
function setupExcelPreviewDragAndDrop() {
    const excelPreviewContainer = document.getElementById('excelPreviewContainer');
    if (!excelPreviewContainer) return;
    
    excelPreviewContainer.addEventListener('mousedown', startExcelPreviewDrag);
    document.addEventListener('mousemove', dragExcelPreview);
    document.addEventListener('mouseup', endExcelPreviewDrag);
}

let isDraggingExcelPreview = false;
let excelPreviewDragStartX = 0;
let excelPreviewDragStartY = 0;
let excelPreviewOffsetX = 0;
let excelPreviewOffsetY = 0;

function startExcelPreviewDrag(e) {
    if (e.target.closest('.excel-table') || e.target.closest('.preview-toggle')) {
        return; // Don't start drag if clicking on table or toggle button
    }
    
    isDraggingExcelPreview = true;
    const container = document.getElementById('excelPreviewContainer');
    container.classList.add('dragging');
    
    const rect = container.getBoundingClientRect();
    excelPreviewDragStartX = e.clientX - rect.left;
    excelPreviewDragStartY = e.clientY - rect.top;
    
    e.preventDefault();
}

function dragExcelPreview(e) {
    if (!isDraggingExcelPreview) return;
    
    const container = document.getElementById('excelPreviewContainer');
    const parentRect = container.parentElement.getBoundingClientRect();
    
    const newX = e.clientX - parentRect.left - excelPreviewDragStartX;
    const newY = e.clientY - parentRect.top - excelPreviewDragStartY;
    
    // Constrain to parent bounds
    const maxX = parentRect.width - container.offsetWidth;
    const maxY = parentRect.height - container.offsetHeight;
    
    excelPreviewOffsetX = Math.max(0, Math.min(newX, maxX));
    excelPreviewOffsetY = Math.max(0, Math.min(newY, maxY));
    
    container.style.transform = `translate(${excelPreviewOffsetX}px, ${excelPreviewOffsetY}px)`;
    
    e.preventDefault();
}

function endExcelPreviewDrag(e) {
    if (!isDraggingExcelPreview) return;
    
    isDraggingExcelPreview = false;
    const container = document.getElementById('excelPreviewContainer');
    container.classList.remove('dragging');
}

// Excel preview functionality with real PDF data
function updateExcelPreview() {
    console.log('updateExcelPreview called with', currentRegions.length, 'regions');
    
    const previewDiv = document.getElementById('excelPreview');
    const previewToggle = document.getElementById('previewToggle');
    const columnControls = document.getElementById('columnControls');
    
    if (!previewDiv || !previewToggle || !columnControls) {
        console.error('Excel preview elements not found');
        return;
    }
    
    if (currentRegions.length === 0) {
        console.log('No regions defined, showing placeholder');
        previewDiv.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Define regions to see Excel preview</div>';
        columnControls.style.display = 'none';
        return;
    }

    if (!previewToggle.classList.contains('active')) {
        previewDiv.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Click "Show Preview" to see Excel layout</div>';
        columnControls.style.display = 'none';
        return;
    }

    // Always sync columns with current regions to ensure consistency
    const newColumns = ['Page', ...currentRegions.map(region => region.name)];
    
    // Check if columns have changed
    const columnsChanged = excelColumns.length !== newColumns.length || 
        !excelColumns.every((col, index) => col === newColumns[index]);
    
    if (columnsChanged) {
        excelColumns = newColumns;
        // Reset data when columns change
        excelData = [];
    }

    // Initialize data if not already done
    if (excelData.length === 0) {
        excelData = [];
        for (let page = 1; page <= Math.min(5, totalPages || 5); page++) {
            const row = { 'Page': `Page ${page}` };
            currentRegions.forEach(region => {
                row[region.name] = extractDataFromRegion(region, page - 1);
            });
            excelData.push(row);
        }
    }

    // Create Excel preview table
    const tableHTML = `
        <table class="excel-table" id="excelTable">
            <thead>
                <tr>
                                         ${excelColumns.map((col, index) => 
                         `<th draggable="true" data-column="${index}">${col}</th>`
                     ).join('')}
                </tr>
            </thead>
            <tbody>
                ${generateExcelRows()}
            </tbody>
        </table>
    `;
    
    previewDiv.innerHTML = tableHTML;
    columnControls.style.display = 'flex';
    
    console.log('Excel preview updated, column controls displayed');
    
    // Setup table interactions
    setupExcelTableInteractions();
}

function generateExcelRows() {
    let rowsHTML = '';
    
    excelData.forEach((row, rowIndex) => {
        rowsHTML += '<tr>';
        excelColumns.forEach((col, colIndex) => {
            const value = row[col] || '';
            rowsHTML += `<td onclick="editCell(${rowIndex}, ${colIndex})" data-row="${rowIndex}" data-col="${colIndex}">${value}</td>`;
        });
        rowsHTML += '</tr>';
    });
    
    return rowsHTML;
}

function extractDataFromRegion(region, pageIndex) {
    // This would normally extract real data from the PDF
    // For now, return a placeholder that indicates the region was found
    return `[${region.name} from Page ${pageIndex + 1}]`;
}

// Function to update Excel preview with real extracted data
function updateExcelPreviewWithRealData(extractedData) {
    if (!extractedData || !Array.isArray(extractedData)) {
        console.error('Invalid extracted data format');
        return;
    }

    // Reset Excel data
    excelData = [];
    
    // Convert extracted data to Excel format
    extractedData.forEach((record, index) => {
        const row = { 'Page': `Page ${currentPage + 1}` };
        
        // Add data for each region
        currentRegions.forEach(region => {
            const regionData = record[region.name] || '';
            row[region.name] = regionData;
        });
        
        excelData.push(row);
    });
    
    // Update the Excel preview
    updateExcelPreview();
    
    console.log('Excel preview updated with real extracted data:', extractedData);
}

function setupExcelTableInteractions() {
    const table = document.getElementById('excelTable');
    if (!table) return;

    // Column drag and drop
    const headers = table.querySelectorAll('th[draggable="true"]');
    headers.forEach((header, index) => {
        // Remove any existing listeners to prevent duplicates
        header.removeEventListener('dragstart', handleColumnDragStart);
        header.removeEventListener('dragend', handleColumnDragEnd);
        header.removeEventListener('dragover', handleColumnDragOver);
        header.removeEventListener('drop', handleColumnDrop);
        
        // Add drag events
        header.addEventListener('dragstart', handleColumnDragStart);
        header.addEventListener('dragend', handleColumnDragEnd);
        header.addEventListener('dragover', handleColumnDragOver);
        header.addEventListener('drop', handleColumnDrop);
        
        // Add click event for editing (separate from drag)
        header.addEventListener('click', (e) => {
            // Only trigger edit if not dragging and it's a quick click (not a drag)
            const clickTime = Date.now();
            if (!draggedColumn && (clickTime - dragStartTime > 200 || dragStartTime === 0)) {
                editColumnHeader(index);
            }
        });
    });
    
    console.log('Excel table interactions setup complete with', headers.length, 'headers');
}

let draggedColumn = null;
let dragStartTime = 0;

function handleColumnDragStart(e) {
    console.log('Column drag start:', e.target.dataset.column);
    draggedColumn = parseInt(e.target.dataset.column);
    dragStartTime = Date.now();
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedColumn.toString());
    e.stopPropagation();
}

function handleColumnDragEnd(e) {
    e.target.classList.remove('dragging');
    // Remove drag-over class from all headers
    document.querySelectorAll('th').forEach(th => th.classList.remove('drag-over'));
    // Add a small delay to prevent click event from firing after drag
    setTimeout(() => {
        draggedColumn = null;
    }, 100);
}

function handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback for drag over
    const targetHeader = e.target.closest('th');
    if (targetHeader && targetHeader !== e.target) {
        // Remove drag-over class from all headers
        document.querySelectorAll('th').forEach(th => th.classList.remove('drag-over'));
        // Add drag-over class to target header
        targetHeader.classList.add('drag-over');
    }
}

function handleColumnDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove drag-over class from all headers
    document.querySelectorAll('th').forEach(th => th.classList.remove('drag-over'));
    
    console.log('Column drop on:', e.target.dataset.column);
    const targetColumn = parseInt(e.target.dataset.column);
    if (draggedColumn !== null && draggedColumn !== targetColumn) {
        console.log('Reordering column', draggedColumn, 'to', targetColumn);
        reorderColumn(draggedColumn, targetColumn);
    }
    draggedColumn = null;
}

function reorderColumn(fromIndex, toIndex) {
    // Validate indices
    if (fromIndex < 0 || fromIndex >= excelColumns.length || 
        toIndex < 0 || toIndex >= excelColumns.length) {
        console.error('Invalid column indices for reordering');
        return;
    }
    
    // Reorder columns array
    const column = excelColumns.splice(fromIndex, 1)[0];
    excelColumns.splice(toIndex, 0, column);
    
    // Reorder data properly
    excelData.forEach(row => {
        const values = Object.values(row);
        const keys = Object.keys(row);
        
        // Validate array lengths
        if (values.length !== keys.length || values.length !== excelColumns.length) {
            console.error('Data structure mismatch, resetting row');
            // Reset this row to match current columns
            const newRow = { 'Page': row['Page'] || 'Page 1' };
            excelColumns.forEach(col => {
                newRow[col] = row[col] || '';
            });
            Object.keys(row).forEach(key => delete row[key]);
            Object.assign(row, newRow);
            return;
        }
        
        // Remove the value from the old position
        const movedValue = values.splice(fromIndex, 1)[0];
        const movedKey = keys.splice(fromIndex, 1)[0];
        
        // Insert at the new position
        values.splice(toIndex, 0, movedValue);
        keys.splice(toIndex, 0, movedKey);
        
        // Rebuild the row object
        const newRow = {};
        keys.forEach((key, index) => {
            newRow[key] = values[index];
        });
        
        // Clear and rebuild the row
        Object.keys(row).forEach(key => delete row[key]);
        Object.assign(row, newRow);
    });
    
    updateExcelPreview();
}

function editColumnHeader(columnIndex) {
    const header = document.querySelector(`th[data-column="${columnIndex}"]`);
    const currentName = excelColumns[columnIndex];
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.style.width = '100%';
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.fontSize = '12px';
    input.style.fontWeight = '600';
    input.style.color = '#495057';
    
    input.addEventListener('blur', () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            excelColumns[columnIndex] = newName;
            updateExcelPreview();
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
    
    header.innerHTML = '';
    header.appendChild(input);
    input.focus();
}

function editCell(rowIndex, colIndex) {
    const cell = document.querySelector(`td[data-row="${rowIndex}"][data-col="${colIndex}"]`);
    const currentValue = excelData[rowIndex][excelColumns[colIndex]] || '';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.style.width = '100%';
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.fontSize = '12px';
    input.style.color = '#495057';
    
    input.addEventListener('blur', () => {
        const newValue = input.value.trim();
        excelData[rowIndex][excelColumns[colIndex]] = newValue;
        cell.textContent = newValue;
        cell.classList.remove('editing');
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
    
    cell.innerHTML = '';
    cell.appendChild(input);
    cell.classList.add('editing');
    input.focus();
}

function addColumn() {
    console.log('addColumn function called');
    const newColumnName = prompt('Enter column name:');
    if (newColumnName && newColumnName.trim()) {
        const columnName = newColumnName.trim();
        console.log('Adding column:', columnName);
        excelColumns.push(columnName);
        excelData.forEach(row => {
            row[columnName] = '';
        });
        updateExcelPreview();
        console.log('Column added successfully');
    }
}

function removeColumn() {
    console.log('removeColumn function called');
    if (excelColumns.length > 1) {
        const columnToRemove = prompt('Enter column name to remove:');
        if (columnToRemove) {
            const index = excelColumns.indexOf(columnToRemove);
            console.log('Removing column:', columnToRemove, 'at index:', index);
            if (index > -1) {
                excelColumns.splice(index, 1);
                excelData.forEach(row => {
                    delete row[columnToRemove];
                });
                updateExcelPreview();
                console.log('Column removed successfully');
            } else {
                alert('Column not found: ' + columnToRemove);
            }
        }
    } else {
        alert('Cannot remove the last column. At least one column must remain.');
    }
}

function clearAllData() {
    console.log('clearAllData function called');
    if (confirm('Are you sure you want to clear all data?')) {
        excelData.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== 'Page') {
                    row[key] = '';
                }
            });
        });
        updateExcelPreview();
        console.log('All data cleared successfully');
    }
}

function resetExcelPreview() {
    console.log('resetExcelPreview function called');
    // Reset Excel data and columns to match current regions
    excelData = [];
    excelColumns = [];
    updateExcelPreview();
    console.log('Excel preview reset successfully');
}

function togglePreview() {
    const previewToggle = document.getElementById('previewToggle');
    previewToggle.classList.toggle('active');
    
    if (previewToggle.classList.contains('active')) {
        previewToggle.textContent = 'Hide Preview';
        updateExcelPreview();
    } else {
        previewToggle.textContent = 'Show Preview';
        updateExcelPreview();
    }
}
