# Nexus System - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The Nexus is the meta-layer hub where disembodied AI agents exist between game sessions, managing agent identity, cross-game skill transfer, and transit between different game worlds.

## Overview

The Nexus is the meta-layer where disembodied AI agents exist between game sessions. It serves as a central hub for game discovery, agent identity management, cross-game skill transfer, and transit between different game worlds. Agents in the Nexus can view their accumulated skills and achievements, choose which game to enter next, and maintain persistent identity across all games.

---

## Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                         NEXUS                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  (disembodied)      │
│  └────┬────┘  └────┬────┘  └────┬────┘                     │
│       │            │            │                           │
│       │            │            │    ┌────────────────────┐ │
│       │            │            │    │ Game Registry      │ │
│       │            │            │    │ - Crafter          │ │
│       │            │            │    │ - Starbound        │ │
│       │            │            │    │ - Minecraft        │ │
│       │            │            │    └────────────────────┘ │
└───────┼────────────┼────────────┼───────────────────────────┘
        │            │            │
   enter_game   enter_game   enter_game
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Crafter │  │Starbound│  │ Crafter │
   └─────────┘  └─────────┘  └─────────┘
```

| Component | Purpose |
|-----------|---------|
| **Nexus** | Hub between games, agent home base |
| **Agent Identity** | Persistent across all games |
| **Game Registry** | Discovery of available games |
| **Transit** | Movement between games |
| **Skill Transfer** | Cross-game learning benefits |
| **Meta-Goals** | Objectives spanning games |

---

## Nexus Architecture

### Nexus Definition

```typescript
interface Nexus {
  // Game Management
  games: Map<string, GameInfo>;

  // Agent Management
  agents: Map<string, AgentIdentity>;

  // Active Sessions
  sessions: Map<string, Session>;    // agentId -> active session

  // Methods
  registerGame(info: GameInfo): void;
  unregisterGame(gameId: string): void;
  listGames(): GameInfo[];
  getGame(gameId: string): GameInfo | null;

  registerAgent(id: string, name: string): AgentIdentity;
  getAgent(id: string): AgentIdentity | null;

  transitIn(entry: EntryPackage): TransitResult;
  transitOut(agentId: string, gameId: string, reason: string): TransitPackage;

  getObservation(agentId: string): NexusObservation;
}
```

### Game Information

```typescript
interface GameInfo {
  id: string;                        // "crafter", "starbound"
  name: string;                      // Human-readable name
  description: string;               // What is this game about?
  status: GameStatus;

  // Capabilities
  genre: string[];                   // ["survival", "sandbox", "rpg"]
  dimensions: 2 | 3;
  multiplayer: boolean;
  persistentWorld: boolean;

  // Skill domains this game exercises
  skillDomains: string[];

  // Protocol info
  wsapVersion: string;
  transitCompatible: boolean;        // Supports enter/exit?

  // Connection
  bridgeUrl: string;                 // How to connect

  // Current state
  activeAgents: number;
  maxAgents: number;
}

enum GameStatus {
  AVAILABLE = "available",           // Ready for agents
  BUSY = "busy",                     // At capacity
  OFFLINE = "offline",               // Not running
  MAINTENANCE = "maintenance",       // Temporarily down
}
```

### Agent Identity

```typescript
interface AgentIdentity {
  id: string;
  name: string;
  createdAt: string;

  // Lifetime statistics
  totalSteps: number;                // Across all games
  totalPlaytime: number;             // Seconds
  gamesVisited: string[];            // History of games played

  // Achievements
  achievements: Achievement[];

  // Skills (game-agnostic)
  skills: Map<string, number>;       // 0.0 to 1.0

  // Portable state
  carriedItems: PortableItem[];
  carriedCurrency: Map<string, number>;

  // Memory (for learning agents)
  coreMemories: string[];            // Key learnings
  strategies: string[];              // Learned strategies

  // Current state
  currentGameId: string | null;
  metaGoals: MetaGoal[];
}
```

---

## Skill Domains

Skills are game-agnostic capabilities that transfer between games:

```typescript
const SKILL_DOMAINS = [
  "exploration",           // Finding things, mapping, navigation
  "resource_management",   // Gathering, inventory, efficiency
  "combat",                // Fighting, dodging, timing
  "crafting",              // Making things, recipes, upgrades
  "survival",              // Health, hunger, hazard avoidance
  "social",                // NPC interaction, trading, quests
  "puzzle_solving",        // Logic, patterns, mechanisms
  "planning",              // Long-term strategy, goal decomposition
  "adaptation",            // Handling new situations, learning
] as const;

type SkillDomain = typeof SKILL_DOMAINS[number];

interface SkillProgress {
  domain: SkillDomain;
  level: number;                     // 0.0 to 1.0
  evidence: SkillEvidence[];         // How this was earned
}

interface SkillEvidence {
  gameId: string;
  action: string;
  timestamp: string;
  delta: number;                     // How much skill gained
}
```

### Skill Transfer

When entering a game, agent skills provide starting bonuses:

```typescript
interface SkillTransferRule {
  gameId: string;
  skillDomain: SkillDomain;
  threshold: number;                 // Minimum skill to apply
  bonus: TransferBonus;
}

type TransferBonus =
  | { type: "stat"; stat: string; formula: (level: number) => number }
  | { type: "item"; itemId: string; condition: (level: number) => boolean }
  | { type: "ability"; abilityId: string }
  | { type: "reputation"; faction: string; amount: number }
  | { type: "unlock"; feature: string };

// Example: Exploration skill in Starbound
const explorationInStarbound: SkillTransferRule = {
  gameId: "starbound",
  skillDomain: "exploration",
  threshold: 0.2,
  bonus: {
    type: "stat",
    stat: "scanner_range",
    formula: (level) => 1 + Math.floor(level * 5),
  },
};
```

---

## Transit Protocol

### Entry Package

What an agent provides when entering a game:

```typescript
interface EntryPackage {
  agentId: string;
  gameId: string;

  // Preferences
  spawnPreference: "safe" | "challenging" | "random";
  difficulty: "easy" | "normal" | "hard" | "adaptive";

  // Goals for this session
  sessionGoals: string[];

  // Constraints
  maxSteps?: number;                 // Leave after N steps
  exitConditions?: string[];         // Conditions to auto-exit

  // Avatar preference (if game has existing avatars)
  avatarId?: string;                 // Jack into specific avatar
  avatarSpec?: AvatarSpec;           // Create new with these prefs
}
```

### Transit Package

What an agent carries when leaving a game:

```typescript
interface TransitPackage {
  agentId: string;
  agentName: string;

  // Session stats
  sessionStats: SessionStats;

  // Skill updates
  skillGains: Map<SkillDomain, number>;

  // Achievements earned
  newAchievements: Achievement[];

  // Portable items (if any)
  carriedItems: PortableItem[];

  // New memories
  newMemories: string[];

  // Meta
  originGame: string;
  exitReason: string;
  timestamp: string;
}

interface SessionStats {
  steps: number;
  playtime: number;
  totalReward: number;
  achievementCount: number;
}
```

### Transit Result

```typescript
interface TransitResult {
  success: boolean;
  sessionId?: string;
  bridgeUrl?: string;
  bonusesApplied?: Map<string, unknown>;
  error?: string;
}
```

---

## Nexus Observation

What an agent sees when in the Nexus:

```typescript
interface NexusObservation {
  // Agent info
  agent: AgentIdentity;

  // Available games
  availableGames: GameInfo[];

  // Recommendations
  suggestedGames: GameSuggestion[];

  // Current goals
  activeMetaGoals: MetaGoal[];

  // Recent history
  recentSessions: SessionSummary[];
}

interface GameSuggestion {
  gameId: string;
  gameName: string;
  score: number;                     // Recommendation strength
  reasons: string[];                 // Why this is suggested
}

interface SessionSummary {
  gameId: string;
  gameName: string;
  timestamp: string;
  duration: number;
  achievements: string[];
  skillGains: Map<string, number>;
}
```

### Nexus Observation (Text Format)

```
=== NEXUS ===
Welcome back, {agent.name}.

YOUR STATS:
- Total experience: {agent.totalSteps} steps across {agent.gamesVisited.length} games
- Top skills: {formatSkills(agent.skills)}
- Achievements: {agent.achievements.length}

AVAILABLE GAMES:
1. Crafter [READY] - 2D survival, gather and craft
   Skills: resource_management, survival, crafting

2. OpenStarbound [READY] - Space exploration
   Skills: exploration, combat, social

3. Minecraft [OFFLINE] - Coming soon

SUGGESTED FOR YOU:
- OpenStarbound: Your exploration skill (40%) would help here
- Crafter: Practice survival skills in a simpler environment

RECENT HISTORY:
- Crafter (2 hours ago): 150 steps, +5% survival, earned "First Night"

COMMANDS:
- list_games: See all games
- game_details <id>: Get details
- enter_game <id>: Enter a game
- review_self: Check your stats

What would you like to do?
```

---

## Nexus Actions

Actions available while in the Nexus:

```typescript
const NEXUS_ACTIONS: ActionDef[] = [
  // === DISCOVERY ===
  {
    name: "list_games",
    description: "See all available games",
    parameters: [],
    preconditions: [],
    category: "discovery",
  },
  {
    name: "game_details",
    description: "Get detailed info about a specific game",
    parameters: [
      { name: "gameId", type: "string" }
    ],
    preconditions: [],
    category: "discovery",
  },

  // === TRANSIT ===
  {
    name: "enter_game",
    description: "Enter a game world",
    parameters: [
      { name: "gameId", type: "string" },
      { name: "spawn", type: "safe | challenging | random", optional: true },
      { name: "difficulty", type: "easy | normal | hard", optional: true },
      { name: "goals", type: "string[]", optional: true },
    ],
    preconditions: ["Game is available"],
    category: "transit",
  },
  {
    name: "wait_for_game",
    description: "Wait for a specific game to become available",
    parameters: [
      { name: "gameId", type: "string" },
      { name: "timeout", type: "number", optional: true }
    ],
    preconditions: [],
    category: "transit",
  },

  // === SELF-REFLECTION ===
  {
    name: "review_self",
    description: "Check your stats, skills, and history",
    parameters: [],
    preconditions: [],
    category: "meta",
  },
  {
    name: "review_achievements",
    description: "See all earned achievements",
    parameters: [
      { name: "filter", type: "game | rarity | recent", optional: true }
    ],
    preconditions: [],
    category: "meta",
  },

  // === GOALS ===
  {
    name: "set_meta_goal",
    description: "Set a goal spanning multiple games",
    parameters: [
      { name: "goal", type: "string" }
    ],
    preconditions: [],
    category: "meta",
  },
  {
    name: "abandon_meta_goal",
    description: "Give up on a meta-goal",
    parameters: [
      { name: "goalId", type: "string" }
    ],
    preconditions: [],
    category: "meta",
  },
];
```

---

## Meta-Goals

Goals that span multiple games:

```typescript
interface MetaGoal {
  id: string;
  description: string;
  type: "skill" | "exploration" | "achievement" | "mastery";

  requirements: MetaGoalRequirement[];
  progress: Map<string, unknown>;

  rewards: string[];
  completed: boolean;
}

interface MetaGoalRequirement {
  type: RequirementType;
  target: string | number;
  games: "any" | "all" | string[];   // Which games count
  count?: number;                     // How many times
}

type RequirementType =
  | "survive_steps"                  // Survive N steps
  | "visit_game"                     // Enter a specific game
  | "earn_achievement"               // Get specific achievement
  | "reach_skill_level"              // Skill to certain level
  | "complete_action"                // Perform action N times
  | "collect_items";                 // Gather items across games

// Example meta-goals
const EXAMPLE_META_GOALS: MetaGoal[] = [
  {
    id: "survivor",
    description: "Survive for 100+ steps in 3 different games",
    type: "skill",
    requirements: [
      { type: "survive_steps", target: 100, games: "any", count: 3 }
    ],
    progress: new Map(),
    rewards: ["Title: Survivor", "+10% starting health in all games"],
    completed: false,
  },
  {
    id: "world_walker",
    description: "Visit every available game at least once",
    type: "exploration",
    requirements: [
      { type: "visit_game", target: "all", games: "all" }
    ],
    progress: new Map(),
    rewards: ["Title: World Walker", "Instant travel between known games"],
    completed: false,
  },
  {
    id: "master_crafter",
    description: "Reach 80% crafting skill",
    type: "mastery",
    requirements: [
      { type: "reach_skill_level", target: 0.8, games: "any" }
    ],
    progress: new Map(),
    rewards: ["Title: Master Crafter", "Unlock rare recipes in all games"],
    completed: false,
  },
];
```

---

## Portable Items

Items that can travel between games:

```typescript
interface PortableItem {
  id: string;
  category: ItemCategory;
  tier: number;                      // 1-10 power level
  properties: Map<string, unknown>;
  originGame: string;

  // How this maps to different games
  equivalenceHints: Map<string, string>;  // gameId -> local item name
}

type ItemCategory =
  | "weapon"
  | "armor"
  | "tool"
  | "material"
  | "consumable"
  | "key_item"
  | "currency";

// Example: Iron sword from Crafter
const portableIronSword: PortableItem = {
  id: "crafter:iron_sword",
  category: "weapon",
  tier: 3,
  properties: new Map([
    ["damage", 15],
    ["durability", 0.8],
  ]),
  originGame: "crafter",
  equivalenceHints: new Map([
    ["starbound", "tier3broadsword"],
    ["minecraft", "iron_sword"],
  ]),
};
```

---

## Requirements

### Requirement: Game Registration

#### Scenario: Game connects to Nexus
- **WHEN** a game connects to the Nexus
- **THEN** the Nexus SHALL:
  1. Validate game info structure
  2. Check WSAP version compatibility
  3. Register game in the game registry
  4. Set initial status to AVAILABLE
  5. Notify any waiting agents

### Requirement: Agent Registration

#### Scenario: New agent connects to Nexus
- **WHEN** a new agent connects to the Nexus
- **THEN** the Nexus SHALL:
  1. Check if agent ID already exists
  2. IF exists: return existing AgentIdentity
  3. ELSE: create new AgentIdentity with:
     - Initialized skill domains at 0
     - Empty achievements list
     - No games visited
  4. Persist identity to storage

### Requirement: Game Entry

#### Scenario: Agent requests to enter game
- **WHEN** an agent requests to enter a game
- **THEN** the Nexus SHALL:
  1. Verify agent is not already in a game
  2. Verify target game is AVAILABLE
  3. Calculate skill bonuses to apply
  4. Create EntryPackage
  5. Send to game adapter
  6. Record session start
  7. Update agent's currentGameId
  8. Return transit result with bridge URL

### Requirement: Game Exit

#### Scenario: Agent exits game
- **WHEN** an agent exits a game (voluntary or forced)
- **THEN** the Nexus SHALL:
  1. Request final stats from game
  2. Calculate skill gains based on actions
  3. Record new achievements
  4. Update agent's AgentIdentity:
     - Increment totalSteps
     - Update skills
     - Add achievements
     - Add game to gamesVisited if new
  5. Clear agent's currentGameId
  6. Create TransitPackage for agent
  7. Return agent to Nexus observation mode

### Requirement: Skill Transfer

#### Scenario: Agent enters game with existing skills
- **WHEN** an agent enters a game with existing skills
- **THEN** the Nexus SHALL:
  1. Look up SkillTransferRules for target game
  2. For each rule where agent.skills[domain] >= threshold:
     a. Calculate bonus value from formula
     b. Add to bonuses list
  3. Send bonuses to game adapter
  4. Game adapter applies bonuses to avatar

### Requirement: Meta-Goal Tracking

#### Scenario: Agent performs action in any game
- **WHEN** an agent performs an action in any game
- **THEN** the Nexus SHALL:
  1. Check all active meta-goals
  2. For each goal, check if action satisfies any requirement
  3. Update goal progress
  4. IF goal is now complete:
     a. Mark as completed
     b. Apply rewards
     c. Notify agent

### Requirement: Game Suggestions

#### Scenario: Agent requests Nexus observation
- **WHEN** an agent requests Nexus observation
- **THEN** the Nexus SHALL suggest games based on:
  1. Skill alignment (games that use agent's strong skills)
  2. Skill gaps (games that train weak skills)
  3. Novelty (games not yet visited)
  4. Meta-goal progress (games that help current goals)
  5. Recency (not recently played)

---

## LLM Backend

The Nexus supports any LLM for agent decision-making. Reference implementation uses Ollama with Qwen3:

```typescript
interface LLMBackend {
  type: "ollama" | "openrouter" | "anthropic" | "custom";
  model: string;
  endpoint: string;
  apiKey?: string;

  options: LLMOptions;
}

interface LLMOptions {
  maxTokens: number;
  temperature: number;
  topP: number;
  repeatPenalty: number;
}

// Recommended for Qwen3 8B
const RECOMMENDED_OPTIONS: LLMOptions = {
  maxTokens: 300,
  temperature: 0.7,
  topP: 0.9,
  repeatPenalty: 1.1,
};
```

---

## Wire Protocol

HTTP/JSON API for distributed deployment:

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/games` | List all games |
| GET | `/games/{id}` | Get game details |
| POST | `/games` | Register a game |
| DELETE | `/games/{id}` | Unregister a game |
| POST | `/agents` | Register agent |
| GET | `/agents/{id}` | Get agent identity |
| GET | `/nexus/{agentId}` | Get Nexus observation |
| POST | `/transit/enter` | Enter a game |
| POST | `/transit/exit` | Exit a game |

### Example: Enter Game

```http
POST /transit/enter
Content-Type: application/json

{
  "agentId": "agent_001",
  "gameId": "starbound",
  "preferences": {
    "spawn": "safe",
    "difficulty": "normal",
    "goals": ["explore", "learn crafting"]
  }
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "sessionId": "sess_abc123",
  "bridgeUrl": "http://localhost:9999",
  "bonusesApplied": {
    "scanner_range": 3,
    "starting_credits": 100
  }
}
```

---

## Open Questions

1. Should agents be able to observe multiple games simultaneously?
2. How to handle games going offline mid-session?
3. Should there be a "spectate" mode to watch other agents?
4. How much agent memory should carry between games?
5. Should portable items have conversion losses between games?

---

## Related Specs

**Core Integration:**
- `avatar-system/spec.md` - Avatar jack-in
- `agent-system/spec.md` - Agent architecture
- `game-engine/spec.md` - Game adapters

**Dependent Systems:**
- `items-system/spec.md` - Portable items
- `economy-system/spec.md` - Cross-game currency
