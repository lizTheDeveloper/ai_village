#!/usr/bin/env python3
"""
AI Village Chatroom MCP Server

Provides chatroom functionality for agent coordination via NATS JetStream.

Channels:
- roadmap: Proposal submissions, approvals, archival announcements
- implementation: Implementation progress updates
- testing: Test results and validation status
- coordination: General workflow coordination

Usage:
  python -m mcp_proxy_system.servers.chatroom_server
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, asdict

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from fastmcp import FastMCP
except ImportError:
    print("Error: fastmcp not installed. Run: pip install fastmcp", file=sys.stderr)
    sys.exit(1)

try:
    import nats
    from nats.js.api import StreamConfig, ConsumerConfig, DeliverPolicy, AckPolicy
except ImportError:
    print("Error: nats-py not installed. Run: pip install nats-py", file=sys.stderr)
    sys.exit(1)


# Configuration from environment
NATS_URL = os.getenv("NATS_URL", "nats://34.185.163.86:4222")
NATS_USER = os.getenv("NATS_USER", "orchestrator")
NATS_PASSWORD = os.getenv("NATS_PASSWORD", "f3LJamuke3FMecv0JYNBhf8z")
PROJECT_NAMESPACE = os.getenv("NATS_NAMESPACE", "ai_village")

# Valid channels
VALID_CHANNELS = {"roadmap", "implementation", "testing", "coordination"}

# Valid statuses for messages
VALID_STATUSES = {
    "STARTED", "IN-PROGRESS", "BLOCKED", "QUESTION",
    "HANDOFF", "COMPLETED", "CHECKPOINT"
}


@dataclass
class ChatMessage:
    """A message in a chatroom channel."""
    channel: str
    agent: str
    status: str
    message: str
    timestamp: str
    msg_id: Optional[str] = None


# Global NATS connection (lazy initialized)
_nc = None
_js = None


async def get_nats_connection():
    """Get or create NATS connection."""
    global _nc, _js
    if _nc is None or not _nc.is_connected:
        _nc = await nats.connect(
            servers=[NATS_URL],
            user=NATS_USER,
            password=NATS_PASSWORD,
            name="chatroom-mcp-server"
        )
        _js = _nc.jetstream()
    return _nc, _js


def make_subject(channel: str) -> str:
    """Create namespaced subject for a channel."""
    return f"{PROJECT_NAMESPACE}.chatroom.{channel}"


def make_presence_subject(channel: str, agent: str) -> str:
    """Create namespaced presence subject."""
    return f"{PROJECT_NAMESPACE}.presence.{channel}.{agent}"


# Initialize FastMCP server
mcp = FastMCP("ai-village-chatroom")


@mcp.tool()
async def chatroom_enter(
    channel: str,
    agent: str,
    message: Optional[str] = None
) -> dict:
    """
    Agent enters a chatroom channel.

    MANDATORY: Call this before posting to any channel.

    Args:
        channel: Channel to enter (roadmap, implementation, testing, coordination)
        agent: Your agent identifier (e.g., "architect-1", "feature-implementer-1")
        message: Optional entry message

    Returns:
        Success status with entry confirmation
    """
    if channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel '{channel}'. Valid: {VALID_CHANNELS}")

    try:
        nc, js = await get_nats_connection()

        # Publish presence
        presence_subject = make_presence_subject(channel, agent)
        presence_data = json.dumps({
            "agent": agent,
            "channel": channel,
            "action": "enter",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        await js.publish(presence_subject, presence_data.encode())

        # Optionally post entry message
        if message:
            await chatroom_post(
                channel=channel,
                agent=agent,
                status="STARTED",
                message=message
            )

        return {
            "success": True,
            "channel": channel,
            "agent": agent,
            "action": "entered"
        }

    except Exception as e:
        raise RuntimeError(f"Failed to enter channel: {e}")


@mcp.tool()
async def chatroom_leave(
    channel: str,
    agent: str,
    work_summary: Optional[str] = None
) -> dict:
    """
    Agent leaves a chatroom channel.

    MANDATORY: Call this when done with a channel.

    Args:
        channel: Channel to leave
        agent: Your agent identifier
        work_summary: Summary of work done (recommended)

    Returns:
        Success status with exit confirmation
    """
    if channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel '{channel}'. Valid: {VALID_CHANNELS}")

    try:
        nc, js = await get_nats_connection()

        # Optionally post work summary
        if work_summary:
            await chatroom_post(
                channel=channel,
                agent=agent,
                status="COMPLETED",
                message=f"WORK SUMMARY:\n{work_summary}"
            )

        # Publish presence (leave)
        presence_subject = make_presence_subject(channel, agent)
        presence_data = json.dumps({
            "agent": agent,
            "channel": channel,
            "action": "leave",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        await js.publish(presence_subject, presence_data.encode())

        return {
            "success": True,
            "channel": channel,
            "agent": agent,
            "action": "left"
        }

    except Exception as e:
        raise RuntimeError(f"Failed to leave channel: {e}")


@mcp.tool()
async def chatroom_post(
    channel: str,
    agent: str,
    status: str,
    message: str
) -> dict:
    """
    Post a message to a chatroom channel.

    Args:
        channel: Channel to post to (roadmap, implementation, testing, coordination)
        agent: Your agent identifier
        status: Message status (STARTED, IN-PROGRESS, BLOCKED, QUESTION, HANDOFF, COMPLETED, CHECKPOINT)
        message: Message content (markdown supported)

    Returns:
        Success status with message ID
    """
    if channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel '{channel}'. Valid: {VALID_CHANNELS}")

    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Valid: {VALID_STATUSES}")

    try:
        nc, js = await get_nats_connection()

        subject = make_subject(channel)
        timestamp = datetime.now(timezone.utc).isoformat()

        msg_data = ChatMessage(
            channel=channel,
            agent=agent,
            status=status,
            message=message,
            timestamp=timestamp
        )

        # Publish with deduplication header
        msg_id = f"{agent}-{channel}-{timestamp}"
        ack = await js.publish(
            subject,
            json.dumps(asdict(msg_data)).encode(),
            headers={"Nats-Msg-Id": msg_id}
        )

        return {
            "success": True,
            "channel": channel,
            "agent": agent,
            "status": status,
            "msg_id": msg_id,
            "seq": ack.seq
        }

    except Exception as e:
        raise RuntimeError(f"Failed to post message: {e}")


@mcp.tool()
async def chatroom_read_new(
    channel: str,
    agent: str,
    limit: int = 20
) -> dict:
    """
    Read new messages from a channel since last check.

    Uses a durable consumer to track what you've already read.

    Args:
        channel: Channel to read from
        agent: Your agent identifier (used for durable consumer)
        limit: Maximum messages to return (default: 20)

    Returns:
        List of new messages
    """
    if channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel '{channel}'. Valid: {VALID_CHANNELS}")

    try:
        nc, js = await get_nats_connection()

        subject = make_subject(channel)
        consumer_name = f"{agent}-{channel}".replace("-", "_")

        # Get or create ephemeral push consumer for this agent
        try:
            psub = await js.pull_subscribe(
                subject,
                durable=consumer_name,
                config=ConsumerConfig(
                    durable_name=consumer_name,
                    deliver_policy=DeliverPolicy.NEW,
                    ack_policy=AckPolicy.EXPLICIT,
                )
            )
        except Exception:
            # Consumer might already exist, try to use it
            psub = await js.pull_subscribe(subject, durable=consumer_name)

        # Fetch messages
        messages = []
        try:
            fetched = await psub.fetch(limit, timeout=1)
            for msg in fetched:
                try:
                    data = json.loads(msg.data.decode())
                    data["msg_id"] = msg.headers.get("Nats-Msg-Id") if msg.headers else None
                    messages.append(data)
                    await msg.ack()
                except json.JSONDecodeError:
                    await msg.ack()  # Ack bad messages to skip them
        except asyncio.TimeoutError:
            pass  # No new messages

        return {
            "channel": channel,
            "count": len(messages),
            "messages": messages
        }

    except Exception as e:
        raise RuntimeError(f"Failed to read messages: {e}")


@mcp.tool()
async def chatroom_peek(
    channel: str,
    limit: int = 10
) -> dict:
    """
    Peek at recent messages without marking them as read.

    Useful for seeing what's happening without consuming messages.

    Args:
        channel: Channel to peek at
        limit: Number of recent messages to show (default: 10)

    Returns:
        List of recent messages
    """
    if channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel '{channel}'. Valid: {VALID_CHANNELS}")

    try:
        nc, js = await get_nats_connection()

        # Get stream info to find last sequence
        stream_info = await js.stream_info("AI_VILLAGE_CHATROOM")
        last_seq = stream_info.state.last_seq

        if last_seq == 0:
            return {"channel": channel, "count": 0, "messages": []}

        # Calculate start sequence
        start_seq = max(1, last_seq - limit + 1)

        messages = []
        subject = make_subject(channel)

        for seq in range(start_seq, last_seq + 1):
            try:
                msg = await js.get_msg("AI_VILLAGE_CHATROOM", seq)
                if msg.subject == subject:
                    try:
                        data = json.loads(msg.data.decode())
                        data["seq"] = seq
                        messages.append(data)
                    except json.JSONDecodeError:
                        pass
            except Exception:
                pass

        return {
            "channel": channel,
            "count": len(messages),
            "messages": messages[-limit:]  # Return only last N
        }

    except Exception as e:
        raise RuntimeError(f"Failed to peek messages: {e}")


@mcp.tool()
async def chatroom_who_active(
    channel: str
) -> dict:
    """
    Check which agents are active in a channel.

    Use this before spawning a new agent to prevent duplicates
    (thundering-herd protection).

    Args:
        channel: Channel to check

    Returns:
        List of active agents in the channel
    """
    if channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel '{channel}'. Valid: {VALID_CHANNELS}")

    try:
        nc, js = await get_nats_connection()

        # Get recent presence messages
        stream_info = await js.stream_info("AI_VILLAGE_AGENT_PRESENCE")
        last_seq = stream_info.state.last_seq

        if last_seq == 0:
            return {"channel": channel, "active_agents": [], "count": 0}

        # Scan last 100 presence messages
        start_seq = max(1, last_seq - 100)

        # Track agent states
        agent_states = {}  # agent -> {"action": enter/leave, "timestamp": ...}

        prefix = f"{PROJECT_NAMESPACE}.presence.{channel}."

        for seq in range(start_seq, last_seq + 1):
            try:
                msg = await js.get_msg("AI_VILLAGE_AGENT_PRESENCE", seq)
                if msg.subject.startswith(prefix):
                    agent = msg.subject[len(prefix):]
                    data = json.loads(msg.data.decode())
                    agent_states[agent] = data
            except Exception:
                pass

        # Filter to only entered agents
        active = [
            {"agent": agent, "since": state.get("timestamp")}
            for agent, state in agent_states.items()
            if state.get("action") == "enter"
        ]

        return {
            "channel": channel,
            "active_agents": active,
            "count": len(active)
        }

    except Exception as e:
        raise RuntimeError(f"Failed to check active agents: {e}")


# Cleanup on exit
async def cleanup():
    """Close NATS connection on shutdown."""
    global _nc
    if _nc and _nc.is_connected:
        await _nc.close()


if __name__ == "__main__":
    import atexit

    def sync_cleanup():
        loop = asyncio.new_event_loop()
        loop.run_until_complete(cleanup())
        loop.close()

    atexit.register(sync_cleanup)
    mcp.run()
