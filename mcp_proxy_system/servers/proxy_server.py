#!/usr/bin/env python3
"""
MCP Proxy Server for AI Village

Provides dynamic MCP server loading and tool orchestration.
This enables hot-loading of any MCP server (like Playwright) without restarting Claude Code.
"""

from fastmcp import FastMCP
from typing import Any, Dict, List, Optional
import os
import sys
import subprocess
import json
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize FastMCP server
mcp = FastMCP("ai-village-proxy")

# Track loaded servers
_loaded_servers: Dict[str, subprocess.Popen] = {}


@mcp.tool()
def install_and_load_mcp_server(git_url: str, server_name: Optional[str] = None) -> dict:
    """
    Install an MCP server from git and load it dynamically.

    Args:
        git_url: Git repository URL (e.g., "https://github.com/anthropics/mcp-server-playwright")
        server_name: Optional name for the server (defaults to repo name)

    Returns:
        Status of installation and loading

    Example:
        install_and_load_mcp_server("https://github.com/anthropics/mcp-server-playwright")
    """
    try:
        # Extract server name from URL if not provided
        if not server_name:
            server_name = git_url.rstrip('/').split('/')[-1].replace('.git', '')

        # Install directory
        install_dir = os.path.expanduser(f"~/.mcp-servers/{server_name}")

        # Clone or update
        if os.path.exists(install_dir):
            # Update existing
            result = subprocess.run(
                ["git", "-C", install_dir, "pull"],
                capture_output=True, text=True
            )
            logger.info(f"Updated {server_name}: {result.stdout}")
        else:
            # Clone new
            os.makedirs(os.path.dirname(install_dir), exist_ok=True)
            result = subprocess.run(
                ["git", "clone", git_url, install_dir],
                capture_output=True, text=True
            )
            logger.info(f"Cloned {server_name}: {result.stdout}")

        # Install dependencies
        if os.path.exists(os.path.join(install_dir, "package.json")):
            subprocess.run(["npm", "install"], cwd=install_dir, capture_output=True)
        elif os.path.exists(os.path.join(install_dir, "pyproject.toml")):
            subprocess.run(["pip", "install", "-e", install_dir], capture_output=True)

        return {
            "success": True,
            "server_name": server_name,
            "install_dir": install_dir,
            "message": f"Installed {server_name}. Use load_mcp_server('{server_name}') to start it."
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def load_mcp_server(server_name: str, command: Optional[str] = None, args: Optional[List[str]] = None) -> dict:
    """
    Load an MCP server dynamically.

    Args:
        server_name: Name of the server to load
        command: Command to run (defaults to npx or python based on server type)
        args: Additional arguments

    Returns:
        Status of server loading
    """
    try:
        install_dir = os.path.expanduser(f"~/.mcp-servers/{server_name}")

        if not os.path.exists(install_dir):
            return {
                "success": False,
                "error": f"Server {server_name} not installed. Use install_and_load_mcp_server() first."
            }

        # Determine command
        if not command:
            if os.path.exists(os.path.join(install_dir, "package.json")):
                command = "npx"
                args = args or [server_name]
            else:
                command = "python"
                args = args or ["-m", server_name]

        # Start server process
        proc = subprocess.Popen(
            [command] + (args or []),
            cwd=install_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        _loaded_servers[server_name] = proc

        return {
            "success": True,
            "server_name": server_name,
            "pid": proc.pid,
            "message": f"Loaded {server_name} (PID: {proc.pid})"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_loaded_servers() -> dict:
    """
    List all currently loaded MCP servers.

    Returns:
        Dictionary with loaded server information
    """
    servers = []
    for name, proc in _loaded_servers.items():
        poll = proc.poll()
        servers.append({
            "name": name,
            "pid": proc.pid,
            "status": "running" if poll is None else f"stopped (exit code: {poll})"
        })

    return {
        "success": True,
        "servers": servers,
        "count": len(servers)
    }


@mcp.tool()
def run_shell_command(command: str, cwd: Optional[str] = None, timeout: int = 30) -> dict:
    """
    Run a shell command and return output.
    Useful for checking browser console logs, running tests, etc.

    Args:
        command: Shell command to run
        cwd: Working directory (optional)
        timeout: Timeout in seconds (default 30)

    Returns:
        Command output
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"Command timed out after {timeout} seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
