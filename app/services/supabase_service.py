"""
Supabase Storage Service
Handles file uploads, downloads, and storage management for Supabase integration
"""

import os
import logging
import tempfile
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timedelta
import hashlib
from supabase import create_client, Client
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)

class SupabaseStorageService:
    """Service for handling Supabase storage operations"""
    
    def __init__(self):
        """Initialize Supabase client and storage configuration"""
        self.url = os.environ.get('SUPABASE_URL')
        self.service_key = os.environ.get('SUPABASE_SERVICE_KEY')
        self.anon_key = os.environ.get('SUPABASE_ANON_KEY')
        
        if not self.url:
            raise ValueError("SUPABASE_URL environment variable is required")
        
        # Use service key for admin operations, fallback to anon key
        api_key = self.service_key or self.anon_key
        if not api_key:
            raise ValueError("Either SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY is required")
        
        try:
            self.client: Client = create_client(self.url, api_key)
            self.bucket_name = 'documents'
            self._ensure_bucket_exists()
            logger.info("Supabase storage service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {str(e)}")
            raise
    
    def _ensure_bucket_exists(self) -> None:
        """Ensure the documents bucket exists"""
        try:
            # Try to get bucket info
            self.client.storage.get_bucket(self.bucket_name)
            logger.debug(f"Bucket '{self.bucket_name}' exists")
        except Exception as e:
            logger.warning(f"Bucket check failed: {str(e)}")
            try:
                # Try to create bucket
                self.client.storage.create_bucket(self.bucket_name, {'public': False})
                logger.info(f"Created bucket '{self.bucket_name}'")
            except Exception as create_error:
                logger.error(f"Failed to create bucket: {str(create_error)}")
                # Continue anyway - bucket might exist but not accessible with current permissions
    
    def upload_file(self, file_path: str, remote_path: str, 
                   content_type: str = 'application/pdf') -> Dict[str, Any]:
        """
        Upload a file to Supabase storage
        
        Args:
            file_path: Local path to the file to upload
            remote_path: Remote path in the storage bucket
            content_type: MIME type of the file
            
        Returns:
            Dict with upload result information
        """
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            file_size = os.path.getsize(file_path)
            logger.info(f"Uploading file {file_path} ({file_size} bytes) to {remote_path}")
            
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            # Calculate file hash for integrity checking
            file_hash = hashlib.sha256(file_data).hexdigest()
            
            # Upload to Supabase storage
            result = self.client.storage.from_(self.bucket_name).upload(
                remote_path, 
                file_data,
                file_options={
                    "content-type": content_type,
                    "x-upsert": "false"  # Don't overwrite existing files
                }
            )
            
            logger.info(f"File uploaded successfully to {remote_path}")
            
            return {
                'success': True,
                'path': remote_path,
                'size': file_size,
                'hash': file_hash,
                'content_type': content_type,
                'uploaded_at': datetime.utcnow().isoformat(),
                'result': result
            }
            
        except Exception as e:
            logger.error(f"Failed to upload file {file_path}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'path': remote_path
            }
    
    def download_file(self, remote_path: str, local_path: Optional[str] = None) -> Tuple[bool, str]:
        """
        Download a file from Supabase storage
        
        Args:
            remote_path: Path to file in storage bucket
            local_path: Optional local path to save the file. If None, creates temp file.
            
        Returns:
            Tuple of (success, local_file_path)
        """
        try:
            logger.info(f"Downloading file from {remote_path}")
            
            # Download file data
            file_data = self.client.storage.from_(self.bucket_name).download(remote_path)
            
            # Determine local path
            if not local_path:
                # Create temporary file
                suffix = os.path.splitext(remote_path)[1] or '.tmp'
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                local_path = temp_file.name
                temp_file.close()
            
            # Write file data
            with open(local_path, 'wb') as f:
                f.write(file_data)
            
            logger.info(f"File downloaded successfully to {local_path}")
            return True, local_path
            
        except Exception as e:
            logger.error(f"Failed to download file {remote_path}: {str(e)}")
            return False, str(e)
    
    def create_signed_url(self, remote_path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Create a signed URL for temporary access to a file
        
        Args:
            remote_path: Path to file in storage bucket
            expires_in: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Signed URL or None if failed
        """
        try:
            logger.debug(f"Creating signed URL for {remote_path}")
            
            result = self.client.storage.from_(self.bucket_name).create_signed_url(
                remote_path, expires_in
            )
            
            if 'signedUrl' in result:
                return result['signedUrl']
            else:
                logger.error(f"No signed URL in response: {result}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create signed URL for {remote_path}: {str(e)}")
            return None
    
    def delete_file(self, remote_path: str) -> bool:
        """
        Delete a file from Supabase storage
        
        Args:
            remote_path: Path to file in storage bucket
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Deleting file {remote_path}")
            
            result = self.client.storage.from_(self.bucket_name).remove([remote_path])
            
            logger.info(f"File deleted successfully: {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file {remote_path}: {str(e)}")
            return False
    
    def list_files(self, path: str = "", limit: int = 100) -> List[Dict[str, Any]]:
        """
        List files in a storage path
        
        Args:
            path: Path to list files from (empty for root)
            limit: Maximum number of files to return
            
        Returns:
            List of file information dictionaries
        """
        try:
            logger.debug(f"Listing files in path: {path}")
            
            result = self.client.storage.from_(self.bucket_name).list(
                path, {"limit": limit}
            )
            
            return result or []
            
        except Exception as e:
            logger.error(f"Failed to list files in {path}: {str(e)}")
            return []
    
    def get_file_info(self, remote_path: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a file in storage
        
        Args:
            remote_path: Path to file in storage bucket
            
        Returns:
            File information dictionary or None if not found
        """
        try:
            # List files in the parent directory to find this file
            parent_path = os.path.dirname(remote_path)
            filename = os.path.basename(remote_path)
            
            files = self.list_files(parent_path)
            
            for file_info in files:
                if file_info.get('name') == filename:
                    return file_info
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get file info for {remote_path}: {str(e)}")
            return None
    
    def upload_from_url(self, url: str, remote_path: str) -> Dict[str, Any]:
        """
        Upload a file from a URL to Supabase storage
        
        Args:
            url: URL to download file from
            remote_path: Remote path in the storage bucket
            
        Returns:
            Dict with upload result information
        """
        import requests
        
        try:
            logger.info(f"Uploading from URL {url} to {remote_path}")
            
            # Download file from URL
            response = requests.get(url, stream=True, timeout=60)
            response.raise_for_status()
            
            # Get content type from response headers
            content_type = response.headers.get('content-type', 'application/octet-stream')
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                temp_path = temp_file.name
            
            try:
                # Upload the temporary file
                result = self.upload_file(temp_path, remote_path, content_type)
                return result
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Failed to upload from URL {url}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'path': remote_path
            }
    
    def create_upload_session(self, filename: str, total_size: int) -> str:
        """
        Create an upload session for chunked uploads
        
        Args:
            filename: Original filename
            total_size: Total file size in bytes
            
        Returns:
            Upload session ID
        """
        import uuid
        
        session_id = str(uuid.uuid4())
        session_info = {
            'id': session_id,
            'filename': filename,
            'total_size': total_size,
            'chunks_received': [],
            'created_at': datetime.utcnow().isoformat(),
            'status': 'active'
        }
        
        # Store session info in a temporary location or database
        # For now, we'll just return the session ID
        logger.info(f"Created upload session {session_id} for {filename} ({total_size} bytes)")
        
        return session_id
    
    def upload_chunk(self, session_id: str, chunk_number: int, chunk_data: bytes) -> Dict[str, Any]:
        """
        Upload a chunk as part of a chunked upload session
        
        Args:
            session_id: Upload session ID
            chunk_number: Chunk number (0-based)
            chunk_data: Chunk data bytes
            
        Returns:
            Dict with chunk upload result
        """
        try:
            chunk_path = f"chunks/{session_id}/chunk_{chunk_number:06d}"
            
            logger.debug(f"Uploading chunk {chunk_number} for session {session_id}")
            
            # Upload chunk to storage
            result = self.client.storage.from_(self.bucket_name).upload(
                chunk_path,
                chunk_data,
                file_options={
                    "content-type": "application/octet-stream",
                    "x-upsert": "true"
                }
            )
            
            return {
                'success': True,
                'session_id': session_id,
                'chunk_number': chunk_number,
                'chunk_path': chunk_path,
                'size': len(chunk_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to upload chunk {chunk_number} for session {session_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id,
                'chunk_number': chunk_number
            }
    
    def complete_chunked_upload(self, session_id: str, total_chunks: int, 
                               final_path: str) -> Dict[str, Any]:
        """
        Complete a chunked upload by assembling chunks into final file
        
        Args:
            session_id: Upload session ID
            total_chunks: Total number of chunks expected
            final_path: Final path for the assembled file
            
        Returns:
            Dict with completion result
        """
        try:
            logger.info(f"Completing chunked upload for session {session_id}")
            
            # Download all chunks and assemble
            assembled_data = b""
            
            for chunk_number in range(total_chunks):
                chunk_path = f"chunks/{session_id}/chunk_{chunk_number:06d}"
                
                try:
                    chunk_data = self.client.storage.from_(self.bucket_name).download(chunk_path)
                    assembled_data += chunk_data
                except Exception as e:
                    logger.error(f"Failed to download chunk {chunk_number}: {str(e)}")
                    raise Exception(f"Missing chunk {chunk_number}")
            
            # Upload assembled file
            result = self.client.storage.from_(self.bucket_name).upload(
                final_path,
                assembled_data,
                file_options={
                    "content-type": "application/pdf",  # Assume PDF for now
                    "x-upsert": "false"
                }
            )
            
            # Clean up chunks
            self._cleanup_chunks(session_id, total_chunks)
            
            logger.info(f"Chunked upload completed: {final_path}")
            
            return {
                'success': True,
                'session_id': session_id,
                'final_path': final_path,
                'size': len(assembled_data),
                'total_chunks': total_chunks
            }
            
        except Exception as e:
            logger.error(f"Failed to complete chunked upload for session {session_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'session_id': session_id
            }
    
    def _cleanup_chunks(self, session_id: str, total_chunks: int) -> None:
        """Clean up chunk files after successful assembly"""
        try:
            chunk_paths = [f"chunks/{session_id}/chunk_{i:06d}" for i in range(total_chunks)]
            self.client.storage.from_(self.bucket_name).remove(chunk_paths)
            logger.debug(f"Cleaned up {total_chunks} chunks for session {session_id}")
        except Exception as e:
            logger.warning(f"Failed to clean up chunks for session {session_id}: {str(e)}")
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the Supabase storage service
        
        Returns:
            Dict with health check results
        """
        try:
            # Test basic connectivity by listing files
            files = self.list_files(limit=1)
            
            return {
                'status': 'healthy',
                'bucket': self.bucket_name,
                'url': self.url,
                'test_timestamp': datetime.utcnow().isoformat(),
                'message': 'Storage service is operational'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'bucket': self.bucket_name,
                'url': self.url,
                'error': str(e),
                'test_timestamp': datetime.utcnow().isoformat(),
                'message': 'Storage service is not operational'
            }

# Global instance
_storage_service = None

def get_storage_service() -> SupabaseStorageService:
    """Get or create global storage service instance"""
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service