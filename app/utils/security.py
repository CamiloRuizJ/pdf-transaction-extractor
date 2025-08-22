"""
Security Utilities
Application security and headers.
"""

from flask import request, g
import structlog
import time

logger = structlog.get_logger()

def setup_security_headers(app):
    """Setup security headers and request logging"""
    
    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses"""
        from config import Config
        
        for header, value in Config.SECURITY_HEADERS.items():
            response.headers[header] = value
        
        return response
    
    @app.before_request
    def log_request():
        """Log incoming requests"""
        g.start_time = time.time()
        logger.info("Incoming request", 
                   method=request.method,
                   path=request.path,
                   ip=request.remote_addr,
                   user_agent=request.headers.get('User-Agent', ''))
    
    @app.after_request
    def log_response(response):
        """Log response details"""
        duration = time.time() - g.start_time if hasattr(g, 'start_time') else 0
        logger.info("Response sent",
                   status_code=response.status_code,
                   duration=duration,
                   path=request.path)
        return response
