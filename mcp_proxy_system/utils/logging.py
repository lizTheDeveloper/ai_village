"""
Logging utilities for Multiverse MCP Server

Provides structured logging for all operations.
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
import os


# Setup logging directory
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)


def setup_logging(log_level: str = 'INFO'):
    """
    Setup logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    log_file = os.path.join(LOG_DIR, 'operations.log')
    
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )


# Create logger
logger = logging.getLogger('multiverse_mcp')


def log_operation(
    operation_name: str,
    params: Dict[str, Any],
    success: bool,
    result: Any = None,
    error: Optional[str] = None,
    duration_ms: Optional[float] = None
):
    """
    Log an MCP operation with structured data.
    
    Args:
        operation_name: Name of the operation (e.g., "create_student")
        params: Operation parameters
        success: Whether the operation succeeded
        result: Operation result (if successful)
        error: Error message (if failed)
        duration_ms: Operation duration in milliseconds
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "operation": operation_name,
        "params": sanitize_params(params),
        "success": success,
    }
    
    if duration_ms is not None:
        log_entry["duration_ms"] = round(duration_ms, 2)
    
    if success:
        log_entry["result_summary"] = summarize_result(result)
    else:
        log_entry["error"] = error
    
    # Log as JSON for structured logging
    logger.info(json.dumps(log_entry))


def sanitize_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove or mask sensitive data from parameters.
    
    Args:
        params: Parameters dictionary
        
    Returns:
        Sanitized parameters
    """
    if not params:
        return {}
    
    sanitized = params.copy()
    
    # Mask email addresses (show domain but hide user)
    if 'email' in sanitized and sanitized['email']:
        email = sanitized['email']
        if '@' in email:
            sanitized['email'] = f"***@{email.split('@')[1]}"
        else:
            sanitized['email'] = '***'
    
    # Don't log sensitive fields
    sensitive_fields = ['password', 'token', 'api_key', 'secret']
    for field in sensitive_fields:
        if field in sanitized:
            sanitized[field] = '***'
    
    return sanitized


def summarize_result(result: Any) -> str:
    """
    Create a summary of operation result for logging.
    
    Args:
        result: Operation result
        
    Returns:
        Summary string
    """
    if result is None:
        return "None"
    
    if isinstance(result, dict):
        if 'id' in result:
            return f"Record with id={result['id']}"
        elif 'data' in result:
            return summarize_result(result['data'])
        else:
            return f"Dict with {len(result)} keys"
    
    if isinstance(result, (list, tuple)):
        return f"{len(result)} records"
    
    return str(result)[:100]  # Truncate long strings


def log_error(operation_name: str, error: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Log an error with context.
    
    Args:
        operation_name: Name of the operation
        error: Exception that occurred
        context: Additional context about the error
    """
    error_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "operation": operation_name,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "context": sanitize_params(context) if context else {}
    }
    
    logger.error(json.dumps(error_entry))


