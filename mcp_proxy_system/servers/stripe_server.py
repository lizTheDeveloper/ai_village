#!/usr/bin/env python3
"""
Multiverse Stripe MCP Server

Handles Stripe API operations for products, prices, and payment links.

Responsibilities:
- Product management
- Price creation
- Payment link generation
- Stripe data retrieval
"""

from fastmcp import FastMCP
from typing import Optional, Dict, Any
import os
import sys

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from multiverse_mcp.operations.stripe_ops import (
    create_product,
    create_price,
    create_payment_link,
    get_product,
    list_products,
    list_prices,
    list_payment_links
)
from multiverse_mcp.utils.logging import setup_logging

# Setup logging
setup_logging()

# Initialize FastMCP server
mcp = FastMCP("multiverse-stripe")


# ========== Product Management ==========

@mcp.tool()
def stripe_create_product(
    name: str,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, str]] = None
) -> dict:
    """
    Create a Stripe product.

    Args:
        name: Product name (required)
        description: Product description
        metadata: Key-value pairs for custom metadata (e.g., {"class_id": "141"})

    Returns:
        Dictionary with success status and Stripe product data including id

    Example:
        stripe_create_product(
            name="Intro to Agents - Winter 2025",
            description="6-week course on autonomous agents",
            metadata={"class_id": "141", "curriculum_slug": "intro_to_agents"}
        )
    """
    return create_product(name=name, description=description, metadata=metadata)


@mcp.tool()
def stripe_get_product(product_id: str) -> dict:
    """
    Get Stripe product details.

    Args:
        product_id: Stripe product ID (starts with 'prod_')

    Returns:
        Dictionary with success status and product data
    """
    return get_product(product_id=product_id)


@mcp.tool()
def stripe_list_products(
    limit: int = 10,
    active_only: bool = True
) -> dict:
    """
    List Stripe products.

    Args:
        limit: Maximum number of products to return (default: 10, max: 100)
        active_only: Only return active products (default: True)

    Returns:
        Dictionary with success status and list of products
    """
    return list_products(limit=limit, active_only=active_only)


# ========== Price Management ==========

@mcp.tool()
def stripe_create_price(
    product_id: str,
    unit_amount: int,
    currency: str = "usd",
    nickname: Optional[str] = None
) -> dict:
    """
    Create a Stripe price for a product.

    Args:
        product_id: Stripe product ID (starts with 'prod_')
        unit_amount: Price in cents (e.g., 29900 for $299.00)
        currency: Three-letter ISO currency code (default: "usd")
        nickname: Internal name for the price (e.g., "Standard Pricing")

    Returns:
        Dictionary with success status and Stripe price data including id

    Example:
        stripe_create_price(
            product_id="prod_ABC123",
            unit_amount=29900,
            currency="usd",
            nickname="Standard Pricing"
        )
    """
    return create_price(
        product_id=product_id,
        unit_amount=unit_amount,
        currency=currency,
        nickname=nickname
    )


@mcp.tool()
def stripe_list_prices(
    product_id: Optional[str] = None,
    limit: int = 10
) -> dict:
    """
    List Stripe prices, optionally filtered by product.

    Args:
        product_id: Filter by Stripe product ID (optional)
        limit: Maximum number of prices to return (default: 10, max: 100)

    Returns:
        Dictionary with success status and list of prices
    """
    return list_prices(product_id=product_id, limit=limit)


# ========== Payment Link Management ==========

@mcp.tool()
def stripe_create_payment_link(
    price_id: str,
    quantity: int = 1,
    metadata: Optional[Dict[str, str]] = None
) -> dict:
    """
    Create a Stripe payment link.

    Args:
        price_id: Stripe price ID (starts with 'price_')
        quantity: Quantity for the line item (default: 1)
        metadata: Key-value pairs for custom metadata

    Returns:
        Dictionary with success status and payment link URL

    Example:
        stripe_create_payment_link(
            price_id="price_XYZ789",
            quantity=1,
            metadata={"class_id": "141"}
        )
    """
    return create_payment_link(
        price_id=price_id,
        quantity=quantity,
        metadata=metadata
    )


@mcp.tool()
def stripe_list_payment_links(
    limit: int = 10,
    active_only: bool = True
) -> dict:
    """
    List Stripe payment links.

    Args:
        limit: Maximum number of links to return (default: 10, max: 100)
        active_only: Only return active links (default: True)

    Returns:
        Dictionary with success status and list of payment links
    """
    return list_payment_links(limit=limit, active_only=active_only)


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
