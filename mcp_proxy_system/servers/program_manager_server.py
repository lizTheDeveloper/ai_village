#!/usr/bin/env python3
"""
Multiverse Program Manager MCP Server

Handles program operations, class management, and analytics for The Multiverse School.

Responsibilities:
- Class and schedule management
- Membership operations
- Reporting and analytics
- Operational planning
"""

from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
import os
import sys

# Add project root to path for imports
# servers/program_manager_server.py -> multiverse_mcp -> themultiverse.school
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from multiverse_mcp.operations.classes import (
    create_class,
    update_class,
    get_class,
    list_classes
)
from multiverse_mcp.operations.classtimes import (
    create_classtime,
    bulk_create_classtimes,
    list_classtimes_for_class,
    get_next_week_schedule,
    get_schedule_for_date_range
)
from multiverse_mcp.operations.memberships import (
    set_membership,
    extend_membership,
    grant_scholarship,
    set_researcher_status,
    get_expiring_memberships
)
from multiverse_mcp.operations.reports import (
    enrollment_stats,
    membership_breakdown,
    revenue_report
)
from multiverse_mcp.operations.pricing import (
    create_class_pricing,
    update_class_pricing,
    list_class_pricing
)
from multiverse_mcp.operations.emails import (
    generate_registration_email_template,
    update_class_registration_email
)
from multiverse_mcp.utils.logging import setup_logging

# Setup logging
setup_logging()

# Initialize FastMCP server
mcp = FastMCP("multiverse-program-manager")


# ========== Class Management ==========

@mcp.tool()
def pm_create_class(
    name: str,
    details: Optional[str] = None,
    teacher_id: Optional[int] = None,
    curriculum_slug: Optional[str] = None,
    stripe_product_id: Optional[str] = None,
    meeting_link: Optional[str] = None,
    registration_email_template: Optional[str] = None,
    overview: Optional[str] = None,
    what_you_learn: Optional[str] = None,
    thumbnail_image: Optional[str] = None
) -> dict:
    """
    Create a new class/course.
    
    Args:
        name: Class name (required)
        details: Class description
        teacher_id: FK to teachers table
        curriculum_slug: Identifier for curriculum (e.g., 'ai-fundamentals')
        stripe_product_id: Linked Stripe product for enrollment
        meeting_link: Video conference URL (e.g., Zoom/Google Meet link)
        registration_email_template: Markdown template sent when student enrolls
        overview: Course overview text for marketing
        what_you_learn: Learning objectives
        thumbnail_image: Image URL for class listing
    
    Returns:
        Dictionary with success status and created class data including id, name, curriculum_slug
    """
    return create_class(
        name=name,
        details=details,
        teacher_id=teacher_id,
        curriculum_slug=curriculum_slug,
        stripe_product_id=stripe_product_id,
        meeting_link=meeting_link,
        registration_email_template=registration_email_template,
        overview=overview,
        what_you_learn=what_you_learn,
        thumbnail_image=thumbnail_image
    )


@mcp.tool()
def pm_update_class(
    class_id: int,
    name: Optional[str] = None,
    details: Optional[str] = None,
    teacher_id: Optional[int] = None,
    curriculum_slug: Optional[str] = None,
    stripe_product_id: Optional[str] = None,
    meeting_link: Optional[str] = None,
    registration_email_template: Optional[str] = None,
    overview: Optional[str] = None,
    what_you_learn: Optional[str] = None,
    thumbnail_image: Optional[str] = None
) -> dict:
    """
    Update an existing class. Only provided fields will be updated.
    
    Args:
        class_id: Class ID to update (required)
        name: Update class name
        details: Update description
        teacher_id: Update teacher assignment
        curriculum_slug: Update curriculum identifier
        stripe_product_id: Update Stripe product link
        meeting_link: Update meeting URL
        registration_email_template: Update enrollment email template
        overview: Update course overview
        what_you_learn: Update learning objectives
        thumbnail_image: Update image URL
    
    Returns:
        Dictionary with success status and updated class data
    """
    updates = {
        k: v for k, v in {
            "name": name,
            "details": details,
            "teacher_id": teacher_id,
            "curriculum_slug": curriculum_slug,
            "stripe_product_id": stripe_product_id,
            "meeting_link": meeting_link,
            "registration_email_template": registration_email_template,
            "overview": overview,
            "what_you_learn": what_you_learn,
            "thumbnail_image": thumbnail_image
        }.items() if v is not None
    }
    
    return update_class(class_id=class_id, **updates)


@mcp.tool()
def pm_get_class(class_id: int) -> dict:
    """
    Get complete class information with related data.
    
    Returns class details plus teacher info, enrollment count, and first/last class dates.
    
    Args:
        class_id: Class ID
    
    Returns:
        Dictionary with success status and complete class data
    """
    return get_class(class_id=class_id)


@mcp.tool()
def pm_list_classes(
    upcoming_only: bool = False,
    has_curriculum: Optional[bool] = None,
    teacher_id: Optional[int] = None,
    limit: int = 100
) -> dict:
    """
    List classes with optional filters.
    
    Args:
        upcoming_only: Only return classes that haven't ended yet
        has_curriculum: Filter to classes with (True) or without (False) curriculum_slug
        teacher_id: Filter by specific teacher
        limit: Maximum number of results (default 100, max 1000)
    
    Returns:
        Dictionary with success status, list of classes with metadata, and count
    """
    return list_classes(
        upcoming_only=upcoming_only,
        has_curriculum=has_curriculum,
        teacher_id=teacher_id,
        limit=limit
    )


# ========== Pricing Management ==========

@mcp.tool()
def pm_create_class_pricing(
    class_id: int,
    price: int,
    price_name: str,
    stripe_payment_link: Optional[str] = None,
    stripe_product_id: Optional[str] = None,
    benefits: Optional[str] = None,
    enrollment_link: Optional[str] = None
) -> dict:
    """
    Create pricing for a class.
    
    Args:
        class_id: Class ID (required)
        price: Price in cents (required)
        price_name: Name of the pricing tier (required)
        stripe_payment_link: Stripe payment link URL
        stripe_product_id: Stripe product ID
        benefits: Benefits description for this pricing tier
        enrollment_link: Enrollment link URL
    
    Returns:
        Dictionary with success status and created pricing data
    """
    return create_class_pricing(
        class_id=class_id,
        price=price,
        price_name=price_name,
        stripe_payment_link=stripe_payment_link,
        stripe_product_id=stripe_product_id,
        benefits=benefits,
        enrollment_link=enrollment_link
    )


@mcp.tool()
def pm_update_class_pricing(
    pricing_id: int,
    price: Optional[int] = None,
    price_name: Optional[str] = None,
    stripe_payment_link: Optional[str] = None,
    stripe_product_id: Optional[str] = None,
    benefits: Optional[str] = None,
    enrollment_link: Optional[str] = None
) -> dict:
    """
    Update existing class pricing.
    
    Args:
        pricing_id: Pricing ID to update
        price: Update price in cents
        price_name: Update price name
        stripe_payment_link: Update payment link
        stripe_product_id: Update product ID
        benefits: Update benefits
        enrollment_link: Update enrollment link
    
    Returns:
        Dictionary with success status and updated pricing data
    """
    return update_class_pricing(
        pricing_id=pricing_id,
        price=price,
        price_name=price_name,
        stripe_payment_link=stripe_payment_link,
        stripe_product_id=stripe_product_id,
        benefits=benefits,
        enrollment_link=enrollment_link
    )


@mcp.tool()
def pm_list_class_pricing(class_id: int) -> dict:
    """
    List all pricing tiers for a class.
    
    Args:
        class_id: Class ID
    
    Returns:
        Dictionary with success status and list of pricing data
    """
    return list_class_pricing(class_id=class_id)


# ========== Email Management ==========

@mcp.tool()
def pm_generate_registration_email(class_id: int) -> dict:
    """
    Generate a registration email template for a class including all classtimes.
    
    Args:
        class_id: Class ID
    
    Returns:
        Dictionary with success status and generated email template (markdown)
    """
    return generate_registration_email_template(class_id=class_id)


@mcp.tool()
def pm_update_class_registration_email(
    class_id: int,
    template: Optional[str] = None,
    auto_generate: bool = True
) -> dict:
    """
    Update the registration email template for a class.
    
    Args:
        class_id: Class ID
        template: Custom template (markdown). If None and auto_generate=True, generates from classtimes
        auto_generate: If True and template is None, auto-generates template from classtimes
    
    Returns:
        Dictionary with success status and updated template
    """
    return update_class_registration_email(
        class_id=class_id,
        template=template,
        auto_generate=auto_generate
    )


# ========== Schedule Management ==========

@mcp.tool()
def pm_create_classtime(
    class_id: int,
    start_time: str,
    end_time: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    homework: Optional[str] = None
) -> dict:
    """
    Create a single class session.
    
    Args:
        class_id: Class ID this session belongs to
        start_time: ISO 8601 timestamp (e.g., '2025-11-10T18:00:00Z')
        end_time: ISO 8601 timestamp
        title: Session title (e.g., 'Week 1: Introduction')
        description: Session description or topics covered
        homework: Homework assignment text
    
    Returns:
        Dictionary with success status and created classtime data
    """
    return create_classtime(
        class_id=class_id,
        start_time=start_time,
        end_time=end_time,
        title=title,
        description=description,
        homework=homework
    )


@mcp.tool()
def pm_bulk_create_classtimes(
    class_id: int,
    sessions: List[Dict[str, Any]]
) -> dict:
    """
    Create multiple class sessions at once.
    
    Useful for creating a weekly class schedule in one operation.
    
    Args:
        class_id: Class ID
        sessions: List of session dicts, each with start_time, end_time, title, description
    
    Example sessions:
        [
            {"start_time": "2025-11-10T18:00:00Z", "end_time": "2025-11-10T20:00:00Z", "title": "Week 1"},
            {"start_time": "2025-11-17T18:00:00Z", "end_time": "2025-11-17T20:00:00Z", "title": "Week 2"}
        ]
    
    Returns:
        Dictionary with success status, list of created classtimes, count, and class name
    """
    return bulk_create_classtimes(class_id=class_id, sessions=sessions)


@mcp.tool()
def pm_list_classtimes(
    class_id: int,
    upcoming_only: bool = False
) -> dict:
    """
    Get all sessions for a specific class.
    
    Args:
        class_id: Class ID
        upcoming_only: Only return future sessions (start_time > now)
    
    Returns:
        Dictionary with success status, list of classtimes ordered by start_time, count, and class name
    """
    return list_classtimes_for_class(class_id=class_id, upcoming_only=upcoming_only)


@mcp.tool()
def pm_get_next_week_schedule() -> dict:
    """
    Get all class sessions scheduled for the next 7 days.
    
    Useful for weekly planning and student communications.
    
    Returns:
        Dictionary with success status, list of upcoming sessions with class info, and count
    """
    return get_next_week_schedule()


@mcp.tool()
def pm_get_schedule_for_date_range(
    start_date: str,
    end_date: str,
    class_id: Optional[int] = None
) -> dict:
    """
    Get class sessions in a specific date range.
    
    Args:
        start_date: Start date (ISO 8601, e.g., '2025-11-01T00:00:00Z')
        end_date: End date (ISO 8601)
        class_id: Optional filter by specific class
    
    Returns:
        Dictionary with success status, list of classtimes in range, and count
    """
    return get_schedule_for_date_range(
        start_date=start_date,
        end_date=end_date,
        class_id=class_id
    )


# ========== Membership Operations ==========

@mcp.tool()
def pm_set_membership(
    membership_level: str,
    student_id: Optional[int] = None,
    email: Optional[str] = None,
    membership_expiration: Optional[str] = None,
    membership_term_days: Optional[int] = None
) -> dict:
    """
    Set a student's membership level and expiration.
    
    Args:
        membership_level: One of: Member, Researcher, Autodidact, Standup, Student
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
        membership_expiration: Specific expiration timestamp (ISO 8601)
        membership_term_days: Days from now to expire (alternative to expiration)
    
    Returns:
        Dictionary with success status and updated student data
    """
    return set_membership(
        student_id=student_id,
        email=email,
        membership_level=membership_level,
        membership_expiration=membership_expiration,
        membership_term_days=membership_term_days
    )


@mcp.tool()
def pm_extend_membership(
    days: int = 30,
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Extend a student's membership by a number of days.
    
    Args:
        days: Number of days to add (default 30)
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status and updated student data with new expiration
    """
    return extend_membership(
        student_id=student_id,
        email=email,
        days=days
    )


@mcp.tool()
def pm_grant_scholarship(
    student_id: Optional[int] = None,
    email: Optional[str] = None,
    scholarship_coupon_code: Optional[str] = None
) -> dict:
    """
    Grant permanent scholarship access to a student.
    
    Scholarships never expire and provide full access.
    
    Args:
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
        scholarship_coupon_code: Optional tracking code (e.g., 'COMMUNITY2025')
    
    Returns:
        Dictionary with success status, updated student data, and confirmation message
    """
    return grant_scholarship(
        student_id=student_id,
        email=email,
        scholarship_coupon_code=scholarship_coupon_code
    )


@mcp.tool()
def pm_set_researcher_status(
    is_researcher: bool,
    student_id: Optional[int] = None,
    email: Optional[str] = None
) -> dict:
    """
    Set or remove researcher status for a student.
    
    Researchers have permanent access and 'Researcher' membership level.
    
    Args:
        is_researcher: Whether student is a researcher
        student_id: Student ID (alternative to email)
        email: Student email (alternative to student_id)
    
    Returns:
        Dictionary with success status and updated student data
    """
    return set_researcher_status(
        student_id=student_id,
        email=email,
        is_researcher=is_researcher
    )


@mcp.tool()
def pm_get_expiring_memberships(days_ahead: int = 7) -> dict:
    """
    Find memberships expiring soon.
    
    Useful for renewal reminders and retention efforts.
    
    Args:
        days_ahead: Number of days to look ahead (default 7)
    
    Returns:
        Dictionary with success status, list of students with expiring memberships, and count
    """
    return get_expiring_memberships(days_ahead=days_ahead)


# ========== Reporting & Analytics ==========

@mcp.tool()
def pm_enrollment_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    """
    Get enrollment statistics for classes.
    
    Args:
        start_date: Filter classes starting after this date (ISO 8601)
        end_date: Filter classes starting before this date (ISO 8601)
    
    Returns:
        Dictionary with success status, list of classes with enrollment counts, and count
    """
    return enrollment_stats(start_date=start_date, end_date=end_date)


@mcp.tool()
def pm_membership_breakdown() -> dict:
    """
    Count students by membership level.
    
    Shows total students, active members, and scholarship students per level.
    
    Returns:
        Dictionary with success status, list of membership statistics, and count
    """
    return membership_breakdown()


@mcp.tool()
def pm_revenue_report(
    start_date: str,
    end_date: str,
    breakdown_by: str = "month"
) -> dict:
    """
    Calculate revenue for a time period.
    
    Args:
        start_date: Start date (ISO 8601, e.g., '2025-01-01T00:00:00Z')
        end_date: End date (ISO 8601)
        breakdown_by: Time period: 'day', 'week', 'month', or 'year'
    
    Returns:
        Dictionary with success status, revenue data by period and category (class/membership), and count
    """
    return revenue_report(
        start_date=start_date,
        end_date=end_date,
        breakdown_by=breakdown_by
    )


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()


