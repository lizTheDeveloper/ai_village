"""
WSAP Adapter for OpenStarbound.

This adapter communicates with a Lua mod running inside the game
via HTTP. The Lua mod must be installed and the game server running.

Architecture:
    LLM Agent <-> Python Adapter <-> HTTP <-> Lua Mod <-> Game State
"""

import json
import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

from ..adapter import GameAdapter
from ..core import (
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


# Action definitions for Starbound
STARBOUND_ACTIONS = [
    # Movement
    ActionDef("move_left", "Move left", [], [], "movement"),
    ActionDef("move_right", "Move right", [], [], "movement"),
    ActionDef("jump", "Jump upward", [], [], "movement"),
    ActionDef("drop", "Drop down through platform", [], [], "movement"),
    ActionDef("warp", "Warp to location",
              [ParamDef("destination", "bookmarked location or coordinates")],
              ["Must have valid destination"], "movement"),
    ActionDef("beam_up", "Beam up to ship", [], ["On planet surface"], "movement"),
    ActionDef("beam_down", "Beam down to planet", [], ["In ship, planet selected"], "movement"),

    # Interaction
    ActionDef("interact", "Interact with nearby object/NPC", [], [], "interact"),
    ActionDef("use_tool", "Use currently equipped tool", [], ["Tool equipped"], "interact"),
    ActionDef("attack", "Attack with current weapon", [], ["Weapon equipped"], "combat"),
    ActionDef("alt_attack", "Alternate attack", [], ["Weapon with alt-fire"], "combat"),

    # Inventory
    ActionDef("equip", "Equip item from inventory",
              [ParamDef("slot", "inventory slot number")],
              [], "inventory"),
    ActionDef("unequip", "Unequip current item",
              [ParamDef("slot", "equipment slot: head/chest/legs/back")],
              [], "inventory"),
    ActionDef("consume", "Consume food/potion",
              [ParamDef("item", "item name or slot")],
              ["Consumable in inventory"], "inventory"),
    ActionDef("drop_item", "Drop item on ground",
              [ParamDef("slot", "inventory slot")],
              [], "inventory"),

    # Crafting
    ActionDef("craft", "Craft an item",
              [ParamDef("item", "item to craft")],
              ["Near crafting station", "Have materials"], "crafting"),
    ActionDef("open_crafting", "Open crafting interface", [], ["Near crafting station"], "crafting"),

    # Social
    ActionDef("say", "Say something in chat",
              [ParamDef("message", "text to say")],
              [], "social"),
    ActionDef("emote", "Perform emote",
              [ParamDef("emote", "emote name")],
              [], "social"),

    # Quest/Progress
    ActionDef("check_quest", "Check current quest objectives", [], [], "quest"),
    ActionDef("track_quest", "Track a specific quest",
              [ParamDef("quest_id", "quest to track")],
              [], "quest"),

    # Tech
    ActionDef("use_tech", "Activate equipped tech",
              [ParamDef("slot", "tech slot: head/body/legs")],
              ["Tech equipped"], "tech"),

    # Meta
    ActionDef("wait", "Wait/do nothing", [], [], "wait"),
    ActionDef("look", "Look around, update observations", [], [], "observe"),
]


class StarboundAdapter(GameAdapter):
    """
    WSAP adapter for OpenStarbound.

    Requires the wsap_bridge Lua mod to be running in-game.
    The mod exposes an HTTP API for receiving commands and
    returning game state.
    """

    def __init__(
        self,
        bridge_url: str = "http://localhost:9999",
        timeout: int = 10,
        player_id: str | None = None,
    ):
        """
        Initialize Starbound adapter.

        Args:
            bridge_url: URL where the Lua bridge mod is listening
            timeout: HTTP request timeout
            player_id: Specific player to control (for multiplayer)
        """
        self.bridge_url = bridge_url.rstrip("/")
        self.timeout = timeout
        self.player_id = player_id

        self._step = 0
        self._connected = False
        self._last_observation: Observation | None = None
        self._recent_events: list[Event] = []

    @property
    def name(self) -> str:
        return "OpenStarbound"

    @property
    def game_description(self) -> str:
        return """OpenStarbound is a 2D space exploration and survival game.

SETTING:
You are a space traveler with your own ship. You can beam down to procedurally
generated planets, explore caves, fight monsters, gather resources, and craft
items. Progress through missions to upgrade your ship and unlock new tech.

SURVIVAL:
- Health: Depletes from damage, environmental hazards. Heals over time or with food.
- Energy: Used for special abilities and tech. Regenerates over time.
- Hunger: Some modes require food consumption.
- Environment: Some planets have hazards (radiation, cold, heat, no air).

CORE LOOP:
1. Beam down to a planet
2. Explore surface and caves
3. Gather resources (ores, plants, monster drops)
4. Return to ship, craft better gear
5. Take on missions for story progression
6. Upgrade ship to travel further

CRAFTING:
- Basic crafting at Inventor's Table
- Smelting ores at Furnace
- Cooking at campfire/kitchen
- Advanced crafting unlocks via progression

COMBAT:
- Melee and ranged weapons
- Shields for blocking
- Techs for special abilities (dash, double-jump, etc.)
- Monster variety per planet type

EXPLORATION:
- Each planet has unique biome, gravity, weather
- Underground caves with ore veins
- Dungeons and villages with NPCs
- Artifact gates for fast travel between systems"""

    @property
    def action_space(self) -> ActionSpace:
        return ActionSpace(actions=STARBOUND_ACTIONS)

    def _request(self, endpoint: str, data: dict | None = None) -> dict:
        """Make HTTP request to bridge mod."""
        url = f"{self.bridge_url}/{endpoint}"
        try:
            if data:
                resp = requests.post(url, json=data, timeout=self.timeout)
            else:
                resp = requests.get(url, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.ConnectionError:
            raise ConnectionError(
                f"Cannot connect to Starbound bridge at {self.bridge_url}. "
                "Make sure the game is running with the wsap_bridge mod."
            )
        except Exception as e:
            raise RuntimeError(f"Bridge request failed: {e}")

    def _check_connection(self) -> bool:
        """Check if bridge is responding."""
        try:
            result = self._request("status")
            if "connected" not in result:
                raise KeyError("Bridge status response missing 'connected' field")
            self._connected = result["connected"]
            return self._connected
        except (ConnectionError, RuntimeError) as e:
            logger.error(f"Connection check failed: {e}")
            self._connected = False
            raise

    def observe(self) -> Observation:
        """Get current game state from bridge."""
        # No fallback - if bridge is unavailable, crash
        data = self._request("observe", {"player_id": self.player_id})

        # Require critical fields - don't silently default
        required_fields = ["health", "max_health", "energy", "max_energy", "position"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            raise KeyError(f"Bridge observe response missing required fields: {missing}")

        # Parse response into Observation
        obs = Observation(
            status={
                "health": data["health"],
                "max_health": data["max_health"],
                "energy": data["energy"],
                "max_energy": data["max_energy"],
            },
            inventory=data.get("inventory", {}),
            location=Location(
                coordinates=tuple(data["position"]),
                region=data.get("world_name", "unknown"),
                description=data.get("location_description", ""),
            ),
            nearby_entities=[
                Entity(
                    type=e["type"],
                    distance=e["distance"],
                    direction=e.get("direction", "nearby"),
                    name=e.get("name"),
                    state=e.get("state"),
                    interactable=e.get("interactable", False),
                )
                for e in data.get("nearby_entities", [])
            ],
            nearby_terrain=[
                Terrain(
                    type=t["type"],
                    direction=t.get("direction", "here"),
                    passable=t.get("passable", True),
                )
                for t in data.get("nearby_terrain", [])
            ],
            active_effects=[
                Effect(
                    name=e["name"],
                    description=e.get("description", ""),
                    duration=e.get("duration"),
                )
                for e in data.get("effects", [])
            ],
            current_goals=[
                Goal(
                    id=g["id"],
                    description=g["description"],
                    type=g.get("type", "quest"),
                    progress=g.get("progress"),
                )
                for g in data.get("quests", [])
            ],
            recent_events=self._recent_events[-5:],
            step=self._step,
            time_of_day=data.get("time_of_day"),
        )

        self._last_observation = obs
        return obs

    def act(self, action: Action) -> ActionResult:
        """Execute action via bridge."""
        self._step += 1
        self._recent_events = []

        # Validate action
        valid_names = [a.name for a in STARBOUND_ACTIONS]
        if action.name not in valid_names:
            return ActionResult(
                success=False,
                message=f"Unknown action: {action.name}",
                observation=self.observe(),
            )

        # No fallback - if bridge fails, crash
        result = self._request("act", {
            "action": action.name,
            "parameters": action.parameters,
            "player_id": self.player_id,
        })

        # Require success field - don't assume failure
        if "success" not in result:
            raise KeyError("Bridge act response missing 'success' field")

        # Parse result - require critical fields
        success = result["success"]
        message = result.get("message", action.name)
        reward = result.get("reward", 0.0)
        achievements = result.get("achievements", [])
        done = result.get("done", False)

        # Track events
        for event in result.get("events", []):
            self._recent_events.append(Event(
                description=event.get("description", ""),
                type=event.get("type", "info"),
            ))

        return ActionResult(
            success=success,
            message=message,
            reward=reward,
            achievements=achievements,
            done=done,
            observation=self.observe(),
        )

    def reset(self) -> Observation:
        """Reset/respawn player."""
        self._step = 0
        self._recent_events = []

        # No fallback - if bridge fails, crash
        self._request("reset", {"player_id": self.player_id})

        return self.observe()

    def close(self) -> None:
        """Cleanup."""
        self._connected = False

    # Additional Starbound-specific methods

    def get_inventory_details(self) -> dict:
        """Get detailed inventory information."""
        # No fallback - if bridge fails, crash
        return self._request("inventory", {"player_id": self.player_id})

    def get_quests(self) -> list[dict]:
        """Get all active quests with details."""
        # No fallback - if bridge fails, crash
        result = self._request("quests", {"player_id": self.player_id})
        if "quests" not in result:
            raise KeyError("Bridge quests response missing 'quests' field")
        return result["quests"]

    def get_world_info(self) -> dict:
        """Get information about current world."""
        # No fallback - if bridge fails, crash
        return self._request("world", {"player_id": self.player_id})


class MockStarboundAdapter(StarboundAdapter):
    """
    Mock adapter for testing without running the actual game.
    Simulates basic game state and responses.
    """

    def __init__(self, **kwargs):
        # Don't call parent __init__ to avoid connection attempts
        self.bridge_url = "mock://localhost"
        self.timeout = 1
        self.player_id = "mock_player"
        self._step = 0
        self._connected = True
        self._recent_events = []

        # Mock state
        self._health = 100
        self._energy = 100
        self._position = [0, 0]
        self._inventory = {"matter_manipulator": 1}
        self._world = "garden_planet"

    def _request(self, endpoint: str, data: dict | None = None) -> dict:
        """Mock request handler."""
        if endpoint == "status":
            return {"connected": True}
        elif endpoint == "observe":
            return {
                "health": self._health,
                "max_health": 100,
                "energy": self._energy,
                "max_energy": 100,
                "position": self._position,
                "world_name": self._world,
                "location_description": f"On {self._world} surface",
                "inventory": self._inventory,
                "nearby_entities": [
                    {"type": "bird", "distance": 5, "direction": "right", "interactable": False},
                ],
                "nearby_terrain": [
                    {"type": "grass", "direction": "below", "passable": True},
                    {"type": "tree", "direction": "right", "passable": False},
                ],
                "effects": [],
                "quests": [
                    {"id": "main1", "description": "Find the artifact", "type": "main", "progress": "0/1"},
                ],
                "time_of_day": "day",
            }
        elif endpoint == "act":
            action = data.get("action", "wait")
            # Simulate action effects
            if action == "move_right":
                self._position[0] += 1
                return {"success": True, "message": "Moved right"}
            elif action == "move_left":
                self._position[0] -= 1
                return {"success": True, "message": "Moved left"}
            elif action == "jump":
                return {"success": True, "message": "Jumped"}
            elif action == "interact":
                return {"success": True, "message": "Interacted with tree", "events": [
                    {"description": "Gathered wood", "type": "success"}
                ]}
            else:
                return {"success": True, "message": f"Executed {action}"}
        elif endpoint == "reset":
            self._health = 100
            self._energy = 100
            self._position = [0, 0]
            return {"success": True}
        return {}
