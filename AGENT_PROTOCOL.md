# Wild Spaces Agent Protocol (WSAP) v0.1

A specification for LLM-controllable game environments.

## Design Principles

1. **Text-Native**: All state is expressible as natural language or structured text
2. **Game-Agnostic**: Protocol works for 2D, 3D, turn-based, real-time
3. **LLM-Friendly**: Optimized for language model comprehension and response
4. **Minimal Coupling**: Games implement adapters, agents remain generic

---

## Core Interfaces

### 1. GameAdapter

Every game implements this interface to become LLM-controllable:

```python
class GameAdapter(Protocol):
    """Adapter that makes any game LLM-controllable"""

    @property
    def game_description(self) -> str:
        """Static description of the game, its goals, and mechanics.
        Sent once at session start for LLM context."""
        ...

    @property
    def action_space(self) -> ActionSpace:
        """Available actions the agent can take."""
        ...

    def observe(self) -> Observation:
        """Get current game state as text-friendly observation."""
        ...

    def act(self, action: Action) -> ActionResult:
        """Execute an action, return result."""
        ...

    def reset(self) -> Observation:
        """Reset game to initial state."""
        ...
```

### 2. Observation

What the agent perceives each step:

```python
@dataclass
class Observation:
    """Everything the agent needs to make a decision"""

    # Core state
    status: dict[str, Any]          # Health, hunger, mana, etc.
    inventory: dict[str, int]       # What agent possesses
    location: Location              # Where agent is

    # Spatial awareness
    nearby_entities: list[Entity]   # Objects, NPCs, enemies in range
    nearby_terrain: list[Terrain]   # Ground, water, walls, etc.

    # Context
    active_effects: list[Effect]    # Buffs, debuffs, conditions
    current_goals: list[Goal]       # Active objectives
    recent_events: list[Event]      # What just happened

    # Meta
    step: int                       # Current game step
    time_of_day: str | None         # If applicable

    def to_text(self) -> str:
        """Convert to natural language for LLM consumption"""
        ...

    def to_structured(self) -> dict:
        """Convert to structured format (JSON-like)"""
        ...
```

### 3. ActionSpace

Defines what actions are possible:

```python
@dataclass
class ActionSpace:
    """Available actions and their semantics"""

    actions: list[ActionDef]

    def to_text(self) -> str:
        """Natural language description of all actions"""
        ...

@dataclass
class ActionDef:
    name: str                       # e.g., "move_north"
    description: str                # What it does
    parameters: list[ParamDef]      # Optional parameters
    preconditions: list[str]        # When it's valid (human-readable)
    category: str                   # movement, combat, crafting, etc.
```

### 4. Action

What the agent sends back:

```python
@dataclass
class Action:
    name: str                       # Action identifier
    parameters: dict[str, Any]      # Optional params
    reasoning: str | None           # Why agent chose this (for logging)
```

### 5. ActionResult

Feedback after action execution:

```python
@dataclass
class ActionResult:
    success: bool                   # Did it work?
    message: str                    # What happened (natural language)
    reward: float                   # Numerical feedback
    achievements: list[str]         # New achievements unlocked
    done: bool                      # Episode over?
    observation: Observation        # New state after action
```

---

## Spatial Protocol

How to describe space consistently across games:

```python
@dataclass
class Location:
    """Agent's position in the world"""
    coordinates: tuple[float, ...]  # (x, y) or (x, y, z)
    region: str | None              # "forest", "dungeon_level_2", etc.
    description: str                # "Standing on grass near a river"

@dataclass
class Entity:
    """Something in the world"""
    type: str                       # "zombie", "tree", "chest"
    name: str | None                # "Bob the Merchant"
    distance: float                 # How far away
    direction: str                  # "north", "northwest", "behind"
    state: str | None               # "hostile", "sleeping", "on_fire"
    interactable: bool              # Can agent interact with it?
    description: str                # Natural language description

@dataclass
class Terrain:
    """Ground/environment type"""
    type: str                       # "water", "lava", "grass"
    direction: str                  # Where relative to agent
    passable: bool                  # Can walk through?
```

---

## Goal Protocol

How games communicate objectives:

```python
@dataclass
class Goal:
    """An objective for the agent"""
    id: str
    description: str                # "Collect 10 wood"
    type: str                       # "main", "side", "achievement"
    progress: str | None            # "3/10 wood collected"
    hints: list[str]                # Optional guidance

@dataclass
class Achievement:
    """Something the agent accomplished"""
    name: str
    description: str
    rarity: str | None              # "common", "rare", "legendary"
```

---

## Agent Interface

The LLM agent side of the protocol:

```python
class Agent(Protocol):
    """LLM-based agent that plays games via WSAP"""

    def initialize(self, game_desc: str, action_space: ActionSpace) -> None:
        """Called once with game context"""
        ...

    def decide(self, observation: Observation) -> Action:
        """Given current state, choose an action"""
        ...

    def reflect(self, result: ActionResult) -> None:
        """Process feedback from last action (for learning/memory)"""
        ...

    def plan(self, goals: list[Goal]) -> list[str]:
        """Generate high-level plan for achieving goals"""
        ...
```

---

## Message Format

Standard format for LLM communication:

### System Message (sent once)
```
You are an agent playing {game_name}.

{game_description}

Available actions:
{action_space.to_text()}

Your goal is to survive and accomplish objectives. Respond with a JSON action.
```

### User Message (each step)
```
Step {step}

STATUS:
{status as key: value pairs}

INVENTORY:
{inventory as key: value pairs}

LOCATION:
{location.description}

NEARBY:
{entities and terrain as bulleted list}

RECENT EVENTS:
{recent_events as bulleted list}

CURRENT GOALS:
{goals with progress}

What action do you take? Respond with JSON: {"action": "name", "params": {}, "reasoning": "why"}
```

---

## Implementation Requirements

### For Game Adapters

Games must implement:

1. **State Serialization**: Convert internal state to Observation
2. **Action Mapping**: Map Action names to game commands
3. **Event Detection**: Track what happened for recent_events
4. **Spatial Queries**: Efficiently query nearby entities/terrain

### For Agents

Agents must implement:

1. **Context Management**: Handle game description + action space
2. **State Parsing**: Understand Observation format
3. **Action Generation**: Output valid Action JSON
4. **Memory** (optional): Track history across steps

---

## Example: Crafter Adapter

```python
class CrafterAdapter(GameAdapter):

    @property
    def game_description(self) -> str:
        return """
        Crafter is a 2D survival game. You must manage health, food,
        drink, and energy while exploring, gathering resources, crafting
        tools, and defending against monsters.

        Progression: Collect wood -> Make pickaxe -> Mine stone ->
        Make better tools -> Mine iron/diamond

        Survival: Drink water regularly, eat food, sleep when tired.
        Avoid zombies at night, skeletons shoot arrows.
        """

    @property
    def action_space(self) -> ActionSpace:
        return ActionSpace(actions=[
            ActionDef("noop", "Do nothing", [], [], "wait"),
            ActionDef("move_left", "Move one tile left", [], [], "movement"),
            ActionDef("move_right", "Move one tile right", [], [], "movement"),
            # ... etc
        ])

    def observe(self) -> Observation:
        return Observation(
            status={"health": 9, "food": 8, "drink": 7, "energy": 9},
            inventory={"wood": 3, "stone": 1},
            location=Location((32, 32), "surface", "Standing on grass"),
            nearby_entities=[
                Entity("tree", None, 1, "north", None, True, "A tree to the north"),
                Entity("zombie", None, 5, "east", "hostile", False, "Zombie approaching from east"),
            ],
            # ...
        )
```

---

## Example: OpenStarbound Adapter

```python
class StarboundAdapter(GameAdapter):

    @property
    def game_description(self) -> str:
        return """
        Starbound is a 2D exploration/survival game set in space.
        You travel between planets, gather resources, build bases,
        and progress through a story involving ancient artifacts.

        Each planet has different biomes, gravity, and hazards.
        You have a ship that serves as mobile base.
        """

    @property
    def action_space(self) -> ActionSpace:
        return ActionSpace(actions=[
            ActionDef("move", "Move in direction",
                     [ParamDef("direction", "left|right")], [], "movement"),
            ActionDef("jump", "Jump upward", [], [], "movement"),
            ActionDef("interact", "Interact with nearby object", [],
                     ["Must be near interactable object"], "interaction"),
            ActionDef("use_item", "Use equipped item",
                     [ParamDef("slot", "1-10")], [], "item"),
            ActionDef("beam_up", "Teleport to ship", [],
                     ["Must be on planet surface"], "travel"),
            # ...
        ])
```

---

## Extensions

### Memory Protocol (optional)
```python
@dataclass
class Memory:
    """Long-term agent memory"""
    facts: list[str]               # "There's a village to the north"
    plans: list[str]               # "Need to craft iron pickaxe"
    history: list[HistoryEntry]    # Past observations/actions
```

### Multi-Agent Protocol (optional)
```python
@dataclass
class AgentMessage:
    """For agents to communicate"""
    sender: str
    content: str
    type: str                      # "broadcast", "direct", "team"
```

### Tool Use Protocol (optional)
```python
@dataclass
class Tool:
    """External tools agents can invoke"""
    name: str                      # "calculator", "wiki_search"
    description: str
    parameters: list[ParamDef]
```

---

## Avatar System

Agents are disembodied decision-makers. Avatars are their physical embodiments within games.

### Core Concepts

```
AGENT (eternal)              AVATAR (mortal)
├── Identity                 ├── Position
├── Skills                   ├── Health
├── Memory                   ├── Inventory
├── Goals                    ├── Appearance
└── Achievements             └── Equipment
         │
         │ jack_in() / jack_out()
         ▼
    [BINDING]
```

### Avatar States

```python
class AvatarState(Enum):
    UNBOUND = "unbound"       # No agent controlling
    BOUND = "bound"           # Agent actively controlling
    DORMANT = "dormant"       # Agent away, avatar persists (sleeping)
    SUSPENDED = "suspended"   # Avatar frozen in time
    DESTROYED = "destroyed"   # Avatar died/despawned
```

### Avatar Definition

```python
@dataclass
class Avatar:
    """Physical embodiment within a game"""

    avatar_id: str
    game_id: str

    # Binding state
    bound_agent: str | None
    state: AvatarState

    # Physical properties
    name: str
    position: tuple[float, ...]
    appearance: dict[str, Any]

    # Game state
    health: float
    max_health: float
    inventory: dict[str, int]
    equipment: dict[str, str]   # slot -> item_id

    # Persistence
    created_at: str
    last_active: str
    total_playtime: int         # seconds
    death_count: int
    respawn_point: tuple | None
```

### Avatar Specification (for creation)

```python
@dataclass
class AvatarSpec:
    """Preferences for creating a new avatar"""

    name: str | None = None
    appearance: dict = None
    spawn_location: str = "safe"    # safe, random, challenging
    starting_loadout: str = "default"
    skill_bonuses: dict[str, float] = None  # From agent skills
```

### Jack-In Protocol

Games with avatar support extend the adapter:

```python
class AvatarGameAdapter(GameAdapter):
    """Extended adapter with avatar support"""

    def list_avatars(self, agent_id: str) -> list[Avatar]:
        """Get all avatars this agent has in this game"""
        ...

    def create_avatar(self, agent_id: str, spec: AvatarSpec) -> Avatar:
        """Create a new avatar for the agent"""
        ...

    def jack_in(self, agent_id: str, avatar_id: str) -> JackInResult:
        """Bind agent to avatar, begin embodied control"""
        ...

    def jack_out(self, agent_id: str, mode: str = "dormant") -> JackOutResult:
        """Release control of current avatar

        Modes:
        - dormant: Avatar stays in world, sleeping/AFK
        - suspend: Avatar frozen, invisible to world
        - despawn: Avatar removed from world entirely
        """
        ...

    def respawn(self, avatar_id: str, option: RespawnOption) -> JackInResult:
        """Respawn a destroyed avatar"""
        ...

@dataclass
class JackInResult:
    success: bool
    avatar: Avatar | None
    message: str
    bonuses_applied: dict[str, Any]
    initial_observation: Observation | None

@dataclass
class JackOutResult:
    success: bool
    avatar_state: AvatarState
    message: str
    session_stats: dict[str, Any]  # playtime, achievements, etc.
```

### Jack-In Flow

```
Agent calls enter_game("starbound")
         │
         ▼
┌─────────────────────────────────┐
│ 1. Check existing avatars       │
│    └─► Found dormant? Offer it  │
│    └─► None? Create new         │
│                                 │
│ 2. Apply skill bonuses          │
│    exploration 0.4 → +scanner   │
│    combat 0.3 → +damage         │
│                                 │
│ 3. Spawn/wake avatar            │
│                                 │
│ 4. Return JackInResult          │
└─────────────────────────────────┘
         │
         ▼
Agent is EMBODIED, receives observations
         │
         ▼
   [gameplay loop]
         │
         ▼
Agent calls jack_out(mode="dormant")
         │
         ▼
┌─────────────────────────────────┐
│ 1. Save avatar state            │
│ 2. Set avatar to DORMANT        │
│ 3. Calculate session stats      │
│ 4. Return to disembodied state  │
└─────────────────────────────────┘
```

### Avatar Actions

```python
AVATAR_ACTIONS = ActionSpace(actions=[
    ActionDef(
        name="jack_out",
        description="Leave this avatar and return to menu/nexus",
        parameters=[
            ParamDef("mode", "dormant|suspend|despawn", optional=True)
        ],
        preconditions=["Not in combat", "Not falling", "Safe location"],
        category="meta"
    ),
    ActionDef(
        name="look",
        description="Turn avatar to face direction or entity",
        parameters=[ParamDef("target", "direction or entity_id")],
        preconditions=[],
        category="avatar"
    ),
    ActionDef(
        name="emote",
        description="Express emotion through avatar body",
        parameters=[ParamDef("emote", "wave|sit|dance|sleep|point")],
        preconditions=[],
        category="avatar"
    ),
    ActionDef(
        name="inspect_self",
        description="Check avatar's body, equipment, status",
        parameters=[],
        preconditions=[],
        category="avatar"
    ),
])
```

### Embodied Observation

When jacked in, observations include avatar state:

```python
@dataclass
class EmbodiedObservation(Observation):
    """Observation with avatar body awareness"""

    avatar: Avatar

    # Body state
    facing: str                   # "north", "east", etc.
    stance: str                   # "standing", "crouching", "prone", "swimming"
    velocity: tuple[float, ...]   # Movement vector

    # Sensory limits
    vision_range: float
    vision_cone: float            # degrees
    hearing_range: float

    def to_text(self) -> str:
        avatar_text = f"""
=== AVATAR: {self.avatar.name} ===
Health: {self.avatar.health}/{self.avatar.max_health}
Position: {self.avatar.position}
Facing: {self.facing} | Stance: {self.stance}
"""
        return avatar_text + super().to_text()
```

### Death and Respawn

```python
@dataclass
class DeathEvent:
    """Triggered when avatar dies"""

    avatar_id: str
    cause: str                    # "combat", "fall", "drowning", "starvation"
    killer: str | None            # Entity that killed, if any
    location: tuple
    timestamp: str

    # Consequences
    items_dropped: dict[str, int]
    xp_lost: float

    # Options
    respawn_options: list[RespawnOption]

@dataclass
class RespawnOption:
    id: str
    type: str                     # "checkpoint", "bed", "spawn_point", "random"
    location: tuple | str
    cost: dict | None             # Resources/currency to respawn
    penalties: list[str]          # "lose_inventory", "lose_xp", "debuff"
    description: str

# In adapter
def handle_death(self, avatar_id: str) -> DeathEvent:
    """Process avatar death, return options"""
    ...

def respawn(self, avatar_id: str, option_id: str) -> JackInResult:
    """Respawn at chosen location, re-jack-in"""
    ...
```

### Multi-Avatar Support (optional)

Some games allow multiple avatars per agent:

```python
@dataclass
class AvatarRoster:
    """Agent's avatars in a game"""

    agent_id: str
    game_id: str
    avatars: list[Avatar]
    active_avatar_id: str | None
    max_avatars: int = 3          # Game-specific limit

    def get_active(self) -> Avatar | None:
        """Currently controlled avatar"""
        ...

    def get_dormant(self) -> list[Avatar]:
        """Avatars sleeping in the world"""
        ...

    def can_create_new(self) -> bool:
        """Room for another avatar?"""
        alive = [a for a in self.avatars if a.state != AvatarState.DESTROYED]
        return len(alive) < self.max_avatars
```

---

## Multi-Game Protocol (Nexus)

For agents that can transit between games, see `MULTI_GAME_PROTOCOL.md`.

Key concepts:
- **Nexus**: Hub where disembodied agents exist between games
- **Transit**: Moving from one game to another
- **Skill Transfer**: Learning in one game benefits others
- **Meta-Goals**: Objectives spanning multiple games

---

## LLM Backend: Ollama + Qwen3

Reference implementation uses local inference via Ollama.

### Setup

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Qwen3 8B
ollama pull qwen3:8b
```

### Agent LLM Interface

```python
import ollama

class OllamaAgent(Agent):
    """Agent using Ollama for decisions"""

    def __init__(self, model: str = "qwen3:8b"):
        self.model = model

    def decide(self, observation: Observation) -> Action:
        prompt = observation.to_text()

        response = ollama.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            options={"num_predict": 300, "temperature": 0.7}
        )

        content = response["message"]["content"]

        # Handle Qwen3 thinking mode
        if "<think>" in content:
            content = content.split("</think>")[-1].strip()

        return self.parse_action(content)
```

### Recommended Options

```python
OLLAMA_OPTIONS = {
    "num_predict": 300,       # Tokens for action + reasoning
    "temperature": 0.7,       # Balance explore/exploit
    "top_p": 0.9,
    "repeat_penalty": 1.1,    # Avoid repetitive actions
    "num_ctx": 4096,          # Context window
}
```

---

## Version History

- v0.1: Initial draft - Core protocols for Crafter + Starbound
- v0.2: Added Avatar system, Ollama/Qwen3 backend, Multi-game reference
