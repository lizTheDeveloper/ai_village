# Integration: Hierarchy Simulator + Core ECS

**Status**: Design Draft
**Date**: 2026-01-06
**Goal**: Build hierarchy abstraction ON TOP of existing primitives, not parallel to them

## The Key Insight

The core game already has:
- `DeityComponent` with `currentBelief`, `beliefPerTick`, `followers`, `totalBeliefEarned`
- `DeityEmergenceSystem` that detects when beliefs crystallize
- `CityManager` that aggregates population stats and makes strategic decisions
- `SpiritualComponent` on agents tracking their faith and deity allegiance

**We don't need to reinvent belief tracking.** We need to:
1. AGGREGATE existing belief data across spatial regions
2. VISUALIZE it at different zoom levels
3. ADD higher-tier abstractions (ringworld, gigasegment) on top

## Architecture: Layered Abstraction

```
┌─────────────────────────────────────────────────────────────┐
│  HIERARCHY SIMULATOR UI                                      │
│  (Reads aggregated data, displays at chosen zoom level)      │
└─────────────────────────────────────────────────────────────┘
                              ↑ reads
┌─────────────────────────────────────────────────────────────┐
│  BeliefAggregationSystem (NEW)                              │
│  - Queries DeityComponents                                   │
│  - Aggregates by spatial region                              │
│  - Maintains hierarchy cache                                 │
└─────────────────────────────────────────────────────────────┘
                              ↑ reads
┌─────────────────────────────────────────────────────────────┐
│  EXISTING CORE SYSTEMS                                       │
│  - DeityEmergenceSystem (detects new deities)               │
│  - PrayerSystem (routes prayers → belief)                   │
│  - BeliefFormationSystem (agent belief dynamics)            │
│  - CityManager (city-level stats)                           │
└─────────────────────────────────────────────────────────────┘
                              ↑ reads/writes
┌─────────────────────────────────────────────────────────────┐
│  EXISTING COMPONENTS                                         │
│  - DeityComponent (belief, followers, miracles)             │
│  - SpiritualComponent (agent's faith, allegiance)           │
│  - PositionComponent (spatial location)                      │
│  - AgentComponent (current behavior, tier)                   │
└─────────────────────────────────────────────────────────────┘
```

## New Components

### 1. HierarchyTierComponent
Tracks which spatial tier an entity belongs to:

```typescript
// In packages/core/src/components/HierarchyTierComponent.ts

interface HierarchyTierComponent extends Component {
  type: 'hierarchy_tier';

  // Spatial hierarchy (derived from position)
  chunk: { x: number; y: number };
  zone: string;           // Computed from chunk
  region: string;         // Computed from zone
  subsection: string;     // Computed from region
  megasegment: string;    // Computed from subsection
  gigasegment: string;    // Computed from megasegment
  ringworld: string;      // Top level

  // Last computed tick (for caching)
  computedAtTick: number;
}
```

### 2. TierStatsComponent
Aggregated stats for a spatial tier (attached to tier entities):

```typescript
interface TierStatsComponent extends Component {
  type: 'tier_stats';

  tierLevel: 'chunk' | 'zone' | 'region' | 'subsection' | 'megasegment' | 'gigasegment' | 'ringworld';
  tierId: string;

  // Population (from agent queries)
  population: {
    total: number;
    bySpecies: Map<string, number>;
    byBehavior: Map<string, number>;
    birthRate: number;     // Per tick
    deathRate: number;     // Per tick
  };

  // Belief (aggregated from DeityComponents + SpiritualComponents)
  belief: {
    totalBelievers: number;
    byDeity: Map<string, number>;       // DeityId -> believer count
    beliefDensity: number;              // Believers / population
    dominantDeity: string | null;       // Most-worshipped
  };

  // Economy (from building/resource queries)
  economy: {
    buildings: number;
    productionRate: Map<string, number>;
    consumptionRate: Map<string, number>;
    surplus: Map<string, number>;
  };

  // Stability (computed from multiple factors)
  stability: {
    overall: number;        // 0-100
    food: number;
    safety: number;
    happiness: number;
    governance: number;
  };

  // Metadata
  lastUpdated: number;      // Tick
  updateInterval: number;   // How often to recompute
}
```

## New Systems

### 1. HierarchyMappingSystem
Maps entities to their spatial tiers:

```typescript
// In packages/core/src/systems/HierarchyMappingSystem.ts

class HierarchyMappingSystem implements System {
  id = 'hierarchy_mapping';
  priority = 15;  // After TimeSystem (10), before most others
  requiredComponents = ['position'];

  // Tier boundaries (could be world-specific)
  private readonly CHUNK_SIZE = 16;        // tiles
  private readonly ZONE_SIZE = 10;         // chunks per zone
  private readonly REGION_SIZE = 10;       // zones per region
  // ... etc

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const pos = entity.getComponent('position');

      // Compute tier membership
      const chunk = this.positionToChunk(pos);
      const zone = this.chunkToZone(chunk);
      const region = this.zoneToRegion(zone);
      // ... cascade up

      // Update component (world.updateComponent pattern)
      world.updateComponent(entity.id, 'hierarchy_tier', (existing) => ({
        ...existing,
        chunk,
        zone,
        region,
        // ...
        computedAtTick: world.tick
      }));
    }
  }

  // Coordinate conversions
  private positionToChunk(pos: Position): { x: number; y: number } {
    return {
      x: Math.floor(pos.x / this.CHUNK_SIZE),
      y: Math.floor(pos.y / this.CHUNK_SIZE)
    };
  }

  private chunkToZone(chunk: { x: number; y: number }): string {
    const zx = Math.floor(chunk.x / this.ZONE_SIZE);
    const zy = Math.floor(chunk.y / this.ZONE_SIZE);
    return `zone_${zx}_${zy}`;
  }
  // ... etc
}
```

### 2. BeliefAggregationSystem
Aggregates belief from DeityComponents by spatial tier:

```typescript
// In packages/core/src/systems/BeliefAggregationSystem.ts

class BeliefAggregationSystem implements System {
  id = 'belief_aggregation';
  priority = 110;  // After DeityEmergenceSystem (100)
  requiredComponents = [];  // Queries multiple component types

  private aggregationInterval = 100;  // Every 100 ticks (5 seconds)
  private lastAggregation = 0;

  // Cache: tierId -> aggregated stats
  private tierBeliefCache: Map<string, TierBeliefStats> = new Map();

  update(world: World, _entities: Entity[], _deltaTime: number): void {
    if (world.tick - this.lastAggregation < this.aggregationInterval) {
      return;
    }
    this.lastAggregation = world.tick;

    // Get all deities
    const deities = world.query()
      .with('deity')
      .executeEntities();

    // Get all agents with spiritual component and hierarchy tier
    const spiritualAgents = world.query()
      .with('agent')
      .with('spiritual')
      .with('hierarchy_tier')
      .executeEntities();

    // Aggregate by tier
    const aggregation = new Map<string, TierBeliefStats>();

    for (const agent of spiritualAgents) {
      const spiritual = agent.getComponent('spiritual');
      const tier = agent.getComponent('hierarchy_tier');

      // Aggregate at each level
      for (const levelId of [tier.zone, tier.region, tier.subsection,
                             tier.megasegment, tier.gigasegment, tier.ringworld]) {
        if (!aggregation.has(levelId)) {
          aggregation.set(levelId, this.createEmptyStats(levelId));
        }
        const stats = aggregation.get(levelId)!;

        stats.totalPopulation++;

        if (spiritual.faith > 0.1) {  // Has meaningful belief
          stats.totalBelievers++;
          const allegiance = spiritual.deityAllegiance;
          if (allegiance) {
            stats.byDeity.set(allegiance,
              (stats.byDeity.get(allegiance) || 0) + 1);
          }
        }
      }
    }

    // Also aggregate deity power (from DeityComponent.beliefs)
    for (const deity of deities) {
      const deityComp = deity.getComponent('deity');
      // Distribute belief power to tiers based on follower locations
      // ...
    }

    this.tierBeliefCache = aggregation;

    // Emit event for UI
    world.eventBus.emit({
      type: 'hierarchy:belief_aggregated',
      timestamp: world.tick,
      data: { tiers: Array.from(aggregation.entries()) }
    });
  }

  // Public API for UI
  getBeliefForTier(tierId: string): TierBeliefStats | null {
    return this.tierBeliefCache.get(tierId) || null;
  }

  getAllTierStats(): Map<string, TierBeliefStats> {
    return this.tierBeliefCache;
  }
}
```

### 3. DeityPowerScalingSystem
Scales deity powers based on aggregated belief:

```typescript
// In packages/core/src/systems/DeityPowerScalingSystem.ts

class DeityPowerScalingSystem implements System {
  id = 'deity_power_scaling';
  priority = 115;  // After BeliefAggregationSystem
  requiredComponents = ['deity'];

  update(world: World, entities: Entity[], deltaTime: number): void {
    const beliefSystem = world.getSystem('belief_aggregation') as BeliefAggregationSystem;

    for (const deity of entities) {
      const deityComp = deity.getComponent('deity');
      const totalBelief = deityComp.beliefs.currentBelief;

      // Calculate power level (log scale)
      const powerLevel = Math.log10(Math.max(1, totalBelief));

      // Determine available abilities
      const abilities = this.getAbilitiesForPower(powerLevel);

      // Update deity component with power info
      world.updateComponent(deity.id, 'deity', (d) => ({
        ...d,
        powerLevel,
        availableAbilities: abilities,
        tierReached: this.powerToKardashev(powerLevel)
      }));
    }
  }

  private powerToKardashev(power: number): number {
    // Power level 3 (1000 believers) = Type 1
    // Power level 6 (1M believers) = Type 2
    // Power level 9 (1B believers) = Type 3
    // Power level 12 (1T believers) = Type 4
    // ... etc
    return Math.floor(power / 3);
  }

  private getAbilitiesForPower(power: number): string[] {
    const abilities: string[] = [];
    if (power >= 3) abilities.push('answer_prayer');
    if (power >= 4) abilities.push('small_miracle');
    if (power >= 5) abilities.push('bless_temple');
    if (power >= 6) abilities.push('manifest_dream');
    if (power >= 7) abilities.push('regional_protection');
    if (power >= 8) abilities.push('mass_vision');
    if (power >= 9) abilities.push('avatar_manifestation');
    if (power >= 10) abilities.push('weather_control');
    if (power >= 11) abilities.push('geography_alteration');
    if (power >= 12) abilities.push('dimensional_rift');
    // ... etc
    return abilities;
  }
}
```

## UI Integration

The hierarchy simulator UI reads from these systems:

```typescript
// In packages/hierarchy-simulator/src/ECSIntegration.ts

class ECSHierarchyBridge {
  constructor(private world: World) {}

  // Get belief stats for a tier (for heat map)
  getBeliefForTier(tierId: string): TierBeliefStats | null {
    const system = this.world.getSystem('belief_aggregation') as BeliefAggregationSystem;
    return system?.getBeliefForTier(tierId) || null;
  }

  // Get all deity info (for deity dashboard)
  getAllDeities(): DeityInfo[] {
    return this.world.query()
      .with('deity')
      .executeEntities()
      .map(e => {
        const d = e.getComponent('deity');
        return {
          id: e.id,
          name: d.identity.primaryName,
          domain: d.identity.domain,
          belief: d.beliefs.currentBelief,
          followers: d.followers.size,
          powerLevel: d.powerLevel || 0,
          kardashevTier: d.tierReached || 0
        };
      });
  }

  // Get population stats aggregated by tier
  getPopulationByTier(): Map<string, number> {
    const system = this.world.getSystem('belief_aggregation') as BeliefAggregationSystem;
    const allStats = system?.getAllTierStats() || new Map();

    const result = new Map<string, number>();
    for (const [tierId, stats] of allStats) {
      result.set(tierId, stats.totalPopulation);
    }
    return result;
  }

  // Subscribe to hierarchy events
  onBeliefUpdate(callback: (data: any) => void): () => void {
    const handler = (event: any) => {
      if (event.type === 'hierarchy:belief_aggregated') {
        callback(event.data);
      }
    };
    this.world.eventBus.subscribe('hierarchy:belief_aggregated', handler);
    return () => this.world.eventBus.unsubscribe('hierarchy:belief_aggregated', handler);
  }
}
```

## Registration

Add new systems to the game loop:

```typescript
// In packages/core/src/systems/registerAllSystems.ts

export function registerAllSystems(registry: ISystemRegistry): void {
  // ... existing systems ...

  // Hierarchy abstraction systems
  registry.register(new HierarchyMappingSystem());      // priority 15
  registry.register(new BeliefAggregationSystem());     // priority 110
  registry.register(new DeityPowerScalingSystem());     // priority 115
}
```

## Benefits of This Approach

### 1. Single Source of Truth
- Belief data lives in `DeityComponent` and `SpiritualComponent`
- No duplicate tracking
- UI always reflects actual game state

### 2. Works With Existing Systems
- `DeityEmergenceSystem` continues to detect new deities
- `PrayerSystem` continues to route prayers
- `CityManager` continues to manage cities
- We just add aggregation on top

### 3. Scales Naturally
- As more agents are added, belief aggregates automatically
- As more deities emerge, they're included in aggregation
- Fast-forward simulation produces correct aggregates

### 4. Performance
- Aggregation runs every 100 ticks (5 seconds), not every frame
- Cached results available for UI
- Event-driven updates when data changes

### 5. Testable
- Can unit test aggregation with mock worlds
- Can run headless and verify aggregation logic
- Same code paths in fast-forward and real-time

## Migration Path

### Phase 1: Add Components
1. Add `HierarchyTierComponent` to component registry
2. Add `TierStatsComponent` for tier entities

### Phase 2: Add Systems
1. Implement `HierarchyMappingSystem` (assign tiers to entities)
2. Implement `BeliefAggregationSystem` (aggregate belief by tier)
3. Implement `DeityPowerScalingSystem` (scale deity powers)

### Phase 3: Connect UI
1. Create `ECSHierarchyBridge` in hierarchy-simulator package
2. Update renderer to read from bridge instead of mock data
3. Subscribe to events for real-time updates

### Phase 4: Remove Mock Data
1. Replace `DataGenerator.ts` with actual ECS queries
2. Remove `AbstractTierBase.ts` simulation (real ECS handles it)
3. Keep tier types for UI organization only

## Result

The hierarchy simulator becomes a **view layer** on top of the core ECS:
- No separate simulation engine
- Data comes from real game state
- Abstraction layers are just spatial aggregations
- Can switch between playing as agent (Type 0) and viewing as deity (Type 1-3) seamlessly
