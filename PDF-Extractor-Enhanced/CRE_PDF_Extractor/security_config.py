"""
Secure Configuration Management for CRE PDF Extractor
Handles API keys and sensitive data safely with encryption.
"""

import os
import base64
import hashlib
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import Dict, Optional
import json
from pathlib import Path

class SecureConfig:
    """Secure configuration management with encryption."""
    
    def __init__(self, master_password: Optional[str] = None):
        self.secrets_file = Path('.secrets')
        self.key_file = Path('.key')
        
        # Initialize encryption
        self._setup_encryption(master_password)
        
        # Load or create secrets
        self.secrets = self._load_secrets()
    
    def _setup_encryption(self, master_password: Optional[str] = None):
        """Setup encryption key."""
        if self.key_file.exists():
            # Load existing key
            with open(self.key_file, 'rb') as f:
                key = f.read()
        else:
            # Generate new key
            if master_password:
                # Derive key from password
                salt = os.urandom(16)
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                )
                key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
                
                # Save salt for future use
                with open('.salt', 'wb') as f:
                    f.write(salt)
            else:
                # Generate random key
                key = Fernet.generate_key()
            
            # Save key
            with open(self.key_file, 'wb') as f:
                f.write(key)
        
        self.cipher = Fernet(key)
    
    def _encrypt(self, data: str) -> str:
        """Encrypt sensitive data."""
        return self.cipher.encrypt(data.encode()).decode()
    
    def _decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    
    def _load_secrets(self) -> Dict:
        """Load encrypted secrets."""
        if self.secrets_file.exists():
            try:
                with open(self.secrets_file, 'r') as f:
                    encrypted_data = f.read()
                decrypted_data = self._decrypt(encrypted_data)
                return json.loads(decrypted_data)
            except Exception as e:
                print(f"Error loading secrets: {e}")
                return {}
        return {}
    
    def _save_secrets(self):
        """Save encrypted secrets."""
        encrypted_data = self._encrypt(json.dumps(self.secrets))
        with open(self.secrets_file, 'w') as f:
            f.write(encrypted_data)
    
    def set_api_key(self, service: str, api_key: str):
        """Set API key for a service."""
        self.secrets[f"{service}_api_key"] = api_key
        self._save_secrets()
    
    def get_api_key(self, service: str) -> Optional[str]:
        """Get API key for a service."""
        return self.secrets.get(f"{service}_api_key")
    
    def set_secret(self, key: str, value: str):
        """Set any secret value."""
        self.secrets[key] = value
        self._save_secrets()
    
    def get_secret(self, key: str) -> Optional[str]:
        """Get any secret value."""
        return self.secrets.get(key)
    
    def list_services(self) -> list:
        """List all configured services."""
        return [k.replace('_api_key', '') for k in self.secrets.keys() if k.endswith('_api_key')]
    
    def remove_service(self, service: str):
        """Remove API key for a service."""
        if f"{service}_api_key" in self.secrets:
            del self.secrets[f"{service}_api_key"]
            self._save_secrets()

# Global secure config instance
secure_config = SecureConfig()
