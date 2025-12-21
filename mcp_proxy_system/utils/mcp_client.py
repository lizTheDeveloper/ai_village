"""
MCP Client for inter-server communication

This allows the proxy server to call tools on other MCP servers.
"""
import json
import subprocess
import os
from typing import Any, Dict, Optional


class MCPClient:
    """Client for calling tools on MCP servers"""

    def __init__(self, server_name: str, command: str, args: list, env: Dict[str, str] = None):
        """
        Initialize MCP client for a specific server

        Args:
            server_name: Name of the MCP server (e.g., 'multiverse-registrar')
            command: Python executable path
            args: Command line arguments (path to server script)
            env: Environment variables for the server
        """
        self.server_name = server_name
        self.command = command
        self.args = args
        self.env = env or {}

    def call_tool(self, tool_name: str, parameters: Optional[Dict[str, Any]] = None) -> dict:
        """
        Call a tool on this MCP server

        Args:
            tool_name: Name of the tool to call
            parameters: Tool parameters

        Returns:
            Result from the tool
        """
        # Build JSON-RPC request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": parameters or {}
            }
        }

        # Prepare environment
        env = os.environ.copy()
        env.update(self.env)

        try:
            # Call the MCP server
            result = subprocess.run(
                [self.command] + self.args,
                input=json.dumps(request).encode(),
                capture_output=True,
                env=env,
                timeout=30
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Server process failed: {result.stderr.decode()}"
                }

            # Parse response
            response = json.loads(result.stdout)

            if "error" in response:
                return {
                    "success": False,
                    "error": response["error"].get("message", str(response["error"]))
                }

            if "result" in response:
                return response["result"]

            return {
                "success": False,
                "error": "Invalid response format"
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Tool call timed out"
            }
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid JSON response: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


class MCPClientManager:
    """Manager for multiple MCP server clients"""

    def __init__(self, config_path: str = None):
        """
        Initialize client manager

        Args:
            config_path: Path to .mcp.json config file
        """
        self.clients = {}

        if config_path:
            self.load_config(config_path)

    def load_config(self, config_path: str):
        """Load MCP server configurations from .mcp.json"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)

            for server_name, server_config in config.get('mcpServers', {}).items():
                self.add_client(
                    server_name,
                    server_config['command'],
                    server_config['args'],
                    server_config.get('env', {})
                )
        except Exception as e:
            print(f"Warning: Could not load MCP config: {e}")

    def add_client(self, server_name: str, command: str, args: list, env: Dict[str, str] = None):
        """Add a client for an MCP server"""
        self.clients[server_name] = MCPClient(server_name, command, args, env)

    def call_tool(self, server_name: str, tool_name: str, parameters: Optional[Dict[str, Any]] = None) -> dict:
        """
        Call a tool on a specific server

        Args:
            server_name: Name of the MCP server
            tool_name: Name of the tool
            parameters: Tool parameters

        Returns:
            Result from the tool
        """
        if server_name not in self.clients:
            return {
                "success": False,
                "error": f"Unknown server: {server_name}",
                "available_servers": list(self.clients.keys())
            }

        return self.clients[server_name].call_tool(tool_name, parameters)

    def get_servers(self) -> list:
        """Get list of configured servers"""
        return list(self.clients.keys())


# Tool name to server mapping
TOOL_SERVER_MAP = {
    # Registrar tools
    "registrar_create_student": "multiverse-registrar",
    "registrar_update_student": "multiverse-registrar",
    "registrar_get_student": "multiverse-registrar",
    "registrar_list_students": "multiverse-registrar",
    "registrar_enroll_student": "multiverse-registrar",
    "registrar_unenroll_student": "multiverse-registrar",
    "registrar_get_student_enrollments": "multiverse-registrar",
    "registrar_get_class_roster": "multiverse-registrar",
    "registrar_bulk_enroll": "multiverse-registrar",
    "registrar_check_course_access": "multiverse-registrar",
    "registrar_get_active_students": "multiverse-registrar",
    "registrar_get_scholarship_students": "multiverse-registrar",
    "registrar_check_enrollment": "multiverse-registrar",

    # Program Manager tools
    "pm_create_class": "multiverse-program-manager",
    "pm_update_class": "multiverse-program-manager",
    "pm_get_class": "multiverse-program-manager",
    "pm_list_classes": "multiverse-program-manager",
    "pm_create_classtime": "multiverse-program-manager",
    "pm_bulk_create_classtimes": "multiverse-program-manager",
    "pm_list_classtimes": "multiverse-program-manager",
    "pm_get_next_week_schedule": "multiverse-program-manager",
    "pm_get_schedule_for_date_range": "multiverse-program-manager",
    "pm_create_class_pricing": "multiverse-program-manager",
    "pm_update_class_pricing": "multiverse-program-manager",
    "pm_list_class_pricing": "multiverse-program-manager",
    "pm_generate_registration_email": "multiverse-program-manager",
    "pm_update_class_registration_email": "multiverse-program-manager",
    "pm_set_membership": "multiverse-program-manager",
    "pm_extend_membership": "multiverse-program-manager",
    "pm_grant_scholarship": "multiverse-program-manager",
    "pm_set_researcher_status": "multiverse-program-manager",
    "pm_get_expiring_memberships": "multiverse-program-manager",
    "pm_enrollment_stats": "multiverse-program-manager",
    "pm_membership_breakdown": "multiverse-program-manager",
    "pm_revenue_report": "multiverse-program-manager",

    # Stripe tools
    "stripe_create_product": "multiverse-stripe",
    "stripe_get_product": "multiverse-stripe",
    "stripe_list_products": "multiverse-stripe",
    "stripe_create_price": "multiverse-stripe",
    "stripe_list_prices": "multiverse-stripe",
    "stripe_create_payment_link": "multiverse-stripe",
    "stripe_list_payment_links": "multiverse-stripe",
}


def get_server_for_tool(tool_name: str) -> Optional[str]:
    """Get the server name for a given tool"""
    return TOOL_SERVER_MAP.get(tool_name)
