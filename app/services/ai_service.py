"""
AI Service
Enhanced AI service with Real Estate specialization and OpenAI integration.
"""

import json
import re
import time
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Union
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import wraps

import structlog
from openai import OpenAI, RateLimitError, APIError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = structlog.get_logger()

class AIService:
    """AI service for data enhancement and validation with comprehensive OpenAI integration"""
    
    def __init__(self):
        self.client = None
        self.model = None
        self.temperature = 0.1
        self.max_tokens = 1000
        self.cost_tracker = {
            'total_tokens': 0,
            'total_cost': 0.0,
            'requests': 0
        }
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._initialize_openai()
    
    def _initialize_openai(self):
        """Initialize OpenAI client with configuration"""
        try:
            from config import Config
            if Config.OPENAI_API_KEY:
                self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
                self.model = getattr(Config, 'OPENAI_MODEL', 'gpt-3.5-turbo')
                self.temperature = getattr(Config, 'OPENAI_TEMPERATURE', 0.1)
                self.max_tokens = getattr(Config, 'OPENAI_MAX_TOKENS', 1000)
                logger.info("OpenAI client initialized successfully", model=self.model)
            else:
                logger.warning("OpenAI API key not configured - using fallback methods")
        except Exception as e:
            logger.error("Failed to initialize OpenAI client", error=str(e))
    
    def _track_usage(self, prompt_tokens: int, completion_tokens: int) -> None:
        """Track token usage and estimated costs"""
        total_tokens = prompt_tokens + completion_tokens
        self.cost_tracker['total_tokens'] += total_tokens
        self.cost_tracker['requests'] += 1
        
        # Estimated costs (as of 2024) - update based on current pricing
        if 'gpt-4' in self.model:
            cost = (prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000
        else:  # gpt-3.5-turbo
            cost = (prompt_tokens * 0.001 + completion_tokens * 0.002) / 1000
        
        self.cost_tracker['total_cost'] += cost
        logger.debug("Token usage tracked", 
                    tokens=total_tokens, 
                    estimated_cost=cost,
                    total_cost=self.cost_tracker['total_cost'])
    
    @retry(
        retry=retry_if_exception_type((RateLimitError, APIError)),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        stop=stop_after_attempt(3)
    )
    def _make_openai_request(self, messages: List[Dict[str, str]], 
                           temperature: Optional[float] = None,
                           max_tokens: Optional[int] = None,
                           response_format: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Make a request to OpenAI API with retry logic"""
        if not self.client:
            raise ValueError("OpenAI client not initialized")
        
        params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens
        }
        
        if response_format:
            params["response_format"] = response_format
        
        response = self.client.chat.completions.create(**params)
        
        # Track usage
        if hasattr(response, 'usage'):
            self._track_usage(
                response.usage.prompt_tokens,
                response.usage.completion_tokens
            )
        
        return {
            "content": response.choices[0].message.content,
            "finish_reason": response.choices[0].finish_reason,
            "usage": response.usage if hasattr(response, 'usage') else None
        }
    
    def enhance_extracted_data(self, raw_data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Enhance extracted data using AI with real estate context"""
        try:
            if not self.client:
                logger.warning("OpenAI client not available, returning enhanced data with basic processing")
                return self._basic_enhancement(raw_data, document_type)
            
            # Create context-aware prompt for real estate documents
            prompt = self._create_enhancement_prompt(raw_data, document_type)
            
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert real estate document analyst. Enhance and standardize the extracted data while maintaining accuracy. Return only valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(
                messages=messages,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            enhanced_data = json.loads(response["content"])
            
            # Merge with original data, preserving confidence scores
            result = {
                "enhanced_data": enhanced_data,
                "original_data": raw_data,
                "enhancement_confidence": self._calculate_enhancement_confidence(raw_data, enhanced_data),
                "document_type": document_type,
                "enhanced_timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("Data enhanced successfully", 
                       document_type=document_type,
                       fields_enhanced=len(enhanced_data))
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse enhanced data JSON", error=str(e))
            return self._basic_enhancement(raw_data, document_type)
        except Exception as e:
            logger.error("Error enhancing data", error=str(e))
            return self._basic_enhancement(raw_data, document_type)
    
    def _create_enhancement_prompt(self, raw_data: Dict[str, Any], document_type: str) -> str:
        """Create context-aware prompt for data enhancement"""
        base_prompt = f"""
Analyze and enhance the following {document_type} real estate document data.

Raw extracted data:
{json.dumps(raw_data, indent=2)}

Please enhance this data by:
1. Standardizing formats (addresses, phone numbers, dates, currency)
2. Correcting obvious OCR errors
3. Adding missing fields that can be inferred
4. Validating and formatting numerical values
5. Standardizing property types and classifications

For real estate documents, pay special attention to:
- Property addresses (full standardized format)
- Financial amounts (rent, sale price, deposits)
- Square footage and property specifications
- Lease terms and dates
- Tenant and landlord information
- Property type classifications

Return enhanced data as JSON with the same structure plus any additional inferred fields.
"""
        return base_prompt
    
    def _basic_enhancement(self, raw_data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Basic enhancement without AI"""
        # Apply basic standardization
        enhanced_data = raw_data.copy()
        
        # Basic formatting improvements
        for key, value in enhanced_data.items():
            if isinstance(value, str):
                # Clean up common OCR issues
                enhanced_data[key] = self._basic_text_cleanup(value)
        
        return {
            "enhanced_data": enhanced_data,
            "original_data": raw_data,
            "enhancement_confidence": 0.6,
            "document_type": document_type,
            "enhanced_timestamp": datetime.utcnow().isoformat(),
            "enhancement_method": "basic"
        }
    
    def _basic_text_cleanup(self, text: str) -> str:
        """Basic text cleanup for common OCR errors"""
        if not isinstance(text, str):
            return text
            
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Common OCR corrections
        corrections = {
            'O': '0', 'l': '1', 'I': '1', 'S': '5',
            'B': '8', 'G': '6', 'Z': '2'
        }
        
        # Apply corrections carefully (only in numeric contexts)
        for wrong, right in corrections.items():
            # Only replace if surrounded by numbers
            pattern = r'(?<=\d)' + re.escape(wrong) + r'(?=\d)'
            text = re.sub(pattern, right, text)
        
        return text
    
    def _calculate_enhancement_confidence(self, original: Dict[str, Any], 
                                        enhanced: Dict[str, Any]) -> float:
        """Calculate confidence score for enhancement"""
        if not enhanced or not original:
            return 0.0
        
        # Base confidence
        confidence = 0.8
        
        # Adjust based on number of changes
        changes = 0
        total_fields = len(original)
        
        for key in original:
            if key in enhanced and str(original[key]) != str(enhanced[key]):
                changes += 1
        
        # Moderate confidence reduction for many changes
        if total_fields > 0:
            change_ratio = changes / total_fields
            if change_ratio > 0.5:
                confidence -= 0.2
            elif change_ratio > 0.3:
                confidence -= 0.1
        
        return max(0.1, min(1.0, confidence))
    
    def validate_real_estate_data(self, data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Validate Real Estate data using AI with domain expertise"""
        try:
            if not self.client:
                return self._basic_validation(data, document_type)
            
            # Create validation prompt
            prompt = self._create_validation_prompt(data, document_type)
            
            messages = [
                {
                    "role": "system",
                    "content": "You are a real estate data validation expert. Analyze the data for accuracy, completeness, and compliance with real estate standards. Return detailed validation results as JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(
                messages=messages,
                temperature=0.0,  # Use deterministic output for validation
                response_format={"type": "json_object"}
            )
            
            validation_result = json.loads(response["content"])
            
            # Ensure required fields in response
            result = {
                "valid": validation_result.get("valid", True),
                "errors": validation_result.get("errors", []),
                "warnings": validation_result.get("warnings", []),
                "suggestions": validation_result.get("suggestions", []),
                "confidence": validation_result.get("confidence", 0.8),
                "field_scores": validation_result.get("field_scores", {}),
                "validation_timestamp": datetime.utcnow().isoformat(),
                "document_type": document_type
            }
            
            logger.info("Data validation completed", 
                       valid=result["valid"],
                       errors_count=len(result["errors"]),
                       warnings_count=len(result["warnings"]))
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse validation JSON", error=str(e))
            return self._basic_validation(data, document_type)
        except Exception as e:
            logger.error("Error validating data", error=str(e))
            return self._basic_validation(data, document_type)
    
    def _create_validation_prompt(self, data: Dict[str, Any], document_type: str) -> str:
        """Create validation prompt for real estate data"""
        return f"""
Validate the following {document_type} real estate document data:

{json.dumps(data, indent=2)}

Perform comprehensive validation checking for:

1. **Data Accuracy & Format**:
   - Address formatting and completeness
   - Phone number formats (US standards)
   - Email address validation
   - Date formats and logical ranges
   - Currency amounts and formatting

2. **Real Estate Specific Validations**:
   - Property type classifications
   - Square footage reasonableness
   - Rent/price ranges for market
   - Lease term validity
   - Cap rate calculations (if applicable)

3. **Business Logic Validation**:
   - Required field completeness
   - Cross-field consistency
   - Logical relationships between fields
   - Market standard compliance

4. **Data Quality Assessment**:
   - Confidence scores per field
   - Missing critical information
   - Potential OCR errors
   - Standardization opportunities

Return JSON with:
{{
  "valid": boolean,
  "errors": ["list of critical errors"],
  "warnings": ["list of warnings"],
  "suggestions": ["list of improvement suggestions"],
  "confidence": float (0.0-1.0),
  "field_scores": {{"field_name": confidence_score}}
}}
"""
    
    def suggest_field_corrections(self, field_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest corrections for specific fields using AI and context"""
        try:
            if not self.client:
                return self._basic_field_corrections(field_data, context)
            
            prompt = self._create_field_correction_prompt(field_data, context)
            
            messages = [
                {
                    "role": "system",
                    "content": "You are a real estate data correction specialist. Suggest accurate corrections for field data based on context and domain knowledge."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(
                messages=messages,
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            corrections = json.loads(response["content"])
            
            return {
                "corrections": corrections.get("corrections", {}),
                "confidence_scores": corrections.get("confidence_scores", {}),
                "explanations": corrections.get("explanations", {}),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Error suggesting field corrections", error=str(e))
            return self._basic_field_corrections(field_data, context)
    
    def _create_field_correction_prompt(self, field_data: Dict[str, Any], 
                                      context: Dict[str, Any]) -> str:
        """Create prompt for field corrections"""
        return f"""
Analyze and suggest corrections for the following field data:

Field Data:
{json.dumps(field_data, indent=2)}

Context:
{json.dumps(context, indent=2)}

For each field that needs correction, suggest:
1. Corrected value
2. Confidence score (0.0-1.0)
3. Brief explanation of the correction

Focus on:
- OCR error corrections
- Format standardization
- Real estate data validation
- Context-based improvements

Return JSON:
{{
  "corrections": {{"field_name": "corrected_value"}},
  "confidence_scores": {{"field_name": confidence_float}},
  "explanations": {{"field_name": "reason for correction"}}
}}
"""
    
    def _basic_field_corrections(self, field_data: Dict[str, Any], 
                               context: Dict[str, Any]) -> Dict[str, Any]:
        """Basic field corrections without AI"""
        corrections = {}
        confidence_scores = {}
        explanations = {}
        
        for field_name, field_value in field_data.items():
            if isinstance(field_value, str):
                # Apply basic corrections
                corrected = self._basic_text_cleanup(field_value)
                if corrected != field_value:
                    corrections[field_name] = corrected
                    confidence_scores[field_name] = 0.7
                    explanations[field_name] = "Basic text cleanup applied"
        
        return {
            "corrections": corrections,
            "confidence_scores": confidence_scores,
            "explanations": explanations,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def correct_ocr_errors(self, text: str, context: str = "real_estate") -> Dict[str, Any]:
        """Correct OCR errors using AI with context awareness"""
        try:
            if not self.client or not text or len(text.strip()) == 0:
                return {
                    "corrected_text": self._basic_ocr_correction(text),
                    "confidence": 0.6,
                    "corrections_made": [],
                    "method": "basic"
                }
            
            # Skip AI for very short text
            if len(text.strip()) < 5:
                return {
                    "corrected_text": self._basic_ocr_correction(text),
                    "confidence": 0.8,
                    "corrections_made": [],
                    "method": "basic_short"
                }
            
            prompt = f"""
Correct OCR errors in the following text from a {context} document.

Original text:
"{text}"

Apply corrections for:
1. Common OCR character misrecognitions (O/0, l/1, etc.)
2. Word spacing issues
3. Missing or extra characters
4. Context-appropriate corrections for real estate terminology

Return JSON with:
{{
  "corrected_text": "the corrected text",
  "corrections_made": ["list of specific corrections"],
  "confidence": float_score_0_to_1
}}

Preserve the original meaning and formatting structure.
"""
            
            messages = [
                {
                    "role": "system",
                    "content": "You are an OCR error correction specialist with expertise in real estate documents. Provide accurate corrections while preserving original meaning."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(
                messages=messages,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response["content"])
            result["method"] = "ai_corrected"
            result["original_text"] = text
            
            logger.info("OCR correction completed", 
                       corrections_count=len(result.get("corrections_made", [])),
                       confidence=result.get("confidence", 0))
            
            return result
            
        except Exception as e:
            logger.error("Error correcting OCR errors", error=str(e))
            return {
                "corrected_text": self._basic_ocr_correction(text),
                "confidence": 0.6,
                "corrections_made": [],
                "method": "basic_fallback",
                "error": str(e)
            }
    
    def classify_document_content(self, text: str) -> Dict[str, Any]:
        """Enhanced document classification using AI"""
        try:
            if not self.client:
                return self._basic_document_classification(text)
            
            prompt = f"""
Classify the following document text and extract key metadata:

Document text (first 1000 chars):
"{text[:1000]}..."

Classify this document and provide:
1. Document type (lease_agreement, purchase_contract, property_listing, etc.)
2. Property type (office, retail, residential, industrial, etc.)
3. Document purpose (lease, sale, analysis, etc.)
4. Key entities mentioned
5. Confidence score for classification

Return JSON:
{{
  "document_type": "specific_document_type",
  "property_type": "property_category",
  "purpose": "document_purpose",
  "entities": {{"addresses": [], "companies": [], "people": []}},
  "confidence": float_score,
  "keywords": ["relevant", "keywords"],
  "language": "detected_language"
}}
"""
            
            messages = [
                {
                    "role": "system",
                    "content": "You are a real estate document classification expert. Analyze documents and provide detailed classification with high accuracy."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(messages=messages, temperature=0.1)
            classification = json.loads(response["content"])
            
            classification["timestamp"] = datetime.utcnow().isoformat()
            classification["method"] = "ai_classification"
            
            return classification
            
        except Exception as e:
            logger.error("Error classifying document", error=str(e))
            return self._basic_document_classification(text)
    
    def _basic_document_classification(self, text: str) -> Dict[str, Any]:
        """Basic document classification using keywords"""
        text_lower = text.lower()
        
        # Simple keyword-based classification
        doc_type = "unknown"
        property_type = "unknown"
        confidence = 0.6
        
        if any(word in text_lower for word in ["lease", "tenant", "landlord", "rent"]):
            doc_type = "lease_agreement"
            confidence = 0.8
        elif any(word in text_lower for word in ["purchase", "sale", "buyer", "seller"]):
            doc_type = "purchase_contract"
            confidence = 0.8
        elif any(word in text_lower for word in ["listing", "mls", "for sale", "for rent"]):
            doc_type = "property_listing"
            confidence = 0.7
        
        if any(word in text_lower for word in ["office", "commercial"]):
            property_type = "office"
        elif any(word in text_lower for word in ["retail", "store", "shop"]):
            property_type = "retail"
        elif any(word in text_lower for word in ["residential", "apartment", "home"]):
            property_type = "residential"
        
        return {
            "document_type": doc_type,
            "property_type": property_type,
            "purpose": "analysis",
            "entities": {"addresses": [], "companies": [], "people": []},
            "confidence": confidence,
            "keywords": [],
            "language": "english",
            "method": "basic_classification",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def extract_structured_data(self, text: str, document_type: str) -> Dict[str, Any]:
        """Extract structured data from unstructured text"""
        try:
            if not self.client:
                return self._basic_structured_extraction(text, document_type)
            
            prompt = self._create_extraction_prompt(text, document_type)
            
            messages = [
                {
                    "role": "system",
                    "content": f"You are a real estate document data extraction expert. Extract structured data from {document_type} documents with high accuracy."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(
                messages=messages,
                temperature=0.1,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            extracted_data = json.loads(response["content"])
            extracted_data["extraction_timestamp"] = datetime.utcnow().isoformat()
            extracted_data["method"] = "ai_extraction"
            
            return extracted_data
            
        except Exception as e:
            logger.error("Error extracting structured data", error=str(e))
            return self._basic_structured_extraction(text, document_type)
    
    def _create_extraction_prompt(self, text: str, document_type: str) -> str:
        """Create extraction prompt based on document type"""
        base_fields = {
            "lease_agreement": [
                "property_address", "tenant_name", "landlord_name", 
                "lease_start_date", "lease_end_date", "monthly_rent",
                "security_deposit", "square_footage", "property_type"
            ],
            "purchase_contract": [
                "property_address", "buyer_name", "seller_name",
                "purchase_price", "closing_date", "earnest_money",
                "square_footage", "property_type"
            ],
            "property_listing": [
                "property_address", "listing_price", "square_footage",
                "property_type", "bedrooms", "bathrooms", "year_built",
                "listing_agent", "mls_number"
            ]
        }
        
        fields = base_fields.get(document_type, base_fields["lease_agreement"])
        
        return f"""
Extract structured data from the following {document_type} text:

{text[:2000]}...

Extract the following fields if present:
{', '.join(fields)}

Return JSON with:
{{
  "extracted_fields": {{
    "field_name": {{
      "value": "extracted_value",
      "confidence": float_0_to_1,
      "location": "where_found_in_text"
    }}
  }},
  "document_summary": "brief summary of document",
  "extraction_confidence": overall_confidence_float
}}

Only include fields that are clearly identifiable in the text.
"""
    
    def _basic_structured_extraction(self, text: str, document_type: str) -> Dict[str, Any]:
        """Basic structured data extraction using regex patterns"""
        from config import Config
        
        extracted_fields = {}
        
        for pattern_name, pattern in Config.CRE_PATTERNS.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                extracted_fields[pattern_name] = {
                    "value": matches[0] if isinstance(matches[0], str) else str(matches[0]),
                    "confidence": 0.7,
                    "location": "regex_match"
                }
        
        return {
            "extracted_fields": extracted_fields,
            "document_summary": f"Basic extraction from {document_type}",
            "extraction_confidence": 0.6,
            "method": "regex_extraction",
            "extraction_timestamp": datetime.utcnow().isoformat()
        }
    
    def generate_data_insights(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate analytical insights from processed data"""
        try:
            if not self.client:
                return self._basic_insights(processed_data)
            
            prompt = f"""
Analyze the following real estate data and generate insights:

{json.dumps(processed_data, indent=2)}

Provide insights on:
1. Market analysis and trends
2. Financial performance indicators
3. Property investment potential
4. Risk factors and considerations
5. Recommendations for stakeholders

Return JSON:
{{
  "market_insights": ["list of market observations"],
  "financial_analysis": {{
    "key_metrics": {{}},
    "performance_indicators": []
  }},
  "investment_potential": {{
    "score": float_0_to_10,
    "factors": ["positive and negative factors"]
  }},
  "recommendations": ["actionable recommendations"],
  "risk_assessment": {{
    "risk_level": "low/medium/high",
    "risk_factors": []
  }}
}}
"""
            
            messages = [
                {
                    "role": "system",
                    "content": "You are a real estate investment analyst with expertise in market analysis and property valuation. Provide professional insights based on data."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = self._make_openai_request(
                messages=messages,
                temperature=0.3,
                max_tokens=1200
            )
            
            insights = json.loads(response["content"])
            insights["analysis_timestamp"] = datetime.utcnow().isoformat()
            insights["method"] = "ai_analysis"
            
            return insights
            
        except Exception as e:
            logger.error("Error generating insights", error=str(e))
            return self._basic_insights(processed_data)
    
    def _basic_insights(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic insights without AI"""
        return {
            "market_insights": ["Basic data analysis completed"],
            "financial_analysis": {
                "key_metrics": {},
                "performance_indicators": []
            },
            "investment_potential": {
                "score": 5.0,
                "factors": ["Insufficient data for detailed analysis"]
            },
            "recommendations": ["Consider additional data collection for enhanced analysis"],
            "risk_assessment": {
                "risk_level": "medium",
                "risk_factors": ["Limited data available"]
            },
            "method": "basic_analysis",
            "analysis_timestamp": datetime.utcnow().isoformat()
        }
    
    def process_batch(self, items: List[Dict[str, Any]], 
                     operation: str, **kwargs) -> List[Dict[str, Any]]:
        """Process multiple items in batch with rate limiting"""
        results = []
        batch_size = kwargs.get('batch_size', 5)
        delay = kwargs.get('delay', 1.0)  # seconds between batches
        
        logger.info("Starting batch processing", 
                   total_items=len(items), 
                   operation=operation,
                   batch_size=batch_size)
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            batch_results = []
            
            # Process batch concurrently
            with ThreadPoolExecutor(max_workers=min(batch_size, 3)) as executor:
                futures = []
                
                for item in batch:
                    if operation == "enhance":
                        future = executor.submit(
                            self.enhance_extracted_data, 
                            item.get('data', {}), 
                            item.get('document_type', 'unknown')
                        )
                    elif operation == "validate":
                        future = executor.submit(
                            self.validate_real_estate_data,
                            item.get('data', {}),
                            item.get('document_type', 'unknown')
                        )
                    elif operation == "classify":
                        future = executor.submit(
                            self.classify_document_content,
                            item.get('text', '')
                        )
                    else:
                        future = executor.submit(lambda x: x, item)  # passthrough
                    
                    futures.append(future)
                
                # Collect results
                for future in as_completed(futures):
                    try:
                        result = future.result(timeout=30)
                        batch_results.append(result)
                    except Exception as e:
                        logger.error("Batch item processing failed", error=str(e))
                        batch_results.append({"error": str(e)})
            
            results.extend(batch_results)
            
            # Rate limiting delay
            if i + batch_size < len(items):
                time.sleep(delay)
        
        logger.info("Batch processing completed", 
                   processed=len(results), 
                   operation=operation)
        
        return results
    
    def get_usage_statistics(self) -> Dict[str, Any]:
        """Get AI service usage statistics"""
        return {
            "total_requests": self.cost_tracker['requests'],
            "total_tokens": self.cost_tracker['total_tokens'],
            "estimated_cost": round(self.cost_tracker['total_cost'], 4),
            "model_used": self.model,
            "client_initialized": self.client is not None
        }
    
    def _basic_validation(self, data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Basic validation without AI"""
        errors = []
        warnings = []
        
        # Check for required fields based on document type
        required_fields = {
            'lease_agreement': ['tenant_name', 'property_address', 'monthly_rent'],
            'purchase_contract': ['buyer_name', 'seller_name', 'purchase_price'],
            'property_listing': ['property_address', 'listing_price']
        }
        
        if document_type in required_fields:
            for field in required_fields[document_type]:
                if field not in data or not data[field]:
                    errors.append(f"Missing required field: {field}")
        
        # Basic format validations
        for key, value in data.items():
            if 'email' in key.lower() and value:
                if '@' not in str(value):
                    warnings.append(f"Invalid email format: {key}")
            elif 'phone' in key.lower() and value:
                if not re.match(r'[\d\-\(\)\s]+', str(value)):
                    warnings.append(f"Invalid phone format: {key}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'confidence': 0.7 if len(errors) == 0 else 0.3,
            'validation_timestamp': datetime.utcnow().isoformat(),
            'method': 'basic_validation'
        }
    
    def _basic_ocr_correction(self, text: str) -> str:
        """Basic OCR correction without AI"""
        if not isinstance(text, str):
            return str(text) if text is not None else ""
        
        from config import Config
        corrected_text = text
        
        # Apply OCR corrections more carefully
        for wrong, right in Config.OCR_CORRECTIONS.items():
            # Only apply corrections in appropriate contexts
            if wrong.isdigit() or right.isdigit():
                # Only replace if it looks like a number context
                pattern = r'(?<=\d)' + re.escape(wrong) + r'(?=\d)|(?<=\s)' + re.escape(wrong) + r'(?=\s)|(?<=^)' + re.escape(wrong) + r'(?=\s)|(?<=\s)' + re.escape(wrong) + r'(?=$)'
                corrected_text = re.sub(pattern, right, corrected_text)
            else:
                corrected_text = corrected_text.replace(wrong, right)
        
        return corrected_text
    
    def __del__(self):
        """Cleanup resources"""
        try:
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=False)
        except:
            pass
