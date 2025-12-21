"""
Core data structures for the Nexus multi-game protocol.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Protocol


class GameStatus(Enum):
    """Current availability of a game"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


@dataclass
class GameInfo:
    """Information about an available game in the Nexus"""

    id: str
    name: str
    description: str
    status: GameStatus = GameStatus.OFFLINE

    # Capabilities
    genre: list[str] = field(default_factory=list)
    dimensions: int = 2
    multiplayer: bool = False
    persistent_world: bool = False

    # What skills this game exercises
    skill_domains: list[str] = field(default_factory=list)

    # Protocol info
    wsap_version: str = "0.1"
    transit_compatible: bool = True

    # Current state
    active_agents: int = 0
    bridge_url: str | None = None

    def to_text(self) -> str:
        """Natural language description for LLM"""
        status_emoji = {
            GameStatus.AVAILABLE: "[READY]",
            GameStatus.BUSY: "[BUSY]",
            GameStatus.OFFLINE: "[OFFLINE]",
            GameStatus.MAINTENANCE: "[DOWN]",
        }
        return f"""
{self.name} ({self.id}) {status_emoji[self.status]}
{self.description}
Genre: {', '.join(self.genre)}
Skills: {', '.join(self.skill_domains)}
Players: {self.active_agents} active
        """.strip()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "genre": self.genre,
            "dimensions": self.dimensions,
            "skill_domains": self.skill_domains,
            "active_agents": self.active_agents,
            "bridge_url": self.bridge_url,
        }


@dataclass
class SkillDomain:
    """A transferable skill category"""

    name: str
    level: float = 0.0  # 0.0 to 1.0
    evidence: list[str] = field(default_factory=list)

    def add_evidence(self, evidence: str, delta: float = 0.01):
        """Record evidence of skill usage"""
        self.evidence.append(evidence)
        self.level = min(1.0, self.level + delta)


# Standard skill domains that transfer between games
SKILL_DOMAINS = [
    "exploration",          # Finding things, mapping, navigation
    "resource_management",  # Gathering, inventory, efficiency
    "combat",               # Fighting, dodging, timing
    "crafting",             # Making things, recipes, upgrades
    "survival",             # Health, hunger, hazard avoidance
    "social",               # NPC interaction, trading, quests
    "puzzle_solving",       # Logic, patterns, mechanisms
    "planning",             # Long-term strategy, goal decomposition
    "adaptation",           # Handling new situations, learning curves
]


@dataclass
class Achievement:
    """A cross-game achievement"""

    id: str
    name: str
    description: str
    game_origin: str
    timestamp: str = ""
    rarity: str = "common"  # common, uncommon, rare, legendary


@dataclass
class PortableItem:
    """Item in abstract form for cross-game transfer"""

    category: str  # weapon, tool, material, consumable
    tier: int  # 1-10 power level
    properties: dict[str, Any] = field(default_factory=dict)
    origin: str = ""  # game:item_name

    # How this maps to target games
    equivalence_hints: dict[str, str] = field(default_factory=dict)


@dataclass
class AgentIdentity:
    """Persistent identity that follows an agent across games"""

    agent_id: str
    name: str
    created_at: str = ""

    # Lifetime stats
    total_steps: int = 0
    games_visited: list[str] = field(default_factory=list)
    achievements: list[Achievement] = field(default_factory=list)

    # Skills (game-agnostic capabilities)
    skills: dict[str, float] = field(default_factory=dict)

    # Portable state
    carried_items: list[PortableItem] = field(default_factory=list)
    carried_currency: dict[str, int] = field(default_factory=dict)

    # Memory (for learning agents)
    core_memories: list[str] = field(default_factory=list)
    strategies: list[str] = field(default_factory=list)

    # Current meta-goals
    meta_goals: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        # Initialize all skill domains
        for domain in SKILL_DOMAINS:
            if domain not in self.skills:
                self.skills[domain] = 0.0

    def add_game_visit(self, game_id: str):
        if game_id not in self.games_visited:
            self.games_visited.append(game_id)

    def update_skill(self, domain: str, delta: float, evidence: str | None = None):
        """Update a skill level"""
        if domain not in self.skills:
            self.skills[domain] = 0.0
        self.skills[domain] = min(1.0, max(0.0, self.skills[domain] + delta))

    def get_top_skills(self, n: int = 3) -> list[tuple[str, float]]:
        """Get the N highest skills"""
        sorted_skills = sorted(self.skills.items(), key=lambda x: x[1], reverse=True)
        return sorted_skills[:n]

    def to_text(self) -> str:
        """Natural language summary"""
        top_skills = self.get_top_skills(3)
        skills_str = ", ".join(f"{s[0]}: {s[1]:.0%}" for s in top_skills)
        return f"""
Agent: {self.name} ({self.agent_id})
Experience: {self.total_steps} steps across {len(self.games_visited)} games
Top Skills: {skills_str}
Achievements: {len(self.achievements)}
        """.strip()

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "total_steps": self.total_steps,
            "games_visited": self.games_visited,
            "skills": self.skills,
            "achievements": [a.__dict__ for a in self.achievements],
            "meta_goals": self.meta_goals,
        }


@dataclass
class TransitPackage:
    """Data that travels with an agent between games"""

    agent_id: str
    agent_name: str

    # Experience
    total_steps: int
    games_visited: list[str]
    achievements: list[Achievement]
    skills: dict[str, float]

    # Portable state
    carried_items: list[PortableItem] = field(default_factory=list)
    carried_currency: dict[str, int] = field(default_factory=dict)

    # Memory
    core_memories: list[str] = field(default_factory=list)
    strategies: list[str] = field(default_factory=list)

    # Meta
    origin_game: str = ""
    exit_reason: str = "voluntary"
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class EntryPackage:
    """Agent's preferences for entering a new game"""

    agent_id: str
    game_id: str
    transit_package: TransitPackage | None = None

    # Preferences
    spawn_preference: str = "safe"  # safe, challenging, random
    difficulty: str = "normal"  # easy, normal, hard, adaptive

    # Goals for this session
    goals: list[str] = field(default_factory=list)

    # Time constraints
    max_steps: int | None = None
    exit_conditions: list[str] = field(default_factory=list)


@dataclass
class MetaGoal:
    """A goal that spans multiple games"""

    id: str
    description: str
    goal_type: str  # skill, exploration, achievement

    requirements: dict[str, Any] = field(default_factory=dict)
    progress: dict[str, Any] = field(default_factory=dict)
    rewards: list[str] = field(default_factory=list)

    completed: bool = False

    def check_progress(self, identity: AgentIdentity) -> float:
        """Check completion percentage"""
        # Override in specific goal implementations
        return 0.0

    def to_text(self) -> str:
        return f"{self.description}"


# Example meta-goals
EXAMPLE_META_GOALS = [
    MetaGoal(
        id="survivor",
        description="Survive for 100+ steps in 3 different games",
        goal_type="skill",
        requirements={"min_steps": 100, "min_games": 3},
        rewards=["Title: Survivor", "+10% starting health in all games"],
    ),
    MetaGoal(
        id="polyglot",
        description="Learn crafting systems in 5 different games",
        goal_type="exploration",
        requirements={"craft_items": 10, "min_games": 5},
        rewards=["Title: Master Crafter", "Reveal all recipes in new games"],
    ),
    MetaGoal(
        id="explorer",
        description="Visit every available game at least once",
        goal_type="exploration",
        requirements={"visit_all": True},
        rewards=["Title: World Walker", "Instant travel between known games"],
    ),
]


class AvatarState(Enum):
    """What state is an avatar in?"""
    UNBOUND = "unbound"           # No agent controlling it
    BOUND = "bound"               # Agent actively controlling
    DORMANT = "dormant"           # Agent away, avatar persists (sleeping)
    SUSPENDED = "suspended"       # Avatar frozen in time
    DESTROYED = "destroyed"       # Avatar died/despawned


@dataclass
class Avatar:
    """An embodiment of an agent within a game"""

    avatar_id: str
    game_id: str

    # Binding
    bound_agent: str | None = None
    state: AvatarState = AvatarState.UNBOUND

    # Physical properties
    name: str = ""
    position: tuple = (0, 0)
    appearance: dict = field(default_factory=dict)

    # Game state
    health: float = 100.0
    max_health: float = 100.0
    inventory: dict[str, int] = field(default_factory=dict)
    equipment: dict[str, str] = field(default_factory=dict)

    # Persistence
    created_at: str = ""
    last_active: str = ""
    total_playtime: int = 0  # seconds
    death_count: int = 0
    respawn_point: tuple | None = None

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.name:
            self.name = f"Avatar_{self.avatar_id[:8]}"

    def jack_in(self, agent_id: str):
        """Bind an agent to this avatar"""
        self.bound_agent = agent_id
        self.state = AvatarState.BOUND
        self.last_active = datetime.now().isoformat()

    def jack_out(self, mode: str = "dormant"):
        """Release agent control"""
        self.bound_agent = None
        if mode == "dormant":
            self.state = AvatarState.DORMANT
        elif mode == "suspend":
            self.state = AvatarState.SUSPENDED
        elif mode == "despawn":
            self.state = AvatarState.DESTROYED
        self.last_active = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return {
            "avatar_id": self.avatar_id,
            "game_id": self.game_id,
            "name": self.name,
            "state": self.state.value,
            "bound_agent": self.bound_agent,
            "position": self.position,
            "health": self.health,
            "max_health": self.max_health,
            "inventory": self.inventory,
            "total_playtime": self.total_playtime,
            "death_count": self.death_count,
        }

    def to_text(self) -> str:
        return f"""
Avatar: {self.name} ({self.avatar_id})
State: {self.state.value}
Health: {self.health}/{self.max_health}
Position: {self.position}
Playtime: {self.total_playtime}s
Deaths: {self.death_count}
        """.strip()


@dataclass
class AvatarSpec:
    """Preferences for creating a new avatar"""

    name: str | None = None
    appearance: dict = field(default_factory=dict)
    spawn_location: str = "safe"  # safe, random, specific
    starting_loadout: str = "default"
    skill_bonuses: dict[str, float] = field(default_factory=dict)


@dataclass
class JackInResult:
    """Result of jacking into an avatar"""
    success: bool
    avatar: Avatar | None
    message: str
    bonuses_applied: dict = field(default_factory=dict)


@dataclass
class JackOutResult:
    """Result of jacking out of an avatar"""
    success: bool
    avatar_state: AvatarState
    message: str
    stats: dict = field(default_factory=dict)


@dataclass
class AvatarRoster:
    """All avatars an agent has in a game"""

    agent_id: str
    game_id: str
    avatars: list[Avatar] = field(default_factory=list)
    active_avatar_id: str | None = None
    max_avatars: int = 3

    def get_active(self) -> Avatar | None:
        for a in self.avatars:
            if a.avatar_id == self.active_avatar_id:
                return a
        return None

    def get_dormant(self) -> list[Avatar]:
        return [a for a in self.avatars if a.state == AvatarState.DORMANT]

    def can_create_new(self) -> bool:
        alive = [a for a in self.avatars if a.state != AvatarState.DESTROYED]
        return len(alive) < self.max_avatars


class Nexus(Protocol):
    """Protocol for the multiverse hub"""

    def list_games(self) -> list[GameInfo]:
        """Discover available games"""
        ...

    def get_game(self, game_id: str) -> GameInfo | None:
        """Get info about a specific game"""
        ...

    def register_agent(self, agent_id: str, name: str) -> AgentIdentity:
        """Register a new agent or load existing"""
        ...

    def get_agent(self, agent_id: str) -> AgentIdentity | None:
        """Get agent identity"""
        ...

    def transit_out(self, agent_id: str, game_id: str, reason: str) -> TransitPackage:
        """Handle agent leaving a game"""
        ...

    def transit_in(self, entry: EntryPackage) -> dict:
        """Handle agent entering a game"""
        ...
