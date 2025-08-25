#!/usr/bin/env python3
"""
Deployment Verification Script for OpenAI Fix
Tests the deployed API endpoints to ensure the fix works correctly
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any

class DeploymentVerifier:
    """Verify the deployment is working correctly"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'RExeli-Deployment-Verifier/1.0'
        })
    
    def test_health_endpoint(self) -> Dict[str, Any]:
        """Test the health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                return {
                    'status': 'success',
                    'response': response.json(),
                    'status_code': response.status_code
                }
            else:
                return {
                    'status': 'failed',
                    'error': f"HTTP {response.status_code}",
                    'response': response.text[:200]
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def test_config_endpoint(self) -> Dict[str, Any]:
        """Test the config endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/config", timeout=10)
            if response.status_code == 200:
                config_data = response.json()
                return {
                    'status': 'success',
                    'response': config_data,
                    'openai_configured': config_data.get('openai_configured', False),
                    'ai_processing': config_data.get('ai_processing', False)
                }
            else:
                return {
                    'status': 'failed',
                    'error': f"HTTP {response.status_code}",
                    'response': response.text[:200]
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def test_ai_endpoint(self) -> Dict[str, Any]:
        """Test the AI endpoint (the main fix target)"""
        try:
            # Test both GET and POST
            get_response = self.session.get(f"{self.base_url}/test-ai", timeout=15)
            
            if get_response.status_code == 200:
                ai_data = get_response.json()
                return {
                    'status': 'success',
                    'response': ai_data,
                    'diagnostics': ai_data.get('diagnostics', {}),
                    'ai_service_type': ai_data.get('diagnostics', {}).get('ai_service_type'),
                    'client_available': ai_data.get('diagnostics', {}).get('client_available'),
                    'client_version': ai_data.get('diagnostics', {}).get('client_version')
                }
            elif get_response.status_code == 500:
                # Parse error response
                try:
                    error_data = get_response.json()
                    return {
                        'status': 'failed',
                        'error': error_data.get('error', 'Unknown error'),
                        'response': error_data
                    }
                except:
                    return {
                        'status': 'failed',
                        'error': f"HTTP 500: {get_response.text[:200]}"
                    }
            else:
                return {
                    'status': 'failed',
                    'error': f"HTTP {get_response.status_code}",
                    'response': get_response.text[:200]
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def test_ai_status_endpoint(self) -> Dict[str, Any]:
        """Test the AI status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/ai/status", timeout=10)
            if response.status_code == 200:
                return {
                    'status': 'success',
                    'response': response.json()
                }
            else:
                return {
                    'status': 'failed',
                    'error': f"HTTP {response.status_code}",
                    'response': response.text[:200]
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def run_verification(self) -> Dict[str, Any]:
        """Run all verification tests"""
        print(f"🚀 Starting deployment verification for: {self.base_url}")
        print(f"⏰ Timestamp: {datetime.utcnow().isoformat()}")
        print("=" * 80)
        
        tests = [
            ("Health Check", self.test_health_endpoint),
            ("Config Check", self.test_config_endpoint),
            ("AI Test Endpoint (CRITICAL)", self.test_ai_endpoint),
            ("AI Status", self.test_ai_status_endpoint)
        ]
        
        results = {}
        all_passed = True
        
        for test_name, test_func in tests:
            print(f"\n🧪 Testing: {test_name}")
            print("-" * 40)
            
            try:
                result = test_func()
                results[test_name] = result
                
                if result['status'] == 'success':
                    print("✅ PASSED")
                    
                    # Print specific details for AI test
                    if 'AI Test' in test_name:
                        diag = result.get('diagnostics', {})
                        print(f"   AI Service Type: {diag.get('ai_service_type', 'unknown')}")
                        print(f"   OpenAI Key Configured: {diag.get('openai_key_configured', False)}")
                        print(f"   Client Available: {diag.get('client_available', False)}")
                        print(f"   Client Version: {diag.get('client_version', 'unknown')}")
                        
                        if diag.get('classification_test') == 'success':
                            print(f"   🎉 AI Classification Test: PASSED")
                        elif diag.get('classification_test') == 'failed':
                            print(f"   ⚠️  AI Classification Test: FAILED - {diag.get('test_error', 'unknown error')}")
                        
                elif result['status'] == 'failed':
                    print("❌ FAILED")
                    print(f"   Error: {result.get('error', 'Unknown error')}")
                    all_passed = False
                    
                elif result['status'] == 'error':
                    print("💥 ERROR")
                    print(f"   Error: {result.get('error', 'Unknown error')}")
                    all_passed = False
                    
            except Exception as e:
                print(f"💥 CRASHED: {e}")
                results[test_name] = {'status': 'crashed', 'error': str(e)}
                all_passed = False
        
        print("\n" + "=" * 80)
        print("🏁 VERIFICATION SUMMARY")
        print("=" * 80)
        
        for test_name, result in results.items():
            status_emoji = {
                'success': '✅',
                'failed': '❌',
                'error': '💥',
                'crashed': '💥'
            }.get(result['status'], '❓')
            
            print(f"{status_emoji} {test_name}: {result['status'].upper()}")
        
        print(f"\n🎯 Overall Status: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
        
        # Specific OpenAI fix verification
        ai_test_result = results.get("AI Test Endpoint (CRITICAL)", {})
        if ai_test_result.get('status') == 'success':
            diag = ai_test_result.get('diagnostics', {})
            if diag.get('client_available') and diag.get('classification_test') == 'success':
                print("🎉 OpenAI CLIENT FIX: FULLY WORKING")
            elif diag.get('ai_service_type') == 'BasicAIService':
                print("⚠️  OpenAI CLIENT FIX: FALLBACK TO BASIC SERVICE (Expected if no API key)")
            else:
                print("⚠️  OpenAI CLIENT FIX: PARTIAL SUCCESS")
        else:
            print("❌ OpenAI CLIENT FIX: FAILED")
        
        return {
            'overall_success': all_passed,
            'results': results,
            'timestamp': datetime.utcnow().isoformat()
        }

def main():
    """Main function"""
    import sys
    
    # Default URLs to test
    urls = [
        "https://rexeli.vercel.app/api",  # Production
        "http://localhost:3000/api",      # Local development
    ]
    
    # Override with command line argument if provided
    if len(sys.argv) > 1:
        urls = [sys.argv[1]]
    
    overall_success = True
    
    for url in urls:
        print(f"\n{'='*100}")
        print(f"TESTING: {url}")
        print(f"{'='*100}")
        
        verifier = DeploymentVerifier(url)
        result = verifier.run_verification()
        
        if not result['overall_success']:
            overall_success = False
        
        time.sleep(1)  # Brief pause between different URLs
    
    # Exit code for CI/CD
    sys.exit(0 if overall_success else 1)

if __name__ == "__main__":
    main()