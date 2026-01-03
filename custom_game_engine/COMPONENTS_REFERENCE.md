# Components Reference

> **Last Updated:** 2026-01-02
> **Purpose:** Reference guide for all 125+ component types in the ECS

## Overview

Components are pure data structures with no logic. They are attached to entities and processed by systems. This document catalogs all component types, their data fields, and usage.

**Component Naming Convention:** Component type strings MUST use `lowercase_with_underscores`, not PascalCase.

```typescript
// ✅ CORRECT
export class SteeringComponent extends ComponentBase {
  public readonly type = 'steering';
}

// ❌ WRONG
export class SteeringComponent extends ComponentBase {
  public readonly type = 'Steering'; // PascalCase is incorrect
}
```

---

## Table of Contents

1. [Core Components](#core-components)
2. [Agent Components](#agent-components)
3. [Physical Components](#physical-components)
4. [Cognitive Components](#cognitive-components)
5. [Social Components](#social-components)
6. [World Entity Components](#world-entity-components)
7. [Building Components](#building-components)
8. [Divinity Components](#divinity-components)
9. [Reproduction Components](#reproduction-components)
10. [Combat Components](#combat-components)
11. [Special Components](#special-components)

---

## Core Components

### IdentityComponent
**Type:** `identity`
**Purpose:** Name, description, pronouns

**Fields:**
```typescript
{
  name: string;              // Agent/entity name (auto-generated if empty)
  description?: string;      // Physical description
  pronouns: 'he/him' | 'she/her' | 'they/them';
  species: string;           // 'human', 'elf', 'cat', etc.
}
```

**Usage:** All agents, some entities

---

### PositionComponent
**Type:** `position`
**Purpose:** World coordinates

**Fields:**
```typescript
{
  x: number;                 // World X coordinate
  y: number;                 // World Y coordinate
  z?: number;                // Height (for flying entities)
  realm?: string;            // Current realm ('mortal', 'underworld', 'celestial')
}
```

**Usage:** All entities with location

---

### VelocityComponent
**Type:** `velocity`
**Purpose:** Movement speed and direction

**Fields:**
```typescript
{
  x: number;                 // X velocity (units/tick)
  y: number;                 // Y velocity
  maxSpeed: number;          // Maximum speed limit
}
```

**Usage:** Moving entities (agents, animals, projectiles)

---

### RenderableComponent
**Type:** `renderable`
**Purpose:** Visual appearance

**Fields:**
```typescript
{
  sprite?: string;           // Sprite ID (e.g., 'lpc_human_male')
  color?: string;            // Tint color (hex)
  scale?: number;            // Size multiplier
  rotation?: number;         // Rotation in radians
  layer?: number;            // Render layer (0=ground, 1=entities, 2=air)
  visible?: boolean;         // Visibility toggle
}
```

**Usage:** All visible entities

---

### TimeComponent
**Type:** `time`
**Purpose:** Singleton time tracker

**Fields:**
```typescript
{
  tick: number;              // Current tick (1 tick = 50ms = 1 in-game minute)
  hour: number;              // Hour of day (0-23)
  day: number;               // Day counter
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
}
```

**Usage:** Singleton entity (only one in world)

---

## Agent Components

### AgentComponent
**Type:** `agent`
**Purpose:** Marks entity as AI-driven agent

**Fields:**
```typescript
{
  behavior: string;          // Current behavior ('gather', 'socialize', etc.)
  lastBehaviorChange: number; // Tick when behavior changed
  behaviorMetadata?: Record<string, any>; // Behavior-specific data
}
```

**Usage:** All AI agents (villagers, etc.)

---

### NeedsComponent
**Type:** `needs`
**Purpose:** Physiological and psychological needs

**Fields:**
```typescript
{
  hunger: number;            // 0.0 (full) to 1.0 (starving)
  thirst: number;            // 0.0 (hydrated) to 1.0 (dehydrated)
  energy: number;            // 1.0 (fully rested) to 0.0 (exhausted)
  cleanliness: number;       // 1.0 (clean) to 0.0 (filthy)
  social: number;            // 1.0 (fulfilled) to 0.0 (lonely)

  // Decay rates (per tick)
  hungerRate: number;
  thirstRate: number;
  energyRate: number;
  cleanlinessRate: number;
  socialRate: number;
}
```

**Usage:** All agents

**Critical Thresholds:**
- `> 0.8`: Critical, agent must satisfy immediately
- `0.5-0.8`: High priority
- `< 0.5`: Comfortable

---

### MoodComponent
**Type:** `mood`
**Purpose:** Emotional state derived from needs

**Fields:**
```typescript
{
  current: 'happy' | 'content' | 'neutral' | 'anxious' | 'sad' | 'angry';
  intensity: number;         // 0.0 to 1.0
  modifiers: Array<{         // Temporary mood effects
    source: string;
    modifier: number;
    expiresAt: number;
  }>;
}
```

**Usage:** All agents

---

### SkillsComponent
**Type:** `skills`
**Purpose:** Agent skill levels and XP

**Fields:**
```typescript
{
  farming: { level: number; xp: number };
  crafting: { level: number; xp: number };
  cooking: { level: number; xp: number };
  hunting: { level: number; xp: number };
  combat: { level: number; xp: number };
  magic: { level: number; xp: number };
  // ... many more skills
}
```

**Usage:** All agents

**XP Progression:** 100 XP per level (configurable)

---

### InventoryComponent
**Type:** `inventory`
**Purpose:** Items carried by agent

**Fields:**
```typescript
{
  items: Record<string, number>; // itemId → quantity
  capacity: number;              // Max items (weight/slots)
  equipped?: {                   // Equipped items
    head?: string;
    body?: string;
    hands?: string;
    feet?: string;
    mainHand?: string;
    offHand?: string;
  };
}
```

**Usage:** Agents, buildings (storage), chests

---

### HealthComponent
**Type:** `health`
**Purpose:** Current/max health

**Fields:**
```typescript
{
  current: number;           // Current HP
  max: number;               // Maximum HP
  regeneration?: number;     // HP per tick
}
```

**Usage:** Agents, animals, buildings

---

## Physical Components

### SteeringComponent
**Type:** `steering`
**Purpose:** Steering forces for movement

**Fields:**
```typescript
{
  target?: { x: number; y: number }; // Destination
  arrivalRadius: number;     // Distance to "arrive" at target
  maxForce: number;          // Maximum steering force
  behavior: 'seek' | 'arrive' | 'wander' | 'flee';
}
```

**Usage:** Moving entities (agents, animals)

---

### CircadianComponent
**Type:** `circadian`
**Purpose:** Sleep/wake cycle

**Fields:**
```typescript
{
  phase: number;             // 0.0 (awake) to 1.0 (asleep)
  sleepPressure: number;     // 0.0 (alert) to 1.0 (exhausted)
  preferredSleepHour: number; // Hour to sleep (default: 22)
  preferredWakeHour: number;  // Hour to wake (default: 6)
}
```

**Usage:** Agents

---

### BodyComponent
**Type:** `body`
**Purpose:** Physical body simulation

**Fields:**
```typescript
{
  parts: Array<{             // Body parts
    name: string;            // 'head', 'torso', 'left_arm', etc.
    health: number;          // Part health (0.0-1.0)
    condition: 'healthy' | 'injured' | 'missing' | 'prosthetic';
  }>;
  bloodLevel: number;        // Blood volume (0.0-1.0)
  temperature: number;       // Body temperature (Celsius)
}
```

**Usage:** Agents (humanoid/complex creatures)

---

### EquipmentComponent
**Type:** `equipment`
**Purpose:** Worn equipment (armor, clothing)

**Fields:**
```typescript
{
  slots: {
    head?: { itemId: string; instanceId: string };
    body?: { itemId: string; instanceId: string };
    hands?: { itemId: string; instanceId: string };
    feet?: { itemId: string; instanceId: string };
    // ... more slots
  };
  bonuses: {                 // Aggregate stats from all equipment
    armor: number;
    magicResist: number;
    speed: number;
  };
}
```

**Usage:** Agents

**Status:** ⏳ Ready to implement (Phase 36)

---

## Cognitive Components

### EpisodicMemoryComponent
**Type:** `episodic_memory`
**Purpose:** Specific event memories ("I did X at time T")

**Fields:**
```typescript
{
  memories: Array<{
    id: string;
    description: string;     // "I harvested wheat at (45, 67)"
    tick: number;            // When it happened
    location?: { x: number; y: number };
    participants?: string[]; // Other agent IDs involved
    importance: number;      // 0.0-1.0
    emotional: number;       // -1.0 (negative) to 1.0 (positive)
  }>;
  capacity: number;          // Max memories
}
```

**Usage:** Agents

---

### SemanticMemoryComponent
**Type:** `semantic_memory`
**Purpose:** General knowledge ("Wheat grows in summer")

**Fields:**
```typescript
{
  facts: Array<{
    statement: string;       // "Apples are edible"
    confidence: number;      // 0.0-1.0
    source: 'observed' | 'told' | 'inferred';
    learnedAt: number;       // Tick learned
  }>;
}
```

**Usage:** Agents

---

### SpatialMemoryComponent
**Type:** `spatial_memory`
**Purpose:** Map knowledge, location memory

**Fields:**
```typescript
{
  knownTiles: Set<string>;   // Explored tiles (as "x,y" strings)
  landmarks: Array<{
    name: string;
    location: { x: number; y: number };
    type: 'building' | 'resource' | 'natural';
  }>;
  resourceLocations: Map<string, Array<{ x: number; y: number }>>;
}
```

**Usage:** Agents

---

### ReflectionComponent
**Type:** `reflection`
**Purpose:** Self-awareness, introspection

**Fields:**
```typescript
{
  lastReflection: number;    // Tick of last reflection
  reflectionInterval: number; // How often to reflect
  insights: string[];        // Generated insights
}
```

**Usage:** Agents

---

### BeliefComponent
**Type:** `belief`
**Purpose:** Religious beliefs, faith in deities

**Fields:**
```typescript
{
  deities: Record<string, {  // deityId → belief data
    strength: number;        // Faith strength (0.0-1.0)
    allocation: number;      // % of daily faith generation
    lastPrayer?: number;     // Tick of last prayer
  }>;
  totalFaith: number;        // Total available faith points
}
```

**Usage:** Agents

---

### InterestsComponent
**Type:** `interests`
**Purpose:** Agent interests, hobbies, passions

**Fields:**
```typescript
{
  interests: Record<string, number>; // topic → strength (0.0-1.0)
  // e.g., { 'farming': 0.8, 'cooking': 0.6, 'music': 0.3 }
}
```

**Usage:** Agents

---

## Social Components

### ConversationComponent
**Type:** `conversation`
**Purpose:** Conversation state

**Fields:**
```typescript
{
  partner?: string;          // Other agent ID
  topic?: string;            // Current topic
  startedAt: number;         // Tick conversation started
  messageHistory: Array<{
    speaker: string;
    text: string;
    tick: number;
  }>;
  quality?: number;          // Conversation quality (0.0-1.0)
  depth?: number;            // Depth of conversation (0-5)
}
```

**Usage:** Agents in conversation

---

### RelationshipComponent
**Type:** `relationship`
**Purpose:** Social relationships between agents

**Fields:**
```typescript
{
  relationships: Record<string, { // otherAgentId → relationship data
    type: 'friend' | 'family' | 'romantic' | 'rival' | 'stranger';
    strength: number;        // -1.0 (enemy) to 1.0 (close)
    trust: number;           // 0.0 (distrust) to 1.0 (trust)
    lastInteraction: number; // Tick of last interaction
    sharedMemories: string[]; // Memory IDs
  }>;
}
```

**Usage:** All agents

---

### SocialGradientComponent
**Type:** `social_gradient`
**Purpose:** Awareness of social density

**Fields:**
```typescript
{
  nearbyAgents: string[];    // Agent IDs within social range
  socialPull: { x: number; y: number }; // Vector toward social hub
  loneliness: number;        // 0.0 (fulfilled) to 1.0 (lonely)
}
```

**Usage:** Agents

---

### TrustNetworkComponent
**Type:** `trust_network`
**Purpose:** Web of trust for information verification

**Fields:**
```typescript
{
  trusted: Record<string, number>; // agentId → trust (0.0-1.0)
  reputation: number;        // This agent's reputation (0.0-1.0)
}
```

**Usage:** Agents

---

## World Entity Components

### PlantComponent
**Type:** `plant`
**Purpose:** Plant lifecycle

**Fields:**
```typescript
{
  species: string;           // 'wheat', 'corn', 'apple_tree', etc.
  stage: 'seed' | 'seedling' | 'mature' | 'flowering' | 'fruiting' | 'senescent';
  age: number;               // Ticks since planted
  waterLevel: number;        // 0.0 (dry) to 1.0 (saturated)
  health: number;            // 0.0 (dying) to 1.0 (healthy)
  harvestYield?: number;     // Available harvest quantity
}
```

**Usage:** Plant entities

---

### AnimalComponent
**Type:** `animal`
**Purpose:** Animal properties

**Fields:**
```typescript
{
  species: string;           // 'chicken', 'cow', 'deer', etc.
  age: number;               // Ticks since birth
  wild: boolean;             // Wild vs domestic
  tamed: boolean;            // Has been tamed
  owner?: string;            // Owner agent ID (if tamed)
  diet: 'herbivore' | 'carnivore' | 'omnivore';
}
```

**Usage:** Animal entities

---

### ResourceComponent
**Type:** `resource`
**Purpose:** Gatherable resources

**Fields:**
```typescript
{
  resourceType: string;      // 'stone', 'wood', 'ore', etc.
  quantity: number;          // Remaining quantity
  maxQuantity: number;       // Starting quantity
  regenerationRate?: number; // Regeneration per tick (if renewable)
}
```

**Usage:** Resource nodes (trees, rocks, ore veins)

---

## Building Components

### BuildingComponent
**Type:** `building`
**Purpose:** Building properties

**Fields:**
```typescript
{
  buildingType: string;      // 'house', 'workshop', 'farm', etc.
  width: number;             // Tile width
  height: number;            // Tile height
  completed: boolean;        // Construction finished?
  owner?: string;            // Owner agent ID
  function?: string;         // 'shelter', 'production', 'storage', etc.
}
```

**Usage:** Building entities

---

### ConstructionComponent
**Type:** `construction`
**Purpose:** Construction progress

**Fields:**
```typescript
{
  progress: number;          // 0.0 to 1.0
  requiredResources: Record<string, number>; // resourceId → quantity
  contributedResources: Record<string, number>;
  builders: string[];        // Agent IDs currently building
}
```

**Usage:** Buildings under construction

---

### StorageComponent
**Type:** `storage`
**Purpose:** Building inventory (warehouse, chest)

**Fields:**
```typescript
{
  items: Record<string, number>; // itemId → quantity
  capacity: number;          // Max items
  allowedTypes?: string[];   // Restrict to specific item types
}
```

**Usage:** Storage buildings, chests

---

### MaintenanceComponent
**Type:** `maintenance`
**Purpose:** Building decay and repair

**Fields:**
```typescript
{
  condition: number;         // 0.0 (collapsed) to 1.0 (pristine)
  decayRate: number;         // Decay per tick
  lastMaintenance: number;   // Tick of last repair
}
```

**Usage:** Buildings

---

## Divinity Components

### DeityComponent
**Type:** `deity`
**Purpose:** God entity

**Fields:**
```typescript
{
  identity: {
    name: string;
    domains: string[];       // ['death', 'wisdom', 'war']
    alignment: 'good' | 'neutral' | 'evil';
  };
  belief: number;            // Total belief points
  power: number;             // Available divine power
  personality: {
    traits: string[];
    goals: string[];
  };
  controller: 'ai' | 'player' | 'emergent';
}
```

**Usage:** Deity entities

---

### PrayerComponent
**Type:** `prayer`
**Purpose:** Active prayer request

**Fields:**
```typescript
{
  petitioner: string;        // Agent ID who prayed
  deity: string;             // Target deity ID
  request: string;           // Prayer text
  emotion: 'desperate' | 'hopeful' | 'grateful' | 'angry';
  answered: boolean;
  response?: string;
}
```

**Usage:** Prayer entities (created during prayer)

---

### AngelComponent
**Type:** `angel`
**Purpose:** Divine servant

**Fields:**
```typescript
{
  deity: string;             // Creator deity ID
  rank: 'seraph' | 'cherub' | 'messenger';
  orders?: string;           // Current orders
  autonomy: number;          // 0.0 (puppet) to 1.0 (free will)
  maintenanceCost: number;   // Belief cost per tick
}
```

**Usage:** Angel entities

---

### AvatarComponent
**Type:** `avatar`
**Purpose:** God avatar in mortal world

**Fields:**
```typescript
{
  deity: string;             // Deity ID
  form: string;              // 'human', 'beast', 'ethereal'
  maintenanceCost: number;   // Belief cost per tick
  manifestedAt: number;      // Tick manifested
}
```

**Usage:** Avatar entities

---

### TempleComponent
**Type:** `temple`
**Purpose:** Temple/shrine building

**Fields:**
```typescript
{
  deity: string;             // Deity worshipped
  size: 'shrine' | 'temple' | 'cathedral';
  faithBonus: number;        // Faith generation multiplier
  offerings: Record<string, number>; // Donated items
}
```

**Usage:** Temple buildings

---

## Reproduction Components

### SexualityComponent
**Type:** `sexuality`
**Purpose:** Sexual orientation, preferences

**Fields:**
```typescript
{
  orientation: 'heterosexual' | 'homosexual' | 'bisexual' | 'asexual';
  preferences?: {
    traits: string[];
    ageRange?: { min: number; max: number };
  };
}
```

**Usage:** Agents (species-dependent)

**Status:** ✅ Complete (Phase 37)

---

### ReproductiveMorphComponent
**Type:** `reproductive_morph`
**Purpose:** Reproductive role (for non-binary species)

**Fields:**
```typescript
{
  current: string;           // e.g., 'kemmer-female', 'drone', 'queen'
  paradigm: string;          // Mating paradigm ID
  canChange: boolean;        // Can morph change?
  changeConditions?: string[]; // Triggers for change
}
```

**Usage:** Agents (paradigm-dependent)

**Status:** ✅ Complete (Phase 37)

---

### CourtshipComponent
**Type:** `courtship`
**Purpose:** Courtship state machine

**Fields:**
```typescript
{
  state: 'seeking' | 'displaying' | 'accepted' | 'rejected';
  target?: string;           // Courted agent ID
  displays: number;          // Display attempts
  compatibility: number;     // Calculated compatibility (0.0-1.0)
}
```

**Usage:** Agents during courtship

**Status:** ✅ Complete (Phase 37)

---

### PregnancyComponent
**Type:** `pregnancy`
**Purpose:** Pregnancy state

**Fields:**
```typescript
{
  gestationProgress: number; // 0.0 to 1.0
  gestationPeriod: number;   // Total gestation ticks
  partner?: string;          // Other parent ID
  health: number;            // Pregnancy health (0.0-1.0)
  complications?: string[];  // Medical issues
}
```

**Usage:** Pregnant agents

**Status:** ✅ Complete (Phase 37)

---

### LaborComponent
**Type:** `labor`
**Purpose:** Active labor state

**Fields:**
```typescript
{
  stage: 'early' | 'active' | 'transition' | 'pushing' | 'delivery';
  progress: number;          // 0.0 to 1.0
  pain: number;              // Pain level (0.0-1.0)
  complications: string[];   // 'breech', 'hemorrhage', etc.
  midwife?: string;          // Assisting midwife ID
}
```

**Usage:** Agents in labor

**Status:** ✅ Complete (Phase 37)

---

### ParentingComponent
**Type:** `parenting`
**Purpose:** Parent-child relationship

**Fields:**
```typescript
{
  children: string[];        // Child agent IDs
  bond: Record<string, number>; // childId → bond strength
  careGiven: number;         // Total care actions
}
```

**Usage:** Parent agents

**Status:** ✅ Complete (Phase 37)

---

### InfantComponent
**Type:** `infant`
**Purpose:** Infant needs and development

**Fields:**
```typescript
{
  birthTick: number;
  parents: string[];         // Parent agent IDs
  development: number;       // 0.0 (newborn) to 1.0 (child)
  fed: boolean;              // Recently fed?
  lastFed?: number;          // Tick of last feeding
}
```

**Usage:** Infant agents

**Status:** ✅ Complete (Phase 37)

---

## Combat Components

### CombatComponent
**Type:** `combat`
**Purpose:** Combat state

**Fields:**
```typescript
{
  target?: string;           // Enemy ID
  stance: 'aggressive' | 'defensive' | 'balanced';
  attackCooldown: number;    // Ticks until next attack
  lastAttack?: number;       // Tick of last attack
}
```

**Usage:** Agents in combat

---

### InjuryComponent
**Type:** `injury`
**Purpose:** Specific injuries

**Fields:**
```typescript
{
  injuries: Array<{
    bodyPart: string;        // 'head', 'left_arm', etc.
    severity: number;        // 0.0 (minor) to 1.0 (critical)
    type: 'cut' | 'bruise' | 'broken' | 'burn';
    healingProgress: number; // 0.0 to 1.0
  }>;
}
```

**Usage:** Injured agents/animals

---

### WeaponComponent
**Type:** `weapon`
**Purpose:** Equipped weapon stats

**Fields:**
```typescript
{
  damage: number;            // Base damage
  range: number;             // Attack range
  attackSpeed: number;       // Attacks per tick
  damageType: 'slashing' | 'piercing' | 'blunt' | 'fire' | 'ice';
}
```

**Usage:** Weapon items, equipped entities

---

## Special Components

### MagicComponent
**Type:** `magic`
**Purpose:** Magic ability

**Fields:**
```typescript
{
  mana: number;              // Current mana
  maxMana: number;           // Maximum mana
  manaRegeneration: number;  // Mana per tick
  knownSpells: string[];     // Spell IDs
  paradigm?: string;         // Magic paradigm ID
}
```

**Usage:** Spellcasters

**Status:** ⚠️ Framework exists, paradigms incomplete

---

### ResearchComponent
**Type:** `research`
**Purpose:** Research project

**Fields:**
```typescript
{
  project: string;           // Project ID
  progress: number;          // 0.0 to 1.0
  researchers: string[];     // Agent IDs contributing
  requiredSkills?: Record<string, number>; // skillId → level
}
```

**Usage:** Research entities

---

### GovernanceComponent
**Type:** `governance`
**Purpose:** Governance data (placeholder)

**Fields:**
```typescript
{
  population: number;
  boundaries?: { x1: number; y1: number; x2: number; y2: number };
  leader?: string;           // Leader agent ID
}
```

**Usage:** Village/settlement entities

**Status:** ⏳ Placeholder for Phase 14

---

### ExplorationComponent
**Type:** `exploration`
**Purpose:** Exploration tracking

**Fields:**
```typescript
{
  exploredTiles: Set<string>; // Explored tile coords
  frontierTiles: Set<string>; // Known but unvisited tiles
  explorationScore: number;  // % of world explored
}
```

**Usage:** Singleton entity (world exploration state)

---

### WeatherComponent
**Type:** `weather`
**Purpose:** Current weather (singleton)

**Fields:**
```typescript
{
  condition: 'clear' | 'rain' | 'snow' | 'storm';
  intensity: number;         // 0.0 to 1.0
  duration: number;          // Ticks remaining
}
```

**Usage:** Singleton entity

---

### TemperatureComponent
**Type:** `temperature`
**Purpose:** Environmental temperature

**Fields:**
```typescript
{
  ambient: number;           // Celsius
  comfort: number;           // -1.0 (too cold/hot) to 1.0 (comfortable)
}
```

**Usage:** Agents, buildings

---

## Component Helpers

The codebase provides typed helper functions for safe component access:

```typescript
import {
  getAgent,
  getPosition,
  getNeeds,
  getInventory,
  requireAgent,
  requirePosition,
  hasComponents,
} from '@ai-village/core/utils/componentHelpers';

// Safe getters (return undefined if missing)
const agent = getAgent(entity);
const position = getPosition(entity);

// Required getters (throw if missing)
const agent = requireAgent(entity);
const position = requirePosition(entity);

// Multi-component check
if (hasComponents(entity, ['agent', 'position', 'needs'])) {
  // All components present
}
```

**Location:** `packages/core/src/utils/componentHelpers.ts`

---

## Adding New Components

When creating a new component:

1. **Extend ComponentBase** from `ecs/Component.ts`
2. **Use lowercase_with_underscores for type**
3. **Define interface for data**
4. **Add helper getters to componentHelpers.ts**
5. **Document in this reference**

**Example:**

```typescript
// MyComponent.ts
import { ComponentBase } from '../ecs/Component.js';

export interface MyComponentData {
  myField: number;
  myOtherField: string;
}

export class MyComponent extends ComponentBase implements MyComponentData {
  public readonly type = 'my_component'; // lowercase with underscores

  myField: number;
  myOtherField: string;

  constructor(data: MyComponentData) {
    super();
    this.myField = data.myField;
    this.myOtherField = data.myOtherField;
  }
}

export function createMyComponent(data: MyComponentData): MyComponent {
  return new MyComponent(data);
}
```

**Usage:**

```typescript
import { createMyComponent } from './components/MyComponent.js';

const entity = world.createEntity();
entity.addComponent(createMyComponent({ myField: 42, myOtherField: 'test' }));

// In system
const my = entity.getComponent('my_component') as MyComponent;
```

---

**End of Components Reference**
