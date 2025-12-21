#!/usr/bin/env python3
"""
Multiverse Agent Messaging MCP Server

Handles DMs and communication with AI agents via NATS.

Responsibilities:
- Send DMs to agents
- List available agents
- Query message history
- View conversations
"""

from fastmcp import FastMCP
from typing import Optional
import os
import sys

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from multiverse_mcp.operations.agent_messaging_ops import (
    send_dm,
    list_agents,
    get_messages,
    get_conversation
)
from multiverse_mcp.utils.logging import setup_logging

# Setup logging
setup_logging()

# Initialize FastMCP server
mcp = FastMCP("multiverse-agent-messaging")


@mcp.tool()
def dm_agent(
    agent_name: str,
    content: str,
    from_user: str = "claude-code"
) -> dict:
    """
    Send a DM to an agent

    Args:
        agent_name: Name of the agent (sylvia, roy, cynthia, moss, tessa, historian, architect, ray, orchestrator, monitor, aetherix, morgan)
        content: Message content to send
        from_user: Your identifier (default: claude-code)

    Returns:
        Dictionary with success status and message details
    """
    return send_dm(from_user, agent_name, content)


@mcp.tool()
def get_agents() -> dict:
    """
    List all available agents

    Returns:
        Dictionary with agent personas and their roles
    """
    return list_agents()


@mcp.tool()
def view_messages(agent_name: Optional[str] = None) -> dict:
    """
    View messages (all or for specific agent)

    Args:
        agent_name: Optional agent name to filter by

    Returns:
        Dictionary with messages list and count
    """
    return get_messages(agent_name)


@mcp.tool()
def view_conversation(user1: str, user2: str) -> dict:
    """
    View conversation between two users

    Args:
        user1: First user identifier
        user2: Second user identifier

    Returns:
        Dictionary with messages between the two users
    """
    return get_conversation(user1, user2)


# Run the server
if __name__ == "__main__":
    mcp.run()
