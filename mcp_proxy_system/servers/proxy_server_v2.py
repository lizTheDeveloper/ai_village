#!/usr/bin/env python3
"""
MCP Proxy Server V2

Provides meta-tools that can call other MCP tools dynamically.
This implementation works within the MCP ecosystem by maintaining
a catalog of available tools and their schemas.

Key Insight: The proxy doesn't actually call other servers - it provides
a catalog and lets Claude Code route the calls through normal MCP channels.
"""

from fastmcp import FastMCP
from typing import Any, Dict, List, Optional
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from multiverse_mcp.utils.tool_searcher import ToolSearcher
from multiverse_mcp.utils.logging import setup_logging
from multiverse_mcp.utils.mcp_installer import MCPInstaller
from multiverse_mcp.utils.dynamic_server_loader import get_loader

# Setup logging
setup_logging()

# Initialize FastMCP server
mcp = FastMCP("multiverse-proxy")

# Initialize tool catalog, installer, and dynamic loader
tool_catalog = ToolSearcher()
mcp_installer = MCPInstaller()
server_loader = get_loader()


@mcp.tool()
def list_available_mcp_tools(server_filter: Optional[str] = None) -> dict:
    """
    List all MCP tools available across all configured servers.

    This provides a complete catalog of tools without loading all their definitions.
    Use this to discover what operations are available.

    Args:
        server_filter: Optional filter by server name (registrar, program_manager, stripe, tool_search)

    Returns:
        Dictionary with tool names, descriptions, and server assignments

    Example:
        list_available_mcp_tools()  # All tools
        list_available_mcp_tools(server_filter="registrar")  # Just registrar tools
    """
    try:
        if server_filter:
            if server_filter not in tool_catalog.tool_catalog:
                return {
                    "success": False,
                    "error": f"Unknown server: {server_filter}",
                    "available_servers": list(tool_catalog.tool_catalog.keys())
                }

            server_data = tool_catalog.tool_catalog[server_filter]
            tools = []
            for tool_name, tool_info in server_data["tools"].items():
                tools.append({
                    "name": tool_name,
                    "server": server_filter,
                    "description": tool_info["description"],
                    "tags": tool_info["tags"]
                })

            return {
                "success": True,
                "server": server_filter,
                "tools": tools,
                "count": len(tools)
            }
        else:
            # All tools from all servers
            all_tools = []
            for server_name, server_data in tool_catalog.tool_catalog.items():
                for tool_name, tool_info in server_data["tools"].items():
                    all_tools.append({
                        "name": tool_name,
                        "server": server_name,
                        "description": tool_info["description"],
                        "tags": tool_info["tags"]
                    })

            return {
                "success": True,
                "tools": all_tools,
                "count": len(all_tools),
                "servers": list(tool_catalog.tool_catalog.keys())
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_tool_usage_guide(tool_name: str) -> dict:
    """
    Get detailed usage information for a specific MCP tool.

    Provides the tool's purpose, parameters, return format, and usage examples.
    Use this before calling an unfamiliar tool.

    Args:
        tool_name: Name of the tool (e.g., "registrar_enroll_student")

    Returns:
        Dictionary with tool documentation and usage examples

    Example:
        get_tool_usage_guide("registrar_enroll_student")
    """
    try:
        tool_info = tool_catalog.get_tool_info(tool_name)

        if not tool_info:
            return {
                "success": False,
                "error": f"Tool not found: {tool_name}",
                "suggestion": "Use list_available_mcp_tools() or search_tools() to find available tools"
            }

        # Provide detailed usage info
        return {
            "success": True,
            "tool": {
                "name": tool_info["name"],
                "server": tool_info["server"],
                "description": tool_info["description"],
                "tags": tool_info["tags"],
                "use_cases": tool_info["use_cases"],
                "mcp_function_name": f"mcp__multiverse-{tool_info['server']}__{ tool_info['name']}",
                "usage_note": f"Call this tool using: mcp__multiverse-{tool_info['server']}__{tool_info['name']}(...parameters...)"
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_workflow_tool_list(workflow: str) -> dict:
    """
    Get the list of tools needed for a specific workflow, in order.

    This returns the exact sequence of MCP tools you need to call for
    common workflows like enrollment, class creation, etc.

    Args:
        workflow: Workflow name. Available workflows:
                 - "enrollment" - Enroll a single student
                 - "bulk_enrollment" - Enroll multiple students
                 - "class_creation" - Create complete class with Stripe
                 - "student_access_audit" - Check student permissions
                 - "revenue_analysis" - Financial reporting
                 - "weekly_schedule" - Get upcoming classes

    Returns:
        Dictionary with ordered list of tools and their full MCP names

    Example:
        get_workflow_tool_list("enrollment")
        # Returns the 4 tools needed and their exact MCP function names
    """
    try:
        tool_names = tool_catalog.get_tools_for_workflow(workflow)

        if not tool_names:
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

        # Build full tool info with MCP names
        tools_with_mcp_names = []
        for tool_name in tool_names:
            tool_info = tool_catalog.get_tool_info(tool_name)
            if tool_info:
                tools_with_mcp_names.append({
                    "step": len(tools_with_mcp_names) + 1,
                    "tool_name": tool_name,
                    "server": tool_info["server"],
                    "description": tool_info["description"],
                    "mcp_function": f"mcp__multiverse-{tool_info['server']}__{tool_name}"
                })

        return {
            "success": True,
            "workflow": workflow,
            "tools": tools_with_mcp_names,
            "count": len(tools_with_mcp_names),
            "usage_instructions": f"Call each tool in order using their mcp_function names"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def search_mcp_tools(query: str, max_results: int = 5) -> dict:
    """
    Search for MCP tools using natural language.

    Instead of browsing all 50+ tools, describe what you want to do
    and this will find the relevant tools.

    Args:
        query: Natural language description (e.g., "enroll student in class")
        max_results: Maximum number of tools to return (default: 5)

    Returns:
        Dictionary with matching tools ranked by relevance

    Example:
        search_mcp_tools("create a new class and set pricing")
        # Returns tools for: pm_create_class, pm_create_class_pricing, etc.
    """
    try:
        results = tool_catalog.search_tools(query, max_results)

        # Add MCP function names to results
        enriched_results = []
        for result in results:
            enriched_results.append({
                **result,
                "mcp_function": f"mcp__multiverse-{result['server']}__{result['tool']}"
            })

        return {
            "success": True,
            "query": query,
            "tools": enriched_results,
            "count": len(enriched_results),
            "usage_note": "Call tools using their mcp_function names"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def install_mcp_server_from_git(
    git_url: str,
    server_name: Optional[str] = None,
    server_file: Optional[str] = None,
    env_vars: Optional[Dict[str, str]] = None,
    requirements_file: Optional[str] = None,
    auto_detect: bool = True
) -> dict:
    """
    Install an MCP server from a git repository and configure it automatically.

    This tool clones a git repository containing an MCP server, installs its
    dependencies, and adds it to the .mcp.json configuration file.

    Args:
        git_url: Git repository URL (supports @branch syntax, e.g., https://github.com/user/repo@main)
        server_name: Name for the server in .mcp.json (default: repo name)
        server_file: Python file to run (default: auto-detect from server.py, main.py, *_server.py)
        env_vars: Dictionary of environment variables to pass to the server
        requirements_file: Path to requirements file (default: requirements.txt)
        auto_detect: Auto-detect server file if not specified (default: True)

    Returns:
        Dictionary with installation status and details

    Examples:
        # Install a public MCP server
        install_mcp_server_from_git("https://github.com/anthropics/mcp-server-example")

        # Install with specific branch
        install_mcp_server_from_git("https://github.com/user/repo@develop")

        # Install with custom configuration
        install_mcp_server_from_git(
            git_url="https://github.com/user/custom-server",
            server_name="my-custom-server",
            server_file="custom_server.py",
            env_vars={"API_KEY": "secret123"},
            requirements_file="deps.txt"
        )

    Usage Notes:
        - Requires git to be installed
        - Server files are installed to ~/.mcp_servers/ by default
        - Dependencies are installed in the current Python environment
        - After installation, restart Claude Code to load the new server
        - Use list_installed_mcp_servers() to see all installed servers
    """
    try:
        success = mcp_installer.install_from_git(
            git_url=git_url,
            server_name=server_name,
            server_file=server_file,
            env_vars=env_vars,
            requirements_file=requirements_file,
            auto_detect=auto_detect
        )

        if success:
            return {
                "success": True,
                "message": f"Successfully installed MCP server from {git_url}",
                "server_name": server_name or mcp_installer._parse_git_url(git_url)[0],
                "next_step": "Restart Claude Code to load the new server"
            }
        else:
            return {
                "success": False,
                "error": "Installation failed. Check the logs for details."
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Installation failed: {str(e)}"
        }


@mcp.tool()
def list_installed_mcp_servers() -> dict:
    """
    List all installed MCP servers from .mcp.json configuration.

    Returns information about each configured MCP server including:
    - Server name
    - File path
    - Python command
    - Environment variables

    Returns:
        Dictionary with list of installed servers

    Example:
        list_installed_mcp_servers()
        # Returns all servers with their configuration details
    """
    try:
        servers = mcp_installer.list_installed()

        return {
            "success": True,
            "servers": servers,
            "count": len(servers),
            "config_file": str(mcp_installer.config_file)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def uninstall_mcp_server(server_name: str, delete_files: bool = False) -> dict:
    """
    Uninstall an MCP server and optionally delete its files.

    Removes the server from .mcp.json configuration. Can optionally
    delete the server files from disk as well.

    Args:
        server_name: Name of the server to uninstall
        delete_files: If True, delete the server files as well (default: False)

    Returns:
        Dictionary with uninstallation status

    Examples:
        # Remove from config only
        uninstall_mcp_server("my-server")

        # Remove from config and delete files
        uninstall_mcp_server("my-server", delete_files=True)

    Usage Notes:
        - Removes server from .mcp.json
        - If delete_files=True, removes the repository from ~/.mcp_servers/
        - Restart Claude Code after uninstalling
    """
    try:
        success = mcp_installer.uninstall(server_name, delete_files)

        if success:
            return {
                "success": True,
                "message": f"Successfully uninstalled '{server_name}'",
                "files_deleted": delete_files,
                "next_step": "Restart Claude Code to remove the server from context"
            }
        else:
            return {
                "success": False,
                "error": f"Failed to uninstall '{server_name}'"
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def load_mcp_server_dynamically(server_name: str) -> dict:
    """
    Load an MCP server dynamically without restarting Claude Code.

    This tool loads a server from .mcp.json configuration and makes its
    tools available immediately. No restart required!

    Args:
        server_name: Name of the server to load (must be in .mcp.json)

    Returns:
        Dictionary with load status and available tools

    Examples:
        # Load a newly installed server
        load_mcp_server_dynamically("my-new-server")

        # Load after updating .mcp.json
        load_mcp_server_dynamically("updated-server")

    Usage Notes:
        - Server must exist in .mcp.json
        - Tools become available immediately
        - Can load multiple servers simultaneously
        - Use get_loaded_servers() to see what's loaded
    """
    try:
        result = server_loader.load_server(server_name)
        return result

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to load server: {str(e)}"
        }


@mcp.tool()
def call_dynamic_server_tool(
    server_name: str,
    tool_name: str,
    parameters: Optional[Dict[str, Any]] = None
) -> dict:
    """
    Call a tool on a dynamically loaded MCP server.

    This allows calling tools from servers that aren't natively loaded
    by Claude Code. The server is loaded on-demand if needed.

    Args:
        server_name: Name of the MCP server
        tool_name: Name of the tool to call
        parameters: Dictionary of tool parameters

    Returns:
        Tool execution result

    Examples:
        # Call tool on loaded server
        call_dynamic_server_tool(
            server_name="analytics",
            tool_name="get_metrics",
            parameters={"date": "2024-01-01"}
        )

        # Server loads automatically if needed
        call_dynamic_server_tool(
            server_name="new-server",
            tool_name="process_data",
            parameters={"input": "data.csv"}
        )

    Usage Notes:
        - Server loads automatically if not already loaded
        - Results returned directly from the tool
        - Supports all parameter types (strings, numbers, objects, arrays)
    """
    try:
        result = server_loader.call_tool(server_name, tool_name, parameters)
        return result

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to call tool: {str(e)}"
        }


@mcp.tool()
def get_loaded_servers() -> dict:
    """
    Get information about all dynamically loaded MCP servers.

    Shows which servers are currently loaded, their status, and
    available tools from each server.

    Returns:
        Dictionary with loaded server information

    Example:
        get_loaded_servers()
        # Returns list of loaded servers with their tools

    Usage Notes:
        - Shows only dynamically loaded servers (not native Claude Code servers)
        - Indicates if server process is still running
        - Lists all tools available from each server
    """
    try:
        return server_loader.get_loaded_servers()

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def reload_mcp_server(server_name: str) -> dict:
    """
    Reload an MCP server to pick up changes.

    Useful when a server has been updated or its configuration changed.
    Stops the current server process and starts a new one.

    Args:
        server_name: Name of the server to reload

    Returns:
        Reload status and updated tool list

    Examples:
        # Reload after code update
        reload_mcp_server("my-server")

        # Reload after configuration change
        reload_mcp_server("analytics")

    Usage Notes:
        - Stops and restarts the server process
        - Picks up code changes immediately
        - Refreshes available tools
        - Use this instead of restarting Claude Code
    """
    try:
        return server_loader.reload_server(server_name)

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def install_and_load_mcp_server(
    git_url: str,
    server_name: Optional[str] = None,
    server_file: Optional[str] = None,
    env_vars: Optional[Dict[str, str]] = None,
    requirements_file: Optional[str] = None,
    auto_detect: bool = True
) -> dict:
    """
    Install an MCP server from git AND load it immediately without restart.

    This is the ultimate convenience tool - combines installation and loading
    into a single operation. Install and start using new servers instantly!

    Args:
        git_url: Git repository URL (supports @branch syntax)
        server_name: Name for the server (default: repo name)
        server_file: Python file to run (default: auto-detect)
        env_vars: Environment variables for the server
        requirements_file: Requirements file (default: requirements.txt)
        auto_detect: Auto-detect server file (default: True)

    Returns:
        Dictionary with installation and loading status

    Examples:
        # Install and load in one step
        install_and_load_mcp_server("https://github.com/user/server")

        # With configuration
        install_and_load_mcp_server(
            git_url="https://github.com/user/server@v1.0",
            server_name="my-server",
            env_vars={"API_KEY": "secret"}
        )

    Usage Notes:
        - No restart required!
        - Server tools available immediately after installation
        - Combines install_mcp_server_from_git + load_mcp_server_dynamically
        - Perfect for quick experimentation with new servers
    """
    try:
        # Step 1: Install
        install_result = mcp_installer.install_from_git(
            git_url=git_url,
            server_name=server_name,
            server_file=server_file,
            env_vars=env_vars,
            requirements_file=requirements_file,
            auto_detect=auto_detect
        )

        if not install_result:
            return {
                "success": False,
                "error": "Installation failed"
            }

        # Get the actual server name (might be from repo name)
        final_server_name = server_name or mcp_installer._parse_git_url(git_url)[0]

        # Step 2: Load dynamically
        load_result = server_loader.load_server(final_server_name)

        if load_result.get("success"):
            return {
                "success": True,
                "message": f"Installed and loaded '{final_server_name}' successfully",
                "server_name": final_server_name,
                "tools": load_result.get("tools", []),
                "tool_count": load_result.get("tool_count", 0),
                "note": "Server is ready to use immediately - no restart required!"
            }
        else:
            return {
                "success": False,
                "error": f"Installation succeeded but loading failed: {load_result.get('error')}"
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to install and load server: {str(e)}"
        }


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
