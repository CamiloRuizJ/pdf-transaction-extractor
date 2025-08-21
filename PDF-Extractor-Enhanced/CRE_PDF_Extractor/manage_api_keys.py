"""
API Key Management Script for CRE PDF Extractor
Secure way to manage API keys for the enhanced application.
"""

import sys
import getpass
from security_config import secure_config

def main():
    """Main function for API key management."""
    print(" CRE PDF Extractor - API Key Manager")
    print("=" * 50)
    
    while True:
        print("\nOptions:")
        print("1. Set OpenAI API Key")
        print("2. List API Keys")
        print("3. Remove API Key")
        print("4. Test API Key")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == '1':
            set_openai_key()
        elif choice == '2':
            list_api_keys()
        elif choice == '3':
            remove_api_key()
        elif choice == '4':
            test_api_key()
        elif choice == '5':
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

def set_openai_key():
    """Set OpenAI API key securely."""
    print("\nSetting up OpenAI API Key for ChatGPT integration...")
    
    # Get API key securely (hidden input)
    api_key = getpass.getpass("Enter your OpenAI API key (starts with 'sk-'): ")
    if not api_key:
        print("API key is required.")
        return
    
    if not api_key.startswith('sk-'):
        print("Invalid OpenAI API key format. Should start with 'sk-'.")
        return
    
    # Confirm API key
    confirm_key = getpass.getpass("Confirm API key: ")
    if api_key != confirm_key:
        print("API keys do not match.")
        return
    
    # Store API key
    secure_config.set_api_key('openai', api_key)
    print(" OpenAI API key stored securely!")
    print("You can now use ChatGPT features in the CRE PDF Extractor.")

def list_api_keys():
    """List configured API keys."""
    print("\nConfigured API Keys:")
    print("-" * 30)
    
    services = secure_config.list_services()
    if not services:
        print("No API keys configured.")
        return
    
    for service in services:
        # Show only first 4 characters for security
        api_key = secure_config.get_api_key(service)
        if api_key:
            masked_key = api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]
            print(f"{service}: {masked_key}")

def remove_api_key():
    """Remove an API key."""
    services = secure_config.list_services()
    if not services:
        print("No API keys to remove.")
        return
    
    print("\nConfigured services:")
    for i, service in enumerate(services, 1):
        print(f"{i}. {service}")
    
    try:
        choice = int(input("Enter service number to remove: ")) - 1
        if 0 <= choice < len(services):
            service = services[choice]
            secure_config.remove_service(service)
            print(f" {service} API key removed!")
        else:
            print("Invalid choice.")
    except ValueError:
        print("Invalid input.")

def test_api_key():
    """Test an API key."""
    services = secure_config.list_services()
    if not services:
        print("No API keys to test.")
        return
    
    print("\nConfigured services:")
    for i, service in enumerate(services, 1):
        print(f"{i}. {service}")
    
    try:
        choice = int(input("Enter service number to test: ")) - 1
        if 0 <= choice < len(services):
            service = services[choice]
            api_key = secure_config.get_api_key(service)
            
            if not api_key:
                print(f"No API key found for {service}.")
                return
            
            print(f"Testing {service} API key...")
            
            # Test the API key based on service
            if service == 'openai':
                test_openai_key(api_key)
            else:
                print(f"Testing not implemented for {service}.")
        else:
            print("Invalid choice.")
    except ValueError:
        print("Invalid input.")

def test_openai_key(api_key):
    """Test OpenAI API key."""
    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
        response = client.models.list()
        print(" OpenAI API key is valid!")
        print("ChatGPT integration is ready to use.")
    except Exception as e:
        print(f" OpenAI API key test failed: {e}")

if __name__ == "__main__":
    main()
