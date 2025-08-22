"""
Error Handlers
Comprehensive application error handling and logging following best practices.
"""

from flask import jsonify, request
from werkzeug.exceptions import BadRequest, Forbidden, MethodNotAllowed
import structlog
import traceback

logger = structlog.get_logger()

def setup_error_handlers(app):
    """Setup comprehensive error handlers for Flask application"""
    
    @app.errorhandler(400)
    def bad_request(error):
        logger.warning("Bad request", error=str(error), request_path=request.path)
        return jsonify({
            'error': 'Bad Request',
            'message': 'The request was invalid or cannot be served',
            'status_code': 400
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        logger.warning("Unauthorized access attempt", request_path=request.path)
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication is required',
            'status_code': 401
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        logger.warning("Forbidden access attempt", request_path=request.path)
        return jsonify({
            'error': 'Forbidden',
            'message': 'Access to this resource is forbidden',
            'status_code': 403
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        logger.info("Resource not found", request_path=request.path)
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'status_code': 404
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        logger.warning("Method not allowed", method=request.method, request_path=request.path)
        return jsonify({
            'error': 'Method Not Allowed',
            'message': f'The {request.method} method is not allowed for this endpoint',
            'status_code': 405
        }), 405
    
    @app.errorhandler(413)
    def file_too_large(error):
        logger.warning("File too large uploaded", request_path=request.path)
        return jsonify({
            'error': 'File Too Large',
            'message': 'The uploaded file exceeds the maximum allowed size',
            'status_code': 413
        }), 413
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        logger.warning("Rate limit exceeded", request_path=request.path, ip=request.remote_addr)
        return jsonify({
            'error': 'Rate Limit Exceeded',
            'message': 'Too many requests. Please slow down.',
            'status_code': 429
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error("Internal server error", 
                    error=str(error), 
                    request_path=request.path,
                    traceback=traceback.format_exc())
        
        # In production, don't expose internal error details
        if app.config.get('DEBUG', False):
            message = str(error)
        else:
            message = 'An unexpected error occurred. Please try again later.'
            
        return jsonify({
            'error': 'Internal Server Error',
            'message': message,
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Catch-all handler for unexpected exceptions"""
        logger.error("Unexpected error", 
                    error=str(error),
                    error_type=type(error).__name__,
                    request_path=request.path,
                    traceback=traceback.format_exc())
        
        # In production, don't expose internal error details
        if app.config.get('DEBUG', False):
            message = f"{type(error).__name__}: {str(error)}"
        else:
            message = 'An unexpected error occurred. Please try again later.'
            
        return jsonify({
            'error': 'Unexpected Error',
            'message': message,
            'status_code': 500
        }), 500
