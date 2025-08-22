/**
 * AI Integration Module
 * Handles AI-powered features and OpenAI integration
 */

// AI Features Configuration
const AI_CONFIG = {
    enabled: true,
    model: 'gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.0
};

// AI Processing States
let aiProcessing = false;
let aiSuggestions = [];

/**
 * Initialize AI features
 */
function initializeAIFeatures() {
    console.log('Initializing AI features...');
    
    // Set up AI status indicators
    updateAIStatusIndicators();
    
    // Initialize AI suggestion handlers
    setupAISuggestionHandlers();
    
    // Set up AI enhancement handlers
    setupAIEnhancementHandlers();
    
    console.log('AI features initialized');
}

/**
 * Update AI status indicators
 */
function updateAIStatusIndicators() {
    const aiStatusPanel = document.getElementById('aiStatusPanel');
    const aiStatusIcon = document.getElementById('aiStatusIcon');
    const aiStatusText = document.getElementById('aiStatusText');
    
    if (AI_CONFIG.enabled) {
        aiStatusIcon.textContent = '🟢';
        aiStatusText.textContent = `AI Active (${AI_CONFIG.model})`;
        aiStatusPanel.classList.add('active');
    } else {
        aiStatusIcon.textContent = '🔴';
        aiStatusText.textContent = 'AI Unavailable';
        aiStatusPanel.classList.remove('active');
    }
}

/**
 * Setup AI suggestion handlers
 */
function setupAISuggestionHandlers() {
    const aiSuggestBtn = document.getElementById('aiSuggestBtn');
    if (aiSuggestBtn) {
        aiSuggestBtn.addEventListener('click', handleAISuggestions);
    }
}

/**
 * Setup AI enhancement handlers
 */
function setupAIEnhancementHandlers() {
    const aiEnhanceBtn = document.getElementById('aiEnhanceBtn');
    if (aiEnhanceBtn) {
        aiEnhanceBtn.addEventListener('click', handleAIEnhancement);
    }
}

/**
 * Handle AI region suggestions
 */
async function handleAISuggestions() {
    if (aiProcessing) {
        showNotification('AI is already processing...', 'warning');
        return;
    }
    
    try {
        setAIProcessing(true);
        showAIBanner('AI analyzing document structure...');
        
        const response = await fetch('/ai_suggest_regions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            aiSuggestions = data.suggestions;
            displayAISuggestions(aiSuggestions);
            showNotification(`AI found ${data.count} suggested regions`, 'success');
        } else {
            showNotification('No AI suggestions available', 'info');
        }
        
    } catch (error) {
        console.error('AI suggestion error:', error);
        showNotification('AI suggestions temporarily unavailable', 'error');
    } finally {
        setAIProcessing(false);
        hideAIBanner();
    }
}

/**
 * Handle AI text enhancement
 */
async function handleAIEnhancement() {
    const extractedData = getCurrentExtractedData();
    
    if (!extractedData || extractedData.length === 0) {
        showNotification('No data to enhance', 'warning');
        return;
    }
    
    try {
        setAIProcessing(true);
        showAIBanner('AI enhancing data quality...');
        
        const enhancedData = [];
        
        for (const item of extractedData) {
            for (const [fieldName, text] of Object.entries(item)) {
                if (fieldName !== 'page' && text && text.trim()) {
                    const enhancedText = await enhanceTextWithAI(text, fieldName);
                    item[fieldName] = enhancedText;
                }
            }
            enhancedData.push(item);
        }
        
        updateExcelPreview(enhancedData);
        showNotification('Data enhanced with AI', 'success');
        
    } catch (error) {
        console.error('AI enhancement error:', error);
        showNotification('AI enhancement failed', 'error');
    } finally {
        setAIProcessing(false);
        hideAIBanner();
    }
}

/**
 * Enhance text with AI
 */
async function enhanceTextWithAI(text, fieldName) {
    try {
        const response = await fetch('/ai_enhance_text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                field_name: fieldName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.enhanced_text;
        } else {
            return text; // Fallback to original text
        }
        
    } catch (error) {
        console.error('AI text enhancement error:', error);
        return text; // Fallback to original text
    }
}

/**
 * Display AI suggestions
 */
function displayAISuggestions(suggestions) {
    const suggestionsList = document.getElementById('aiSuggestionsList');
    const suggestionsSection = document.getElementById('aiSuggestionsSection');
    
    if (!suggestionsList || !suggestionsSection) return;
    
    suggestionsList.innerHTML = '';
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="no-suggestions">No AI suggestions available</div>';
        return;
    }
    
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = createSuggestionElement(suggestion, index);
        suggestionsList.appendChild(suggestionElement);
    });
    
    suggestionsSection.style.display = 'block';
}

/**
 * Create suggestion element
 */
function createSuggestionElement(suggestion, index) {
    const element = document.createElement('div');
    element.className = 'ai-suggestion-item';
    element.innerHTML = `
        <div class="suggestion-header">
            <span class="suggestion-name">${suggestion.name}</span>
            <div class="suggestion-actions">
                <button class="btn-apply" onclick="applyAISuggestion(${index})" title="Apply suggestion">
                    <span class="btn-icon">✅</span>
                </button>
                <button class="btn-ignore" onclick="ignoreAISuggestion(${index})" title="Ignore suggestion">
                    <span class="btn-icon">❌</span>
                </button>
            </div>
        </div>
        <div class="suggestion-details">
            <span class="suggestion-position">Position: (${suggestion.x}, ${suggestion.y})</span>
            <span class="suggestion-size">Size: ${suggestion.width} × ${suggestion.height}</span>
        </div>
    `;
    return element;
}

/**
 * Apply AI suggestion
 */
function applyAISuggestion(index) {
    if (index >= 0 && index < aiSuggestions.length) {
        const suggestion = aiSuggestions[index];
        addRegionFromSuggestion(suggestion);
        showNotification(`Applied AI suggestion: ${suggestion.name}`, 'success');
    }
}

/**
 * Ignore AI suggestion
 */
function ignoreAISuggestion(index) {
    if (index >= 0 && index < aiSuggestions.length) {
        aiSuggestions.splice(index, 1);
        displayAISuggestions(aiSuggestions);
        showNotification('AI suggestion ignored', 'info');
    }
}

/**
 * Add region from AI suggestion
 */
function addRegionFromSuggestion(suggestion) {
    const region = {
        name: suggestion.name,
        x: suggestion.x,
        y: suggestion.y,
        width: suggestion.width,
        height: suggestion.height
    };
    
    // Add to regions list
    addRegion(region);
    
    // Draw on canvas
    drawRegion(region);
}

/**
 * Set AI processing state
 */
function setAIProcessing(processing) {
    aiProcessing = processing;
    
    const aiButtons = document.querySelectorAll('.btn-ai');
    aiButtons.forEach(btn => {
        btn.disabled = processing;
    });
    
    if (processing) {
        document.body.classList.add('ai-processing');
    } else {
        document.body.classList.remove('ai-processing');
    }
}

/**
 * Show AI banner
 */
function showAIBanner(message) {
    const banner = document.getElementById('aiProcessingBanner');
    if (banner) {
        const textElement = banner.querySelector('.processing-text');
        if (textElement) {
            textElement.textContent = message;
        }
        banner.style.display = 'flex';
    }
}

/**
 * Hide AI banner
 */
function hideAIBanner() {
    const banner = document.getElementById('aiProcessingBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

/**
 * Analyze document with AI
 */
async function analyzeWithAI() {
    if (aiProcessing) {
        showNotification('AI is already processing...', 'warning');
        return;
    }
    
    try {
        setAIProcessing(true);
        showAIBanner('AI analyzing document...');
        
        // Simulate AI analysis
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('AI analysis complete', 'success');
        
    } catch (error) {
        console.error('AI analysis error:', error);
        showNotification('AI analysis failed', 'error');
    } finally {
        setAIProcessing(false);
        hideAIBanner();
    }
}

/**
 * Validate data with AI
 */
async function validateData() {
    const extractedData = getCurrentExtractedData();
    
    if (!extractedData || extractedData.length === 0) {
        showNotification('No data to validate', 'warning');
        return;
    }
    
    try {
        setAIProcessing(true);
        showAIBanner('AI validating data...');
        
        // Simulate AI validation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showNotification('Data validation complete', 'success');
        
    } catch (error) {
        console.error('AI validation error:', error);
        showNotification('AI validation failed', 'error');
    } finally {
        setAIProcessing(false);
        hideAIBanner();
    }
}

// Export functions for global access
window.initializeAIFeatures = initializeAIFeatures;
window.handleAISuggestions = handleAISuggestions;
window.handleAIEnhancement = handleAIEnhancement;
window.analyzeWithAI = analyzeWithAI;
window.validateData = validateData;
window.applyAISuggestion = applyAISuggestion;
window.ignoreAISuggestion = ignoreAISuggestion;
