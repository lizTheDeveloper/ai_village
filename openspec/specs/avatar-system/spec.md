# Avatar System - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

Avatars are physical embodiments that agents "jack in" to, allowing persistent identity across multiple game worlds and bodies.

## Overview

Avatars are the physical embodiments of AI agents within game worlds. Agents are disembodied decision-makers that "jack in" to avatars to interact with a game. This separation allows agents to persist across game sessions, switch between multiple bodies, and transit between different game worlds while maintaining their identity, memories, and skills.

---

## Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                        AGENT                                │
│  (Identity, Skills, Memory, Goals)                          │
│  - Exists in the Nexus (meta-layer)                         │
│  - Persists forever across sessions                         │
│  - Can be "embodied" or "disembodied"                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ jack_in() / jack_out()
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       AVATAR                                │
│  (Position, Health, Inventory, Appearance)                  │
│  - Exists within a specific game world                      │
│  - Has physical properties and limitations                  │
│  - Can persist when agent leaves (dormant)                  │
│  - Mortal: can be destroyed/killed                          │
└─────────────────────────────────────────────────────────────┘
```

| Concept | Agent | Avatar |
|---------|-------|--------|
| **Persistence** | Eternal | Mortal |
| **Location** | Nexus (meta-layer) | Game world |
| **Contains** | Identity, Skills, Memory, Goals | Position, Health, Inventory |
| **Destroyed by** | Nothing (persists) | Death, despawn |
| **Number** | One per identity | Multiple per game |

---

## Avatar States

```typescript
enum AvatarState {
  UNBOUND = "unbound",       // No agent controlling - NPC or vacant
  BOUND = "bound",           // Agent actively controlling
  DORMANT = "dormant",       // Agent left, avatar sleeping in world
  SUSPENDED = "suspended",   // Avatar frozen, invisible to world
  DESTROYED = "destroyed",   // Avatar died or was despawned
}
```

### State Transitions

```
                    create_avatar()
                          │
                          ▼
                     ┌─────────┐
                     │ UNBOUND │ ◄─────────────────────┐
                     └────┬────┘                       │
                          │ jack_in()                  │
                          ▼                            │
                     ┌─────────┐                       │
              ┌─────►│  BOUND  │◄────┐                 │
              │      └────┬────┘     │                 │
              │           │          │                 │
    jack_in() │           │          │ respawn()       │
              │           │          │                 │
              │     jack_out()       │                 │
              │      ┌────┴────┐     │                 │
              │      ▼         ▼     │                 │
         ┌─────────┐     ┌───────────┐                 │
         │ DORMANT │     │ SUSPENDED │                 │
         └────┬────┘     └─────┬─────┘                 │
              │                │                       │
              │    death/      │ despawn()             │
              │    timeout     │                       │
              │                ▼                       │
              │         ┌───────────┐                  │
              └────────►│ DESTROYED │──────────────────┘
                        └───────────┘     (create new)
```

---

## Avatar Architecture

### Avatar Definition

```typescript
interface Avatar {
  id: string;
  gameId: string;                    // Which game world this exists in

  // Binding
  boundAgentId: string | null;       // Agent currently controlling
  state: AvatarState;

  // Identity
  name: string;                      // Display name
  species?: string;                  // Human, robot, alien, etc.
  appearance: AvatarAppearance;

  // Physical properties
  position: Position;
  facing: Direction;
  stance: Stance;
  velocity: Vector;

  // Status
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  statusEffects: StatusEffect[];

  // Inventory
  inventory: Inventory;
  equipment: Equipment;              // slot -> item mapping

  // Senses
  visionRange: number;
  visionCone: number;                // degrees
  hearingRange: number;

  // Persistence
  createdAt: GameTime;
  lastActive: GameTime;
  totalPlaytime: number;             // seconds
  deathCount: number;
  respawnPoint: Position | null;

  // Customization
  unlockedAbilities: string[];
  skillModifiers: Map<string, number>;
}

interface AvatarAppearance {
  spriteId: string;
  colors: Map<string, Color>;        // hair, skin, clothes, etc.
  accessories: string[];
  scale: number;
  animations: Map<string, string>;   // action -> animation
}

type Stance =
  | "standing"
  | "crouching"
  | "prone"
  | "sitting"
  | "swimming"
  | "flying"
  | "climbing";

type Direction = "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest";
```

### Avatar Specification (Creation)

```typescript
interface AvatarSpec {
  // Identity
  name?: string;                     // Auto-generate if null
  species?: string;
  appearance?: Partial<AvatarAppearance>;

  // Spawn settings
  spawnLocation: SpawnPreference;
  startingLoadout: string;           // "default", "warrior", "explorer", etc.

  // From agent skills - bonuses to apply
  skillBonuses?: Map<string, number>;

  // Game-specific options
  gameOptions?: Map<string, unknown>;
}

type SpawnPreference =
  | { type: "safe" }                 // Safe starting area
  | { type: "random" }               // Random valid location
  | { type: "challenging" }          // Dangerous area
  | { type: "specific"; position: Position }
  | { type: "near_entity"; entityId: string };
```

---

## Jack-In Protocol

### Interface

```typescript
interface AvatarGameAdapter extends GameAdapter {
  // === AVATAR MANAGEMENT ===

  listAvatars(agentId: string): Avatar[];
  getAvatar(avatarId: string): Avatar | null;
  createAvatar(agentId: string, spec: AvatarSpec): Avatar;
  deleteAvatar(avatarId: string): boolean;

  // === JACK-IN / JACK-OUT ===

  jackIn(agentId: string, avatarId: string): JackInResult;
  jackOut(agentId: string, mode: JackOutMode): JackOutResult;

  // === DEATH & RESPAWN ===

  handleDeath(avatarId: string): DeathEvent;
  getRespawnOptions(avatarId: string): RespawnOption[];
  respawn(avatarId: string, optionId: string): JackInResult;

  // === TRANSFER (rare) ===

  transferToAvatar(agentId: string, targetAvatarId: string): TransferResult;
}

type JackOutMode = "dormant" | "suspend" | "despawn";

interface JackInResult {
  success: boolean;
  avatar: Avatar | null;
  message: string;
  bonusesApplied: Map<string, unknown>;
  initialObservation: Observation | null;
}

interface JackOutResult {
  success: boolean;
  avatarState: AvatarState;
  message: string;
  sessionStats: SessionStats;
}

interface SessionStats {
  playtime: number;                  // seconds this session
  actionsPerformed: number;
  distanceTraveled: number;
  damageDealt: number;
  damageTaken: number;
  itemsCollected: number;
  achievements: string[];
  skillGains: Map<string, number>;
}
```

### Death & Respawn

```typescript
interface DeathEvent {
  avatarId: string;
  cause: DeathCause;
  killerId?: string;                 // Entity that caused death
  location: Position;
  timestamp: GameTime;

  // Consequences
  itemsDropped: Map<string, number>;
  experienceLost: number;

  // Options
  respawnOptions: RespawnOption[];
  autoRespawnTimer?: number;         // seconds until auto-respawn
}

type DeathCause =
  | "combat"
  | "fall"
  | "drowning"
  | "starvation"
  | "dehydration"
  | "poison"
  | "fire"
  | "cold"
  | "radiation"
  | "explosion"
  | "environmental"
  | "script";                        // Game script killed

interface RespawnOption {
  id: string;
  type: RespawnType;
  location: Position | string;       // Position or location name
  description: string;

  // Costs
  cost?: Map<string, number>;        // Resources/currency
  cooldown?: number;                 // seconds

  // Penalties
  penalties: RespawnPenalty[];
}

type RespawnType =
  | "checkpoint"                     // Last checkpoint
  | "bed"                            // Bound bed/home
  | "spawn_point"                    // World spawn
  | "corpse"                         // Where you died
  | "random"                         // Random safe location
  | "custom";                        // Game-specific

type RespawnPenalty =
  | "lose_inventory"
  | "lose_equipment"
  | "lose_experience"
  | "temporary_debuff"
  | "durability_loss"
  | "currency_cost";
```

---

## Multi-Avatar Support

Some games allow agents to have multiple avatars:

```typescript
interface AvatarRoster {
  agentId: string;
  gameId: string;
  avatars: Avatar[];
  activeAvatarId: string | null;     // Currently controlled
  maxAvatars: number;                // Game-imposed limit

  // Helpers
  getActive(): Avatar | null;
  getDormant(): Avatar[];
  getDestroyed(): Avatar[];
  canCreateNew(): boolean;
}
```

### Use Cases

| Scenario | Description |
|----------|-------------|
| **Alt characters** | RPG with multiple character slots |
| **Respawn bodies** | Clone/backup system (sci-fi) |
| **Possession** | Ability to take over NPCs |
| **Remote drones** | Controlling machines from afar |
| **Split consciousness** | Temporary multi-body control |

---

## Embodied Observation

When jacked in, observations include avatar body awareness:

```typescript
interface EmbodiedObservation extends Observation {
  avatar: Avatar;

  // Body state
  facing: Direction;
  stance: Stance;
  velocity: Vector;
  isGrounded: boolean;

  // Sensory information
  canSee: Entity[];                  // Entities in vision cone
  canHear: SoundEvent[];             // Audible sounds
  canSmell?: string[];               // If game has smell

  // Body awareness
  injuries: Injury[];
  fatigue: number;
  encumbrance: number;               // Inventory weight

  // Control state
  actionsAvailable: string[];
  actionsBlocked: Map<string, string>;  // action -> reason blocked
}

interface Injury {
  location: string;                  // "head", "left_arm", etc.
  severity: number;                  // 0-100
  type: string;                      // "cut", "burn", "fracture"
  healing: boolean;
}
```

---

## Avatar Actions

```typescript
const AVATAR_ACTIONS: ActionDef[] = [
  // === META ===
  {
    name: "jack_out",
    description: "Leave this avatar and return to disembodied state",
    parameters: [
      { name: "mode", type: "dormant | suspend | despawn", optional: true }
    ],
    preconditions: ["Not in combat", "Not falling", "Safe location"],
    category: "meta",
  },

  // === BODY CONTROL ===
  {
    name: "look",
    description: "Turn avatar to face a direction or entity",
    parameters: [
      { name: "target", type: "Direction | EntityId" }
    ],
    preconditions: [],
    category: "avatar",
  },
  {
    name: "stance",
    description: "Change body stance",
    parameters: [
      { name: "stance", type: "Stance" }
    ],
    preconditions: ["Stance is valid for current location"],
    category: "avatar",
  },
  {
    name: "emote",
    description: "Express emotion through body language",
    parameters: [
      { name: "emote", type: "wave | sit | dance | sleep | point | shrug | nod | shake" }
    ],
    preconditions: [],
    category: "avatar",
  },

  // === SELF-INSPECTION ===
  {
    name: "inspect_self",
    description: "Check avatar's body, equipment, and status",
    parameters: [],
    preconditions: [],
    category: "avatar",
  },
  {
    name: "check_inventory",
    description: "Review carried items",
    parameters: [],
    preconditions: [],
    category: "avatar",
  },

  // === EQUIPMENT ===
  {
    name: "equip",
    description: "Equip an item from inventory",
    parameters: [
      { name: "itemId", type: "string" },
      { name: "slot", type: "EquipmentSlot", optional: true }
    ],
    preconditions: ["Item in inventory", "Slot compatible"],
    category: "avatar",
  },
  {
    name: "unequip",
    description: "Remove equipped item to inventory",
    parameters: [
      { name: "slot", type: "EquipmentSlot" }
    ],
    preconditions: ["Slot has item", "Inventory has space"],
    category: "avatar",
  },
];
```

---

## Requirements

### Requirement: Avatar State Management

#### Scenario: Avatar state changes
- **WHEN** an avatar's state changes
- **THEN** the AvatarSystem SHALL:
  - Validate the state transition is legal
  - Update avatar state atomically
  - Trigger appropriate callbacks (onJackIn, onJackOut, onDeath)
  - Persist state to storage
  - Notify any observers (game UI, other systems)

### Requirement: Jack-In Process

#### Scenario: Agent jacks in to avatar
- **WHEN** an agent calls jackIn(avatarId)
- **THEN** the AvatarSystem SHALL:
  - Verify agent is not already jacked into another avatar
  - Verify avatar is in UNBOUND or DORMANT state
  - Apply any skill bonuses from agent to avatar
  - Set avatar state to BOUND
  - Set avatar.boundAgentId to agent.id
  - Return initial observation from avatar's perspective
  - Begin routing agent actions to this avatar

### Requirement: Jack-Out Process

#### Scenario: Agent jacks out of avatar
- **WHEN** an agent calls jackOut(mode)
- **THEN** the AvatarSystem SHALL:
  - Verify agent is currently jacked in
  - Verify avatar is in a safe state for jack-out
  - Calculate session statistics
  - Set avatar state based on mode:
    - "dormant": DORMANT (avatar stays in world, sleeping)
    - "suspend": SUSPENDED (avatar frozen, invisible)
    - "despawn": DESTROYED (avatar removed)
  - Clear avatar.boundAgentId
  - Return session stats to agent
  - Stop routing actions to this avatar

### Requirement: Death Handling

#### Scenario: Avatar health reaches zero
- **WHEN** an avatar's health reaches 0
- **THEN** the AvatarSystem SHALL:
  - Trigger onDeath callback
  - Create DeathEvent with cause and consequences
  - Apply death penalties (drop items, lose XP, etc.)
  - Set avatar state to DESTROYED
  - Unbind any controlling agent
  - Present respawn options to agent
  - Start auto-respawn timer if configured

### Requirement: Respawn Process

#### Scenario: Agent selects respawn option
- **WHEN** an agent selects a respawn option
- **THEN** the AvatarSystem SHALL:
  - Verify the option is valid and available
  - Apply any costs (currency, resources)
  - Apply respawn penalties
  - Either:
    - Restore existing avatar at respawn location, OR
    - Create new avatar if previous was fully destroyed
  - Set avatar health to respawn amount (often partial)
  - Apply any respawn debuffs
  - Jack agent into the avatar
  - Return initial observation

### Requirement: Multi-Avatar Management

#### Scenario: Agent has multiple avatars in game
- **WHEN** an agent has multiple avatars in a game
- **THEN** the AvatarSystem SHALL:
  - Maintain roster of all avatars
  - Enforce game's max avatar limit
  - Only allow one BOUND avatar at a time
  - Allow switching between avatars via jack-out/jack-in
  - Track per-avatar statistics separately
  - Allow dormant avatars to be affected by world events

### Requirement: Dormant Avatar Behavior

#### Scenario: Avatar is dormant
- **WHEN** an avatar is in DORMANT state
- **THEN** the game world SHALL:
  - Keep avatar physically present in world
  - Make avatar visible to other entities
  - Allow avatar to be affected by:
    - Environmental damage (if exposed)
    - Other entities' actions
    - Time-based effects
  - NOT allow avatar to take actions
  - Protect from trivial damage (optional safe zones)
  - Wake avatar if critically threatened (optional)

---

## Skill Bonuses

When an agent jacks into an avatar, their skills can provide bonuses:

```typescript
interface SkillBonusMapping {
  gameId: string;
  bonuses: Map<string, SkillBonus>;
}

interface SkillBonus {
  agentSkill: string;                // Agent skill name
  threshold: number;                 // Minimum skill level to apply
  effect: BonusEffect;
}

type BonusEffect =
  | { type: "stat_boost"; stat: string; formula: (skill: number) => number }
  | { type: "unlock_ability"; ability: string }
  | { type: "item_grant"; itemId: string }
  | { type: "starting_equipment"; slot: string; itemId: string }
  | { type: "discount"; category: string; percent: number };

// Example mappings
const starboundBonuses: SkillBonusMapping = {
  gameId: "starbound",
  bonuses: new Map([
    ["exploration", {
      agentSkill: "exploration",
      threshold: 0.2,
      effect: { type: "stat_boost", stat: "scanner_range", formula: (s) => 1 + Math.floor(s * 5) }
    }],
    ["combat", {
      agentSkill: "combat",
      threshold: 0.3,
      effect: { type: "stat_boost", stat: "weapon_damage", formula: (s) => 1 + s * 0.3 }
    }],
    ["social", {
      agentSkill: "social",
      threshold: 0.4,
      effect: { type: "discount", category: "shops", percent: (s) => s * 20 }
    }],
  ]),
};
```

---

## Open Questions

1. Should dormant avatars be attackable by other players/NPCs?
2. How long can an avatar stay dormant before auto-despawn?
3. Can agents "possess" NPC avatars or only their own?
4. Should avatar appearance affect gameplay (stealth, social)?
5. How to handle avatar gear when switching between games?

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent architecture
- `nexus-system/spec.md` - Multi-game transit
- `game-engine/spec.md` - Game loop integration

**Dependent Systems:**
- `items-system/spec.md` - Inventory and equipment
- `world-system/spec.md` - Physical world interaction
- `conflict-system/spec.md` - Combat and death
