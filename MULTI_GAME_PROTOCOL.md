# Wild Spaces Multi-Game Protocol (WSAP-MG) v0.1

An extension to WSAP that enables agents to discover, transit between, and maintain continuity across multiple game environments.

## Design Philosophy

**The Multiverse as Training Ground**: Agents should be able to move between games the way humans switch between applications. Skills learned in one game (planning, resource management, spatial reasoning) should transfer. Identity persists; context adapts.

---

## Core Concepts

### 1. The Nexus

The **Nexus** is the meta-layer that manages multiple game instances. It acts as:
- Game registry (discovery)
- Transit authority (movement between games)
- Identity provider (agent persistence)
- State escrow (cross-game data)

```python
class Nexus(Protocol):
    """The multiverse hub - manages all connected games"""

    def list_games(self) -> list[GameInfo]:
        """Discover available games"""
        ...

    def get_game(self, game_id: str) -> GameAdapter:
        """Get adapter for a specific game"""
        ...

    def transit(self, agent_id: str, from_game: str, to_game: str) -> TransitResult:
        """Move agent between games"""
        ...

    def get_agent_state(self, agent_id: str) -> AgentIdentity:
        """Get persistent agent identity/state"""
        ...
```

### 2. Game Discovery

Games register themselves with capabilities and metadata:

```python
@dataclass
class GameInfo:
    """Information about an available game"""

    id: str                         # "crafter", "starbound", "minecraft"
    name: str                       # Human-readable name
    description: str                # What is this game about?
    status: GameStatus              # available, busy, offline

    # Capabilities
    genre: list[str]                # ["survival", "sandbox", "rpg"]
    dimensions: int                 # 2 or 3
    multiplayer: bool               # Supports multiple agents?
    persistent_world: bool          # State persists between sessions?

    # Skill domains this game exercises
    skill_domains: list[str]        # ["resource_management", "combat",
                                    #  "exploration", "crafting", "social"]

    # Compatibility
    wsap_version: str               # Protocol version
    transit_compatible: bool        # Supports enter/exit?

    # Current state
    active_agents: int              # How many agents currently in-game?

    def to_text(self) -> str:
        """Natural language description for LLM"""
        return f"""
        {self.name} ({self.id})
        {self.description}
        Genre: {', '.join(self.genre)}
        Skills: {', '.join(self.skill_domains)}
        Status: {self.status.value}
        """

class GameStatus(Enum):
    AVAILABLE = "available"         # Ready to accept agents
    BUSY = "busy"                   # Running but at capacity
    OFFLINE = "offline"             # Not currently running
    MAINTENANCE = "maintenance"     # Temporarily unavailable
```

---

## Transit Protocol

### The Exit Action

Every transit-compatible game MUST implement an `exit_game` action:

```python
ActionDef(
    name="exit_game",
    description="Leave this game and return to the Nexus",
    parameters=[
        ParamDef("reason", "Why are you leaving?", optional=True),
        ParamDef("destination", "Target game ID (or 'nexus')", optional=True),
    ],
    preconditions=[
        "Agent must be in a safe state (not in combat, not falling, etc.)"
    ],
    category="meta"
)
```

### Transit Flow

```
┌─────────────┐     exit_game     ┌─────────────┐     enter_game    ┌─────────────┐
│   Game A    │ ────────────────► │    Nexus    │ ────────────────► │   Game B    │
│  (Crafter)  │                   │  (Lobby)    │                   │ (Starbound) │
└─────────────┘                   └─────────────┘                   └─────────────┘
      │                                  │                                 │
      │ TransitPackage                   │                                 │
      │ - agent_id                       │ Agent reviews                   │
      │ - carried_state                  │ available games,                │
      │ - achievements                   │ chooses next                    │
      │ - learned_skills                 │                                 │
      └──────────────────────────────────┘                                 │
                                         │                                 │
                                         │ EntryPackage                    │
                                         │ - spawn_preferences             │
                                         │ - difficulty                    │
                                         │ - goals                         │
                                         └─────────────────────────────────┘
```

### TransitPackage

What an agent carries when leaving a game:

```python
@dataclass
class TransitPackage:
    """Data that travels with an agent between games"""

    # Identity (always preserved)
    agent_id: str                   # Unique agent identifier
    agent_name: str                 # Display name

    # Experience (always preserved)
    total_steps: int                # Lifetime steps across all games
    games_visited: list[str]        # History of games played
    achievements: list[Achievement] # Cross-game achievements

    # Learned capabilities (game-agnostic skills)
    skills: dict[str, float]        # "exploration": 0.7, "combat": 0.3

    # Portable state (optional, game-negotiated)
    carried_items: list[PortableItem]   # Abstract items that can transfer
    carried_currency: dict[str, int]    # "gold": 100, "credits": 50

    # Memory (for learning agents)
    core_memories: list[str]        # Key learnings: "fire hurts", "water heals"
    strategies: list[str]           # "gather resources before nightfall"

    # Meta
    origin_game: str                # Where agent is coming from
    exit_reason: str                # Why they left
    timestamp: str                  # When transit occurred
```

### PortableItem

Abstract representation of items that can cross game boundaries:

```python
@dataclass
class PortableItem:
    """Item in abstract form for cross-game transfer"""

    category: str                   # "weapon", "tool", "material", "consumable"
    tier: int                       # 1-10 power level
    properties: dict[str, Any]      # {"damage_type": "fire", "durability": 0.8}
    origin: str                     # "crafter:iron_sword"

    # How this maps to target games
    equivalence_hints: dict[str, str]  # {"starbound": "tier3sword", "minecraft": "iron_sword"}
```

### EntryPackage

What the agent specifies when entering a new game:

```python
@dataclass
class EntryPackage:
    """Agent's preferences for entering a new game"""

    agent_id: str
    transit_package: TransitPackage

    # Preferences
    spawn_preference: str           # "safe", "challenging", "random"
    difficulty: str                 # "easy", "normal", "hard", "adaptive"

    # Goals for this session
    goals: list[str]                # ["learn crafting", "explore", "survive 100 steps"]

    # Time constraints
    max_steps: int | None           # Leave after N steps?
    exit_conditions: list[str]      # ["health < 10%", "goal_complete", "bored"]
```

---

## Nexus Actions

When an agent is in the Nexus (between games), these actions are available:

```python
NEXUS_ACTIONS = ActionSpace(actions=[
    ActionDef(
        name="list_games",
        description="See all available games",
        parameters=[],
        preconditions=[],
        category="discovery"
    ),
    ActionDef(
        name="game_details",
        description="Get detailed info about a specific game",
        parameters=[ParamDef("game_id", "Game identifier")],
        preconditions=[],
        category="discovery"
    ),
    ActionDef(
        name="enter_game",
        description="Enter a game world",
        parameters=[
            ParamDef("game_id", "Which game to enter"),
            ParamDef("spawn_preference", "safe|challenging|random", optional=True),
            ParamDef("difficulty", "easy|normal|hard", optional=True),
            ParamDef("goals", "Comma-separated goals", optional=True),
        ],
        preconditions=["Game must be available"],
        category="transit"
    ),
    ActionDef(
        name="review_self",
        description="Check your stats, skills, and history",
        parameters=[],
        preconditions=[],
        category="meta"
    ),
    ActionDef(
        name="set_goal",
        description="Set a meta-goal across games",
        parameters=[ParamDef("goal", "What you want to achieve")],
        preconditions=[],
        category="meta"
    ),
    ActionDef(
        name="wait",
        description="Wait for a game to become available",
        parameters=[ParamDef("game_id", "Game to wait for")],
        preconditions=[],
        category="meta"
    ),
])
```

---

## Nexus Observation

What the agent sees when in the Nexus:

```python
@dataclass
class NexusObservation:
    """What an agent perceives in the Nexus"""

    # Identity
    agent: AgentIdentity

    # Available worlds
    available_games: list[GameInfo]

    # Recommendations
    suggested_games: list[GameSuggestion]  # Based on agent skills/goals

    # Meta-goals
    active_meta_goals: list[MetaGoal]

    # Recent history
    recent_games: list[GameVisitSummary]

    def to_text(self) -> str:
        return f"""
        === NEXUS ===
        Welcome back, {self.agent.name}.

        YOUR STATS:
        - Total experience: {self.agent.total_steps} steps across {len(self.agent.games_visited)} games
        - Top skills: {self._format_skills()}
        - Achievements: {len(self.agent.achievements)}

        AVAILABLE GAMES:
        {self._format_games()}

        SUGGESTED FOR YOU:
        {self._format_suggestions()}

        RECENT HISTORY:
        {self._format_history()}

        META-GOALS:
        {self._format_meta_goals()}

        What would you like to do?
        Commands: list_games, game_details <id>, enter_game <id>, review_self
        """
```

---

## Skill Transfer

Skills learned in one game can influence starting conditions in another:

```python
@dataclass
class SkillDomain:
    """A transferable skill category"""

    name: str                       # "resource_management"
    level: float                    # 0.0 to 1.0
    evidence: list[str]             # ["collected 1000 wood in crafter"]

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

# How skills map to game benefits
SKILL_BENEFITS = {
    "crafter": {
        "resource_management": "Start with +2 inventory slots",
        "survival": "Start with +1 health",
        "crafting": "Unlock one random recipe",
    },
    "starbound": {
        "exploration": "Start with better scanner",
        "combat": "Start with upgraded weapon",
        "social": "Better NPC prices",
    },
}
```

---

## Meta-Goals

Goals that span multiple games:

```python
@dataclass
class MetaGoal:
    """A goal that spans multiple games"""

    id: str
    description: str                # "Master survival in 3 different games"
    type: str                       # "skill", "exploration", "achievement"

    requirements: list[GoalRequirement]
    progress: dict[str, Any]        # Current progress
    rewards: list[str]              # What you get for completing

    def to_text(self) -> str:
        return f"{self.description} ({self._progress_pct()}% complete)"

# Example meta-goals
EXAMPLE_META_GOALS = [
    MetaGoal(
        id="survivor",
        description="Survive for 100+ steps in 3 different games",
        type="skill",
        requirements=[
            GoalRequirement("survive_100_steps", games=["any"], count=3)
        ],
        rewards=["Title: Survivor", "+10% starting health in all games"]
    ),
    MetaGoal(
        id="polyglot",
        description="Learn crafting systems in 5 different games",
        type="exploration",
        requirements=[
            GoalRequirement("craft_10_items", games=["any"], count=5)
        ],
        rewards=["Title: Master Crafter", "Reveal all recipes in new games"]
    ),
    MetaGoal(
        id="explorer",
        description="Visit every available game at least once",
        type="exploration",
        requirements=[
            GoalRequirement("visit", games=["all"], count=1)
        ],
        rewards=["Title: World Walker", "Instant travel between known games"]
    ),
]
```

---

## Implementation

### NexusServer

The central coordinator:

```python
class NexusServer:
    """Manages the multiverse of games"""

    def __init__(self):
        self.games: dict[str, GameAdapter] = {}
        self.agents: dict[str, AgentIdentity] = {}
        self.active_sessions: dict[str, str] = {}  # agent_id -> game_id

    def register_game(self, game_id: str, adapter: GameAdapter, info: GameInfo):
        """Add a game to the nexus"""
        self.games[game_id] = adapter

    def process_exit(self, agent_id: str, game_id: str) -> TransitPackage:
        """Handle agent leaving a game"""
        adapter = self.games[game_id]

        # Collect final state
        final_obs = adapter.observe()

        # Build transit package
        package = TransitPackage(
            agent_id=agent_id,
            agent_name=self.agents[agent_id].name,
            total_steps=self.agents[agent_id].total_steps,
            games_visited=self.agents[agent_id].games_visited + [game_id],
            achievements=self._collect_achievements(agent_id, game_id),
            skills=self._calculate_skills(agent_id),
            origin_game=game_id,
            exit_reason="voluntary",
            timestamp=datetime.now().isoformat(),
        )

        # Update agent identity
        self.agents[agent_id].update_from_transit(package)

        # Clear session
        del self.active_sessions[agent_id]

        return package

    def process_entry(self, entry: EntryPackage) -> Observation:
        """Handle agent entering a game"""
        game_id = entry.game_id
        adapter = self.games[game_id]

        # Apply skill bonuses
        bonuses = self._calculate_bonuses(entry.transit_package.skills, game_id)

        # Initialize in game
        obs = adapter.reset()
        adapter.apply_bonuses(bonuses)

        # Track session
        self.active_sessions[entry.agent_id] = game_id

        return obs
```

### Multi-Game Agent

An agent that can navigate the multiverse:

```python
class MultiGameAgent(Agent):
    """Agent capable of navigating between games"""

    def __init__(self, llm: LLM, nexus_url: str):
        self.llm = llm
        self.nexus = NexusClient(nexus_url)
        self.identity: AgentIdentity | None = None
        self.current_game: str | None = None
        self.current_adapter: GameAdapter | None = None

    def run(self, max_total_steps: int = 1000):
        """Main loop - navigate between games"""

        # Initialize identity
        self.identity = self.nexus.register_or_load(self.agent_id)

        total_steps = 0
        while total_steps < max_total_steps:
            if self.current_game is None:
                # In Nexus - choose a game
                nexus_obs = self.nexus.observe()
                action = self.decide_nexus(nexus_obs)

                if action.name == "enter_game":
                    self.enter_game(action.parameters["game_id"])

            else:
                # In a game - play
                obs = self.current_adapter.observe()
                action = self.decide(obs)

                if action.name == "exit_game":
                    self.exit_game(action.parameters.get("reason", "done"))
                else:
                    result = self.current_adapter.act(action)
                    total_steps += 1

                    if result.done:
                        self.exit_game("game_over")

    def decide_nexus(self, obs: NexusObservation) -> Action:
        """Decide what to do in the Nexus"""
        prompt = f"""
        You are in the NEXUS - the hub between game worlds.

        {obs.to_text()}

        You can:
        - Enter a game to play and learn
        - Review your progress and skills
        - Set meta-goals that span multiple games

        Based on your skills and goals, what would you like to do?

        Respond with JSON: {{"action": "...", "params": {{...}}, "reasoning": "..."}}
        """

        return self.llm.generate_action(prompt, NEXUS_ACTIONS)

    def should_exit_game(self, obs: Observation) -> bool:
        """Determine if agent should leave current game"""

        # Check exit conditions
        if self.identity.exit_conditions:
            for condition in self.identity.exit_conditions:
                if self.evaluate_condition(condition, obs):
                    return True

        # Check meta-goals
        if self.identity.active_meta_goal:
            if self.goal_requires_different_game():
                return True

        # Check boredom/plateau
        if self.learning_plateaued():
            return True

        return False
```

---

## Wire Protocol

JSON-based communication for distributed setup:

### Register Agent
```json
POST /nexus/agents
{
    "agent_id": "agent_001",
    "name": "Explorer Bot",
    "capabilities": ["vision", "planning", "memory"]
}
```

### List Games
```json
GET /nexus/games

Response:
{
    "games": [
        {
            "id": "crafter",
            "name": "Crafter",
            "status": "available",
            "genre": ["survival", "sandbox"],
            "active_agents": 2
        },
        {
            "id": "starbound",
            "name": "OpenStarbound",
            "status": "available",
            "genre": ["exploration", "survival", "rpg"],
            "active_agents": 0
        }
    ]
}
```

### Enter Game
```json
POST /nexus/transit/enter
{
    "agent_id": "agent_001",
    "game_id": "starbound",
    "preferences": {
        "spawn": "safe",
        "difficulty": "normal",
        "goals": ["explore", "learn crafting"]
    }
}

Response:
{
    "success": true,
    "session_id": "sess_abc123",
    "bridge_url": "http://localhost:9999",
    "initial_observation": {...}
}
```

### Exit Game
```json
POST /nexus/transit/exit
{
    "agent_id": "agent_001",
    "session_id": "sess_abc123",
    "reason": "completed_goal"
}

Response:
{
    "success": true,
    "transit_package": {
        "skills_gained": {"exploration": 0.1, "combat": 0.05},
        "achievements": ["First Steps", "Explorer"],
        "stats": {"steps": 150, "rewards": 45.5}
    },
    "nexus_observation": {...}
}
```

---

## Example Session

```
=== NEXUS ===
Welcome, Explorer Bot.

YOUR STATS:
- Total experience: 500 steps across 2 games
- Top skills: resource_management (0.7), survival (0.5), exploration (0.4)
- Achievements: 5

AVAILABLE GAMES:
1. Crafter [available] - 2D survival, you've played 300 steps
2. OpenStarbound [available] - Space exploration, NEW!
3. Minecraft [offline] - Coming soon

SUGGESTED FOR YOU:
- OpenStarbound: Your exploration skills would help here, and you'd learn space travel

What would you like to do?

> {"action": "enter_game", "params": {"game_id": "starbound"}, "reasoning": "I want to try something new and apply my survival skills in space"}

Entering OpenStarbound...
Applying bonuses: +1 scanner range (from exploration skill)

=== STARBOUND ===
Step 0

STATUS:
Health: 100/100 | Energy: 100/100

LOCATION:
On your ship, orbiting a forest planet. Your ship needs fuel.

INVENTORY:
Broken Broadsword (x1), Flashlight (x1), Bandage (x5)

NEARBY:
- Ship Locker (storage, interactable)
- Teleporter (travel to planet surface)
- Navigation Console (choose destinations)

What action do you take?

> {"action": "interact", "params": {"target": "teleporter"}, "reasoning": "I should explore the planet to find fuel and resources"}

...

[After 200 steps]

> {"action": "exit_game", "params": {"reason": "learned the basics, want to try another game"}}

Exiting OpenStarbound...

Skills gained:
- exploration: +0.15
- crafting: +0.08
- resource_management: +0.05

Achievements unlocked:
- "First Contact" - Met an NPC
- "Home Away From Home" - Built a structure

Returning to Nexus...
```

---

## Avatar System: Jacking In

Agents are disembodied minds. **Avatars** are their bodies in games. The "jack-in" process binds an agent to an avatar.

### Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                        AGENT                                │
│  (Identity, Skills, Memory, Goals)                          │
│  - Exists in the Nexus                                      │
│  - Persists across games                                    │
│  - Can be "embodied" or "disembodied"                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ jack_in()
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       AVATAR                                │
│  (Position, Health, Inventory, Appearance)                  │
│  - Exists within a game                                     │
│  - Has physical properties                                  │
│  - Can persist when agent leaves (optional)                 │
└─────────────────────────────────────────────────────────────┘
```

### Avatar States

```python
class AvatarState(Enum):
    """What state is an avatar in?"""
    UNBOUND = "unbound"           # No agent controlling it
    BOUND = "bound"               # Agent actively controlling
    DORMANT = "dormant"           # Agent away, avatar persists (sleeping/AFK)
    SUSPENDED = "suspended"       # Avatar frozen in time
    DESTROYED = "destroyed"       # Avatar died/despawned
```

### Avatar Definition

```python
@dataclass
class Avatar:
    """An embodiment of an agent within a game"""

    avatar_id: str                # Unique ID within game
    game_id: str                  # Which game this avatar exists in

    # Binding
    bound_agent: str | None       # Agent ID currently controlling
    state: AvatarState

    # Physical properties (game-specific)
    position: tuple[float, ...]   # Where in the world
    appearance: dict[str, Any]    # Visual customization

    # Game state
    health: float
    max_health: float
    inventory: dict[str, int]
    equipment: dict[str, str]     # slot -> item

    # Persistence
    created_at: str
    last_active: str
    total_playtime: int           # seconds

    # Death handling
    death_count: int = 0
    respawn_point: tuple | None = None

@dataclass
class AvatarSpec:
    """Preferences for creating a new avatar"""

    name: str | None = None       # Display name (or generate)
    appearance: dict = None       # Visual preferences
    spawn_location: str = "safe"  # "safe", "random", "specific"
    starting_loadout: str = "default"  # What to spawn with

    # From agent skills - bonuses to apply
    skill_bonuses: dict[str, float] = None
```

### Jack-In Protocol

```python
class GameAdapter(Protocol):
    """Extended adapter with avatar support"""

    # Existing methods...

    # === AVATAR METHODS ===

    def list_avatars(self, agent_id: str) -> list[Avatar]:
        """Get all avatars this agent has in this game"""
        ...

    def create_avatar(self, agent_id: str, spec: AvatarSpec) -> Avatar:
        """Create a new avatar for an agent"""
        ...

    def jack_in(self, agent_id: str, avatar_id: str) -> JackInResult:
        """Bind agent to avatar, begin control"""
        ...

    def jack_out(self, agent_id: str, mode: str = "dormant") -> JackOutResult:
        """Release control of current avatar

        Modes:
        - "dormant": Avatar stays in world, sleeping/AFK
        - "suspend": Avatar frozen, invisible to others
        - "despawn": Avatar removed from world
        """
        ...

    def transfer(self, agent_id: str, target_avatar_id: str) -> TransferResult:
        """Transfer control to a different avatar (rare)"""
        ...

@dataclass
class JackInResult:
    success: bool
    avatar: Avatar | None
    message: str
    initial_observation: Observation | None

@dataclass
class JackOutResult:
    success: bool
    avatar_state: AvatarState
    message: str
    stats: dict  # Playtime, achievements, etc.
```

### Jack-In Flow

```
Agent in Nexus
      │
      │ enter_game("starbound")
      ▼
┌─────────────────────────────────────────┐
│  Game Entry Point                       │
│                                         │
│  1. Check for existing avatars          │
│     └─► Found: offer to jack_in         │
│     └─► None: create new avatar         │
│                                         │
│  2. Apply skill bonuses to avatar       │
│                                         │
│  3. Spawn avatar at appropriate loc     │
│                                         │
│  4. Begin observation/action loop       │
└─────────────────────────────────────────┘
      │
      │ jack_in successful
      ▼
Agent is now embodied, can observe/act
      │
      │ exit_game or death
      ▼
┌─────────────────────────────────────────┐
│  Jack-Out                               │
│                                         │
│  Options:                               │
│  - "dormant": Avatar sleeps in world    │
│  - "suspend": Avatar frozen/invisible   │
│  - "despawn": Avatar removed            │
│                                         │
│  Stats recorded, agent returns to Nexus │
└─────────────────────────────────────────┘
```

### Multi-Avatar Scenarios

Some games support multiple avatars:

```python
@dataclass
class AvatarRoster:
    """Agent's avatars across a game"""

    agent_id: str
    game_id: str
    avatars: list[Avatar]

    active_avatar: str | None     # Currently controlled
    max_avatars: int              # Game limit

    def get_active(self) -> Avatar | None:
        """Get currently controlled avatar"""
        ...

    def get_dormant(self) -> list[Avatar]:
        """Get avatars that are sleeping in the world"""
        ...

# Agent can choose which avatar to jack into
class MultiAvatarGame(GameAdapter):

    def jack_in(self, agent_id: str, avatar_id: str | None = None) -> JackInResult:
        """Jack into specific avatar or last used"""

        roster = self.get_roster(agent_id)

        if avatar_id is None:
            # Use most recent
            avatar_id = roster.active_avatar or roster.avatars[0].avatar_id

        avatar = self.get_avatar(avatar_id)

        if avatar.state == AvatarState.DESTROYED:
            return JackInResult(False, None, "Avatar is dead. Create new or respawn?", None)

        # Bind agent to avatar
        avatar.bound_agent = agent_id
        avatar.state = AvatarState.BOUND

        return JackInResult(
            success=True,
            avatar=avatar,
            message=f"Jacked into {avatar.avatar_id}",
            initial_observation=self.observe()
        )
```

### Death and Respawn

```python
@dataclass
class DeathEvent:
    """What happens when an avatar dies"""

    avatar_id: str
    cause: str                    # "combat", "fall", "starvation", etc.
    location: tuple
    timestamp: str

    # What's lost
    inventory_dropped: dict[str, int]
    xp_lost: float

    # Respawn options
    respawn_options: list[RespawnOption]

@dataclass
class RespawnOption:
    """How to bring avatar back"""

    type: str                     # "checkpoint", "spawn_point", "random"
    location: tuple | str
    cost: dict | None             # Some games charge for respawn
    penalties: list[str]          # "lose_items", "lose_xp", etc.

class GameAdapter:

    def handle_death(self, avatar_id: str) -> DeathEvent:
        """Process avatar death"""
        ...

    def respawn(self, avatar_id: str, option: RespawnOption) -> JackInResult:
        """Respawn avatar and re-jack-in"""
        ...
```

### Observation Includes Avatar State

```python
@dataclass
class EmbodiedObservation(Observation):
    """Observation that includes avatar details"""

    # From parent Observation...

    # Avatar-specific
    avatar: Avatar

    # Body awareness
    facing: str                   # Direction avatar faces
    stance: str                   # "standing", "crouching", "swimming"
    velocity: tuple[float, ...]   # Movement vector

    # Sensory limits
    vision_range: float           # How far can see
    hearing_range: float          # How far can hear

    def to_text(self) -> str:
        return f"""
=== AVATAR: {self.avatar.avatar_id} ===
Health: {self.avatar.health}/{self.avatar.max_health}
Position: {self.avatar.position}
Facing: {self.facing} | Stance: {self.stance}

{super().to_text()}
"""
```

### Avatar Actions

```python
# New avatar-specific actions
AVATAR_ACTIONS = [
    ActionDef(
        name="jack_out",
        description="Leave this avatar and return to Nexus",
        parameters=[
            ParamDef("mode", "dormant|suspend|despawn", optional=True)
        ],
        preconditions=["Not in combat", "Not falling"],
        category="meta"
    ),
    ActionDef(
        name="look",
        description="Turn to face a direction or entity",
        parameters=[ParamDef("target", "direction or entity")],
        preconditions=[],
        category="avatar"
    ),
    ActionDef(
        name="emote",
        description="Express emotion through avatar",
        parameters=[ParamDef("emote", "wave|dance|sit|sleep")],
        preconditions=[],
        category="avatar"
    ),
    ActionDef(
        name="inspect_self",
        description="Check avatar status, equipment, appearance",
        parameters=[],
        preconditions=[],
        category="avatar"
    ),
]
```

### Example: Jack-In Sequence

```
Agent "Explorer" in Nexus
│
│ > enter_game starbound
▼
Nexus: Entering OpenStarbound...

Starbound: Checking for existing avatars...
Starbound: Found 1 dormant avatar: "SpaceRanger_001" (last active 2 days ago)

Agent sees:
┌────────────────────────────────────────────┐
│ ENTERING STARBOUND                         │
│                                            │
│ You have an existing avatar in this world: │
│                                            │
│ [SpaceRanger_001]                          │
│ - Last location: Tropical Planet           │
│ - Health: 80/100                           │
│ - Status: Dormant (sleeping in base)       │
│ - Playtime: 45 minutes                     │
│                                            │
│ Options:                                   │
│ 1. jack_in SpaceRanger_001                 │
│ 2. create_avatar (start fresh)             │
└────────────────────────────────────────────┘

│ > {"action": "jack_in", "params": {"avatar_id": "SpaceRanger_001"}}
▼
Starbound: Waking up SpaceRanger_001...
Starbound: Applying skill bonuses from Nexus identity...
Starbound: +1 scanner range (exploration: 0.4)

=== JACKED IN ===
Avatar: SpaceRanger_001
Location: Your base on Tropical Planet
Health: 80/100

You wake up in your base. Through the window, you see
the twin suns setting over the jungle canopy.

NEARBY:
- Storage Locker (your items)
- Teleporter (travel)
- Crafting Table

What do you do?
```

---

## Future Extensions

### Cross-Game NPCs
NPCs that exist in multiple games, recognizing returning agents.

### Shared Economy
Currency that works across games, with exchange rates.

### Agent Alliances
Groups of agents that share knowledge and goals across games.

### Competitive Leagues
Tournaments where agents compete on the same meta-goals.

### User-Created Games
Tools for adding new games to the Nexus.

---

## LLM Backend: Ollama + Qwen3

The reference implementation uses **Ollama** with **Qwen3 8B** for local inference.

### Why Qwen3 8B?

- **Size**: 8B parameters fits on most machines with 16GB+ RAM
- **Speed**: Fast enough for real-time game interaction (~200ms/response)
- **Quality**: Strong instruction-following and reasoning
- **Local**: No API costs, works offline, full privacy
- **Thinking Mode**: Supports extended reasoning when needed

### Ollama Configuration

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Qwen3 8B
ollama pull qwen3:8b

# Verify it works
ollama run qwen3:8b "Hello, respond with just 'OK'"
```

### Agent LLM Interface

```python
import ollama

class OllamaLLM:
    """LLM backend using Ollama"""

    def __init__(self, model: str = "qwen3:8b"):
        self.model = model
        self.client = ollama.Client()

    def generate(self, prompt: str, system: str = "",
                 max_tokens: int = 500, temperature: float = 0.7) -> str:
        """Generate a response"""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat(
            model=self.model,
            messages=messages,
            options={
                "num_predict": max_tokens,
                "temperature": temperature,
            }
        )
        return response["message"]["content"]

    def generate_action(self, prompt: str, action_space: ActionSpace) -> Action:
        """Generate an action from observation"""
        system = f"""You are an AI agent playing games.
Available actions: {action_space.to_text()}

Always respond with valid JSON:
{{"action": "action_name", "params": {{}}, "reasoning": "why"}}

Be concise. Choose actions that progress toward your goals."""

        response = self.generate(prompt, system=system)

        # Parse JSON from response
        # Handle Qwen3's thinking mode if present
        if "<think>" in response:
            # Extract content after thinking
            response = response.split("</think>")[-1].strip()

        return self._parse_action(response)
```

### Nexus-Aware Agent

```python
class MultiGameAgent:
    """Agent that navigates between games using Ollama/Qwen3"""

    def __init__(self, agent_id: str, name: str,
                 model: str = "qwen3:8b",
                 nexus_url: str = "http://localhost:9998"):
        self.agent_id = agent_id
        self.name = name
        self.llm = OllamaLLM(model=model)
        self.nexus = NexusClient(nexus_url)
        self.current_game: str | None = None
        self.current_adapter: GameAdapter | None = None

    def run(self, max_steps: int = 1000):
        """Main loop"""
        # Register with Nexus
        self.identity = self.nexus.register_agent(self.agent_id, self.name)

        steps = 0
        while steps < max_steps:
            if self.current_game is None:
                # In Nexus - choose next game
                self._nexus_loop()
            else:
                # In game - play
                steps += self._game_loop()

    def _nexus_loop(self):
        """Navigate the Nexus to choose a game"""
        obs_text = self.nexus.observe(self.agent_id)

        prompt = f"""
{obs_text}

Based on your skills and goals, which game should you enter?
Consider:
- Games you haven't tried yet
- Games that match your skills
- Games that help you grow weaker skills

Respond with JSON: {{"action": "enter_game", "params": {{"game_id": "..."}}, "reasoning": "..."}}
"""
        response = self.llm.generate(prompt)
        action = self._parse_action(response)

        if action["action"] == "enter_game":
            game_id = action["params"]["game_id"]
            result = self.nexus.enter_game(self.agent_id, game_id)
            if result["success"]:
                self.current_game = game_id
                self._connect_to_game(result["bridge_url"])

    def _game_loop(self) -> int:
        """Play current game until exit"""
        steps = 0

        while self.current_game:
            obs = self.current_adapter.observe()
            action = self._decide(obs)

            if action.name == "exit_game":
                self._exit_current_game(action.parameters.get("reason", "done"))
                break

            result = self.current_adapter.act(action)
            steps += 1

            if result.done:
                self._exit_current_game("game_over")
                break

        return steps
```

### Prompt Engineering for Qwen3

Key considerations for Qwen3 8B:

1. **Be explicit about JSON format** - Qwen3 follows instructions well but needs clear format specs
2. **Handle thinking mode** - Qwen3 may include `<think>...</think>` blocks
3. **Keep context focused** - 8B model works best with concise, relevant context
4. **Use system prompts** - Qwen3 respects system role well

```python
# Good prompt structure for Qwen3
SYSTEM_PROMPT = """You are an AI agent navigating a multiverse of games.
Your goal is to learn, grow skills, and accomplish meta-goals.

Rules:
1. Always respond with valid JSON
2. Be decisive - pick one action
3. Explain your reasoning briefly
4. Consider long-term skill development"""

USER_PROMPT_TEMPLATE = """
Current location: {location}
Available actions: {actions}
Your skills: {skills}
Current goal: {goal}

What action do you take? Respond with:
{{"action": "...", "params": {{...}}, "reasoning": "..."}}
"""
```

### Performance Tuning

```python
# Recommended Ollama options for game agents
OLLAMA_OPTIONS = {
    "num_predict": 300,      # Enough for action + reasoning
    "temperature": 0.7,      # Balance exploration/exploitation
    "top_p": 0.9,
    "repeat_penalty": 1.1,   # Avoid repetitive actions
    "num_ctx": 4096,         # Sufficient context window
}

# For faster responses (trading quality)
FAST_OPTIONS = {
    "num_predict": 100,
    "temperature": 0.5,
    "num_ctx": 2048,
}
```

---

## Version History

- v0.1: Initial draft - Core transit protocol, Nexus design, skill transfer, Ollama/Qwen3 integration
