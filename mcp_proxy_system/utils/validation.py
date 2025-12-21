"""
Validation utilities for Multiverse MCP Server

Provides input validation for emails, dates, membership levels, etc.
"""

import re
from datetime import datetime
from typing import Tuple, Optional


# Valid membership levels based on DATABASE_SCHEMA.md
VALID_MEMBERSHIP_LEVELS = [
    'Member',
    'Researcher', 
    'Autodidact',
    'Standup',
    'Student',
    'Expelled'
]

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def validate_email(email: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple of (is_valid: bool, error_message: str or None)
    """
    if not email:
        return False, "Email is required"
    
    if not isinstance(email, str):
        return False, "Email must be a string"
    
    if not EMAIL_REGEX.match(email):
        return False, "Invalid email format"
    
    return True, None


def validate_membership_level(level: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate membership level.
    
    Args:
        level: Membership level to validate
        
    Returns:
        Tuple of (is_valid: bool, error_message: str or None)
    """
    if not level:
        return False, "Membership level is required"
    
    if level not in VALID_MEMBERSHIP_LEVELS:
        return False, f"Invalid membership level. Must be one of: {', '.join(VALID_MEMBERSHIP_LEVELS)}"
    
    return True, None


def validate_iso8601_date(date_string: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate ISO 8601 date format.
    
    Args:
        date_string: Date string to validate (e.g., "2025-11-04T12:00:00Z")
        
    Returns:
        Tuple of (is_valid: bool, error_message: str or None)
    """
    if not date_string:
        return False, "Date is required"
    
    try:
        # Handle both Z and +00:00 timezone formats
        datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return True, None
    except ValueError as e:
        return False, f"Invalid date format (expected ISO 8601): {str(e)}"


def validate_positive_integer(value: any, field_name: str = "value") -> Tuple[bool, Optional[str]]:
    """
    Validate that a value is a positive integer.
    
    Args:
        value: Value to validate
        field_name: Name of the field for error messages
        
    Returns:
        Tuple of (is_valid: bool, error_message: str or None)
    """
    if value is None:
        return False, f"{field_name} is required"
    
    try:
        int_value = int(value)
        if int_value <= 0:
            return False, f"{field_name} must be a positive integer"
        return True, None
    except (ValueError, TypeError):
        return False, f"{field_name} must be a positive integer"


def validate_required_field(value: any, field_name: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that a required field is not None or empty string.
    
    Args:
        value: Value to validate
        field_name: Name of the field for error messages
        
    Returns:
        Tuple of (is_valid: bool, error_message: str or None)
    """
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return False, f"{field_name} is required"
    return True, None


def sanitize_email(email: str) -> str:
    """
    Sanitize email address by trimming whitespace and lowercasing.
    
    Args:
        email: Email address to sanitize
        
    Returns:
        Sanitized email address
    """
    return email.strip().lower() if email else email


