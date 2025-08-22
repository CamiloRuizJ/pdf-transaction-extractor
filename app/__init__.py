"""
PDF Transaction Extractor Enhanced - Main Application
Strategic Real Estate document processing with AI/ML capabilities.
Merged features from V2 and Enhanced versions.
"""

from flask import Flask
from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from celery import Celery
import structlog
import os

from config import Config, config_map

# Initialize structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

def create_celery(app):
    """Create Celery instance for background processing."""
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_BROKER_URL'],
        broker=app.config['CELERY_BROKER_URL']
    )
    
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=app.config['CELERY_TASK_TIME_LIMIT'],
        task_soft_time_limit=app.config['CELERY_TASK_SOFT_TIME_LIMIT'],
    )
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

def create_app(config_name=None):
    """Enhanced application factory pattern for Flask app creation."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    config_class = config_map.get(config_name, Config)
    
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize config to create directories
    config = config_class()
    
    # Initialize extensions
    csrf = CSRFProtect()
    csrf.init_app(app)
    
    # Initialize rate limiter
    limiter = Limiter(
        app,
        key_func=get_remote_address,
        default_limits=["1000 per hour", "100 per minute"]
    )
    
    # Initialize caching
    cache = Cache(app, config={'CACHE_TYPE': 'simple'})
    
    # Enable CORS for API endpoints
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize Celery (optional for development)
    if not app.config['TESTING']:
        try:
            app.celery = create_celery(app)
        except Exception as e:
            logger.warning("Celery initialization failed, running without background tasks", error=str(e))
            app.celery = None
    
    # Register blueprints
    from app.routes import main_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Initialize services
    from app.services import initialize_services
    initialize_services(app)
    
    # Setup error handlers
    from app.utils.error_handlers import setup_error_handlers
    setup_error_handlers(app)
    
    # Setup security headers
    from app.utils.security import setup_security_headers
    setup_security_headers(app)
    
    # Add health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'version': 'enhanced'}, 200
    
    logger.info("PDF Transaction Extractor Enhanced initialized successfully", config=config_name)
    
    return app

def create_celery_app():
    """Create Celery app for background tasks."""
    app = create_app()
    return app.celery
