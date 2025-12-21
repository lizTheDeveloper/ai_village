#!/usr/bin/env python3
"""
Multiverse Registrar MCP Server

Handles student records and enrollment tracking for The Multiverse School.

Responsibilities:
- Student CRUD operations
- Enrollment processing
- Access verification
- Student lookup queries
"""

from fastmcp import FastMCP
from typing import Optional, List
import os
import sys

# Add project root to path for imports
# servers/registrar_server.py -> multiverse_mcp -> themultiverse.school
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from multiverse_mcp.operations.students import (
    create_student,
    update_student,
    get_student,
    list_students
)
from multiverse_mcp.operations.enrollments import (
    enroll_student_in_class,
    unenroll_student_from_class,
    get_student_enrollments,
    get_class_roster,
    bulk_enroll_students
)
from multiverse_mcp.operations.registrar_queries import (
    check_course_access,
    get_active_students,
    get_scholarship_students,
    check_enrollment_status
)
from multiverse_mcp.utils.logging import setup_logging

# Setup logging
setup_logging()

# Initialize FastMCP server
mcp = FastMCP("multiverse-registrar")


# ========== Student Operations ==========

@mcp.tool()
def registrar_create_student(
    email: str,
    name: Optional[str] = None,
    phone_number: Optional[str] = None,
    github: Optional[str] = None,
    pronouns: Optional[str] = None,
    timezone: Optional[str] = None
) -> dict:
    """
    Create a new student record.
    
    Args:
        email: Student email address (required, must be unique)
        name: Student full name
        phone_number: Contact phone number
        github: GitHub username or URL
        pronouns: Student's pronouns (e.g., 'she/her', 'they/them')
        timezone: Timezone string (e.g., 'America/New_York')
    
    Returns:
        Dictionary with success status and created student data including id, email, name, created_at
    """
    return create_student(
        email=email,
        name=name,
        phone_number=phone_number,
        github=github,
        pronouns=pronouns,
        timezone=timezone
    )


@mcp.tool()
def registrar_update_student(
    student_id: Optional[int] = None,
    email: Optional[str] = None,
    name: Optional[str] = None,
    phone_number: Optional[str] = None,
    github: Optional[str] = None,
    pronouns: Optional[str] = None,
    timezone: Optional[str] = None,
    notes: Optional[str] = None,
    looking_for_work: Optional[bool] = None,
    portfolio: Optional[str] = None,
    linkedin: Optional[str] = None
) -> dict:
    """
    Update an existing student record.
    
    Must provide either student_id or email to identify the student.
    Only provided fields will be updated.
    
    Args:
        student_id: Student ID to update (alternative to email)
        email: Student email to look up (alternative to student_id)
        name: Update student name
        phone_number: Update phone number
        github: Update GitHub username/URL
        pronouns: Update pronouns
        timezone: Update timezone
        notes: Update internal notes
        looking_for_work: Update job search status
        portfolio: Update portfolio URL
        linkedin: Update LinkedIn URL
    
    Returns:
        Dictionary with success status and updated student data
    """
    updates = {
        k: v for k, v in {
            "name": name,
            "phone_number": phone_number,
            "github": github,
            "pronouns": pronouns,
            "timezone": timezone,
            "notes": notes,
            "looking_for_work": looking_for_work,
            "portfolio": portfolio,
            "linkedin": linkedin
        }.items() if v is not None
    }
    
    return update_student(student_id=student_id, email=email, **updates)


@mcp.tool()
def registrar_get_student(
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Get complete student information by ID or email.
    
    Args:
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status and complete student record including all fields
    """
    return get_student(student_id=student_id, email=email)


@mcp.tool()
def registrar_list_students(
    active_only: bool = False,
    membership_level: Optional[str] = None,
    scholarship: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
) -> dict:
    """
    List students with optional filters.
    
    Args:
        active_only: Only return students with active memberships
        membership_level: Filter by specific membership level (Member, Autodidact, Standup, Researcher, Student)
        scholarship: Filter by scholarship status (True/False)
        limit: Maximum number of results (default 100, max 1000)
        offset: Pagination offset for fetching next page
    
    Returns:
        Dictionary with success status, list of students, and count
    """
    return list_students(
        active_only=active_only,
        membership_level=membership_level,
        scholarship=scholarship,
        limit=limit,
        offset=offset
    )


# ========== Enrollment Operations ==========

@mcp.tool()
def registrar_enroll_student(
    class_id: int,
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Enroll a student in a class.
    
    This operation is idempotent - returns success even if student is already enrolled.
    Sets enrollment_email_sent to FALSE so the enrollment email will be sent in the next job run.
    
    Args:
        class_id: Class ID to enroll the student in
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status, enrollment data, and class name
    """
    return enroll_student_in_class(
        class_id=class_id,
        student_id=student_id,
        email=email
    )


@mcp.tool()
def registrar_unenroll_student(
    class_id: int,
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Unenroll a student from a class.
    
    Args:
        class_id: Class ID to unenroll the student from
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status and deletion confirmation
    """
    return unenroll_student_from_class(
        class_id=class_id,
        student_id=student_id,
        email=email
    )


@mcp.tool()
def registrar_get_student_enrollments(
    student_id: Optional[int] = None,
    email: Optional[str] = None,
    upcoming_only: bool = False
) -> dict:
    """
    Get all classes a student is enrolled in.
    
    Args:
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
        upcoming_only: Only return classes that haven't ended yet
    
    Returns:
        Dictionary with success status, list of enrolled classes with details, and count
    """
    return get_student_enrollments(
        student_id=student_id,
        email=email,
        upcoming_only=upcoming_only
    )


@mcp.tool()
def registrar_get_class_roster(class_id: int) -> dict:
    """
    Get all students enrolled in a specific class.
    
    Args:
        class_id: Class ID
    
    Returns:
        Dictionary with success status, list of enrolled students with enrollment details, class name, and count
    """
    return get_class_roster(class_id=class_id)


@mcp.tool()
def registrar_bulk_enroll(
    class_id: int,
    student_emails: List[str]
) -> dict:
    """
    Enroll multiple students in a class at once.
    
    Looks up students by email (case-insensitive) and enrolls all found students.
    Returns details about which emails were found/not found.
    
    Args:
        class_id: Class ID to enroll students in
        student_emails: List of student email addresses
    
    Returns:
        Dictionary with enrolled count, students found/requested, and list of not-found emails
    """
    return bulk_enroll_students(
        class_id=class_id,
        student_emails=student_emails
    )


# ========== Query Operations ==========

@mcp.tool()
def registrar_check_course_access(
    curriculum_slug: str,
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Check if a student can access a specific curriculum.
    
    Returns True if:
    - Student is admin OR
    - Student is enrolled in a class with this curriculum_slug
    
    Args:
        curriculum_slug: Curriculum identifier (e.g., 'ai-fundamentals')
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status, has_access boolean, and reason
    """
    return check_course_access(
        curriculum_slug=curriculum_slug,
        student_id=student_id,
        email=email
    )


@mcp.tool()
def registrar_get_active_students(
    limit: int = 100,
    offset: int = 0
) -> dict:
    """
    Get all students who should have access (active status).
    
    A student is active if ANY of:
    - scholarship = TRUE
    - researcher = TRUE
    - Valid (non-expired) membership
    - Enrolled in a currently-running class
    
    Args:
        limit: Maximum number of results (default 100, max 1000)
        offset: Pagination offset
    
    Returns:
        Dictionary with success status, list of active students with their active reason, and count
    """
    return get_active_students(limit=limit, offset=offset)


@mcp.tool()
def registrar_get_scholarship_students() -> dict:
    """
    Get all scholarship recipients.
    
    Returns:
        Dictionary with success status, list of scholarship students with coupon codes, and count
    """
    return get_scholarship_students()


@mcp.tool()
def registrar_check_enrollment(
    class_id: int,
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Check if a specific student is enrolled in a specific class.
    
    Args:
        class_id: Class ID
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status, is_enrolled boolean, and enrollment details if enrolled
    """
    return check_enrollment_status(
        class_id=class_id,
        student_id=student_id,
        email=email
    )


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()


