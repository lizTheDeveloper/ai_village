# Multiverse Mechanics - Universe Forking, Travel, and Invasion

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Dependencies:** 02-SOUL-AGENTS.md, 05-SHIP-FLEET-HIERARCHY.md, 07-TRADE-LOGISTICS.md, HilbertTime, PassageSnapshot

---

## Overview & Motivation

### The Multiverse Model

The game features a **branching multiverse** where player actions, causal violations, and deliberate forks create parallel timelines. This spec defines:

1. **Universe Forking** - How new timelines split from existing ones
2. **Timeline Divergence** - How forks evolve differently over time
3. **Inter-Universe Travel** - Ships, passages, and navigation methods
4. **Invasion Scenarios** - Advanced civilizations conquering primitive forks
5. **Timeline Paradoxes** - Causal violations and resolution
6. **Canon Events** - Timeline stability mechanics
7. **Merge Mechanics** - Collapsing compatible branches

**Core Principle:** Universes are **branching timelines**, not parallel dimensions. Every fork shares a common ancestor and diverges from a specific point in time.

---

## Existing System Integration

### Persistence System (`packages/persistence/src/types.ts`)

**UniverseSnapshot** (existing):
```typescript
interface UniverseSnapshot {
  identity: {
    id: string;
    name: string;
    createdAt: number;
    schemaVersion: number;
    parentId?: string;         // Parent universe ID
    forkedAtTick?: string;     // When fork occurred (serialized bigint)
  };

  time: UniverseTime;
  config: Partial<UniverseDivineConfig> | Record<string, never>;
  entities: VersionedEntity[];
  worldState: WorldSnapshot;
  checksums: { entities: string; components: string; worldState: string; };
}
```

**UniverseTime** (existing):
```typescript
interface UniverseTime {
  universeId: string;
  universeTick: string;  // Ticks since THIS universe was created/forked
  timeScale: number;     // 1.0 = normal, 2.0 = 2x speed
  day: number;
  timeOfDay: number;
  phase: 'dawn' | 'day' | 'dusk' | 'night';

  /** If forked, the parent universe tick when fork occurred */
  forkPoint?: {
    parentUniverseId: string;
    parentUniverseTick: string;  // Serialized bigint
    multiverseTick: string;      // Serialized bigint
  };

  paused: boolean;
  pausedDuration: number;
}
```

**PassageSnapshot** (existing):
```typescript
interface PassageSnapshot {
  id: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  type: 'thread' | 'bridge' | 'gate' | 'confluence';
  active: boolean;
}
```

### Hilbert-Time System (`packages/core/src/trade/HilbertTime.ts`)

**HilbertTimeCoordinate** (existing):
```typescript
interface HilbertTimeCoordinate {
  tau: bigint;       // τ - Proper time (local tick count)
  beta: string;      // β - Branch identifier (e.g., "root.save1.fork2")
  sigma: number;     // σ - Sync sequence (async message ordering)
  origin: string;    // Universe ID
  causalParents: CausalReference[];
}
```

**CausalViolation** (existing):
```typescript
interface CausalViolation {
  type: 'future_dependency' | 'missing_sync' | 'branch_conflict';
  missingParent: CausalReference;
  receivedEvent: HilbertTimeCoordinate;
  description: string;
  resolution: 'fork' | 'queue' | 'reject';
  forkAtTau?: bigint;
}
```

### Trade System (`packages/core/src/trade/TradeAgreementTypes.ts`)

**TradeScope** (existing):
```typescript
type TradeScope =
  | 'local'              // Same universe, same civilization
  | 'inter_village'      // Same universe, different villages
  | 'cross_timeline'     // Different timeline (forked universe in same multiverse)
  | 'cross_universe'     // Different universe in same multiverse
  | 'cross_multiverse';  // Different multiverse (requires portal)
```

### Spaceship System (`packages/core/src/navigation/SpaceshipComponent.ts`)

**SpaceshipComponent** (existing):
```typescript
interface SpaceshipComponent {
  type: 'spaceship';
  ship_type: SpaceshipType;  // Includes: probability_scout, timeline_merger, svetz_retrieval
  navigation: {
    can_navigate_beta_space: boolean;
    contamination_cargo: Array<{
      entity_id: string;
      source_timeline: string;       // β-branch this came from
      contamination_level: number;   // 0-1, incompatibility
    }>;
    visited_branches: string[];  // β-branches visited
  };
}
```

---

## Universe Forking Mechanics

### When Forks Occur

**Three Fork Triggers:**

#### 1. Causal Violation (Automatic)

**What:** Cross-universe event depends on recipient's future
**When:** Trade shipment arrives "before" it was sent (recipient time)
**Resolution:** Automatic fork to resolve causality

**Example:**
```
Universe A (τ = 1000):
  - Sends shipment to Universe B
  - Shipment departs at τ_A = 1000

Universe B (τ = 500):
  - Receives shipment at τ_B = 500
  - But shipment depends on Universe A's τ_A = 1000
  - Causal violation! Universe B at τ=500 hasn't "seen" Universe A at τ=1000 yet

Resolution:
  - Universe B forks at τ_B = 500
  - Fork Universe B' accepts shipment (altered timeline)
  - Original Universe B continues without shipment (pristine timeline)
```

**Implementation:**
```typescript
/**
 * Detect and resolve causal violation via fork
 */
function handleCausalViolation(
  receivingUniverse: UniverseSnapshot,
  receivedEvent: HilbertTimeCoordinate,
  knownCoordinates: Map<string, HilbertTimeCoordinate>
): UniverseSnapshot | null {
  const ourTime = getCurrentHilbertTime(receivingUniverse);

  const violation = detectCausalViolation(receivedEvent, ourTime, knownCoordinates);

  if (violation && violation.resolution === 'fork') {
    // Create fork at violation point
    const forkUniverse = forkUniverseAtTick(
      receivingUniverse,
      violation.forkAtTau!,
      {
        reason: 'causal_violation',
        triggerEvent: receivedEvent,
        description: violation.description,
      }
    );

    // Fork accepts event, original rejects
    return forkUniverse;
  }

  return null;
}
```

#### 2. Player Choice (Manual)

**What:** Player explicitly creates alternate timeline
**When:** Save/load, manual fork via UI
**Resolution:** Player chooses fork point and name

**Example:**
```
Player at τ = 5000 wants to try different strategy.

Player clicks "Fork Timeline":
  - Choose fork point: τ = 3000 (2000 ticks ago)
  - Name fork: "Peaceful Route"
  - Original becomes "Military Route"

Result:
  - "Military Route" continues from τ = 5000
  - "Peaceful Route" starts from τ = 3000
  - Both exist simultaneously
  - Player can switch between them
```

**Implementation:**
```typescript
/**
 * Player-initiated fork via UI
 */
function createManualFork(
  sourceUniverse: UniverseSnapshot,
  forkAtTick: bigint,
  forkName: string
): UniverseSnapshot {
  // Load snapshot at forkAtTick (requires time travel)
  const snapshotAtFork = loadSnapshotAtTick(sourceUniverse.identity.id, forkAtTick);

  if (!snapshotAtFork) {
    throw new Error(`No snapshot available at tick ${forkAtTick}`);
  }

  // Create new universe from snapshot
  const forkUniverse: UniverseSnapshot = {
    ...snapshotAtFork,
    identity: {
      ...snapshotAtFork.identity,
      id: generateUniverseId(),
      name: forkName,
      parentId: sourceUniverse.identity.id,
      forkedAtTick: forkAtTick.toString(),
      createdAt: Date.now(),
    },
    time: {
      ...snapshotAtFork.time,
      forkPoint: {
        parentUniverseId: sourceUniverse.identity.id,
        parentUniverseTick: forkAtTick.toString(),
        multiverseTick: getCurrentMultiverseTick().toString(),
      },
    },
  };

  return forkUniverse;
}
```

#### 3. Natural Divergence (Emergent)

**What:** Quantum uncertainty causes spontaneous forks
**When:** Low-probability events in high-tension situations
**Resolution:** Automatic fork with small probability

**Example:**
```
Agent Alice faces critical decision:
  - Attack enemy (90% probability)
  - Negotiate peace (10% probability)

If Alice's personality sits on the fence (45% attack, 55% negotiate):
  - 5% chance of spontaneous fork
  - Fork A: Alice attacks
  - Fork B: Alice negotiates

Both timelines exist, weighted by probability.
```

**Implementation:**
```typescript
/**
 * Check for natural divergence during critical events
 */
function checkNaturalDivergence(
  universe: UniverseSnapshot,
  criticalEvent: CriticalEvent
): { shouldFork: boolean; probability: number } {
  // Only fork if event is genuinely uncertain
  const uncertainty = calculateEventUncertainty(criticalEvent);

  if (uncertainty < 0.4) {
    return { shouldFork: false, probability: 0 }; // Too deterministic
  }

  // Fork probability proportional to uncertainty
  const forkProbability = (uncertainty - 0.4) * 0.1; // Max 6% at perfect uncertainty

  const shouldFork = Math.random() < forkProbability;

  return { shouldFork, probability: forkProbability };
}

/**
 * Calculate uncertainty of event outcome
 * Returns 0-1 (0 = deterministic, 1 = max uncertainty)
 */
function calculateEventUncertainty(event: CriticalEvent): number {
  // For binary choice (attack vs negotiate):
  // Uncertainty = 1 - |p1 - p2|
  // Max uncertainty at p1 = p2 = 0.5

  if (event.type === 'binary_choice') {
    return 1 - Math.abs(event.option1Probability - event.option2Probability);
  }

  // For multi-choice: entropy-based
  if (event.type === 'multi_choice') {
    const entropy = event.options.reduce((sum, opt) => {
      if (opt.probability === 0) return sum;
      return sum - opt.probability * Math.log2(opt.probability);
    }, 0);

    const maxEntropy = Math.log2(event.options.length);
    return entropy / maxEntropy; // Normalized 0-1
  }

  return 0;
}
```

---

## Fork Metadata

### UniverseForkMetadata Component

**NEW component to track fork details:**

```typescript
/**
 * Tracks why and how this universe was forked
 * Attached to universe entity (or stored in snapshot metadata)
 */
interface UniverseForkMetadata extends Component {
  type: 'universe_fork_metadata';

  /**
   * Fork trigger
   */
  forkTrigger: ForkTrigger;

  /**
   * Parent universe
   */
  parentUniverse: {
    universeId: string;
    universeName: string;
    forkTick: bigint;         // τ in parent when fork occurred
    multiverseTick: bigint;   // Absolute multiverse time
  };

  /**
   * Divergence tracking
   */
  divergence: {
    divergenceScore: number;      // 0-1, how different from parent
    majorDifferences: DivergenceEvent[];
    lastDivergenceUpdate: bigint; // τ when last recalculated
  };

  /**
   * Canon events inherited from parent
   */
  canonEvents: CanonEvent[];

  /**
   * Merge compatibility
   */
  mergeability: {
    compatibleWithParent: boolean;
    compatibleBranches: string[];  // Other universe IDs
    mergeConflicts: MergeConflict[];
  };

  /**
   * Travel restrictions
   */
  isolation: {
    allowTravelTo: boolean;    // Can ships enter this universe?
    allowTravelFrom: boolean;  // Can ships leave?
    quarantineReason?: string; // If quarantined
  };
}

type ForkTrigger =
  | { type: 'causal_violation'; violation: CausalViolation }
  | { type: 'player_choice'; reason: string }
  | { type: 'natural_divergence'; event: CriticalEvent; probability: number }
  | { type: 'timeline_merger_split'; mergerShipId: string };

interface DivergenceEvent {
  tick: bigint;                // τ when divergence occurred
  eventType: string;           // 'agent_death', 'building_created', etc.
  description: string;
  divergenceImpact: number;    // 0-1, how much this event diverged timeline
}

interface CanonEvent {
  tick: bigint;                // τ when canon event occurred
  eventType: string;
  description: string;
  resistanceStrength: number;  // 0-1, how hard to change
  wasAltered: boolean;         // Did this fork alter canon?
}

interface MergeConflict {
  conflictType: 'agent_state' | 'building_exists' | 'item_quantity' | 'terrain_difference';
  entityId: string;
  parentValue: unknown;
  forkValue: unknown;
  resolvable: boolean;
}
```

---

## Timeline Divergence Tracking

### Divergence Score Calculation

**Divergence Score:** How different is a fork from its parent?

**Formula:**
```typescript
/**
 * Calculate divergence score between fork and parent
 * Returns 0-1 (0 = identical, 1 = completely different)
 */
function calculateDivergenceScore(
  forkUniverse: UniverseSnapshot,
  parentUniverse: UniverseSnapshot,
  forkMetadata: UniverseForkMetadata
): number {
  const forkTick = BigInt(forkMetadata.parentUniverse.forkTick);
  const currentTick = BigInt(forkUniverse.time.universeTick);
  const ticksSinceFork = currentTick - forkTick;

  // Categories of divergence
  const agentDivergence = calculateAgentDivergence(forkUniverse, parentUniverse);
  const buildingDivergence = calculateBuildingDivergence(forkUniverse, parentUniverse);
  const inventoryDivergence = calculateInventoryDivergence(forkUniverse, parentUniverse);
  const terrainDivergence = calculateTerrainDivergence(forkUniverse, parentUniverse);
  const eventDivergence = calculateEventDivergence(forkMetadata.divergence.majorDifferences);

  // Weighted average (agents matter most for gameplay)
  const divergence = (
    agentDivergence * 0.4 +
    buildingDivergence * 0.2 +
    inventoryDivergence * 0.15 +
    terrainDivergence * 0.1 +
    eventDivergence * 0.15
  );

  // Time decay: divergence naturally increases over time
  const timeDecayFactor = Math.min(1, Number(ticksSinceFork) / 100000); // Max at 100k ticks
  const finalDivergence = divergence + (1 - divergence) * timeDecayFactor * 0.3;

  return Math.min(1, finalDivergence);
}

/**
 * Agent divergence - compare agent states
 */
function calculateAgentDivergence(
  fork: UniverseSnapshot,
  parent: UniverseSnapshot
): number {
  const forkAgents = fork.entities.filter(e =>
    e.components.some(c => c.type === 'identity')
  );
  const parentAgents = parent.entities.filter(e =>
    e.components.some(c => c.type === 'identity')
  );

  let differences = 0;
  let comparisons = 0;

  for (const forkAgent of forkAgents) {
    const parentAgent = parentAgents.find(a => a.id === forkAgent.id);

    if (!parentAgent) {
      // Agent exists in fork but not parent (new birth, or immigration)
      differences += 1;
      comparisons += 1;
      continue;
    }

    // Compare critical components
    differences += compareAgentHealth(forkAgent, parentAgent);
    differences += compareAgentSkills(forkAgent, parentAgent);
    differences += compareAgentRelationships(forkAgent, parentAgent);
    differences += compareAgentInventory(forkAgent, parentAgent);
    differences += compareAgentMemories(forkAgent, parentAgent);
    comparisons += 5;
  }

  // Agents in parent but not fork (deaths)
  const missingAgents = parentAgents.filter(pa =>
    !forkAgents.some(fa => fa.id === pa.id)
  );
  differences += missingAgents.length;
  comparisons += missingAgents.length;

  return comparisons > 0 ? differences / comparisons : 0;
}

/**
 * Building divergence - compare structures
 */
function calculateBuildingDivergence(
  fork: UniverseSnapshot,
  parent: UniverseSnapshot
): number {
  const forkBuildings = fork.entities.filter(e =>
    e.components.some(c => c.type === 'building')
  );
  const parentBuildings = parent.entities.filter(e =>
    e.components.some(c => c.type === 'building')
  );

  let differences = 0;

  // Buildings in fork but not parent
  differences += forkBuildings.filter(fb =>
    !parentBuildings.some(pb => pb.id === fb.id)
  ).length;

  // Buildings in parent but not fork
  differences += parentBuildings.filter(pb =>
    !forkBuildings.some(fb => fb.id === pb.id)
  ).length;

  const totalBuildings = Math.max(forkBuildings.length, parentBuildings.length);
  return totalBuildings > 0 ? differences / totalBuildings : 0;
}

/**
 * Event divergence - analyze major divergence events
 */
function calculateEventDivergence(majorDifferences: DivergenceEvent[]): number {
  // Each major difference contributes to divergence
  const totalImpact = majorDifferences.reduce((sum, event) =>
    sum + event.divergenceImpact, 0
  );

  // Normalize by expected number of events (assume ~10 major events = full divergence)
  return Math.min(1, totalImpact / 10);
}
```

### Divergence Events

**What Constitutes a Divergence Event:**

```typescript
/**
 * Track divergence event when significant difference occurs
 */
function recordDivergenceEvent(
  forkUniverse: UniverseSnapshot,
  eventType: string,
  description: string,
  impact: number
): void {
  const metadata = getForkMetadata(forkUniverse);

  const divergenceEvent: DivergenceEvent = {
    tick: BigInt(forkUniverse.time.universeTick),
    eventType,
    description,
    divergenceImpact: impact,
  };

  metadata.divergence.majorDifferences.push(divergenceEvent);
  metadata.divergence.lastDivergenceUpdate = BigInt(forkUniverse.time.universeTick);
}

/**
 * Examples of divergence events and their impacts
 */
const DIVERGENCE_EVENT_IMPACTS = {
  // High impact (0.3-1.0)
  agent_death: 0.5,              // Agent dies in fork but not parent
  agent_birth: 0.4,              // New agent born in fork
  building_destroyed: 0.6,       // Major building destroyed
  war_declaration: 0.8,          // Fork goes to war, parent doesn't
  deity_emergence: 1.0,          // God emerges in fork, huge divergence

  // Medium impact (0.1-0.3)
  building_created: 0.2,         // New building in fork
  marriage: 0.15,                // Different marriages
  skill_mastery: 0.1,            // Agent masters skill in fork
  trade_agreement: 0.2,          // Different trade deals

  // Low impact (0-0.1)
  item_crafted: 0.02,            // Minor inventory differences
  agent_moved: 0.01,             // Agent in different location
  mood_change: 0.005,            // Agent has different mood
};
```

---

## Canon Events

### What Makes an Event "Canon"?

**Canon Events:** Events that are **resistant to change** across timelines. They represent narrative inevitability.

**Properties:**
1. **High Probability:** Event has >90% chance of occurring
2. **Causal Convergence:** Multiple paths lead to same outcome
3. **Narrative Weight:** Event is thematically significant
4. **Timeline Anchor:** Event stabilizes surrounding timeline

**Examples:**
- Agent Alice always becomes mayor (destiny)
- Village always builds Temple of Stars (architectural inevitability)
- First Contact with aliens always happens around day 1000 (narrative anchor)

### Canon Event Tracking

```typescript
/**
 * Canon event - resists timeline changes
 */
interface CanonEvent {
  /** When event occurs (in parent timeline) */
  tick: bigint;

  /** Type of event */
  eventType: string;

  /** Description */
  description: string;

  /** Resistance to change (0-1) */
  resistanceStrength: number;

  /** Did this fork alter the canon event? */
  wasAltered: boolean;

  /** If altered, how? */
  alteration?: {
    forkTick: bigint;           // When alteration occurred
    originalOutcome: string;    // What was supposed to happen
    actualOutcome: string;      // What happened instead
    divergenceImpact: number;   // How much this altered timeline
  };

  /** Convergence pressure */
  convergence?: {
    attempting: boolean;         // Is timeline trying to "fix" itself?
    convergenceStrength: number; // 0-1, how strong is the pull back to canon?
    estimatedConvergenceTick: bigint; // When timeline might re-align
  };
}
```

### Canon Event Resistance

**How Canon Events Resist Change:**

```typescript
/**
 * Check if event should occur despite timeline differences
 * Canon events have "gravity" pulling timeline back to canon
 */
function checkCanonEventOccurrence(
  forkUniverse: UniverseSnapshot,
  canonEvent: CanonEvent,
  currentTick: bigint
): { shouldOccur: boolean; probability: number } {
  const ticksSinceCanon = currentTick - canonEvent.tick;

  // Canon events can occur "late" if timeline diverged
  if (ticksSinceCanon < -100) {
    // Too early, event hasn't happened yet
    return { shouldOccur: false, probability: 0 };
  }

  if (ticksSinceCanon > 10000) {
    // Too late, window closed
    return { shouldOccur: false, probability: 0 };
  }

  // Check if event was already altered
  if (canonEvent.wasAltered) {
    // Event already happened differently, no second chance
    return { shouldOccur: false, probability: 0 };
  }

  // Calculate occurrence probability based on resistance
  const baseProbability = 0.9; // Canon events are very likely
  const resistance = canonEvent.resistanceStrength;
  const timePenalty = Math.abs(Number(ticksSinceCanon)) / 10000; // Penalty for being off-schedule

  const probability = baseProbability * resistance * (1 - timePenalty * 0.5);

  const shouldOccur = Math.random() < probability;

  return { shouldOccur, probability };
}

/**
 * Attempt to converge timeline back to canon
 */
function attemptCanonConvergence(
  forkUniverse: UniverseSnapshot,
  canonEvent: CanonEvent
): void {
  if (!canonEvent.convergence?.attempting) {
    return;
  }

  const convergenceStrength = canonEvent.convergence.convergenceStrength;

  // Generate "nudges" toward canon outcome
  // Example: If canon says "Alice becomes mayor", increase Alice's leadership skill

  if (canonEvent.eventType === 'agent_role_change') {
    const targetAgent = findAgent(forkUniverse, canonEvent.description);
    if (targetAgent) {
      // Subtle nudges (not guaranteed, but increases probability)
      increaseAgentSkill(targetAgent, 'leadership', convergenceStrength * 0.1);
      increaseAgentReputation(targetAgent, convergenceStrength * 0.2);
    }
  }

  if (canonEvent.eventType === 'building_constructed') {
    const buildingType = extractBuildingType(canonEvent.description);
    // Increase probability that mayor suggests building
    increaseBuildingPriority(forkUniverse, buildingType, convergenceStrength);
  }

  // Convergence weakens over time
  canonEvent.convergence.convergenceStrength *= 0.99;
}
```

### Timeline Stability

**Timeline Stability Score:** How resistant is a timeline to further divergence?

```typescript
/**
 * Calculate timeline stability
 * High stability = resists change, low stability = chaotic
 */
function calculateTimelineStability(
  universe: UniverseSnapshot,
  forkMetadata: UniverseForkMetadata
): number {
  const canonEvents = forkMetadata.canonEvents;
  const alteredEvents = canonEvents.filter(e => e.wasAltered);

  // Base stability from canon adherence
  const canonAdherence = 1 - (alteredEvents.length / Math.max(1, canonEvents.length));

  // Divergence reduces stability
  const divergenceScore = forkMetadata.divergence.divergenceScore;
  const divergencePenalty = divergenceScore * 0.5;

  // Age increases stability (older timelines are more "set")
  const age = BigInt(universe.time.universeTick);
  const ageFactor = Math.min(1, Number(age) / 100000); // Max at 100k ticks

  const stability = (canonAdherence - divergencePenalty) * (0.5 + ageFactor * 0.5);

  return Math.max(0, Math.min(1, stability));
}
```

---

## Travel Prerequisites: Multi-Planet → Multi-Star → Multi-Universe

### The Progression Requirement

**CRITICAL:** Inter-universe travel is the FINAL stage of space exploration, not a shortcut. Civilizations must master each stage before progressing:

```
Stage 1: Multi-Planet (Interplanetary)
    ↓ Requires worldships, ~600 years
Stage 2: Multi-Star (Interstellar)
    ↓ Requires β-space ships, ~3000 years
Stage 3: Multi-Universe (Multiversal)
    Requires probability/timeline ships
```

### Why This Progression Matters

**Problem:** Without gating, players could potentially skip straight to inter-universe travel by finding a passage or building a probability scout, bypassing the rich gameplay of exploring their own solar system and galaxy.

**Solution:** Key resources for inter-universe ship construction are **only found in other star systems**, which requires mastering interstellar travel first. And interstellar ships require resources from **other planets in the home solar system**.

### Resource Gating Chain

```typescript
/**
 * Resource spawn locations enforce travel progression
 */
const RESOURCE_SPAWN_GATING = {
  /**
   * Stage 1 Gate: Interplanetary travel unlocks these
   * Required for building β-space ships (Stage 2)
   */
  requiresMultiPlanet: {
    // Found only on other planets in home solar system
    'stellarite_ore': {
      spawnLocations: ['asteroid_belt', 'metallic_moon', 'iron_planet'],
      usedFor: ['heart_chamber_hull', 'ship_plating', 'beta_antenna'],
      note: 'Cannot build threshold ships without leaving home planet',
    },
    'neutronium_shard': {
      spawnLocations: ['gas_giant_moon', 'collapsed_core', 'dense_planet'],
      usedFor: ['power_core', 'gravitational_dampener'],
      note: 'Extremely heavy, requires orbital processing',
    },
    'helium_3': {
      spawnLocations: ['gas_giant_atmosphere', 'lunar_regolith'],
      usedFor: ['fusion_reactor', 'propulsion_fuel'],
      note: 'Primary fuel for worldships',
    },
  },

  /**
   * Stage 2 Gate: Interstellar travel unlocks these
   * Required for building probability/timeline ships (Stage 3)
   */
  requiresMultiStar: {
    // Found only near exotic stellar phenomena
    'void_essence': {
      spawnLocations: ['black_hole_accretion', 'void_rift', 'dark_matter_halo'],
      usedFor: ['probability_lens', 'timeline_anchor', 'reality_stabilizer'],
      note: 'Critical for all inter-universe ship types',
    },
    'temporal_dust': {
      spawnLocations: ['pulsar_emission', 'time_dilation_zone', 'neutron_star_surface'],
      usedFor: ['temporal_crystal', 'chronometer', 'svetz_retrieval_core'],
      note: 'Only forms in extreme gravitational environments',
    },
    'exotic_matter': {
      spawnLocations: ['neutron_star', 'magnetar', 'quark_star'],
      usedFor: ['passage_stabilizer', 'wormhole_anchor'],
      note: 'Negative mass, enables stable passages',
    },
    'quantum_foam': {
      spawnLocations: ['spacetime_distortion', 'gravitational_wave_source', 'planck_boundary'],
      usedFor: ['quantum_processor', 'observation_array', 'probability_calculator'],
      note: 'Fundamental for probability manipulation',
    },
  },

  /**
   * Stage 3 Gate: Inter-universe travel unlocks these
   * Used for advanced transcendent technology
   */
  requiresMultiverse: {
    // Found only through inter-universe exploration
    'probability_crystal': {
      spawnLocations: ['collapsed_timeline', 'decision_nexus', 'schrodinger_point'],
      usedFor: ['transcendent_processor', 'destiny_weaver'],
      note: 'Crystallized unrealized possibilities',
    },
    'causal_thread': {
      spawnLocations: ['canon_event_remnant', 'timeline_anchor_point'],
      usedFor: ['timeline_merger_core', 'causality_engine'],
      note: 'Enables manipulation of canon events',
    },
    'timeline_fragment': {
      spawnLocations: ['extinct_universe', 'collapsed_branch'],
      usedFor: ['resurrection_matrix', 'universe_seed'],
      note: 'Only retrievable via Svetz ships',
    },
  },
};
```

### Ship Construction Dependencies

```typescript
/**
 * Ship types and their required resources
 * Shows why progression is enforced
 */
const SHIP_RESOURCE_REQUIREMENTS = {
  // Stage 1: Worldships (multi-planet enabler)
  worldship: {
    stage: 1,
    resources: {
      home_planet: ['iron_ore', 'copper_ore', 'silicon_sand', 'mana_shard'],
      system_planets: [], // None - can build with home planet resources
    },
    note: 'Generation ship, no FTL, enables solar system exploration',
  },

  // Stage 2: β-space ships (multi-star enabler)
  threshold_ship: {
    stage: 2,
    resources: {
      home_planet: ['rare_earth_compound', 'refined_mana', 'emotional_essence'],
      system_planets: ['stellarite_ore', 'neutronium_shard'], // REQUIRES multi-planet
    },
    note: 'Cannot build without stellarite from asteroids',
  },

  courier_ship: {
    stage: 2,
    resources: {
      home_planet: ['processing_unit', 'silicon_wafer'],
      system_planets: ['stellarite_ore', 'helium_3'],
    },
    note: 'Fast cargo transport between stars',
  },

  brainship: {
    stage: 2,
    resources: {
      home_planet: ['soul_fragment', 'emotional_essence'],
      system_planets: ['neutronium_shard', 'raw_crystal'],
    },
    note: 'Living ship with soul integration',
  },

  // Stage 3: Inter-universe ships (multi-universe enabler)
  probability_scout: {
    stage: 3,
    resources: {
      home_planet: ['quantum_processor', 'crystal_lens'],
      system_planets: ['stellarite_ore'],
      other_stars: ['void_essence', 'temporal_dust', 'quantum_foam'], // REQUIRES multi-star
    },
    note: 'Cannot build without void_essence from black holes',
  },

  timeline_merger: {
    stage: 3,
    resources: {
      home_planet: ['soul_anchor', 'resonance_core'],
      system_planets: ['neutronium_shard'],
      other_stars: ['void_essence', 'exotic_matter', 'temporal_dust'],
    },
    note: 'Collapses compatible timelines',
  },

  svetz_retrieval: {
    stage: 3,
    resources: {
      home_planet: ['timeline_anchor', 'probability_lens'],
      system_planets: ['stellarite_ore'],
      other_stars: ['temporal_dust', 'quantum_foam', 'exotic_matter'],
    },
    note: 'Retrieves entities from extinct timelines',
  },
};
```

### Progression Validation

```typescript
/**
 * Validate that a civilization can build a ship type
 * Enforces progression requirements
 */
function canBuildShip(
  civId: string,
  shipType: SpaceshipType,
  world: World
): { canBuild: boolean; missingRequirements: string[] } {
  const requirements = SHIP_RESOURCE_REQUIREMENTS[shipType];
  const missing: string[] = [];

  // Check home planet resources
  for (const resource of requirements.resources.home_planet) {
    if (!hasResource(civId, resource, world)) {
      missing.push(`${resource} (home planet)`);
    }
  }

  // Check system planet resources (requires interplanetary capability)
  if (requirements.resources.system_planets?.length > 0) {
    const hasInterplanetary = hasTravelCapability(civId, 'interplanetary', world);

    if (!hasInterplanetary) {
      missing.push('INTERPLANETARY TRAVEL (must visit other planets first)');
    } else {
      for (const resource of requirements.resources.system_planets) {
        if (!hasResource(civId, resource, world)) {
          missing.push(`${resource} (other planets in system)`);
        }
      }
    }
  }

  // Check other star resources (requires interstellar capability)
  if (requirements.resources.other_stars?.length > 0) {
    const hasInterstellar = hasTravelCapability(civId, 'interstellar', world);

    if (!hasInterstellar) {
      missing.push('INTERSTELLAR TRAVEL (must visit other star systems first)');
    } else {
      for (const resource of requirements.resources.other_stars) {
        if (!hasResource(civId, resource, world)) {
          missing.push(`${resource} (other star systems)`);
        }
      }
    }
  }

  return {
    canBuild: missing.length === 0,
    missingRequirements: missing,
  };
}

/**
 * Check if civilization has reached a travel capability level
 */
function hasTravelCapability(
  civId: string,
  level: 'interplanetary' | 'interstellar' | 'multiversal',
  world: World
): boolean {
  const civ = getCivilization(civId, world);

  switch (level) {
    case 'interplanetary':
      // Has visited at least one other planet in home system
      return civ.visitedPlanets.some(p => p !== civ.homePlanetId);

    case 'interstellar':
      // Has visited at least one other star system
      return civ.visitedSystems.some(s => s !== civ.homeSystemId);

    case 'multiversal':
      // Has visited at least one other universe
      return civ.visitedUniverses.some(u => u !== civ.homeUniverseId);
  }
}
```

### Example Progression Timeline

```
Year 0: Stone Age village on home planet

Year 5,000: Industrial civilization
  - Has iron, copper, silicon from home planet
  - Can build basic structures

Year 20,000: Space Age
  - Builds first worldship (generation ship)
  - 600-year journey to asteroid belt
  - Mines stellarite_ore and neutronium_shard

Year 25,000: Interstellar Era
  - Has stellarite → can build threshold ship
  - First β-space jump to nearby star
  - Discovers black hole system
  - Mines void_essence

Year 30,000: Multiversal Era
  - Has void_essence + temporal_dust → can build probability_scout
  - Discovers first thread passage
  - Makes contact with alternate timeline
  - Begins inter-universe trade
```

---

## Inter-Universe Travel Methods

### 1. Passages (Stable Connections)

**Existing PassageSnapshot** extended with metadata:

```typescript
/**
 * Extended passage with travel mechanics
 */
interface PassageExtended extends PassageSnapshot {
  /** Passage metadata */
  metadata: {
    /** Discovery */
    discoveredAt: bigint;
    discoveredBy?: EntityId; // Agent who found it

    /** Stability */
    stability: number;      // 0-1, unstable passages collapse
    decayRate: number;      // How fast stability degrades

    /** Travel cost */
    traversalCost: {
      energyCost: number;    // Emotional energy to traverse
      timeCost: number;      // Ticks to cross
      riskFactor: number;    // 0-1, chance of failure
    };

    /** Restrictions */
    restrictions: {
      requiresShip: boolean;        // Can agents walk through or need ship?
      minimumCoherence: number;     // Ship coherence required
      maxEntitySize: number;        // Size limit
      allowedShipTypes: SpaceshipType[];
    };

    /** Traffic */
    traffic: {
      totalCrossings: number;
      lastCrossing: bigint;
      congestion: number;    // 0-1, high traffic = slower crossings
    };
  };
}
```

**Passage Types (from existing PassageSnapshot):**

1. **Thread:** Fragile connection, low stability, requires probability scout ship
2. **Bridge:** Stable connection, allows general traffic
3. **Gate:** Large stable portal, allows fleets
4. **Confluence:** Nexus connecting 3+ universes

**Creating a Passage:**

```typescript
/**
 * Create passage between two universes
 */
function createPassage(
  sourceUniverseId: string,
  targetUniverseId: string,
  passageType: 'thread' | 'bridge' | 'gate' | 'confluence',
  discoveredBy?: EntityId
): PassageExtended {
  const passage: PassageExtended = {
    // Base fields
    $schema: 'https://aivillage.dev/schemas/passage/v1',
    $version: 1,
    id: generatePassageId(),
    sourceUniverseId,
    targetUniverseId,
    type: passageType,
    active: true,

    // Extended metadata
    metadata: {
      discoveredAt: getCurrentTick(),
      discoveredBy,

      stability: getInitialStability(passageType),
      decayRate: getDecayRate(passageType),

      traversalCost: {
        energyCost: getEnergyCost(passageType),
        timeCost: getTimeCost(passageType),
        riskFactor: getRiskFactor(passageType),
      },

      restrictions: {
        requiresShip: passageType === 'thread', // Threads require ships
        minimumCoherence: getMinCoherence(passageType),
        maxEntitySize: getMaxSize(passageType),
        allowedShipTypes: getAllowedShips(passageType),
      },

      traffic: {
        totalCrossings: 0,
        lastCrossing: 0n,
        congestion: 0,
      },
    },
  };

  return passage;
}

/**
 * Passage type configurations
 */
function getInitialStability(type: 'thread' | 'bridge' | 'gate' | 'confluence'): number {
  switch (type) {
    case 'thread': return 0.3;      // Fragile
    case 'bridge': return 0.7;      // Stable
    case 'gate': return 0.9;        // Very stable
    case 'confluence': return 0.95; // Extremely stable (natural)
  }
}

function getDecayRate(type: 'thread' | 'bridge' | 'gate' | 'confluence'): number {
  switch (type) {
    case 'thread': return 0.001;    // Decays 0.1% per tick
    case 'bridge': return 0.0001;   // Decays 0.01% per tick
    case 'gate': return 0.00001;    // Decays 0.001% per tick
    case 'confluence': return 0;    // No decay (natural)
  }
}

function getMinCoherence(type: 'thread' | 'bridge' | 'gate' | 'confluence'): number {
  switch (type) {
    case 'thread': return 0.8;      // Requires high coherence
    case 'bridge': return 0.6;      // Moderate coherence
    case 'gate': return 0.5;        // Low coherence OK
    case 'confluence': return 0.3;  // Very forgiving
  }
}
```

### 2. Probability Scout Ships

**Ship Type:** `probability_scout` (from SpaceshipComponent)

**Purpose:** Solo explorer mapping unobserved branches

**Mechanics:**
```typescript
/**
 * Probability scout navigation
 * Scouts can "observe" unobserved branches before collapsing them
 */
function navigateProbabilityScout(
  ship: SpaceshipComponent,
  targetBranch: string, // β-branch identifier
  sourceUniverse: UniverseSnapshot
): NavigationResult {
  // Scouts have observation_precision = 0.9 (best observers)
  const observationPrecision = ship.navigation.observation_precision;

  // Can scout measure branch before collapsing?
  const canMeasure = Math.random() < observationPrecision;

  if (canMeasure) {
    // Scout successfully mapped branch WITHOUT entering
    const branchInfo = observeBranch(targetBranch, sourceUniverse);

    return {
      success: true,
      entered: false,
      branchInfo,
      contamination: 0, // No contamination (didn't enter)
    };
  } else {
    // Failed to measure, must enter to observe (collapses superposition)
    return navigateShipToBranch(ship, targetBranch, sourceUniverse);
  }
}

/**
 * Observe branch without entering
 * Returns estimated state of branch
 */
function observeBranch(
  branchId: string,
  sourceUniverse: UniverseSnapshot
): BranchObservation {
  // Load branch snapshot
  const branch = loadUniverseSnapshot(branchId);

  if (!branch) {
    return {
      exists: false,
      error: 'Branch not found',
    };
  }

  // Calculate branch properties
  const divergenceFromSource = calculateDivergenceScore(
    branch,
    sourceUniverse,
    getForkMetadata(branch)
  );

  const stability = calculateTimelineStability(branch, getForkMetadata(branch));

  const population = branch.entities.filter(e =>
    e.components.some(c => c.type === 'identity')
  ).length;

  const threatLevel = estimateThreatLevel(branch);

  return {
    exists: true,
    branchId,
    divergence: divergenceFromSource,
    stability,
    population,
    threatLevel,
    safeToEnter: threatLevel < 0.5 && stability > 0.3,
  };
}

interface BranchObservation {
  exists: boolean;
  branchId?: string;
  divergence?: number;
  stability?: number;
  population?: number;
  threatLevel?: number;
  safeToEnter?: boolean;
  error?: string;
}
```

### 3. Timeline Merger Ships

**Ship Type:** `timeline_merger` (from SpaceshipComponent)

**Purpose:** Collapse compatible probability branches

**Mechanics:**
```typescript
/**
 * Timeline merger collapse operation
 * Merges compatible branches to reduce timeline proliferation
 */
function attemptTimelineMerge(
  mergerShip: SpaceshipComponent,
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot
): MergeResult {
  // Check coherence (mergers need 0.75 threshold)
  if (mergerShip.crew.coherence < 0.75) {
    return {
      success: false,
      reason: 'insufficient_coherence',
      requiredCoherence: 0.75,
      actualCoherence: mergerShip.crew.coherence,
    };
  }

  // Check compatibility
  const compatibility = checkBranchCompatibility(branch1, branch2);

  if (!compatibility.compatible) {
    return {
      success: false,
      reason: 'incompatible_branches',
      conflicts: compatibility.conflicts,
    };
  }

  // Merge branches
  const mergedUniverse = mergeBranches(branch1, branch2, compatibility);

  // Record merge in metadata
  recordMergeEvent(mergedUniverse, branch1.identity.id, branch2.identity.id);

  return {
    success: true,
    mergedUniverseId: mergedUniverse.identity.id,
    conflictsResolved: compatibility.conflicts.length,
  };
}

/**
 * Check if two branches can be merged
 */
function checkBranchCompatibility(
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot
): BranchCompatibility {
  const conflicts: MergeConflict[] = [];

  // Check agent states
  const agentConflicts = findAgentConflicts(branch1, branch2);
  conflicts.push(...agentConflicts);

  // Check building states
  const buildingConflicts = findBuildingConflicts(branch1, branch2);
  conflicts.push(...buildingConflicts);

  // Check inventory
  const inventoryConflicts = findInventoryConflicts(branch1, branch2);
  conflicts.push(...inventoryConflicts);

  // Check terrain
  const terrainConflicts = findTerrainConflicts(branch1, branch2);
  conflicts.push(...terrainConflicts);

  // Branches are compatible if all conflicts are resolvable
  const compatible = conflicts.every(c => c.resolvable);

  return {
    compatible,
    conflicts,
    divergenceScore: conflicts.length / 100, // Normalize
  };
}

/**
 * Merge two compatible branches
 */
function mergeBranches(
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot,
  compatibility: BranchCompatibility
): UniverseSnapshot {
  // Start with branch1 as base
  const merged: UniverseSnapshot = JSON.parse(JSON.stringify(branch1));

  // Resolve conflicts by taking "more developed" state
  for (const conflict of compatibility.conflicts) {
    if (conflict.resolvable) {
      resolveConflict(merged, conflict, branch1, branch2);
    }
  }

  // Update identity
  merged.identity.id = generateUniverseId();
  merged.identity.name = `${branch1.identity.name} + ${branch2.identity.name}`;
  merged.identity.parentId = findCommonAncestor(branch1, branch2);

  // Mark original branches as merged
  markBranchAsMerged(branch1.identity.id, merged.identity.id);
  markBranchAsMerged(branch2.identity.id, merged.identity.id);

  return merged;
}

/**
 * Resolve individual merge conflict
 */
function resolveConflict(
  merged: UniverseSnapshot,
  conflict: MergeConflict,
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot
): void {
  switch (conflict.conflictType) {
    case 'agent_state':
      // Take agent with higher skills
      const agent1 = findEntity(branch1, conflict.entityId);
      const agent2 = findEntity(branch2, conflict.entityId);
      const betterAgent = compareAgentSkills(agent1, agent2) > 0 ? agent1 : agent2;
      replaceEntity(merged, conflict.entityId, betterAgent);
      break;

    case 'building_exists':
      // Building exists in one branch but not other - keep it
      const building1 = findEntity(branch1, conflict.entityId);
      const building2 = findEntity(branch2, conflict.entityId);
      const building = building1 || building2;
      if (building && !findEntity(merged, conflict.entityId)) {
        addEntity(merged, building);
      }
      break;

    case 'item_quantity':
      // Take max quantity
      const qty1 = conflict.parentValue as number;
      const qty2 = conflict.forkValue as number;
      setItemQuantity(merged, conflict.entityId, Math.max(qty1, qty2));
      break;

    case 'terrain_difference':
      // Cannot resolve - keep branch1's terrain
      // (Terrain changes are rare and usually intentional)
      break;
  }
}
```

### 4. Svetz Retrieval Ships

**Ship Type:** `svetz_retrieval` (from SpaceshipComponent)

**Purpose:** Temporal archaeology from extinct timelines

**Mechanics:**
```typescript
/**
 * Svetz retrieval operation
 * Extract entities/items from extinct timelines
 */
function performSvetzRetrieval(
  svetzShip: SpaceshipComponent,
  extinctBranchId: string,
  targetEntityId: string
): RetrievalResult {
  // Load extinct branch (if snapshot exists)
  const extinctBranch = loadUniverseSnapshot(extinctBranchId);

  if (!extinctBranch) {
    return {
      success: false,
      reason: 'branch_not_found',
      error: 'No snapshot available for extinct branch',
    };
  }

  // Check if branch is actually extinct
  const branchActive = isBranchActive(extinctBranchId);
  if (branchActive) {
    return {
      success: false,
      reason: 'branch_not_extinct',
      error: 'Cannot retrieve from active timeline',
    };
  }

  // Find target entity in extinct branch
  const targetEntity = findEntity(extinctBranch, targetEntityId);

  if (!targetEntity) {
    return {
      success: false,
      reason: 'entity_not_found',
      error: `Entity ${targetEntityId} not found in extinct branch`,
    };
  }

  // Extract entity (create copy)
  const retrievedEntity = cloneEntity(targetEntity);

  // Mark as contaminated (from extinct timeline)
  const contaminationLevel = 0.8; // High contamination from extinct branch

  svetzShip.navigation.contamination_cargo.push({
    entity_id: retrievedEntity.id,
    source_timeline: extinctBranchId,
    contamination_level: contaminationLevel,
  });

  return {
    success: true,
    retrievedEntity,
    contaminationLevel,
  };
}

/**
 * Check if timeline is extinct (no active simulation)
 */
function isBranchActive(branchId: string): boolean {
  // Branch is active if:
  // 1. Has active game instance
  // 2. Has been updated recently (within last 1000 ticks of multiverse time)
  // 3. Not marked as "merged" or "collapsed"

  const branchStatus = getBranchStatus(branchId);
  return branchStatus.active;
}
```

### 5. Natural β-Space Navigation (Ships)

**General ship navigation between universes:**

```typescript
/**
 * Navigate ship to target β-branch
 */
function navigateShipToBranch(
  ship: SpaceshipComponent,
  targetBranch: string,
  sourceUniverse: UniverseSnapshot
): NavigationResult {
  // Check coherence
  if (ship.crew.coherence < ship.navigation.coherence_threshold) {
    return {
      success: false,
      reason: 'insufficient_coherence',
      requiredCoherence: ship.navigation.coherence_threshold,
      actualCoherence: ship.crew.coherence,
    };
  }

  // Calculate emotional distance
  const emotionalDistance = calculateEmotionalDistance(
    ship.narrative.personality,
    targetBranch
  );

  if (emotionalDistance > ship.navigation.max_emotional_distance) {
    return {
      success: false,
      reason: 'emotional_distance_too_great',
      maxDistance: ship.navigation.max_emotional_distance,
      actualDistance: emotionalDistance,
    };
  }

  // Attempt navigation
  const navigationSuccess = Math.random() < ship.crew.coherence;

  if (!navigationSuccess) {
    // Failed navigation
    ship.navigation.failed_navigations++;

    // Decoherence from failure
    ship.crew.coherence -= ship.navigation.decoherence_rate * 10;

    return {
      success: false,
      reason: 'navigation_failed',
      decoherenceIncurred: ship.navigation.decoherence_rate * 10,
    };
  }

  // Success! Move ship to target branch
  ship.navigation.visited_branches.push(targetBranch);

  // Accumulate contamination from source
  const contamination = calculateContamination(sourceUniverse, targetBranch);

  if (contamination > 0.1) {
    ship.navigation.contamination_cargo.push({
      entity_id: ship.entityId || 'ship',
      source_timeline: sourceUniverse.identity.id,
      contamination_level: contamination,
    });
  }

  return {
    success: true,
    arrived: targetBranch,
    contaminationLevel: contamination,
  };
}

/**
 * Calculate contamination level from timeline mixing
 */
function calculateContamination(
  sourceUniverse: UniverseSnapshot,
  targetBranch: string
): number {
  const targetUniverse = loadUniverseSnapshot(targetBranch);

  if (!targetUniverse) return 1.0; // Max contamination if branch unknown

  // Contamination = divergence between universes
  const sourceMeta = getForkMetadata(sourceUniverse);
  const targetMeta = getForkMetadata(targetUniverse);

  if (!sourceMeta || !targetMeta) {
    // If either is root universe, low contamination
    return 0.1;
  }

  const divergence = calculateDivergenceScore(sourceUniverse, targetUniverse, sourceMeta);

  return divergence;
}
```

---

## Invasion Scenarios

### Types of Invasion

#### 1. Military Invasion

**Scenario:** Advanced civilization discovers primitive fork, conquers it

**Example:**
```
Universe A (advanced, year 3000, has spaceships)
↓ Discovers passage to
Universe B (primitive, year 500, medieval tech)

Universe A sends fleet through passage.
Universe B cannot resist.
Universe A conquers Universe B.
```

**Implementation:**
```typescript
/**
 * Military invasion through passage
 */
function invadeUniverse(
  attackerFleet: FleetTier,
  passage: PassageExtended,
  targetUniverse: UniverseSnapshot
): InvasionResult {
  // Fleet must traverse passage
  const traversalSuccess = traversePassage(attackerFleet, passage);

  if (!traversalSuccess) {
    return {
      success: false,
      reason: 'passage_traversal_failed',
    };
  }

  // Fleet arrives in target universe
  const defenderForces = getDefenderForces(targetUniverse);

  // Military strength comparison
  const attackerStrength = calculateFleetStrength(attackerFleet);
  const defenderStrength = calculateDefenseStrength(defenderForces);

  // Tech advantage modifier
  const techGap = calculateTechGap(attackerFleet, defenderForces);
  const attackerModifier = 1 + techGap; // +100% strength per tech era ahead

  const finalAttackerStrength = attackerStrength * attackerModifier;

  // Resolve invasion
  if (finalAttackerStrength > defenderStrength * 2) {
    // Overwhelming victory
    return {
      success: true,
      outcome: 'total_conquest',
      occupiedSystems: getAllSystems(targetUniverse),
      casualties: {
        attackerLosses: Math.floor(defenderStrength * 0.1),
        defenderLosses: defenderForces.totalShips,
      },
    };
  } else if (finalAttackerStrength > defenderStrength) {
    // Narrow victory
    return {
      success: true,
      outcome: 'partial_conquest',
      occupiedSystems: getStrategicSystems(targetUniverse),
      casualties: {
        attackerLosses: Math.floor(attackerFleet.squadrons.totalShips * 0.3),
        defenderLosses: Math.floor(defenderForces.totalShips * 0.7),
      },
    };
  } else {
    // Defeat
    return {
      success: false,
      outcome: 'invasion_repelled',
      casualties: {
        attackerLosses: Math.floor(attackerFleet.squadrons.totalShips * 0.6),
        defenderLosses: Math.floor(defenderForces.totalShips * 0.4),
      },
    };
  }
}

/**
 * Calculate technology gap between civilizations
 * Returns era difference (1 = 1 era ahead, 2 = 2 eras, etc.)
 */
function calculateTechGap(
  attacker: FleetTier,
  defender: DefenseForces
): number {
  // Tech level from ship types
  const attackerTech = getFleetTechLevel(attacker);
  const defenderTech = getDefenseTechLevel(defender);

  return Math.max(0, attackerTech - defenderTech);
}

/**
 * Get tech level from fleet composition
 */
function getFleetTechLevel(fleet: FleetTier): number {
  const shipTypes = fleet.squadrons.shipTypeBreakdown;

  // Stage 1 ships = tech level 1
  if (shipTypes.worldship > 0) return 1;

  // Stage 2 ships = tech level 2
  if (shipTypes.courier_ship > 0 || shipTypes.threshold_ship > 0 || shipTypes.brainship > 0) {
    return 2;
  }

  // Stage 3 ships = tech level 3
  if (shipTypes.probability_scout > 0 || shipTypes.timeline_merger > 0 || shipTypes.svetz_retrieval > 0) {
    return 3;
  }

  return 0; // No ships
}
```

#### 2. Cultural Invasion (Technology Uplift)

**Scenario:** Advanced civilization "uplifts" primitive fork with technology

**Example:**
```
Universe A (advanced) discovers Universe B (primitive).
Universe A shares technology (FTL, AI, biotech).
Universe B rapidly advances, but becomes dependent on Universe A.
Universe A controls Universe B through economic/cultural dominance.
```

**Implementation:**
```typescript
/**
 * Technology uplift invasion
 * Conquer through cultural/economic dominance, not military
 */
function performTechUplift(
  advancedCiv: CivilizationIdentity,
  primitiveCiv: CivilizationIdentity,
  techPackage: TechnologyPackage
): UpliftResult {
  // Transfer technology
  const transferSuccess = transferTechnology(primitiveCiv, techPackage);

  if (!transferSuccess) {
    return {
      success: false,
      reason: 'technology_transfer_failed',
    };
  }

  // Primitive civ gains tech, but becomes dependent
  const dependencyLevel = calculateDependency(techPackage);

  // Create trade agreement (one-sided, favors advanced civ)
  const tradeAgreement = createDependencyTrade(
    advancedCiv,
    primitiveCiv,
    dependencyLevel
  );

  // Cultural influence
  const culturalDominance = dependencyLevel * 0.8;

  return {
    success: true,
    outcome: 'cultural_conquest',
    dependencyLevel,
    culturalDominance,
    tradeAgreement,
  };
}

interface TechnologyPackage {
  technologies: string[];        // Research IDs
  totalEraJump: number;          // How many eras ahead
  dependencyItems: string[];     // Items primitive civ can't produce themselves
}
```

#### 3. Economic Invasion (Trade Dominance)

**Scenario:** Advanced civilization dominates primitive fork through trade

**Example:**
```
Universe A (wealthy) establishes trade with Universe B (poor).
Universe A provides cheap manufactured goods.
Universe B's local industry collapses (can't compete).
Universe B becomes economically dependent on Universe A.
Universe A extracts resources from Universe B at favorable rates.
```

**Implementation:**
```typescript
/**
 * Economic invasion through trade dominance
 */
function establishTradeDominance(
  wealthyCiv: CivilizationIdentity,
  poorCiv: CivilizationIdentity
): EconomicInvasionResult {
  // Create trade agreement heavily favoring wealthy civ
  const tradeAgreement: TradeAgreement = {
    id: generateTradeId(),
    scope: 'cross_universe',
    parties: [wealthyCiv, poorCiv],
    terms: [
      // Wealthy civ exports manufactured goods (cheap)
      {
        itemId: 'manufactured_goods',
        quantity: 1000,
        providedBy: wealthyCiv.id,
        receivedBy: poorCiv.id,
        delivery: { method: 'periodic', frequency: 100 },
        payment: { currency: 'gold', amount: 100 }, // Underpriced
      },
      // Wealthy civ imports raw resources (expensive for them)
      {
        itemId: 'raw_materials',
        quantity: 500,
        providedBy: poorCiv.id,
        receivedBy: wealthyCiv.id,
        delivery: { method: 'periodic', frequency: 100 },
        payment: { currency: 'gold', amount: 50 }, // Overpriced
      },
    ],
    status: 'active',
    // ... other fields
  };

  // Poor civ's local industry cannot compete
  const industrialCollapse = calculateIndustrialCollapse(poorCiv, tradeAgreement);

  // Economic dependency increases over time
  const economicDependency = industrialCollapse * 0.9;

  return {
    success: true,
    outcome: 'economic_conquest',
    tradeAgreement,
    industrialCollapse,
    economicDependency,
  };
}
```

### Invasion Defense Mechanics

**How primitive civilizations can defend:**

```typescript
/**
 * Defense strategies for invaded universe
 */
interface InvasionDefense {
  strategy: DefenseStrategy;
  effectiveness: number; // 0-1
}

type DefenseStrategy =
  | 'military_resistance'      // Fight back (usually fails against tech gap)
  | 'passage_destruction'      // Destroy passage to isolate invader
  | 'timeline_fork_escape'     // Fork timeline to create "clean" branch
  | 'cultural_preservation'    // Maintain culture despite occupation
  | 'insurgency'               // Guerrilla warfare
  | 'diplomatic_alliance';     // Ally with other universes

/**
 * Destroy passage to prevent further invasion
 */
function destroyPassage(
  passage: PassageExtended,
  defenderCiv: CivilizationIdentity
): { success: boolean; consequence?: string } {
  // Destroying passage isolates both universes
  const success = Math.random() < 0.7; // 70% success rate

  if (success) {
    passage.active = false;
    passage.metadata.stability = 0;

    return {
      success: true,
      consequence: 'Passage destroyed. Invader forces stranded. No further reinforcements.',
    };
  } else {
    return {
      success: false,
      consequence: 'Passage destruction failed. Invader has secured the passage.',
    };
  }
}

/**
 * Fork timeline to escape invasion
 * Creates new branch where invasion never happened
 */
function forkToEscapeInvasion(
  invadedUniverse: UniverseSnapshot,
  invasionStartTick: bigint
): UniverseSnapshot {
  // Fork at tick BEFORE invasion
  const forkTick = invasionStartTick - 1n;

  const escapeFork = createManualFork(
    invadedUniverse,
    forkTick,
    `${invadedUniverse.identity.name} (Escaped)`
  );

  // Original universe continues with invasion
  // Fork universe is "clean" (no invasion)

  // Close passage in fork (prevent re-invasion)
  const passages = getPassagesToUniverse(escapeFork.identity.id);
  passages.forEach(p => {
    p.active = false;
    p.metadata.isolation.allowTravelTo = false;
  });

  return escapeFork;
}
```

---

## Timeline Paradoxes and Resolution

### Meeting Yourself

**Scenario:** Agent travels to fork universe where their alternate self exists

**Paradox:**
- Agent Alice from Universe A enters Universe B
- Universe B has Alice' (alternate Alice)
- Both Alices exist in same universe

**Resolution:**

```typescript
/**
 * Handle paradox of meeting yourself
 */
function handleSelfMeetingParadox(
  travelerAgent: Entity,
  alternateAgent: Entity,
  targetUniverse: UniverseSnapshot
): ParadoxResolution {
  // Option 1: Quantum superposition (both exist)
  if (Math.random() < 0.5) {
    return {
      resolution: 'superposition',
      outcome: 'Both agents coexist. Traveler is marked as "out-of-phase".',
      travelerMarked: true,
      alternateMarked: false,
    };
  }

  // Option 2: Timeline fork (paradox creates new branch)
  else {
    const forkUniverse = forkUniverseAtTick(
      targetUniverse,
      BigInt(targetUniverse.time.universeTick),
      {
        reason: 'self_meeting_paradox',
        triggerEvent: { type: 'agent_duplication', agentId: travelerAgent.id },
        description: `Agent ${travelerAgent.id} met alternate self`,
      }
    );

    return {
      resolution: 'timeline_fork',
      outcome: 'Timeline forked. Traveler enters fork, alternate stays in original.',
      newForkId: forkUniverse.identity.id,
    };
  }
}
```

### Contamination Mechanics

**Contamination:** Entities/items from one timeline mixing with another

**Sources:**
1. Ship carries contaminated cargo (from SpaceshipComponent.contamination_cargo)
2. Agent memories from alternate timeline
3. Items crafted in one timeline, brought to another
4. Buildings constructed by traveler (foreign architecture)

**Effects of Contamination:**

```typescript
/**
 * Contamination effects on timeline stability
 */
function applyContaminationEffects(
  targetUniverse: UniverseSnapshot,
  contaminatedEntity: Entity,
  contaminationLevel: number
): void {
  // High contamination destabilizes timeline
  const forkMetadata = getForkMetadata(targetUniverse);
  const stabilityPenalty = contaminationLevel * 0.1;

  forkMetadata.divergence.divergenceScore += stabilityPenalty;

  // Record contamination event
  recordDivergenceEvent(
    targetUniverse,
    'timeline_contamination',
    `Entity ${contaminatedEntity.id} contaminated with ${contaminationLevel.toFixed(2)} from foreign timeline`,
    contaminationLevel
  );

  // High contamination (>0.8) triggers paradox check
  if (contaminationLevel > 0.8) {
    const paradoxCheck = checkContaminationParadox(
      targetUniverse,
      contaminatedEntity,
      contaminationLevel
    );

    if (paradoxCheck.paradoxDetected) {
      // Resolve via fork
      forkUniverseAtTick(
        targetUniverse,
        BigInt(targetUniverse.time.universeTick),
        {
          reason: 'contamination_paradox',
          triggerEvent: paradoxCheck.event,
          description: `High contamination (${contaminationLevel.toFixed(2)}) caused paradox`,
        }
      );
    }
  }
}

/**
 * Check if contamination creates paradox
 */
function checkContaminationParadox(
  universe: UniverseSnapshot,
  entity: Entity,
  contamination: number
): { paradoxDetected: boolean; event?: unknown } {
  // Paradox occurs if contaminated entity's existence contradicts timeline
  // Example: Agent from future with knowledge of events that haven't happened yet

  // Check entity components for future knowledge
  const hasMemoryComponent = entity.components.some(c => c.type === 'memory');

  if (hasMemoryComponent && contamination > 0.8) {
    // Agent has memories from future/alternate timeline
    // This is a paradox if memories reference events that don't exist here

    return {
      paradoxDetected: true,
      event: {
        type: 'future_knowledge',
        entityId: entity.id,
        contaminationLevel: contamination,
      },
    };
  }

  return { paradoxDetected: false };
}
```

### Paradox Triggers Fork

**Core Principle:** Paradoxes are resolved by forking, not by preventing them

**Why:**
- Conservation of game matter (never delete entities)
- Player agency (actions have consequences, not restrictions)
- Emergent narrative (paradoxes create interesting stories)

**Implementation:**
```typescript
/**
 * Generic paradox resolution via fork
 */
function resolveParadoxViaFork(
  universe: UniverseSnapshot,
  paradoxType: string,
  paradoxData: unknown
): UniverseSnapshot {
  const currentTick = BigInt(universe.time.universeTick);

  const forkUniverse = forkUniverseAtTick(
    universe,
    currentTick,
    {
      reason: 'paradox_resolution',
      triggerEvent: { type: paradoxType, data: paradoxData },
      description: `Paradox resolved via fork: ${paradoxType}`,
    }
  );

  // Original universe "rejects" paradox (clean timeline)
  // Fork universe "accepts" paradox (altered timeline)

  return forkUniverse;
}
```

---

## Merge Mechanics

### Timeline Merger Ships

**Purpose:** Reduce timeline proliferation by collapsing compatible branches

**Compatibility Criteria:**

```typescript
/**
 * Check if two branches can be merged
 */
function checkBranchCompatibility(
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot
): BranchCompatibility {
  // Must share common ancestor
  const commonAncestor = findCommonAncestor(branch1, branch2);
  if (!commonAncestor) {
    return {
      compatible: false,
      reason: 'no_common_ancestor',
      conflicts: [],
    };
  }

  // Calculate divergence
  const metadata1 = getForkMetadata(branch1);
  const metadata2 = getForkMetadata(branch2);
  const divergence = calculateDivergenceScore(branch1, branch2, metadata1);

  // Branches must be similar (divergence < 0.3)
  if (divergence > 0.3) {
    return {
      compatible: false,
      reason: 'too_divergent',
      divergenceScore: divergence,
      conflicts: [],
    };
  }

  // Find conflicts
  const conflicts = findMergeConflicts(branch1, branch2);

  // All conflicts must be resolvable
  const allResolvable = conflicts.every(c => c.resolvable);

  return {
    compatible: allResolvable,
    conflicts,
    divergenceScore: divergence,
  };
}
```

### Merge Conflicts

**Types of Merge Conflicts:**

```typescript
interface MergeConflict {
  conflictType: 'agent_state' | 'building_exists' | 'item_quantity' | 'terrain_difference';
  entityId: string;
  parentValue: unknown;  // State in branch1
  forkValue: unknown;    // State in branch2
  resolvable: boolean;
}

/**
 * Find all merge conflicts between two branches
 */
function findMergeConflicts(
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot
): MergeConflict[] {
  const conflicts: MergeConflict[] = [];

  // Agent conflicts
  const agents1 = branch1.entities.filter(e => e.components.some(c => c.type === 'identity'));
  const agents2 = branch2.entities.filter(e => e.components.some(c => c.type === 'identity'));

  for (const agent1 of agents1) {
    const agent2 = agents2.find(a => a.id === agent1.id);

    if (!agent2) {
      // Agent exists in branch1 but not branch2
      conflicts.push({
        conflictType: 'agent_state',
        entityId: agent1.id,
        parentValue: 'exists',
        forkValue: 'missing',
        resolvable: true, // Can add agent to merged timeline
      });
      continue;
    }

    // Agent exists in both, check if states differ
    const healthDiff = compareComponentField(agent1, agent2, 'health', 'current');
    if (healthDiff !== null) {
      conflicts.push({
        conflictType: 'agent_state',
        entityId: agent1.id,
        parentValue: healthDiff.value1,
        forkValue: healthDiff.value2,
        resolvable: true, // Can take max health
      });
    }

    // Similar checks for skills, inventory, etc.
  }

  // Building conflicts
  const buildings1 = branch1.entities.filter(e => e.components.some(c => c.type === 'building'));
  const buildings2 = branch2.entities.filter(e => e.components.some(c => c.type === 'building'));

  for (const building1 of buildings1) {
    const building2 = buildings2.find(b => b.id === building1.id);

    if (!building2) {
      conflicts.push({
        conflictType: 'building_exists',
        entityId: building1.id,
        parentValue: 'exists',
        forkValue: 'missing',
        resolvable: true, // Can add building
      });
    }
  }

  // Terrain conflicts (usually unresolvable)
  const terrainDiff = compareTerrainSnapshots(
    branch1.worldState.terrain,
    branch2.worldState.terrain
  );

  if (terrainDiff.different) {
    conflicts.push({
      conflictType: 'terrain_difference',
      entityId: 'terrain',
      parentValue: terrainDiff.branch1Hash,
      forkValue: terrainDiff.branch2Hash,
      resolvable: false, // Terrain changes are fundamental
    });
  }

  return conflicts;
}
```

### Merge Operation

**Merging Process:**

```typescript
/**
 * Merge two compatible branches
 * Returns merged universe
 */
function mergeBranches(
  branch1: UniverseSnapshot,
  branch2: UniverseSnapshot,
  compatibility: BranchCompatibility
): UniverseSnapshot {
  // Start with branch1 as base
  const merged: UniverseSnapshot = JSON.parse(JSON.stringify(branch1));

  // Resolve each conflict
  for (const conflict of compatibility.conflicts) {
    if (conflict.resolvable) {
      resolveConflict(merged, conflict, branch1, branch2);
    } else {
      // Unresolvable conflict - abort merge
      throw new Error(`Unresolvable conflict: ${conflict.conflictType} on ${conflict.entityId}`);
    }
  }

  // Update merged universe metadata
  merged.identity.id = generateUniverseId();
  merged.identity.name = `${branch1.identity.name} + ${branch2.identity.name} [Merged]`;
  merged.identity.parentId = findCommonAncestor(branch1, branch2);
  merged.identity.createdAt = Date.now();

  // Mark original branches as merged
  markBranchAsMerged(branch1.identity.id, merged.identity.id);
  markBranchAsMerged(branch2.identity.id, merged.identity.id);

  // Add merge metadata
  addMergeMetadata(merged, branch1.identity.id, branch2.identity.id);

  return merged;
}

/**
 * Mark branch as merged (deactivate, preserve snapshot)
 */
function markBranchAsMerged(
  branchId: string,
  mergedIntoId: string
): void {
  const branchStatus = getBranchStatus(branchId);
  branchStatus.active = false;
  branchStatus.mergedInto = mergedIntoId;
  branchStatus.mergedAt = Date.now();

  // Preserve snapshot for time travel / retrieval
  // (Conservation of game matter)
}
```

---

## TypeScript Interfaces Summary

### Complete Type Definitions

```typescript
// ============================================================================
// Fork Metadata
// ============================================================================

interface UniverseForkMetadata extends Component {
  type: 'universe_fork_metadata';

  forkTrigger: ForkTrigger;

  parentUniverse: {
    universeId: string;
    universeName: string;
    forkTick: bigint;
    multiverseTick: bigint;
  };

  divergence: {
    divergenceScore: number;
    majorDifferences: DivergenceEvent[];
    lastDivergenceUpdate: bigint;
  };

  canonEvents: CanonEvent[];

  mergeability: {
    compatibleWithParent: boolean;
    compatibleBranches: string[];
    mergeConflicts: MergeConflict[];
  };

  isolation: {
    allowTravelTo: boolean;
    allowTravelFrom: boolean;
    quarantineReason?: string;
  };
}

type ForkTrigger =
  | { type: 'causal_violation'; violation: CausalViolation }
  | { type: 'player_choice'; reason: string }
  | { type: 'natural_divergence'; event: CriticalEvent; probability: number }
  | { type: 'timeline_merger_split'; mergerShipId: string };

interface DivergenceEvent {
  tick: bigint;
  eventType: string;
  description: string;
  divergenceImpact: number;
}

interface CanonEvent {
  tick: bigint;
  eventType: string;
  description: string;
  resistanceStrength: number;
  wasAltered: boolean;
  alteration?: {
    forkTick: bigint;
    originalOutcome: string;
    actualOutcome: string;
    divergenceImpact: number;
  };
  convergence?: {
    attempting: boolean;
    convergenceStrength: number;
    estimatedConvergenceTick: bigint;
  };
}

// ============================================================================
// Passages (Extended)
// ============================================================================

interface PassageExtended extends PassageSnapshot {
  metadata: {
    discoveredAt: bigint;
    discoveredBy?: EntityId;

    stability: number;
    decayRate: number;

    traversalCost: {
      energyCost: number;
      timeCost: number;
      riskFactor: number;
    };

    restrictions: {
      requiresShip: boolean;
      minimumCoherence: number;
      maxEntitySize: number;
      allowedShipTypes: SpaceshipType[];
    };

    traffic: {
      totalCrossings: number;
      lastCrossing: bigint;
      congestion: number;
    };
  };
}

// ============================================================================
// Navigation
// ============================================================================

interface NavigationResult {
  success: boolean;
  reason?: string;
  arrived?: string;
  contaminationLevel?: number;
  requiredCoherence?: number;
  actualCoherence?: number;
  decoherenceIncurred?: number;
  branchInfo?: BranchObservation;
  entered?: boolean;
}

interface BranchObservation {
  exists: boolean;
  branchId?: string;
  divergence?: number;
  stability?: number;
  population?: number;
  threatLevel?: number;
  safeToEnter?: boolean;
  error?: string;
}

// ============================================================================
// Invasion
// ============================================================================

interface InvasionResult {
  success: boolean;
  outcome?: 'total_conquest' | 'partial_conquest' | 'invasion_repelled';
  reason?: string;
  occupiedSystems?: string[];
  casualties?: {
    attackerLosses: number;
    defenderLosses: number;
  };
}

interface UpliftResult {
  success: boolean;
  outcome?: 'cultural_conquest';
  reason?: string;
  dependencyLevel?: number;
  culturalDominance?: number;
  tradeAgreement?: TradeAgreement;
}

interface EconomicInvasionResult {
  success: boolean;
  outcome?: 'economic_conquest';
  tradeAgreement?: TradeAgreement;
  industrialCollapse?: number;
  economicDependency?: number;
}

interface InvasionDefense {
  strategy: DefenseStrategy;
  effectiveness: number;
}

type DefenseStrategy =
  | 'military_resistance'
  | 'passage_destruction'
  | 'timeline_fork_escape'
  | 'cultural_preservation'
  | 'insurgency'
  | 'diplomatic_alliance';

// ============================================================================
// Paradoxes
// ============================================================================

interface ParadoxResolution {
  resolution: 'superposition' | 'timeline_fork' | 'rejection';
  outcome: string;
  travelerMarked?: boolean;
  alternateMarked?: boolean;
  newForkId?: string;
}

// ============================================================================
// Merge
// ============================================================================

interface BranchCompatibility {
  compatible: boolean;
  reason?: string;
  conflicts: MergeConflict[];
  divergenceScore?: number;
}

interface MergeConflict {
  conflictType: 'agent_state' | 'building_exists' | 'item_quantity' | 'terrain_difference';
  entityId: string;
  parentValue: unknown;
  forkValue: unknown;
  resolvable: boolean;
}

interface MergeResult {
  success: boolean;
  reason?: string;
  mergedUniverseId?: string;
  conflictsResolved?: number;
  requiredCoherence?: number;
  actualCoherence?: number;
  conflicts?: MergeConflict[];
}

// ============================================================================
// Critical Events (Natural Divergence)
// ============================================================================

interface CriticalEvent {
  type: 'binary_choice' | 'multi_choice';
  description: string;
  option1Probability?: number;
  option2Probability?: number;
  options?: Array<{ name: string; probability: number }>;
}
```

---

## Integration with Existing Systems

### 1. Save/Load System

**Snapshots Enable Time Travel:**

```typescript
/**
 * Load universe at specific tick (for forking)
 */
function loadSnapshotAtTick(
  universeId: string,
  targetTick: bigint
): UniverseSnapshot | null {
  // Use existing persistence system
  const snapshots = listSnapshotsForUniverse(universeId);

  // Find snapshot closest to targetTick
  const closestSnapshot = snapshots.reduce((closest, snapshot) => {
    const snapshotTick = BigInt(snapshot.time.universeTick);
    const closestTick = BigInt(closest.time.universeTick);

    const distTarget = abs(snapshotTick - targetTick);
    const distClosest = abs(closestTick - targetTick);

    return distTarget < distClosest ? snapshot : closest;
  });

  return closestSnapshot;
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
```

### 2. Trade System

**Cross-Universe Trade:**

```typescript
/**
 * Trade agreements can span universes
 * Uses existing TradeScope: 'cross_universe'
 */
function createCrossUniverseTrade(
  civ1: CivilizationIdentity, // Universe A
  civ2: CivilizationIdentity, // Universe B
  passage: PassageExtended
): TradeAgreement {
  const agreement: TradeAgreement = {
    id: generateTradeId(),
    scope: 'cross_universe',
    parties: [civ1, civ2],
    terms: [
      {
        itemId: 'exotic_matter',
        quantity: 100,
        providedBy: civ1.id,
        receivedBy: civ2.id,
        delivery: {
          method: 'periodic',
          frequency: 1000,
          deliveryLocation: {
            passageId: passage.id,
            requiresEscrow: false,
          },
        },
        payment: { currency: 'gold', amount: 500 },
      },
    ],
    mediators: [],
    status: 'active',
    proposedAt: getCurrentTick(),
    // ... other fields from TradeAgreementTypes
  };

  return agreement;
}
```

### 3. Hilbert-Time System

**Causal Ordering:**

```typescript
/**
 * Every cross-universe event uses Hilbert-Time
 */
function sendCrossUniverseShipment(
  shipment: TradeShipment,
  sourceUniverse: UniverseSnapshot,
  targetUniverse: UniverseSnapshot
): void {
  // Create Hilbert-Time coordinate for shipment
  const sourceTime = getCurrentHilbertTime(sourceUniverse);
  const targetTime = getCurrentHilbertTime(targetUniverse);

  const shipmentCoordinate: HilbertTimeCoordinate = {
    tau: sourceTime.tau,
    beta: sourceTime.beta,
    sigma: sourceTime.sigma + 1,
    origin: sourceUniverse.identity.id,
    causalParents: [
      {
        universeId: sourceUniverse.identity.id,
        tau: sourceTime.tau,
        beta: sourceTime.beta,
        sigma: sourceTime.sigma,
      },
    ],
  };

  // Check for causal violation on receipt
  const knownCoordinates = getKnownCoordinates(targetUniverse);
  const violation = detectCausalViolation(
    shipmentCoordinate,
    targetTime,
    knownCoordinates
  );

  if (violation && violation.resolution === 'fork') {
    // Fork target universe to resolve
    const forkUniverse = handleCausalViolation(
      targetUniverse,
      shipmentCoordinate,
      knownCoordinates
    );

    // Deliver shipment to fork
    deliverShipment(shipment, forkUniverse);
  } else {
    // No violation, deliver normally
    deliverShipment(shipment, targetUniverse);
  }
}
```

---

## Summary

This spec defines **multiverse mechanics** for universe forking, travel, and invasion:

**Universe Forking:**
- 3 triggers: Causal violation, player choice, natural divergence
- Fork metadata tracks divergence, canon events, merge compatibility
- Divergence score measures timeline difference (0-1)

**Canon Events:**
- Resistant to change (narrative inevitability)
- Convergence pressure pulls timelines back to canon
- Timeline stability from canon adherence

**Inter-Universe Travel:**
- Passages (thread, bridge, gate, confluence) with stability/cost
- Probability scouts observe branches without entering
- Timeline mergers collapse compatible forks
- Svetz retrievals extract from extinct timelines
- Ships navigate via emotional distance and coherence

**Invasion Scenarios:**
- Military invasion (fleet conquest)
- Cultural invasion (technology uplift)
- Economic invasion (trade dominance)
- Defense strategies (passage destruction, fork escape)

**Timeline Paradoxes:**
- Meeting yourself (superposition or fork)
- Contamination from timeline mixing
- Paradoxes trigger forks (conservation of game matter)

**Merge Mechanics:**
- Compatibility check (divergence < 0.3, resolvable conflicts)
- Merge conflicts (agent state, buildings, items, terrain)
- Merger ships collapse branches to reduce proliferation

**Integration:**
- Extends PassageSnapshot with metadata
- Uses Hilbert-Time for causal ordering
- Supports cross_universe TradeScope
- Snapshots enable time travel for forking

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-17
**Total Lines:** ~950
**Status:** Complete design document
