# Performance Budget & Optimization Strategy

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-17
**Dependencies:** 02-SOUL-AGENTS.md, 03-TIME-SCALING.md, 11-LLM-GOVERNORS.md, hierarchy-simulator package

## Overview

This spec defines performance constraints, resource budgets, and optimization strategies for the grand strategy system. The system must handle:

- **500 soul agents** in headless simulation (configurable cap)
- **Millions of years** of compressed time
- **Multiple zoom levels** (village → galaxy)
- **Thousands of entities** per tier
- **LLM-driven governance** at all scales

Performance is achieved through:
1. **Hierarchical simulation** - Statistical aggregation at higher tiers
2. **Intelligent culling** - SimulationScheduler integration
3. **Lazy loading** - Chunks loaded on-demand
4. **Memory management** - Tiered data retention
5. **Background processing** - Worker threads for non-critical work

---

## Target Performance Metrics

### Frame Rate Targets

| Zoom Level | Target TPS | Target FPS | Entity Count | Notes |
|------------|-----------|-----------|--------------|-------|
| Village/City | 20 TPS | 60 FPS | 100-500 | Full ECS simulation |
| Region/Nation | 20 TPS | 60 FPS | 500-2,000 | Partial aggregation |
| Continent/Planet | 10 TPS | 60 FPS | 2,000-5,000 | Heavy aggregation |
| Star System | 5 TPS | 60 FPS | 5,000-10,000 | Statistical simulation |
| Galaxy/Council | 1 TPS | 60 FPS | 10,000+ | Pure differential equations |

**Rationale:**
- **TPS** (Ticks Per Second) scales down at higher zoom - less granular simulation needed
- **FPS** (Frames Per Second) stays constant - rendering must remain smooth
- Decoupled render loop allows FPS >> TPS at higher tiers

### Latency Targets

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Zoom transition | 100ms | 500ms | Chunk load + entity spawn |
| Time jump (100 years) | 1s | 5s | Background simulation |
| Time jump (1,000 years) | 10s | 30s | Era simulation |
| Time jump (10,000 years) | 60s | 300s | Statistical projection |
| Save snapshot | 500ms | 2s | Gzip compression |
| Load snapshot | 1s | 5s | Decompression + hydration |
| LLM governance decision | 2s | 10s | Per tier per decision |

### Memory Budget

**Total Budget:** 4 GB (browser environment)

| Component | Budget | Notes |
|-----------|--------|-------|
| Soul agents (500 × 60KB) | 30 MB | Always in memory |
| Active tier ECS | 500 MB | Full entity data |
| Semi-active tiers (3 × 100MB) | 300 MB | Aggregated data |
| Inactive tiers | 50 MB | Summary statistics only |
| Chunk cache | 400 MB | LRU eviction |
| Snapshot history | 800 MB | Compressed saves |
| Renderer assets | 500 MB | Sprites, textures |
| LLM context cache | 200 MB | Prompt fragments |
| System overhead | 650 MB | JS runtime, buffers |

**Total:** ~4 GB

---

## Memory Budget per Tier

### Active Tier (Current Zoom Level)

**Budget:** 500 MB

```typescript
interface ActiveTierMemory {
  // Full ECS data
  entities: Entity[];           // 100-5,000 entities
  components: ComponentStore;   // All component types
  systems: System[];            // Active systems only

  // Spatial chunks
  chunks: ChunkData[];          // 9x9 grid around player
  chunkCache: LRUCache<Chunk>;  // Recently visited

  // Per-entity memory
  perEntity: 50_000;            // 50 KB average
  maxEntities: 10_000;          // Hard limit
}
```

**Entity Size Breakdown:**
- **Agent:** ~60 KB (skills, memories, relationships, inventory)
- **Building:** ~20 KB (components, resources, workers)
- **Resource:** ~5 KB (type, quantity, quality)
- **Ship:** ~30 KB (crew, cargo, systems)
- **Planet:** ~100 KB (terrain, resources, population)

### Semi-Active Tiers (±1 Zoom Level)

**Budget:** 100 MB per tier, 3 tiers = 300 MB

```typescript
interface SemiActiveTierMemory {
  // Aggregated data only
  summaries: EntitySummary[];    // 1,000-10,000 summaries
  statistics: TierStatistics;    // Differential equations state
  events: Event[];               // Recent significant events

  // No full components
  // No spatial chunks
  // No individual skills/memories

  perSummary: 10_000;            // 10 KB per summary
  maxSummaries: 10_000;          // Per tier
}

interface EntitySummary {
  id: string;
  type: 'agent' | 'building' | 'ship' | 'planet';
  position: Vec3;
  tier: number;

  // Aggregated stats
  powerRating: number;
  resourceValue: number;
  population?: number;

  // No detailed components
}
```

### Inactive Tiers (≥2 Zoom Levels Away)

**Budget:** 50 MB total

```typescript
interface InactiveTierMemory {
  // Statistics only
  tierStats: {
    population: number;
    resourceTotals: ResourceMap;
    powerDistribution: number[];
    eventCounts: EventCountMap;
  };

  // Differential equation state
  derivatives: DifferentialState;

  // No individual entities
  // No summaries
  // Pure mathematics
}
```

### Soul Agents (Always Active)

**Budget:** 600 MB

```typescript
interface SoulAgentMemory {
  souls: SoulAgent[];           // 500 souls (configurable max)
  perSoul: 60_000;              // 60 KB each

  // Always in memory because:
  // - Cross-tier continuity
  // - Reincarnation across scales
  // - Player connection to characters
  // - Narrative coherence
}

// Soul agent data
interface SoulAgent {
  soulId: string;               // UUID
  currentEntityId: string;      // Current vessel
  tier: number;                 // Current zoom level

  // Core identity (immutable)
  personality: Personality;     // 1 KB
  coreTalents: Talent[];        // 2 KB

  // Cross-life continuity
  pastLives: PastLife[];        // 10 KB (compressed)
  karmaBalance: number;
  soulAge: number;

  // Current life
  memories: Memory[];           // 20 KB (working set)
  skills: SkillMap;             // 10 KB
  relationships: Relationship[]; // 15 KB
  inventory: Item[];            // 10 KB
}
```

**Soul Memory Optimization:**
- **Tiered memories:** Working set (last 100 ticks) in RAM, rest compressed
- **Skill consolidation:** Merge similar skills across lives
- **Relationship pruning:** Keep only active relationships
- **Inventory culling:** Store only equipped + significant items

---

## LLM Call Budget

### Per-Tier Call Limits

Based on **11-LLM-GOVERNORS.md** cost analysis:

| Tier | Calls/Minute | Calls/Hour | Cost/Hour | Trigger |
|------|--------------|------------|-----------|---------|
| Village/City | 6 | 360 | $0.36 | Every 10 ticks |
| Region/Nation | 3 | 180 | $0.18 | Every 20 ticks |
| Continent/Planet | 1 | 60 | $0.06 | Every 60 ticks |
| Star System | 0.5 | 30 | $0.03 | Every 120 ticks |
| Galaxy/Council | 0.25 | 15 | $0.015 | Every 240 ticks |

**Total:** ~645 calls/hour = **$0.645/hour** (LLM cost scales with governors, not soul count)

### Batching Strategies

```typescript
interface LLMBatchStrategy {
  // Batch similar decisions
  batchSize: number;            // Max decisions per call
  batchWindow: number;          // Ticks to accumulate

  // Village example:
  // - 10 agents need orders
  // - Batch into single "assign work orders" call
  // - Context: village state, available tasks
  // - Output: 10 agent orders

  // Nation example:
  // - 5 cities need resource allocation
  // - Batch into "distribute national resources" call
  // - Context: national economy, city needs
  // - Output: 5 allocation plans
}
```

**Batching Rules:**
1. **Spatial batching:** Group decisions in same chunk
2. **Temporal batching:** Accumulate over batch window
3. **Functional batching:** Group same decision type
4. **Priority unbatching:** Emergency decisions skip batching

### Cost Control

```typescript
interface LLMCostControl {
  // Per-tier budgets
  hourlyBudget: Map<Tier, number>;
  dailyBudget: Map<Tier, number>;

  // Throttling
  cooldownAfterCall: number;     // Min ticks between calls
  exponentialBackoff: boolean;   // On rate limit

  // Fallbacks
  fallbackToRuleSystem: boolean; // If over budget
  cacheDecisions: boolean;       // Reuse similar contexts

  // Monitoring
  costAccumulator: CostTracker;
  alertThreshold: number;        // Alert if >80% budget
}
```

### Context Size Optimization

| Tier | Max Context | Input Tokens | Output Tokens | Notes |
|------|-------------|--------------|---------------|-------|
| Village | 4,000 | 3,500 | 500 | Full village state |
| Region | 6,000 | 5,500 | 500 | Summary of cities |
| Continent | 8,000 | 7,500 | 500 | Statistical overview |
| Star System | 4,000 | 3,500 | 500 | Orbital mechanics only |
| Galaxy | 2,000 | 1,500 | 500 | Pure strategy |

**Context Compression:**
- Use **entity summaries** instead of full data
- **Schema-based prompts** - consistent structure reduces tokens
- **Cached fragments** - reuse stable context parts
- **Incremental updates** - only changed data

---

## Chunk Loading/Unloading

### Active Radius per Zoom Level

```typescript
interface ChunkLoadingStrategy {
  tiers: {
    village: {
      activeRadius: 3,      // 7×7 chunks (49 chunks)
      chunkSize: 32,        // 32×32 tiles
      preloadRadius: 1,     // Prefetch adjacent
      unloadDelay: 60,      // Seconds before unload
    },
    region: {
      activeRadius: 2,      // 5×5 chunks (25 chunks)
      chunkSize: 64,        // 64×64 tiles
      preloadRadius: 1,
      unloadDelay: 120,
    },
    planet: {
      activeRadius: 1,      // 3×3 chunks (9 chunks)
      chunkSize: 128,       // 128×128 tiles
      preloadRadius: 0,     // No preload
      unloadDelay: 300,
    },
    starSystem: {
      activeRadius: 1,      // 3×3 sectors
      chunkSize: 256,       // 256×256 AU grid
      preloadRadius: 0,
      unloadDelay: 600,
    },
  };
}
```

### Load Prediction

```typescript
interface ChunkLoadPredictor {
  // Predict next chunks based on movement
  predictNext(
    currentChunk: ChunkId,
    velocity: Vec3,
    heading: number
  ): ChunkId[];

  // Algorithm:
  // 1. Project position 5 seconds ahead
  // 2. Calculate chunks along path
  // 3. Prioritize by distance + heading alignment
  // 4. Load in background worker
}

// Example: Ship moving east at 10 tiles/sec
// Current chunk: (5, 5)
// 5sec projection: (55, 5) → chunk (6, 5)
// Preload: (6, 5), (6, 4), (6, 6)
```

### Unload Strategy

```typescript
interface ChunkUnloadStrategy {
  // LRU cache with delay
  unloadCriteria: {
    distanceFromActive: number;  // Chunks away
    timeSinceVisit: number;      // Seconds
    playerCount: number;         // Players in chunk
    importanceScore: number;     // Event activity
  };

  // Unload priority (highest first):
  // 1. Distance > activeRadius + 2
  // 2. No players present
  // 3. Low importance score
  // 4. Time since visit > unloadDelay

  // Never unload:
  // - Player's current chunk
  // - Player's home base chunk
  // - Active battle chunks
  // - Chunks with running LLM decisions
}
```

### Cache Sizes

```typescript
interface ChunkCacheConfig {
  // Memory budget: 400 MB

  village: {
    maxCachedChunks: 100,        // 100 × 2 MB = 200 MB
    perChunkSize: 2_000_000,     // 2 MB (full entity data)
  },

  region: {
    maxCachedChunks: 50,         // 50 × 3 MB = 150 MB
    perChunkSize: 3_000_000,     // 3 MB (aggregated cities)
  },

  planet: {
    maxCachedChunks: 20,         // 20 × 2.5 MB = 50 MB
    perChunkSize: 2_500_000,     // 2.5 MB (terrain + summary)
  },

  starSystem: {
    maxCachedChunks: 10,         // 10 × 1 MB = 10 MB
    perChunkSize: 1_000_000,     // 1 MB (orbital elements)
  },
}
```

---

## Background Simulation Threading

### Thread Allocation

```typescript
interface ThreadStrategy {
  // Main thread (60 FPS)
  mainThread: {
    rendering: true,
    playerInput: true,
    criticalSystems: [
      'PlayerMovement',
      'CameraControl',
      'UIUpdate',
    ],
    budgetPerFrame: 16.67, // ms (60 FPS)
  },

  // Simulation worker (20 TPS)
  simulationWorker: {
    ecs: true,
    activeTier: true,
    systems: 'all',
    budgetPerTick: 50, // ms (20 TPS)
  },

  // Background workers (no time constraint)
  backgroundWorkers: {
    count: navigator.hardwareConcurrency - 2, // Leave 2 cores
    tasks: [
      'ChunkGeneration',
      'PathfindingAStar',
      'LLMBatching',
      'SnapshotCompression',
      'StatisticalSimulation', // Higher tiers
    ],
  },
}
```

### Main Thread (Rendering)

**Budget:** 16.67ms per frame (60 FPS)

```typescript
// Render loop (requestAnimationFrame)
function renderLoop(timestamp: number) {
  const dt = timestamp - lastFrame;

  // 1. Update camera (2ms)
  camera.update(dt);

  // 2. Interpolate entity positions (3ms)
  // Smooth movement between simulation ticks
  renderer.interpolatePositions(lastTickState, nextTickState, alpha);

  // 3. Render scene (10ms)
  renderer.render(visibleEntities);

  // 4. Update UI panels (1ms)
  devPanel.update();

  // Total: ~16ms → 60 FPS
  requestAnimationFrame(renderLoop);
}
```

### Simulation Worker

**Budget:** 50ms per tick (20 TPS)

```typescript
// Simulation loop (setInterval 50ms)
function simulationTick(world: World) {
  const tickStart = performance.now();

  // 1. Process active tier systems (40ms)
  gameLoop.tick(world);

  // 2. Check semi-active tier events (5ms)
  hierarchySimulator.updateAdjacentTiers();

  // 3. Send state to main thread (2ms)
  postMessage({ type: 'state', entities: serializeEntities() });

  // 4. Performance check (1ms)
  const elapsed = performance.now() - tickStart;
  if (elapsed > 50) {
    console.warn(`Tick overrun: ${elapsed}ms`);
  }
}
```

### Background Workers

**No strict time budget** - complete when done

```typescript
// Worker 1: Chunk generation
workerPool.submit({
  task: 'generateChunk',
  chunkId: (x, y),
  priority: 'low',
  callback: (chunk) => chunkCache.insert(chunk),
});

// Worker 2: A* pathfinding (expensive)
workerPool.submit({
  task: 'calculatePath',
  start: pos1,
  goal: pos2,
  priority: 'high',
  callback: (path) => agent.setPath(path),
});

// Worker 3: Statistical simulation (higher tiers)
workerPool.submit({
  task: 'simulateGalaxyTier',
  deltaT: 1000, // years
  state: galaxyState,
  callback: (newState) => updateGalaxyState(newState),
});

// Worker 4: Snapshot compression
workerPool.submit({
  task: 'compressSnapshot',
  snapshot: worldState,
  algorithm: 'gzip',
  callback: (compressed) => saveToIndexedDB(compressed),
});
```

### Synchronization Points

```typescript
interface SynchronizationStrategy {
  // Main ↔ Simulation
  mainToSim: {
    frequency: 'every frame',  // 60 Hz
    data: ['playerInput', 'cameraPosition'],
  },

  simToMain: {
    frequency: 'every tick',   // 20 Hz
    data: ['entityStates', 'events'],
  },

  // Simulation ↔ Background
  simToBackground: {
    frequency: 'on demand',
    data: ['chunkRequests', 'pathRequests', 'llmRequests'],
  },

  backgroundToSim: {
    frequency: 'on completion',
    data: ['chunks', 'paths', 'llmResponses'],
  },
}
```

---

## Snapshot Compression

### Compression Strategy

```typescript
interface SnapshotCompressionStrategy {
  // Recent history: Full fidelity
  recent: {
    retention: 100,           // Last 100 snapshots
    interval: 60,             // Every 60s (1 min)
    compression: 'gzip-fast', // Light compression
    size: ~10_000_000,        // 10 MB per snapshot
    totalSize: 1_000_000_000, // 1 GB for recent
  },

  // Medium history: Era snapshots
  medium: {
    retention: 50,            // Last 50 eras
    interval: 3600,           // Every hour
    compression: 'gzip-best', // Heavy compression
    size: ~5_000_000,         // 5 MB per era
    totalSize: 250_000_000,   // 250 MB for eras
  },

  // Ancient history: Statistics only
  ancient: {
    retention: 100,           // Last 100 ancient eras
    interval: 86400,          // Every day
    compression: 'json',      // No binary data
    size: ~100_000,           // 100 KB (stats only)
    totalSize: 10_000_000,    // 10 MB for ancient
  },
}
```

### Era Snapshots vs Full Saves

```typescript
interface SnapshotType {
  // Full snapshot (every minute)
  full: {
    entities: Entity[];           // All entities
    components: ComponentData[];  // Full component state
    chunks: Chunk[];              // Active chunks
    soulAgents: SoulAgent[];      // All souls
    metadata: SnapshotMetadata;

    size: ~10_000_000,            // 10 MB
    compressionRatio: 0.3,        // 3:1 with gzip
    loadTime: 1000,               // 1s to decompress
  },

  // Era snapshot (every hour)
  era: {
    statistics: TierStatistics;   // Aggregated stats
    events: SignificantEvent[];   // Major events only
    soulAgents: SoulAgent[];      // Souls with compressed memories
    keyEntities: Entity[];        // Player bases, capitals, heroes

    size: ~5_000_000,             // 5 MB
    compressionRatio: 0.4,        // 2.5:1 with gzip
    loadTime: 500,                // 0.5s to decompress
  },

  // Ancient snapshot (every day)
  ancient: {
    statistics: TierStatistics;   // Pure numbers
    timeline: TimelineEvent[];    // Event log only

    size: ~100_000,               // 100 KB
    compressionRatio: 0.8,        // Minimal compression
    loadTime: 50,                 // 50ms to parse
  },
}
```

### Pruning Strategies

```typescript
interface SnapshotPruningStrategy {
  // Automatic pruning rules
  rules: [
    {
      condition: 'age > 7 days && type === "full"',
      action: 'compress to era',
    },
    {
      condition: 'age > 30 days && type === "era"',
      action: 'compress to ancient',
    },
    {
      condition: 'age > 365 days && type === "ancient"',
      action: 'archive to cold storage',
    },
  ],

  // Manual retention
  protectedSnapshots: [
    'player saved',       // Never auto-prune
    'universe fork',      // Keep fork points
    'era boundary',       // Keep millennium marks
    'major event',        // Player-flagged moments
  ],

  // Disk space management
  maxTotalSize: 2_000_000_000,  // 2 GB hard limit
  pruneWhenAbove: 1_800_000_000, // 1.8 GB soft limit
  pruneStrategy: 'oldest first, skip protected',
}
```

### Differential Compression

```typescript
interface DifferentialSnapshot {
  // Store delta from previous snapshot
  baseSnapshot: string;         // Reference snapshot ID
  delta: {
    added: Entity[];            // New entities
    removed: string[];          // Deleted entity IDs
    modified: Partial<Entity>[], // Changed components only
  },

  // Rebuilding
  rebuild(): Snapshot {
    const base = loadSnapshot(baseSnapshot);
    applyDelta(base, delta);
    return base;
  },

  // Size savings
  // Full snapshot: 10 MB
  // Delta (1 min): ~500 KB (20:1 ratio)
  // Delta (1 hour): ~2 MB (5:1 ratio)
}
```

---

## Culling Strategies

### SimulationScheduler Integration

**Existing system:** `packages/core/src/ecs/SIMULATION_SCHEDULER.md`

```typescript
interface CullingStrategy {
  // Reuse existing SimulationScheduler modes
  ALWAYS: {
    // Soul agents, player entities, governors
    cost: 'full simulation',
    entities: ['soul_agent', 'player', 'governor'],
  },

  PROXIMITY: {
    // Entities only when on-screen or nearby
    cost: 'conditional simulation',
    entities: ['npc', 'wildlife', 'plants', 'buildings'],
    radius: {
      village: 50,  // tiles
      region: 200,
      planet: 1000,
      star: 10000,  // AU
    },
  },

  PASSIVE: {
    // Zero per-tick cost, pure data
    cost: 'zero simulation',
    entities: ['resource_node', 'decoration', 'terrain'],
  },
}
```

### Distance-Based Culling

```typescript
interface DistanceCulling {
  // Simulation fidelity by distance
  tiers: [
    {
      distance: 0,     // 0-50 tiles
      fidelity: 1.0,   // Full simulation (20 TPS)
      systems: 'all',
    },
    {
      distance: 50,    // 50-200 tiles
      fidelity: 0.5,   // Half rate (10 TPS)
      systems: ['movement', 'combat', 'ai'],
    },
    {
      distance: 200,   // 200-1000 tiles
      fidelity: 0.1,   // 1/10 rate (2 TPS)
      systems: ['movement'],
    },
    {
      distance: 1000,  // 1000+ tiles
      fidelity: 0.0,   // No simulation
      systems: [],
    },
  ],
}
```

### Importance-Based Culling

```typescript
interface ImportanceCulling {
  // Entity importance scoring
  calculateImportance(entity: Entity): number {
    let score = 0;

    // Player-related
    if (entity.hasComponent('player')) score += 1000;
    if (entity.hasComponent('soul_agent')) score += 100;
    if (entity.hasTag('player_owned')) score += 50;

    // Social importance
    if (entity.hasComponent('governor')) score += 80;
    if (entity.hasComponent('hero')) score += 60;
    if (entity.hasComponent('family_head')) score += 40;

    // Economic importance
    const building = entity.getComponent('building');
    if (building?.tier >= 3) score += 30;

    // Military importance
    if (entity.hasComponent('military_unit')) {
      const unit = entity.getComponent('military_unit');
      score += unit.tier * 10;
    }

    // Event involvement
    if (entity.hasTag('active_quest')) score += 25;
    if (entity.hasTag('recent_combat')) score += 20;

    return score;
  },

  // Simulation allocation
  simulationBudget: 1000, // entities per tick
  allocation: {
    guaranteed: (entity) => entity.importance > 100,
    probable: (entity) => entity.importance > 50 ? 0.8 : 0.0,
    lottery: (entity) => entity.importance > 10 ? 0.2 : 0.0,
  },
}
```

### Aggregate Simulation (Higher Tiers)

```typescript
interface AggregateCulling {
  // Instead of simulating individuals, use statistics

  // Example: Planet tier - 10,000 villages
  // DON'T: Simulate each village's 100 agents (1M agents!)
  // DO: Simulate 1,000 "population units" with statistical behavior

  populationUnit: {
    represents: 1000,        // Agents per unit
    properties: {
      avgHealth: number,
      avgSkill: number,
      avgMorale: number,
      distribution: 'normal',
    },

    simulation: {
      // Differential equations
      dHealth_dt: (health, food, disease) => ...,
      dSkill_dt: (skill, education, tools) => ...,
      dMorale_dt: (morale, governance, events) => ...,
    },
  },

  // Result: 10,000 villages → 10,000 units (10,000 entities)
  // Instead of: 10,000 villages × 100 agents = 1,000,000 entities
  // Reduction: 100:1
}
```

---

## Scaling Limits

### Maximum Soul Agents

**Recommended:** 500 souls (configurable setting)
**Hard limit:** 1,000 souls

Soul agents are *meaningful named characters* - 500 is plenty for tracking ~10-20 per generation across millennia.

```typescript
interface SoulScalingLimits {
  recommended: {
    count: 500,
    memory: 30_000_000,       // 30 MB
    cpuPerTick: 2,            // ms

    rationale: [
      'Fits in memory budget',
      'Allows rich personalities',
      'Supports full memory systems',
      'Enables detailed relationships',
    ],
  },

  hard: {
    count: 1_000,
    memory: 60_000_000,       // 60 MB
    cpuPerTick: 15,           // ms

    tradeoffs: [
      'Compressed memories',
      'Simplified relationships',
      'Reduced personality depth',
      'Throttled LLM access',
    ],
  },

  // Beyond 1k: Not recommended
  // - Diminishing gameplay returns
  // - 500 souls already supports ~10-20 per generation across millennia
}
```

### Maximum Universe Forks

**Recommended:** 10 active universes
**Hard limit:** 100 total (including archived)

```typescript
interface UniverseForkLimits {
  active: {
    count: 10,
    memory: 500_000_000,      // 500 MB (active tier)
    snapshotSize: 50_000_000, // 50 MB per fork point

    rationale: [
      'Player can meaningfully track 10 timelines',
      'Each fork gets full simulation',
      'Allows rich narrative branching',
    ],
  },

  archived: {
    count: 90,
    memory: 100_000_000,      // 100 MB (compressed)
    snapshotSize: 1_000_000,  // 1 MB (statistics only)

    purpose: [
      'Historical record',
      'Can be reactivated',
      'Time travel archaeology',
    ],
  },

  // Forking strategy
  costPerFork: {
    snapshot: 50_000_000,     // Initial state
    divergence: 1_000_000,    // Per simulated day
    convergence: 0,           // If timelines merge
  },
}
```

### Maximum Time Jump

**Recommended:** 10,000 years
**Hard limit:** 1,000,000 years

```typescript
interface TimeJumpLimits {
  // Based on 03-TIME-SCALING.md

  tactical: {
    range: [0, 100],          // years
    method: 'full simulation',
    realTime: 10,             // seconds
    fidelity: 1.0,

    use: 'Immediate future, player sees all events',
  },

  strategic: {
    range: [100, 10_000],     // years
    method: 'era simulation',
    realTime: 60,             // seconds
    fidelity: 0.1,

    use: 'Generational changes, see major events only',
  },

  epochal: {
    range: [10_000, 1_000_000], // years
    method: 'statistical projection',
    realTime: 300,            // seconds
    fidelity: 0.01,

    use: 'Cosmic timescales, see civilizational patterns',
  },

  // Accuracy degrades with distance
  errorGrowth: {
    formula: 'error = baseError * sqrt(timeJump)',
    baseError: 0.01,          // 1% per century

    // Example: 10,000 year jump
    // error = 0.01 * sqrt(10000) = 0.01 * 100 = 1.0 (100%)
    // Meaning: Specific events unpredictable, trends accurate
  },
}
```

### Maximum Galaxy Size

**Recommended:** 1,000 star systems
**Hard limit:** 10,000 star systems

```typescript
interface GalaxySizeLimits {
  recommended: {
    stars: 1_000,
    planets: 5_000,           // 5 per star avg
    avgDistance: 10,          // ly between stars
    galaxyDiameter: 100,      // ly

    rationale: [
      'Manageable for player exploration',
      'Rich enough for diverse civilizations',
      'Fits in memory budget',
    ],
  },

  hard: {
    stars: 10_000,
    planets: 50_000,
    avgDistance: 10,          // ly
    galaxyDiameter: 1000,     // ly

    tradeoffs: [
      'Statistical simulation only',
      'Limited individual planet detail',
      'Longer load times',
      'Larger save files',
    ],
  },

  // Procedural generation allows "infinite" galaxy
  // But simulation/memory limits restrict active region
  simulationBubble: {
    activeStars: 100,         // Full simulation
    loadedStars: 1000,        // Cached data
    knownStars: 10000,        // Statistics only
    proceduralStars: Infinity, // Generated on-demand
  },
}
```

---

## Performance Testing

### Benchmark Suite

```typescript
interface PerformanceBenchmarks {
  // Micro benchmarks (isolate components)
  micro: [
    {
      name: 'Entity creation',
      test: () => createEntities(1000),
      target: 100,          // ms
      critical: true,
    },
    {
      name: 'Component query',
      test: () => queryComponents(10000),
      target: 10,           // ms
      critical: true,
    },
    {
      name: 'Pathfinding (100 tiles)',
      test: () => findPath(start, goal),
      target: 50,           // ms
      critical: false,
    },
    {
      name: 'LLM batching',
      test: () => batchDecisions(10),
      target: 2000,         // ms (network bound)
      critical: false,
    },
  ],

  // Macro benchmarks (whole system)
  macro: [
    {
      name: 'Village simulation (500 entities)',
      test: () => simulateTicks(100),
      target: 5000,         // ms (100 ticks at 20 TPS)
      critical: true,
    },
    {
      name: 'Zoom transition (village → region)',
      test: () => transitionZoom('village', 'region'),
      target: 500,          // ms
      critical: true,
    },
    {
      name: 'Time jump (1000 years)',
      test: () => timeJump(1000),
      target: 10000,        // ms
      critical: false,
    },
    {
      name: 'Save snapshot',
      test: () => saveSnapshot(),
      target: 2000,         // ms
      critical: false,
    },
    {
      name: 'Load snapshot',
      test: () => loadSnapshot(),
      target: 5000,         // ms
      critical: false,
    },
  ],

  // Stress tests (find breaking points)
  stress: [
    {
      name: 'Max entities (active tier)',
      test: () => createEntities(10000),
      expectFailure: false,
      maxTime: 60000,       // 60s
    },
    {
      name: 'Max soul agents',
      test: () => createSouls(1500),
      expectFailure: true,  // Should hit hard limit (1000 max)
      maxTime: 30000,       // 30s
    },
    {
      name: 'Max universe forks',
      test: () => forkUniverses(100),
      expectFailure: true,  // Should hit storage limit
      maxTime: 300000,      // 300s
    },
    {
      name: 'Max time jump',
      test: () => timeJump(1000000),
      expectFailure: false,
      maxTime: 600000,      // 600s (10 min)
    },
  ],
}
```

### Metrics Collection

```typescript
interface PerformanceMetrics {
  // Real-time metrics (during gameplay)
  realtime: {
    // Frame timing
    fps: Gauge,
    frameTime: Histogram,     // ms per frame
    frameBudget: 16.67,       // ms (60 FPS)

    // Tick timing
    tps: Gauge,
    tickTime: Histogram,      // ms per tick
    tickBudget: 50,           // ms (20 TPS)

    // System timing
    systemTimes: Map<SystemName, Histogram>,
    topSystems: System[],     // Slowest 10 systems

    // Memory
    heapUsed: Gauge,
    heapLimit: Gauge,
    entityCount: Gauge,
    componentCount: Gauge,

    // LLM
    llmCallsPerMinute: Gauge,
    llmCostPerHour: Gauge,
    llmLatency: Histogram,

    // Chunks
    chunksLoaded: Gauge,
    chunkLoadTime: Histogram,
    chunkCacheHitRate: Gauge,
  },

  // Session metrics (aggregate over time)
  session: {
    totalTicks: Counter,
    totalFrames: Counter,
    totalLLMCalls: Counter,
    totalLLMCost: Counter,

    avgFPS: Gauge,
    avgTPS: Gauge,
    avgMemory: Gauge,

    // Quality metrics
    frameDrops: Counter,      // Frames below 30 FPS
    tickOverruns: Counter,    // Ticks exceeding budget
    llmTimeouts: Counter,     // Failed LLM calls

    // Player experience
    zoomTransitions: Counter,
    timeJumps: Counter,
    saves: Counter,
    loads: Counter,
  },
}
```

### Degradation Thresholds

```typescript
interface DegradationThresholds {
  // When to alert/throttle/disable features

  performance: {
    fps: {
      warning: 45,          // Below 45 FPS
      critical: 30,         // Below 30 FPS
      action: 'reduce particle effects, lower render quality',
    },

    tps: {
      warning: 15,          // Below 15 TPS
      critical: 10,         // Below 10 TPS
      action: 'enable aggressive culling, pause non-critical systems',
    },

    tickTime: {
      warning: 60,          // 60ms tick (should be 50ms)
      critical: 100,        // 100ms tick
      action: 'skip background systems, reduce simulation fidelity',
    },
  },

  memory: {
    heap: {
      warning: 3_200_000_000,   // 3.2 GB (80%)
      critical: 3_600_000_000,  // 3.6 GB (90%)
      action: 'unload distant chunks, prune snapshot cache',
    },

    entities: {
      warning: 8_000,       // 80% of budget
      critical: 9_500,      // 95% of budget
      action: 'cull distant entities, compress soul memories',
    },
  },

  llm: {
    budget: {
      warning: 0.8,         // 80% of hourly budget
      critical: 1.0,        // 100% of budget
      action: 'fallback to rule systems, increase batching',
    },

    latency: {
      warning: 5000,        // 5s response
      critical: 10000,      // 10s response
      action: 'skip non-critical decisions, increase timeout',
    },
  },

  // Recovery actions
  recovery: {
    level1: [
      'reduce render quality',
      'increase culling distance',
      'throttle background systems',
    ],

    level2: [
      'pause non-critical systems',
      'unload distant chunks',
      'compress soul memories',
      'fallback to rule systems',
    ],

    level3: [
      'force garbage collection',
      'emergency snapshot save',
      'reload with reduced settings',
      'prompt user to close tabs',
    ],
  },
}
```

### Continuous Monitoring

```typescript
interface ContinuousMonitoring {
  // Background monitoring thread
  monitor: {
    interval: 1000,         // Check every second

    checks: [
      {
        metric: 'fps',
        threshold: 45,
        duration: 5000,     // 5s below threshold
        action: 'warn',
      },
      {
        metric: 'heapUsed',
        threshold: 3_200_000_000,
        duration: 10000,    // 10s above threshold
        action: 'cleanup',
      },
      {
        metric: 'tickTime',
        threshold: 60,
        duration: 3000,     // 3s above threshold
        action: 'throttle',
      },
    ],
  },

  // Metrics export
  export: {
    format: 'prometheus',
    endpoint: 'http://localhost:8766/metrics',
    interval: 10000,        // Export every 10s
  },

  // Alerting (admin dashboard)
  alerts: {
    channels: ['console', 'ui', 'dashboard'],
    severity: ['info', 'warning', 'critical'],

    rules: [
      {
        condition: 'fps < 30',
        severity: 'critical',
        message: 'Critical FPS drop - enable performance mode?',
        action: 'prompt user',
      },
      {
        condition: 'heapUsed > 3.6GB',
        severity: 'critical',
        message: 'Memory critical - force cleanup?',
        action: 'auto cleanup',
      },
    ],
  },
}
```

---

## Performance Budget Summary

### Target Configuration (500 souls)

| Component | Budget | Utilization | Headroom |
|-----------|--------|-------------|----------|
| **Memory** | 4 GB | 2.0 GB | 2.0 GB |
| **CPU (Tick)** | 50 ms | 25 ms | 25 ms |
| **CPU (Frame)** | 16.67 ms | 14 ms | 2.67 ms |
| **LLM Calls** | 645/hr | 500/hr | 145/hr |
| **LLM Cost** | $1/hr | $0.65/hr | $0.35/hr |
| **Storage** | 2 GB | 500 MB | 1.5 GB |

### Scaling Projections

| Soul Count | Memory | Tick Time | LLM Calls/hr | LLM Cost/hr | Viable? |
|------------|--------|-----------|--------------|-------------|---------|
| 100 | 6 MB | 2 ms | 645 | $0.65 | Yes (trivial) |
| 250 | 15 MB | 4 ms | 645 | $0.65 | Yes (easy) |
| 500 | 30 MB | 8 ms | 645 | $0.65 | Yes (recommended max) |
| 1,000 | 60 MB | 15 ms | 645 | $0.65 | Possible (hard limit) |

**Conclusion:** 500 souls is the recommended cap - enough for meaningful dynasties without bloat. LLM costs scale with governors, not souls.

### Optimization Priority

1. **Tier 1 (Critical):**
   - Implement SimulationScheduler culling
   - Enable chunk lazy loading
   - Add LLM batching
   - Optimize hot path queries

2. **Tier 2 (Important):**
   - Background worker threading
   - Snapshot compression
   - Memory pooling for entities
   - Statistical simulation for distant tiers

3. **Tier 3 (Nice to Have):**
   - GPU pathfinding acceleration
   - WebAssembly for math-heavy systems
   - IndexedDB streaming
   - Predictive chunk preloading

---

## Implementation Notes

### Phase 1: Profiling Infrastructure
- Add performance metrics collection
- Implement degradation monitoring
- Create benchmark suite
- Establish baselines

### Phase 2: Memory Optimization
- Implement tiered memory strategy
- Add chunk cache with LRU eviction
- Compress soul agent memories
- Prune snapshot history

### Phase 3: CPU Optimization
- Move to worker threads
- Implement SimulationScheduler integration
- Add distance/importance culling
- Optimize system hot paths

### Phase 4: LLM Optimization
- Implement batching strategies
- Add context compression
- Enable decision caching
- Set up cost monitoring

### Phase 5: Scaling Tests
- Run stress tests
- Measure degradation thresholds
- Tune parameters
- Document limits

---

## References

- **hierarchy-simulator** package: Statistical simulation patterns
- **03-TIME-SCALING.md**: Time jump algorithms
- **02-SOUL-AGENTS.md**: Soul memory requirements
- **11-LLM-GOVERNORS.md**: LLM cost analysis
- **SIMULATION_SCHEDULER.md**: Existing culling system
- **PERFORMANCE.md**: ECS optimization guidelines
- **SCHEDULER_GUIDE.md**: System priority ordering

---

## Open Questions

1. Should galaxy tier use pure differential equations or coarse-grained ECS?
2. What's the optimal snapshot compression algorithm (gzip vs custom binary)?
3. Can we use WebGPU for statistical simulations?
4. Should soul agent memories be stored in IndexedDB vs RAM?
5. How to handle performance on low-end hardware (2 GB RAM)?

---

**Next Steps:**
1. Implement metrics collection infrastructure
2. Run baseline benchmarks on current codebase
3. Prototype worker threading for background simulation
4. Test snapshot compression algorithms
5. Write performance testing harness
