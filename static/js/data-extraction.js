// Data Extraction functionality

async function testOcr() {
    try {
        const statusDiv = document.getElementById('extractionStatus');
        statusDiv.innerHTML = '<div class="status-info">Testing OCR capabilities and extracting sample data...</div>';

        // First test OCR capabilities
        const testResponse = await fetch('/test_ocr', {
            method: 'POST'
        });

        const testData = await testResponse.json();
        
        if (!testData.success) {
            statusDiv.innerHTML = `<div class="status-error">Error testing OCR: ${testData.error}</div>`;
            return;
        }

        // If OCR is working and we have regions, extract sample data
        if (testData.tesseract_available && testData.opencv_available && 
            testData.ocr_test_result === 'Working' && currentRegions && currentRegions.length > 0) {
            
            statusDiv.innerHTML = '<div class="status-info">OCR working! Extracting sample data from current regions...</div>';
            
            // Extract sample data from current page
            const extractResponse = await fetch('/extract_sample_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    regions: currentRegions,
                    page: currentPage || 0
                })
            });

            const extractData = await extractResponse.json();
            
            if (extractData.success) {
                // Update Excel preview with real extracted data
                updateExcelPreviewWithRealData(extractData.extracted_data);
                
                let statusHtml = '<div class="status-success"><strong>OCR Test Results:</strong><br>';
                statusHtml += `Tesseract: ✅ Available (${testData.tesseract_version})<br>`;
                statusHtml += `OpenCV: ✅ Available (${testData.opencv_version})<br>`;
                statusHtml += `OCR Test: ✅ Working<br>`;
                statusHtml += `<br><strong>✅ Sample data extracted and shown in Excel preview!</strong><br>`;
                statusHtml += `Extracted ${extractData.records_count} records from current page.`;
                statusHtml += '</div>';
                statusDiv.innerHTML = statusHtml;
            } else {
                let statusHtml = '<div class="status-info"><strong>OCR Test Results:</strong><br>';
                statusHtml += `Tesseract: ✅ Available (${testData.tesseract_version})<br>`;
                statusHtml += `OpenCV: ✅ Available (${testData.opencv_version})<br>`;
                statusHtml += `OCR Test: ✅ Working<br>`;
                statusHtml += `<br><strong>⚠️ OCR working but sample extraction failed: ${extractData.error}</strong>`;
                statusHtml += '</div>';
                statusDiv.innerHTML = statusHtml;
            }
        } else {
            let statusHtml = '<div class="status-info"><strong>OCR Test Results:</strong><br>';
            statusHtml += `Tesseract: ${testData.tesseract_available ? '✅ Available' : '❌ Not Available'} (${testData.tesseract_version})<br>`;
            statusHtml += `OpenCV: ${testData.opencv_available ? '✅ Available' : '❌ Not Available'} (${testData.opencv_version})<br>`;
            statusHtml += `OCR Test: ${testData.ocr_test_result}<br>`;
            
            if (testData.tesseract_available && testData.opencv_available && testData.ocr_test_result === 'Working') {
                statusHtml += '<br><strong>✅ OCR is ready for extraction!</strong><br>';
                statusHtml += 'Define regions first to see sample data extraction.';
            } else {
                statusHtml += '<br><strong>⚠️ OCR may not work properly. Check installation.</strong>';
            }
            
            statusHtml += '</div>';
            statusDiv.innerHTML = statusHtml;
        }
    } catch (error) {
        document.getElementById('extractionStatus').innerHTML = 
            `<div class="status-error">Error testing OCR: ${error.message}</div>`;
    }
}

async function extractData() {
    try {
        const statusDiv = document.getElementById('extractionStatus');
        statusDiv.innerHTML = '<div class="status-info">Validating regions and extracting data...</div>';

        // Validate that we have regions and they have proper coordinates
        if (!currentRegions || currentRegions.length === 0) {
            statusDiv.innerHTML = '<div class="status-error">Error: No regions defined for extraction</div>';
            return;
        }

        // Validate each region has proper coordinates
        const invalidRegions = currentRegions.filter(region => 
            !region.x || !region.y || !region.width || !region.height || !region.name
        );
        
        if (invalidRegions.length > 0) {
            statusDiv.innerHTML = '<div class="status-error">Error: Some regions have invalid coordinates. Please re-select them.</div>';
            return;
        }

        statusDiv.innerHTML = '<div class="status-info">Saving regions and extracting data...</div>';

        // First, save the regions to the backend
        const saveResponse = await fetch('/save_regions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ regions: currentRegions })
        });

        const saveData = await saveResponse.json();
        if (!saveData.success) {
            statusDiv.innerHTML = `<div class="status-error">Error saving regions: ${saveData.error}</div>`;
            return;
        }

        statusDiv.innerHTML = '<div class="status-info">Extracting data from all pages...</div>';

        // Now extract the data
        const response = await fetch('/extract_data', {
            method: 'POST'
        });

        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                <div class="status-success">
                    <strong>Extraction Complete!</strong><br>
                    Extracted ${data.records_extracted} records with ${data.fields_extracted} fields<br>
                    <button class="btn btn-primary" onclick="downloadFile('${data.output_file}')" style="margin-top: 10px;">
                        Download Excel File
                    </button>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `<div class="status-error">Error: ${data.error}</div>`;
        }
    } catch (error) {
        document.getElementById('extractionStatus').innerHTML = 
            `<div class="status-error">Error: ${error.message}</div>`;
    }
}

async function downloadFile(filename) {
    try {
        window.open(`/download/${filename}`, '_blank');
    } catch (error) {
        showStatus('Error downloading file: ' + error.message, 'error');
    }
}

async function clearSession() {
    try {
        const response = await fetch('/clear_session', {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            // Reset UI
            currentRegions = [];
            selectedRegion = null;
            currentPage = 0;
            totalPages = 0;
            
            document.getElementById('uploadSection').style.display = 'block';
            document.getElementById('pdfViewer').style.display = 'none';
            document.getElementById('loading').style.display = 'none';
            
            // Hide Excel preview and data extraction sections
            document.getElementById('excelPreviewSection').style.display = 'none';
            document.getElementById('dataExtractionSection').style.display = 'none';
            
            document.getElementById('fileName').textContent = 'No file selected';
            document.getElementById('pageCount').textContent = '-';
            document.getElementById('currentPage').textContent = '-';
            document.getElementById('extractionStatus').innerHTML = '';
            
            // Reset Excel data
            excelData = [];
            excelColumns = [];
            
            updateRegionList();
            disableButtons();
            
            showStatus('Session cleared successfully!', 'success');
        } else {
            showStatus('Error clearing session: ' + data.error, 'error');
        }
    } catch (error) {
        showStatus('Error clearing session: ' + error.message, 'error');
    }
}

// Event listeners
document.getElementById('extractDataBtn').addEventListener('click', extractData);
document.getElementById('testOcrBtn').addEventListener('click', testOcr);
document.getElementById('clearSessionBtn').addEventListener('click', clearSession);
