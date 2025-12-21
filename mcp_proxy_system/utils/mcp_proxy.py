"""
MCP Proxy Client

Enables dynamic tool calling for programmatic orchestration.
Allows calling MCP tools by name without having them in the function list.

This implements the "programmatic tool calling" pattern from Anthropic's guide:
https://www.anthropic.com/engineering/advanced-tool-use
"""

import json
import subprocess
import sys
from typing import Any, Dict, Optional, List
from pathlib import Path


class MCPProxy:
    """
    Proxy client for dynamically calling MCP tools.

    Usage:
        proxy = MCPProxy()
        result = proxy.call_tool("registrar_get_student", email="jane@example.com")
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize MCP proxy.

        Args:
            config_path: Path to .mcp.json (defaults to repo root)
        """
        if config_path is None:
            # Find repo root
            current = Path(__file__).resolve()
            while current.parent != current:
                mcp_config = current / ".mcp.json"
                if mcp_config.exists():
                    config_path = str(mcp_config)
                    break
                current = current.parent

        if config_path is None:
            raise FileNotFoundError("Could not find .mcp.json in parent directories")

        self.config_path = config_path
        self.config = self._load_config()
        self.server_processes = {}

    def _load_config(self) -> Dict[str, Any]:
        """Load MCP configuration from .mcp.json"""
        with open(self.config_path, 'r') as f:
            data = json.load(f)
            return data.get("mcpServers", {})

    def _get_server_for_tool(self, tool_name: str) -> Optional[str]:
        """
        Determine which MCP server provides this tool.

        Args:
            tool_name: Tool name (e.g., "registrar_get_student")

        Returns:
            Server name or None
        """
        # Map tool prefixes to servers
        prefix_map = {
            "registrar_": "multiverse-registrar",
            "pm_": "multiverse-program-manager",
            "stripe_": "multiverse-stripe",
            "search_tools": "multiverse-tool-search",
            "get_workflow_tools": "multiverse-tool-search",
            "get_tool_info": "multiverse-tool-search",
            "list_all_tools": "multiverse-tool-search",
            "list_servers": "multiverse-tool-search"
        }

        for prefix, server in prefix_map.items():
            if tool_name.startswith(prefix) or tool_name == prefix:
                return server

        return None

    def call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """
        Call an MCP tool dynamically.

        Args:
            tool_name: Name of the tool (e.g., "registrar_get_student")
            **kwargs: Tool parameters

        Returns:
            Tool response as dictionary

        Example:
            result = proxy.call_tool("registrar_get_student", email="jane@example.com")
        """
        server_name = self._get_server_for_tool(tool_name)

        if server_name is None:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
                "suggestion": "Use search_tools() to find available tools"
            }

        if server_name not in self.config:
            return {
                "success": False,
                "error": f"Server not configured: {server_name}",
                "config_path": self.config_path
            }

        server_config = self.config[server_name]

        # Call the MCP server directly
        try:
            # Build command
            cmd = [server_config["command"]] + server_config["args"]

            # Prepare input
            request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": kwargs
                }
            }

            # Execute
            env = {**server_config.get("env", {})}
            result = subprocess.run(
                cmd,
                input=json.dumps(request).encode(),
                capture_output=True,
                env=env,
                timeout=30
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": "Tool execution failed",
                    "stderr": result.stderr.decode(),
                    "stdout": result.stdout.decode()
                }

            # Parse response
            response = json.loads(result.stdout)

            if "error" in response:
                return {
                    "success": False,
                    "error": response["error"].get("message", "Unknown error"),
                    "code": response["error"].get("code")
                }

            return response.get("result", {"success": True})

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Tool execution timeout (30s)"
            }
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid JSON response: {e}",
                "stdout": result.stdout.decode() if 'result' in locals() else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "type": type(e).__name__
            }

    def batch_call(self, calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Call multiple tools in sequence.

        Args:
            calls: List of dicts with "tool" and "params" keys

        Returns:
            List of results

        Example:
            results = proxy.batch_call([
                {"tool": "registrar_get_student", "params": {"email": "jane@example.com"}},
                {"tool": "pm_list_classes", "params": {"limit": 5}}
            ])
        """
        results = []
        for call in calls:
            result = self.call_tool(call["tool"], **call.get("params", {}))
            results.append(result)
        return results

    def list_available_tools(self) -> List[str]:
        """
        List all available tools across all configured servers.

        Returns:
            List of tool names
        """
        # This would require querying each server for its tools
        # For now, return a hardcoded list based on known servers
        tools = []

        if "multiverse-registrar" in self.config:
            tools.extend([
                "registrar_create_student",
                "registrar_update_student",
                "registrar_get_student",
                "registrar_list_students",
                "registrar_enroll_student",
                "registrar_unenroll_student",
                "registrar_get_student_enrollments",
                "registrar_get_class_roster",
                "registrar_bulk_enroll",
                "registrar_check_course_access",
                "registrar_get_active_students",
                "registrar_get_scholarship_students",
                "registrar_check_enrollment"
            ])

        if "multiverse-program-manager" in self.config:
            tools.extend([
                "pm_create_class",
                "pm_update_class",
                "pm_get_class",
                "pm_list_classes",
                "pm_create_classtime",
                "pm_bulk_create_classtimes",
                "pm_list_classtimes",
                "pm_get_next_week_schedule",
                "pm_get_schedule_for_date_range",
                "pm_create_class_pricing",
                "pm_update_class_pricing",
                "pm_list_class_pricing",
                "pm_generate_registration_email",
                "pm_update_class_registration_email",
                "pm_set_membership",
                "pm_extend_membership",
                "pm_grant_scholarship",
                "pm_set_researcher_status",
                "pm_get_expiring_memberships",
                "pm_enrollment_stats",
                "pm_membership_breakdown",
                "pm_revenue_report"
            ])

        if "multiverse-stripe" in self.config:
            tools.extend([
                "stripe_create_product",
                "stripe_get_product",
                "stripe_list_products",
                "stripe_create_price",
                "stripe_list_prices",
                "stripe_create_payment_link",
                "stripe_list_payment_links"
            ])

        if "multiverse-tool-search" in self.config:
            tools.extend([
                "search_tools",
                "get_workflow_tools",
                "get_tool_info",
                "list_all_tools",
                "list_servers"
            ])

        return sorted(tools)


# Convenience function for quick access
_proxy = None


def get_proxy() -> MCPProxy:
    """Get singleton MCP proxy instance"""
    global _proxy
    if _proxy is None:
        _proxy = MCPProxy()
    return _proxy


def call_tool(tool_name: str, **kwargs) -> Dict[str, Any]:
    """
    Convenience function to call an MCP tool.

    Args:
        tool_name: Tool name
        **kwargs: Tool parameters

    Returns:
        Tool result

    Example:
        result = call_tool("registrar_get_student", email="jane@example.com")
    """
    return get_proxy().call_tool(tool_name, **kwargs)
