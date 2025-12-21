"""
Dynamic MCP Server Loader

Load and call MCP servers dynamically at runtime without requiring Claude Code restart.
Servers can be installed, loaded, and called on-the-fly.
"""

import json
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional
import time


class DynamicServerLoader:
    """Load and manage MCP servers dynamically at runtime."""

    def __init__(self, config_file: Optional[Path] = None):
        """
        Initialize the dynamic server loader.

        Args:
            config_file: Path to .mcp.json (default: ./.mcp.json)
        """
        self.config_file = config_file or Path.cwd() / ".mcp.json"
        self.server_processes = {}  # server_name -> subprocess
        self.server_tools = {}  # server_name -> {tool_name: tool_schema}
        self.lock = threading.RLock()  # Reentrant lock to allow nested acquisition

    def _load_config(self) -> Dict:
        """Load .mcp.json configuration."""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return {"mcpServers": {}}

    def get_available_servers(self) -> List[str]:
        """Get list of all configured server names."""
        config = self._load_config()
        return list(config.get("mcpServers", {}).keys())

    def is_server_loaded(self, server_name: str) -> bool:
        """Check if a server is currently loaded."""
        with self.lock:
            return server_name in self.server_processes

    def load_server(self, server_name: str) -> Dict:
        """
        Load an MCP server dynamically and discover its tools.

        Args:
            server_name: Name of the server to load

        Returns:
            Dictionary with server info and available tools
        """
        with self.lock:
            # Check if already loaded
            if server_name in self.server_processes:
                return {
                    "success": True,
                    "message": f"Server '{server_name}' already loaded",
                    "tools": list(self.server_tools.get(server_name, {}).keys())
                }

            # Load config
            config = self._load_config()
            server_config = config.get("mcpServers", {}).get(server_name)

            if not server_config:
                return {
                    "success": False,
                    "error": f"Server '{server_name}' not found in .mcp.json"
                }

            try:
                # Start the server process
                command = server_config.get("command")
                args = server_config.get("args", [])
                env = {**server_config.get("env", {})}

                # Start server in background
                # Use line buffering and redirect stderr to avoid blocking
                process = subprocess.Popen(
                    [command] + args,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,  # Discard stderr to avoid blocking
                    env={**subprocess.os.environ, **env},
                    text=True,
                    bufsize=1  # Line buffered
                )

                # Give server time to start
                time.sleep(0.5)

                # Check if process started successfully
                if process.poll() is not None:
                    stderr = process.stderr.read()
                    return {
                        "success": False,
                        "error": f"Server failed to start: {stderr}"
                    }

                # Discover tools using MCP protocol
                tools = self._discover_tools(process)

                # Store process and tools
                self.server_processes[server_name] = process
                self.server_tools[server_name] = tools

                return {
                    "success": True,
                    "message": f"Server '{server_name}' loaded successfully",
                    "server_name": server_name,
                    "tools": list(tools.keys()),
                    "tool_count": len(tools)
                }

            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to load server: {str(e)}"
                }

    def _initialize_server(self, process: subprocess.Popen) -> bool:
        """
        Initialize MCP server with proper handshake.

        Args:
            process: Server subprocess

        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Step 1: Send initialize request
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {
                        "tools": {},
                        "resources": {},
                        "prompts": {}
                    },
                    "clientInfo": {
                        "name": "multiverse-proxy",
                        "version": "1.0.0"
                    }
                }
            }

            process.stdin.write(json.dumps(init_request) + "\n")
            process.stdin.flush()

            # Step 2: Read initialize response
            response_line = process.stdout.readline()
            response = json.loads(response_line)

            if "error" in response:
                print(f"Initialization error: {response['error']}")
                return False

            # Step 3: Send initialized notification
            # NOTE: Notifications do NOT get responses - don't try to read one!
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }

            process.stdin.write(json.dumps(initialized_notification) + "\n")
            process.stdin.flush()

            # Small delay to let server process the notification
            time.sleep(0.1)

            return True

        except Exception as e:
            print(f"Failed to initialize server: {e}")
            return False

    def _discover_tools(self, process: subprocess.Popen) -> Dict[str, Dict]:
        """
        Discover available tools from an MCP server using the MCP protocol.

        Args:
            process: Server subprocess

        Returns:
            Dictionary mapping tool names to their schemas
        """
        try:
            # Initialize server first
            if not self._initialize_server(process):
                return {}

            # Now send list_tools request
            request = {
                "jsonrpc": "2.0",
                "method": "tools/list",
                "id": 2
            }

            process.stdin.write(json.dumps(request) + "\n")
            process.stdin.flush()

            # Read response
            response_line = process.stdout.readline()
            response = json.loads(response_line)

            if "result" in response and "tools" in response["result"]:
                tools = {}
                for tool in response["result"]["tools"]:
                    tool_name = tool.get("name")
                    tools[tool_name] = {
                        "description": tool.get("description", ""),
                        "inputSchema": tool.get("inputSchema", {})
                    }
                return tools

            return {}

        except Exception as e:
            print(f"Warning: Could not discover tools: {e}")
            return {}

    def call_tool(
        self,
        server_name: str,
        tool_name: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict:
        """
        Call a tool on a dynamically loaded MCP server.

        Args:
            server_name: Name of the server
            tool_name: Name of the tool to call
            parameters: Tool parameters

        Returns:
            Tool execution result
        """
        with self.lock:
            # Load server if not already loaded
            if server_name not in self.server_processes:
                load_result = self.load_server(server_name)
                if not load_result.get("success"):
                    return load_result

            # Get process
            process = self.server_processes.get(server_name)
            if not process:
                return {
                    "success": False,
                    "error": f"Server '{server_name}' not loaded"
                }

            # Check if process is still alive
            if process.poll() is not None:
                # Process died, remove from cache
                del self.server_processes[server_name]
                if server_name in self.server_tools:
                    del self.server_tools[server_name]
                return {
                    "success": False,
                    "error": f"Server '{server_name}' process terminated"
                }

            try:
                # Call tool using MCP JSON-RPC protocol
                # Use incrementing ID to avoid conflicts
                call_id = int(time.time() * 1000)  # millisecond timestamp as ID
                request = {
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "params": {
                        "name": tool_name,
                        "arguments": parameters or {}
                    },
                    "id": call_id
                }

                process.stdin.write(json.dumps(request) + "\n")
                process.stdin.flush()

                # Read response with timeout using select
                import select
                ready, _, _ = select.select([process.stdout], [], [], 5.0)

                if not ready:
                    return {
                        "success": False,
                        "error": "Tool call timed out after 5 seconds"
                    }

                response_line = process.stdout.readline()
                if not response_line:
                    return {
                        "success": False,
                        "error": "No response from server"
                    }

                response = json.loads(response_line)

                if "result" in response:
                    # MCP tools return: {"result": {"content": [{"type": "text", "text": "..."}]}}
                    # Extract the actual content for easier use
                    result = response["result"]

                    # If result has content array, extract text from first content item
                    if isinstance(result, dict) and "content" in result:
                        content_items = result.get("content", [])
                        if content_items and len(content_items) > 0:
                            first_item = content_items[0]
                            if isinstance(first_item, dict) and "text" in first_item:
                                # Try to parse as JSON if it looks like JSON
                                text = first_item["text"]
                                try:
                                    parsed = json.loads(text)
                                    return parsed  # Return the parsed JSON directly
                                except:
                                    return {
                                        "success": True,
                                        "result": text  # Return as plain text
                                    }

                    # Fallback: return raw result
                    return {
                        "success": True,
                        "result": result
                    }
                elif "error" in response:
                    return {
                        "success": False,
                        "error": response["error"].get("message", "Unknown error")
                    }
                else:
                    return {
                        "success": False,
                        "error": "Invalid response from server"
                    }

            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to call tool: {str(e)}"
                }

    def unload_server(self, server_name: str) -> Dict:
        """
        Unload a dynamically loaded server.

        Args:
            server_name: Name of the server to unload

        Returns:
            Unload status
        """
        with self.lock:
            if server_name not in self.server_processes:
                return {
                    "success": False,
                    "error": f"Server '{server_name}' not loaded"
                }

            try:
                process = self.server_processes[server_name]
                process.terminate()
                process.wait(timeout=5)

                del self.server_processes[server_name]
                if server_name in self.server_tools:
                    del self.server_tools[server_name]

                return {
                    "success": True,
                    "message": f"Server '{server_name}' unloaded successfully"
                }

            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to unload server: {str(e)}"
                }

    def reload_server(self, server_name: str) -> Dict:
        """
        Reload a server (unload then load).

        Args:
            server_name: Name of the server to reload

        Returns:
            Reload status
        """
        # Unload if loaded
        if self.is_server_loaded(server_name):
            unload_result = self.unload_server(server_name)
            if not unload_result.get("success"):
                return unload_result

        # Load
        return self.load_server(server_name)

    def get_loaded_servers(self) -> Dict:
        """
        Get information about all loaded servers.

        Returns:
            Dictionary with loaded server information
        """
        with self.lock:
            servers = []
            for server_name, process in self.server_processes.items():
                tools = self.server_tools.get(server_name, {})
                servers.append({
                    "name": server_name,
                    "status": "running" if process.poll() is None else "terminated",
                    "tools": list(tools.keys()),
                    "tool_count": len(tools)
                })

            return {
                "success": True,
                "servers": servers,
                "count": len(servers)
            }

    def refresh_tools(self, server_name: str) -> Dict:
        """
        Refresh the tool list for a loaded server.

        Args:
            server_name: Name of the server

        Returns:
            Refreshed tool list
        """
        with self.lock:
            if server_name not in self.server_processes:
                return {
                    "success": False,
                    "error": f"Server '{server_name}' not loaded"
                }

            process = self.server_processes[server_name]
            if process.poll() is not None:
                return {
                    "success": False,
                    "error": f"Server '{server_name}' process terminated"
                }

            try:
                tools = self._discover_tools(process)
                self.server_tools[server_name] = tools

                return {
                    "success": True,
                    "server_name": server_name,
                    "tools": list(tools.keys()),
                    "tool_count": len(tools)
                }

            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to refresh tools: {str(e)}"
                }

    def cleanup(self):
        """Cleanup all loaded servers."""
        with self.lock:
            for server_name in list(self.server_processes.keys()):
                try:
                    process = self.server_processes[server_name]
                    process.terminate()
                    process.wait(timeout=5)
                except:
                    pass

            self.server_processes.clear()
            self.server_tools.clear()

    def __del__(self):
        """Cleanup on destruction."""
        self.cleanup()


# Global instance
_loader = None


def get_loader() -> DynamicServerLoader:
    """Get the global dynamic server loader instance."""
    global _loader
    if _loader is None:
        _loader = DynamicServerLoader()
    return _loader
