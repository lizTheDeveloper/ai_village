"""
Wild Spaces Agent Protocol (WSAP)
A universal interface for LLM-controlled game agents.
"""

from .core import (
    Observation,
    Location,
    Entity,
    Terrain,
    Effect,
    Goal,
    Event,
    ActionSpace,
    ActionDef,
    ParamDef,
    Action,
    ActionResult,
)
from .adapter import GameAdapter
from .agent import Agent, OllamaAgent, MemoryAgent

__version__ = "0.1.0"
__all__ = [
    "Observation",
    "Location",
    "Entity",
    "Terrain",
    "Effect",
    "Goal",
    "Event",
    "ActionSpace",
    "ActionDef",
    "ParamDef",
    "Action",
    "ActionResult",
    "GameAdapter",
    "Agent",
    "OllamaAgent",
    "MemoryAgent",
]
