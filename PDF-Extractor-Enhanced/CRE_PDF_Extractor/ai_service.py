"""
AI Service for CRE PDF Extractor
Integrates ChatGPT for intelligent text processing and data extraction.
"""

import openai
import json
import re
from typing import Dict, List, Optional, Any
from security_config import secure_config

class AIService:
    """AI service using ChatGPT for enhanced processing."""
    
    def __init__(self, config):
        self.config = config
        self.client = None
        self._setup_openai()
    
    def _setup_openai(self):
        """Setup OpenAI client."""
        api_key = self.config.get_api_key('openai')
        if api_key:
            try:
                self.client = openai.OpenAI(api_key=api_key)
                print(" OpenAI client initialized successfully")
            except Exception as e:
                print(f" Failed to initialize OpenAI client: {e}")
                self.client = None
        else:
            print(" No OpenAI API key found. AI features will be disabled.")
            self.client = None
    
    def enhance_text(self, text: str, context: str = "") -> Dict[str, Any]:
        """Enhance text using ChatGPT."""
        if not self.client or not text.strip():
            return {
                'original': text,
                'enhanced': text,
                'confidence': 0.5,
                'corrections': [],
                'ai_used': False
            }
        
        try:
            prompt = f"""
            Enhance the following text extracted from a commercial real estate document. 
            Context: {context}
            
            Original text: "{text}"
            
            Please:
            1. Correct any OCR errors
            2. Fix formatting issues
            3. Standardize data formats (addresses, amounts, dates)
            4. Provide confidence score (0-1)
            5. List any corrections made
            
            Return as JSON:
            {{
                "enhanced_text": "corrected text",
                "confidence": 0.95,
                "corrections": ["list of corrections"],
                "data_type": "detected data type"
            }}
            """
            
            response = self.client.chat.completions.create(
                model=self.config.CHATGPT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config.CHATGPT_TEMPERATURE,
                max_tokens=self.config.CHATGPT_MAX_TOKENS
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                'original': text,
                'enhanced': result.get('enhanced_text', text),
                'confidence': result.get('confidence', 0.5),
                'corrections': result.get('corrections', []),
                'data_type': result.get('data_type', 'unknown'),
                'ai_used': True
            }
            
        except Exception as e:
            print(f"Error enhancing text with AI: {e}")
            return {
                'original': text,
                'enhanced': text,
                'confidence': 0.5,
                'corrections': [],
                'ai_used': False,
                'error': str(e)
            }
    
    def suggest_regions(self, image_description: str) -> List[Dict[str, Any]]:
        """Suggest regions based on document content."""
        if not self.client:
            return []
        
        try:
            prompt = f"""
            Based on this commercial real estate document description, suggest regions for data extraction:
            
            Document: {image_description}
            
            Suggest regions for extracting:
            - Property addresses
            - Rent amounts
            - Square footage
            - Lease terms
            - Tenant names
            - Landlord names
            - Property types
            - Dates
            - Contact information
            
            Return as JSON array:
            [
                {{
                    "name": "region name",
                    "description": "what this region contains",
                    "priority": "high/medium/low",
                    "expected_format": "expected data format"
                }}
            ]
            """
            
            response = self.client.chat.completions.create(
                model=self.config.CHATGPT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config.CHATGPT_TEMPERATURE,
                max_tokens=self.config.CHATGPT_MAX_TOKENS
            )
            
            suggestions = json.loads(response.choices[0].message.content)
            return suggestions
            
        except Exception as e:
            print(f"Error suggesting regions: {e}")
            return []
    
    def validate_data(self, data: Dict[str, str]) -> Dict[str, Any]:
        """Validate extracted data using AI."""
        if not self.client:
            return {'valid': True, 'issues': [], 'ai_used': False}
        
        try:
            data_str = json.dumps(data, indent=2)
            prompt = f"""
            Validate this extracted commercial real estate data for consistency and accuracy:
            
            {data_str}
            
            Check for:
            1. Data format consistency
            2. Logical relationships
            3. Missing required fields
            4. Potential errors in addresses, amounts, dates
            5. CRE-specific validation rules
            
            Return as JSON:
            {{
                "valid": true/false,
                "issues": ["list of issues"],
                "suggestions": ["improvement suggestions"],
                "confidence": 0.95
            }}
            """
            
            response = self.client.chat.completions.create(
                model=self.config.CHATGPT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config.CHATGPT_TEMPERATURE,
                max_tokens=self.config.CHATGPT_MAX_TOKENS
            )
            
            validation = json.loads(response.choices[0].message.content)
            validation['ai_used'] = True
            return validation
            
        except Exception as e:
            print(f"Error validating data: {e}")
            return {'valid': True, 'issues': [], 'ai_used': False, 'error': str(e)}
    
    def extract_structured_data(self, text: str, template: Dict[str, str]) -> Dict[str, Any]:
        """Extract structured data using AI."""
        if not self.client:
            return {'extracted': {}, 'confidence': 0.5, 'ai_used': False}
        
        try:
            template_str = json.dumps(template, indent=2)
            prompt = f"""
            Extract structured commercial real estate data from this text according to the template:
            
            Text: "{text}"
            
            Template: {template_str}
            
            Extract the data and return as JSON:
            {{
                "extracted_data": {{
                    "field_name": "extracted_value"
                }},
                "confidence": 0.95,
                "missing_fields": ["list of missing fields"],
                "suggestions": ["extraction suggestions"]
            }}
            """
            
            response = self.client.chat.completions.create(
                model=self.config.CHATGPT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config.CHATGPT_TEMPERATURE,
                max_tokens=self.config.CHATGPT_MAX_TOKENS
            )
            
            result = json.loads(response.choices[0].message.content)
            result['ai_used'] = True
            return result
            
        except Exception as e:
            print(f"Error extracting structured data: {e}")
            return {'extracted': {}, 'confidence': 0.5, 'ai_used': False, 'error': str(e)}
