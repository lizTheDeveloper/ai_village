#!/usr/bin/env python3
"""
Tool Search MCP Server

Implements dynamic tool discovery based on Anthropic's advanced tool use patterns.
https://www.anthropic.com/engineering/advanced-tool-use

Instead of loading all tool definitions upfront, this enables Claude to:
1. Search for relevant tools on-demand
2. Load only necessary tools (3-5 vs 50+)
3. Reduce context window consumption
4. Get workflow-specific tool recommendations
"""

from fastmcp import FastMCP
from typing import List, Optional
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from multiverse_mcp.utils.tool_searcher import ToolSearcher
from multiverse_mcp.utils.logging import setup_logging

# Setup logging
setup_logging()

# Initialize FastMCP server and tool searcher
mcp = FastMCP("multiverse-tool-search")
tool_searcher = ToolSearcher()


@mcp.tool()
def search_tools(query: str, max_results: int = 5) -> dict:
    """
    Search for relevant MCP tools using natural language.

    This implements the "Tool Search Tool" pattern from Anthropic's advanced tool use guide.
    Instead of loading all 50+ tool definitions, Claude can search for and discover
    only the tools needed for the current task.

    Args:
        query: Natural language description of what you want to do
               Examples:
               - "enroll student in class"
               - "create new course"
               - "check student access to curriculum"
               - "generate revenue report"
        max_results: Maximum number of tools to return (default: 5)

    Returns:
        Dictionary with success status and list of matching tools with descriptions

    Example:
        search_tools(query="enroll student in class", max_results=5)

        Returns:
        {
          "success": true,
          "query": "enroll student in class",
          "tools": [
            {
              "tool": "registrar_enroll_student",
              "server": "registrar",
              "description": "Enroll student in a class",
              "score": 35,
              "tags": ["enroll", "enrollment", "register", "add to class"]
            },
            ...
          ],
          "count": 5
        }
    """
    try:
        results = tool_searcher.search_tools(query, max_results)

        return {
            "success": True,
            "query": query,
            "tools": results,
            "count": len(results)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_workflow_tools(workflow: str) -> dict:
    """
    Get recommended tools for a specific workflow.

    Workflows are pre-defined sequences of operations that accomplish
    common tasks. This returns the exact tools needed for that workflow.

    Args:
        workflow: Workflow name, one of:
                 - "enrollment" - Enroll student in class
                 - "bulk_enrollment" - Enroll multiple students
                 - "class_creation" - Create complete class with Stripe
                 - "student_access_audit" - Check student permissions
                 - "revenue_analysis" - Financial reporting
                 - "weekly_schedule" - Get upcoming classes

    Returns:
        Dictionary with success status and list of tool names for the workflow

    Example:
        get_workflow_tools(workflow="class_creation")

        Returns:
        {
          "success": true,
          "workflow": "class_creation",
          "tools": [
            "pm_create_class",
            "stripe_create_product",
            "stripe_create_price",
            "stripe_create_payment_link",
            "pm_create_class_pricing",
            "pm_bulk_create_classtimes",
            "pm_generate_registration_email"
          ],
          "count": 7,
          "description": "Complete workflow for creating a new class"
        }
    """
    try:
        tools = tool_searcher.get_tools_for_workflow(workflow)

        if not tools:
            return {
                "success": False,
                "error": f"Unknown workflow: {workflow}",
                "available_workflows": [
                    "enrollment",
                    "bulk_enrollment",
                    "class_creation",
                    "student_access_audit",
                    "revenue_analysis",
                    "weekly_schedule"
                ]
            }

        # Get detailed info for each tool
        tool_details = []
        for tool_name in tools:
            info = tool_searcher.get_tool_info(tool_name)
            if info:
                tool_details.append({
                    "name": info["name"],
                    "server": info["server"],
                    "description": info["description"]
                })

        return {
            "success": True,
            "workflow": workflow,
            "tools": tools,
            "tool_details": tool_details,
            "count": len(tools)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_tool_info(tool_name: str) -> dict:
    """
    Get detailed information about a specific tool.

    Args:
        tool_name: Exact tool name (e.g., "registrar_enroll_student")

    Returns:
        Dictionary with tool details including description, tags, and use cases

    Example:
        get_tool_info(tool_name="registrar_enroll_student")

        Returns:
        {
          "success": true,
          "tool": {
            "name": "registrar_enroll_student",
            "server": "registrar",
            "description": "Enroll student in a class",
            "tags": ["enroll", "enrollment", "register", "add to class"],
            "use_cases": ["enroll student", "add to class", "register for class"]
          }
        }
    """
    try:
        info = tool_searcher.get_tool_info(tool_name)

        if not info:
            return {
                "success": False,
                "error": f"Tool not found: {tool_name}",
                "suggestion": "Use search_tools() to find available tools"
            }

        return {
            "success": True,
            "tool": info
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def list_all_tools(server: Optional[str] = None) -> dict:
    """
    List all available MCP tools, optionally filtered by server.

    Args:
        server: Optional server name to filter by
                ("registrar", "program_manager", "stripe")

    Returns:
        Dictionary with list of all tool names

    Example:
        list_all_tools(server="registrar")

        Returns:
        {
          "success": true,
          "server": "registrar",
          "tools": [
            "registrar_create_student",
            "registrar_update_student",
            "registrar_get_student",
            ...
          ],
          "count": 14
        }
    """
    try:
        if server:
            # Filter by server
            if server not in tool_searcher.tool_catalog:
                return {
                    "success": False,
                    "error": f"Unknown server: {server}",
                    "available_servers": list(tool_searcher.tool_catalog.keys())
                }

            tools = list(tool_searcher.tool_catalog[server]["tools"].keys())
            return {
                "success": True,
                "server": server,
                "tools": sorted(tools),
                "count": len(tools)
            }
        else:
            # All tools
            tools = tool_searcher.list_all_tools()
            return {
                "success": True,
                "tools": tools,
                "count": len(tools)
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def list_servers() -> dict:
    """
    List all available MCP servers.

    Returns:
        Dictionary with list of servers and their descriptions

    Example:
        list_servers()

        Returns:
        {
          "success": true,
          "servers": [
            {
              "name": "registrar",
              "description": "Student and enrollment management",
              "tool_count": 14
            },
            {
              "name": "program_manager",
              "description": "Class, schedule, and program management",
              "tool_count": 24
            },
            {
              "name": "stripe",
              "description": "Stripe payment and product management",
              "tool_count": 7
            }
          ],
          "count": 3
        }
    """
    try:
        servers = []
        for server_name, server_data in tool_searcher.tool_catalog.items():
            servers.append({
                "name": server_name,
                "description": server_data["description"],
                "tool_count": len(server_data["tools"])
            })

        return {
            "success": True,
            "servers": servers,
            "count": len(servers),
            "total_tools": sum(s["tool_count"] for s in servers)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
