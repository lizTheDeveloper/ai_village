"""
Core data structures for WSAP.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Location:
    """Agent's position in the world"""
    coordinates: tuple[float, ...]
    region: str | None = None
    description: str = ""

    def to_text(self) -> str:
        parts = []
        if self.region:
            parts.append(f"In {self.region}")
        if self.description:
            parts.append(self.description)
        if not parts:
            parts.append(f"At {self.coordinates}")
        return ". ".join(parts)


@dataclass
class Entity:
    """Something in the world near the agent"""
    type: str
    distance: float
    direction: str
    name: str | None = None
    state: str | None = None
    interactable: bool = True
    description: str | None = None

    def to_text(self) -> str:
        parts = [self.type]
        if self.name:
            parts[0] = f"{self.name} ({self.type})"
        if self.state:
            parts.append(f"[{self.state}]")
        parts.append(f"- {self.direction}, distance {self.distance:.0f}")
        if self.description:
            parts.append(f"({self.description})")
        return " ".join(parts)


@dataclass
class Terrain:
    """Ground/environment in a direction"""
    type: str
    direction: str
    passable: bool = True

    def to_text(self) -> str:
        passable_str = "" if self.passable else " (impassable)"
        return f"{self.type} to the {self.direction}{passable_str}"


@dataclass
class Effect:
    """Active buff, debuff, or condition"""
    name: str
    description: str
    duration: int | None = None  # Steps remaining, None = permanent

    def to_text(self) -> str:
        if self.duration:
            return f"{self.name}: {self.description} ({self.duration} steps)"
        return f"{self.name}: {self.description}"


@dataclass
class Goal:
    """An objective for the agent"""
    id: str
    description: str
    type: str = "main"  # main, side, achievement
    progress: str | None = None
    hints: list[str] = field(default_factory=list)

    def to_text(self) -> str:
        text = f"[{self.type.upper()}] {self.description}"
        if self.progress:
            text += f" ({self.progress})"
        return text


@dataclass
class Event:
    """Something that happened recently"""
    description: str
    type: str = "info"  # info, success, danger, reward

    def to_text(self) -> str:
        prefix = {"danger": "!", "success": "+", "reward": "*"}.get(self.type, "-")
        return f"{prefix} {self.description}"


@dataclass
class Observation:
    """Complete game state for agent decision-making"""

    # Core state
    status: dict[str, Any]
    inventory: dict[str, int]
    location: Location

    # Spatial awareness
    nearby_entities: list[Entity] = field(default_factory=list)
    nearby_terrain: list[Terrain] = field(default_factory=list)

    # Context
    active_effects: list[Effect] = field(default_factory=list)
    current_goals: list[Goal] = field(default_factory=list)
    recent_events: list[Event] = field(default_factory=list)

    # Meta
    step: int = 0
    time_of_day: str | None = None

    def to_text(self) -> str:
        """Convert to natural language for LLM"""
        sections = []

        # Header
        header = f"Step {self.step}"
        if self.time_of_day:
            header += f" ({self.time_of_day})"
        sections.append(header)

        # Status
        if self.status:
            status_items = [f"{k}: {v}" for k, v in self.status.items()]
            sections.append("STATUS:\n" + ", ".join(status_items))

        # Inventory
        inv_items = [f"{k}: {v}" for k, v in self.inventory.items() if v > 0]
        if inv_items:
            sections.append("INVENTORY:\n" + ", ".join(inv_items))
        else:
            sections.append("INVENTORY:\nempty")

        # Location
        sections.append(f"LOCATION:\n{self.location.to_text()}")

        # Nearby
        if self.nearby_entities or self.nearby_terrain:
            nearby_parts = []
            for e in self.nearby_entities:
                nearby_parts.append(f"  - {e.to_text()}")
            for t in self.nearby_terrain:
                nearby_parts.append(f"  - {t.to_text()}")
            sections.append("NEARBY:\n" + "\n".join(nearby_parts))

        # Effects
        if self.active_effects:
            effects = [f"  - {e.to_text()}" for e in self.active_effects]
            sections.append("ACTIVE EFFECTS:\n" + "\n".join(effects))

        # Goals
        if self.current_goals:
            goals = [f"  - {g.to_text()}" for g in self.current_goals]
            sections.append("CURRENT GOALS:\n" + "\n".join(goals))

        # Recent events
        if self.recent_events:
            events = [f"  {e.to_text()}" for e in self.recent_events]
            sections.append("RECENT EVENTS:\n" + "\n".join(events))

        return "\n\n".join(sections)

    def to_dict(self) -> dict:
        """Convert to structured dict"""
        return {
            "step": self.step,
            "time_of_day": self.time_of_day,
            "status": self.status,
            "inventory": self.inventory,
            "location": {
                "coordinates": self.location.coordinates,
                "region": self.location.region,
                "description": self.location.description,
            },
            "nearby_entities": [
                {"type": e.type, "distance": e.distance, "direction": e.direction,
                 "state": e.state, "interactable": e.interactable}
                for e in self.nearby_entities
            ],
            "nearby_terrain": [
                {"type": t.type, "direction": t.direction, "passable": t.passable}
                for t in self.nearby_terrain
            ],
            "active_effects": [
                {"name": e.name, "description": e.description, "duration": e.duration}
                for e in self.active_effects
            ],
            "current_goals": [
                {"id": g.id, "description": g.description, "type": g.type, "progress": g.progress}
                for g in self.current_goals
            ],
            "recent_events": [
                {"description": e.description, "type": e.type}
                for e in self.recent_events
            ],
        }


@dataclass
class ParamDef:
    """Definition of an action parameter"""
    name: str
    description: str
    type: str = "string"
    required: bool = True
    options: list[str] | None = None  # If enum-like


@dataclass
class ActionDef:
    """Definition of an available action"""
    name: str
    description: str
    parameters: list[ParamDef] = field(default_factory=list)
    preconditions: list[str] = field(default_factory=list)
    category: str = "general"

    def to_text(self) -> str:
        text = f"{self.name}: {self.description}"
        if self.parameters:
            params = ", ".join(p.name for p in self.parameters)
            text += f" (params: {params})"
        if self.preconditions:
            text += f" [requires: {', '.join(self.preconditions)}]"
        return text


@dataclass
class ActionSpace:
    """All available actions"""
    actions: list[ActionDef]

    def to_text(self) -> str:
        by_category: dict[str, list[ActionDef]] = {}
        for a in self.actions:
            by_category.setdefault(a.category, []).append(a)

        sections = []
        for cat, actions in by_category.items():
            lines = [f"[{cat.upper()}]"]
            for a in actions:
                lines.append(f"  - {a.to_text()}")
            sections.append("\n".join(lines))

        return "\n\n".join(sections)

    def action_names(self) -> list[str]:
        return [a.name for a in self.actions]

    def get_action(self, name: str) -> ActionDef | None:
        for a in self.actions:
            if a.name == name:
                return a
        return None


@dataclass
class Action:
    """An action chosen by the agent"""
    name: str
    parameters: dict[str, Any] = field(default_factory=dict)
    reasoning: str | None = None


@dataclass
class ActionResult:
    """Result of executing an action"""
    success: bool
    message: str
    reward: float = 0.0
    achievements: list[str] = field(default_factory=list)
    done: bool = False
    observation: Observation | None = None

    def to_text(self) -> str:
        parts = []
        if self.success:
            parts.append(f"Success: {self.message}")
        else:
            parts.append(f"Failed: {self.message}")
        if self.reward != 0:
            parts.append(f"Reward: {self.reward:+.1f}")
        if self.achievements:
            parts.append(f"Achievements: {', '.join(self.achievements)}")
        if self.done:
            parts.append("Episode ended.")
        return " | ".join(parts)
