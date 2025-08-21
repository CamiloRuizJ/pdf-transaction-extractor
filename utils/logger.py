"""
Logger utility for PDF Transaction Extractor.
Provides centralized logging functionality.
"""

import logging
import os
from datetime import datetime
from typing import Optional

def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """Get a configured logger instance."""
    logger = logging.getLogger(name)
    
    # Set log level
    if level:
        logger.setLevel(getattr(logging, level.upper()))
    else:
        logger.setLevel(logging.INFO)
    
    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Create file handler if logs directory exists
    logs_dir = 'logs'
    if os.path.exists(logs_dir):
        log_file = os.path.join(logs_dir, 'app.log')
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger
