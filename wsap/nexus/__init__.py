"""
Nexus - Multi-game coordination for WSAP agents.

The Nexus allows agents to:
- Discover available games
- Transit between games
- Maintain persistent identity
- Transfer skills and achievements
"""

from .core import (
    Nexus,
    GameInfo,
    GameStatus,
    AgentIdentity,
    TransitPackage,
    EntryPackage,
    SkillDomain,
    MetaGoal,
    # Avatar system
    Avatar,
    AvatarState,
    AvatarSpec,
    AvatarRoster,
    JackInResult,
    JackOutResult,
)
from .server import NexusServer
from .client import NexusClient

__all__ = [
    "Nexus",
    "NexusServer",
    "NexusClient",
    "GameInfo",
    "GameStatus",
    "AgentIdentity",
    "TransitPackage",
    "EntryPackage",
    "SkillDomain",
    "MetaGoal",
    # Avatar system
    "Avatar",
    "AvatarState",
    "AvatarSpec",
    "AvatarRoster",
    "JackInResult",
    "JackOutResult",
]
