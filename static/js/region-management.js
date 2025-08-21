// Region Management functionality
const regionModal = document.getElementById('regionModal');
const regionNameInput = document.getElementById('regionNameInput');
const regionNameSelect = document.getElementById('regionNameSelect');

// Modal functions
function openRegionModal() {
    if (!selectedRegion) {
        console.error('Cannot open modal: no region selected');
        return;
    }
    regionModal.style.display = 'block';
    regionNameInput.value = '';
    regionNameSelect.value = '';
    regionNameInput.focus();
}

function closeRegionModal() {
    regionModal.style.display = 'none';
    regionNameInput.value = '';
    regionNameSelect.value = '';
    selectedRegion = null;
}

function updateRegionNameInput() {
    const selectedValue = regionNameSelect.value;
    if (selectedValue && selectedValue !== 'Custom Field') {
        regionNameInput.value = selectedValue;
    } else if (selectedValue === 'Custom Field') {
        regionNameInput.value = '';
        regionNameInput.focus();
    }
}

function saveRegionName() {
    const name = regionNameInput.value.trim();
    if (name && selectedRegion) {
        // Validate region coordinates before saving
        if (!selectedRegion.x || !selectedRegion.y || !selectedRegion.width || !selectedRegion.height) {
            showStatus('Error: Invalid region coordinates. Please re-select the region.', 'error');
            return;
        }
        
        selectedRegion.name = name;
        currentRegions.push(selectedRegion);
        console.log('Region added:', selectedRegion);
        console.log('Total regions now:', currentRegions.length);
        
        closeRegionModal();
        drawRegions();
        updateRegionList();
        enableButtons();
        
        // Reset Excel data to include new region
        excelData = [];
        excelColumns = [];
        
        // Update Excel preview immediately after adding region
        console.log('Calling updateExcelPreview from saveRegionName');
        updateExcelPreview();
        
        // Show success message
        showStatus(`Region "${name}" saved successfully!`, 'success');
        
        // Clear the selected region after saving
        selectedRegion = null;
    } else if (!selectedRegion) {
        console.error('No region selected for naming');
        showStatus('Error: No region selected', 'error');
    } else {
        console.error('Region name is empty');
        showStatus('Error: Please enter a region name', 'error');
    }
}

// Region management
function updateRegionList() {
    const regionList = document.getElementById('regionList');
    
    if (currentRegions.length === 0) {
        regionList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No regions defined yet</div>';
        updateExcelPreview();
        return;
    }

    regionList.innerHTML = currentRegions.map((region, index) => `
        <div class="region-item" data-index="${index}">
            <div class="region-name">${region.name}</div>
            <div class="region-actions">
                <button class="btn-small btn-edit" onclick="editRegion(${index})">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteRegion(${index})">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Update Excel preview
    console.log('Calling updateExcelPreview from updateRegionList');
    updateExcelPreview();
}

function editRegion(index) {
    selectedRegion = currentRegions[index];
    regionNameInput.value = selectedRegion.name;
    
    // Try to find the name in the dropdown options
    const select = document.getElementById('regionNameSelect');
    let found = false;
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === selectedRegion.name) {
            select.value = selectedRegion.name;
            found = true;
            break;
        }
    }
    if (!found) {
        select.value = 'Custom Field';
    }
    
    openRegionModal();
    
    // Remove the old region when saving
    currentRegions.splice(index, 1);
}

function deleteRegion(index) {
    currentRegions.splice(index, 1);
    drawRegions();
    updateRegionList();
    enableButtons();
    
    // Reset Excel data when regions change
    excelData = [];
    excelColumns = [];
    updateExcelPreview();
}

function clearAllRegions() {
    currentRegions = [];
    selectedRegion = null;
    drawRegions();
    updateRegionList();
    enableButtons();
    
    // Reset Excel data when regions change
    excelData = [];
    excelColumns = [];
    updateExcelPreview();
}

// Button functions
async function saveRegions() {
    console.log('saveRegions called with regions:', currentRegions);
    try {
        const response = await fetch('/save_regions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ regions: currentRegions })
        });

        const data = await response.json();
        console.log('Save regions response:', data);
        if (data.success) {
            showStatus(`Saved ${data.regions_count} regions successfully!`, 'success');
        } else {
            showStatus('Error saving regions: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error in saveRegions:', error);
        showStatus('Error saving regions: ' + error.message, 'error');
    }
}

function enableButtons() {
    console.log('enableButtons called, currentRegions.length:', currentRegions.length);
    document.getElementById('saveRegionsBtn').disabled = currentRegions.length === 0;
    document.getElementById('clearRegionsBtn').disabled = currentRegions.length === 0;
    document.getElementById('extractDataBtn').disabled = currentRegions.length === 0;
}

function disableButtons() {
    document.getElementById('saveRegionsBtn').disabled = true;
    document.getElementById('clearRegionsBtn').disabled = true;
    document.getElementById('extractDataBtn').disabled = true;
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('extractionStatus');
    statusDiv.innerHTML = `<div class="status-${type}">${message}</div>`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }
}

// Event listeners
document.getElementById('saveRegionsBtn').addEventListener('click', saveRegions);
document.getElementById('clearRegionsBtn').addEventListener('click', clearAllRegions);

// Initialize
disableButtons();
