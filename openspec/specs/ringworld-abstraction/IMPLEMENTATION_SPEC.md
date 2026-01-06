# Hierarchy Abstraction: Precise Implementation Spec

**Status**: Ready for Implementation
**Date**: 2026-01-06
**Goal**: Wire hierarchy simulator to real ECS data via aggregation systems

---

## File Structure

```
packages/core/src/
├── components/
│   ├── HierarchyTierComponent.ts       (NEW)
│   └── index.ts                        (MODIFY - add export)
├── systems/
│   ├── HierarchyMappingSystem.ts       (NEW)
│   ├── BeliefAggregationSystem.ts      (NEW)
│   ├── DeityPowerScalingSystem.ts      (NEW)
│   ├── registerAllSystems.ts           (MODIFY - register new systems)
│   └── index.ts                        (MODIFY - add exports)
├── hierarchy/
│   ├── TierDefinitions.ts              (NEW - spatial tier config)
│   ├── BeliefAggregator.ts             (NEW - aggregation logic)
│   └── index.ts                        (NEW)
└── index.ts                            (MODIFY - export hierarchy module)

packages/hierarchy-simulator/src/
├── bridge/
│   └── ECSBridge.ts                    (NEW - connects to core ECS)
├── simulation/
│   └── SimulationController.ts         (MODIFY - use ECSBridge)
└── main.ts                             (MODIFY - initialize bridge)
```

---

## Phase 1: Core Components

### 1.1 HierarchyTierComponent

**File:** `packages/core/src/components/HierarchyTierComponent.ts`

```typescript
/**
 * Tracks which spatial tier an entity belongs to.
 * Computed from position by HierarchyMappingSystem.
 */

import type { Component } from '../ecs/Component.js';

export interface HierarchyTierComponent extends Component {
  type: 'hierarchy_tier';

  // Spatial coordinates at each level
  chunk: { x: number; y: number };
  zone: { x: number; y: number };
  region: { x: number; y: number };
  subsection: { x: number; y: number };
  megasegment: { x: number; y: number };
  gigasegment: { x: number; y: number };

  // String IDs for lookup
  zoneId: string;
  regionId: string;
  subsectionId: string;
  megasegmentId: string;
  gigasegmentId: string;
  ringworldId: string;

  // Cache invalidation
  computedAtTick: number;
  positionHash: number;  // Hash of position to detect changes
}

export function createHierarchyTierComponent(
  partial?: Partial<HierarchyTierComponent>
): HierarchyTierComponent {
  return {
    type: 'hierarchy_tier',
    chunk: { x: 0, y: 0 },
    zone: { x: 0, y: 0 },
    region: { x: 0, y: 0 },
    subsection: { x: 0, y: 0 },
    megasegment: { x: 0, y: 0 },
    gigasegment: { x: 0, y: 0 },
    zoneId: 'zone_0_0',
    regionId: 'region_0_0',
    subsectionId: 'subsection_0_0',
    megasegmentId: 'megasegment_0_0',
    gigasegmentId: 'gigasegment_0_0',
    ringworldId: 'ringworld_alpha',
    computedAtTick: 0,
    positionHash: 0,
    ...partial,
  };
}
```

### 1.2 Register Component Type

**File:** `packages/core/src/components/index.ts`

Add to exports:
```typescript
export * from './HierarchyTierComponent.js';
```

**File:** `packages/core/src/ecs/ComponentTypes.ts`

Add to component type union:
```typescript
export type ComponentType =
  | 'agent'
  | 'position'
  // ... existing types ...
  | 'hierarchy_tier';  // ADD THIS
```

---

## Phase 2: Tier Definitions

### 2.1 TierDefinitions

**File:** `packages/core/src/hierarchy/TierDefinitions.ts`

```typescript
/**
 * Spatial tier configuration.
 * Defines how positions map to hierarchy levels.
 */

export interface TierScale {
  name: string;
  level: number;           // 0 = chunk, 6 = ringworld
  unitsPerParent: number;  // How many of this tier fit in parent
  label: string;           // Human-readable
  populationScale: [number, number];  // Min/max expected population
}

export const TIER_CONFIG: Record<string, TierScale> = {
  chunk: {
    name: 'chunk',
    level: 0,
    unitsPerParent: 16,    // 16 chunks per zone
    label: 'Chunk',
    populationScale: [0, 100],
  },
  zone: {
    name: 'zone',
    level: 1,
    unitsPerParent: 10,    // 10 zones per region
    label: 'Zone',
    populationScale: [100, 10_000],
  },
  region: {
    name: 'region',
    level: 2,
    unitsPerParent: 10,    // 10 regions per subsection
    label: 'Region',
    populationScale: [10_000, 1_000_000],
  },
  subsection: {
    name: 'subsection',
    level: 3,
    unitsPerParent: 10,    // 10 subsections per megasegment
    label: 'Subsection',
    populationScale: [1_000_000, 100_000_000],
  },
  megasegment: {
    name: 'megasegment',
    level: 4,
    unitsPerParent: 10,    // 10 megasegments per gigasegment
    label: 'Megasegment',
    populationScale: [100_000_000, 10_000_000_000],
  },
  gigasegment: {
    name: 'gigasegment',
    level: 5,
    unitsPerParent: 100,   // 100 gigasegments per ringworld
    label: 'Gigasegment',
    populationScale: [10_000_000_000, 1_000_000_000_000],
  },
  ringworld: {
    name: 'ringworld',
    level: 6,
    unitsPerParent: 1,     // Top level
    label: 'Ringworld',
    populationScale: [1_000_000_000_000, 100_000_000_000_000],
  },
};

// Tile size in world units
export const TILE_SIZE = 1;
export const CHUNK_SIZE = 16;  // tiles per chunk

// Compute tier coordinates from position
export function positionToTiers(x: number, y: number): {
  chunk: { x: number; y: number };
  zone: { x: number; y: number };
  region: { x: number; y: number };
  subsection: { x: number; y: number };
  megasegment: { x: number; y: number };
  gigasegment: { x: number; y: number };
} {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkY = Math.floor(y / CHUNK_SIZE);

  const zoneX = Math.floor(chunkX / TIER_CONFIG.zone.unitsPerParent);
  const zoneY = Math.floor(chunkY / TIER_CONFIG.zone.unitsPerParent);

  const regionX = Math.floor(zoneX / TIER_CONFIG.region.unitsPerParent);
  const regionY = Math.floor(zoneY / TIER_CONFIG.region.unitsPerParent);

  const subsectionX = Math.floor(regionX / TIER_CONFIG.subsection.unitsPerParent);
  const subsectionY = Math.floor(regionY / TIER_CONFIG.subsection.unitsPerParent);

  const megasegmentX = Math.floor(subsectionX / TIER_CONFIG.megasegment.unitsPerParent);
  const megasegmentY = Math.floor(subsectionY / TIER_CONFIG.megasegment.unitsPerParent);

  const gigasegmentX = Math.floor(megasegmentX / TIER_CONFIG.gigasegment.unitsPerParent);
  const gigasegmentY = Math.floor(megasegmentY / TIER_CONFIG.gigasegment.unitsPerParent);

  return {
    chunk: { x: chunkX, y: chunkY },
    zone: { x: zoneX, y: zoneY },
    region: { x: regionX, y: regionY },
    subsection: { x: subsectionX, y: subsectionY },
    megasegment: { x: megasegmentX, y: megasegmentY },
    gigasegment: { x: gigasegmentX, y: gigasegmentY },
  };
}

// Generate tier ID strings
export function tierCoordsToId(tier: string, x: number, y: number): string {
  return `${tier}_${x}_${y}`;
}
```

---

## Phase 3: Systems

### 3.1 HierarchyMappingSystem

**File:** `packages/core/src/systems/HierarchyMappingSystem.ts`

```typescript
/**
 * Maps entities to their spatial hierarchy tiers.
 * Runs early to ensure tier data is available for other systems.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import {
  positionToTiers,
  tierCoordsToId,
} from '../hierarchy/TierDefinitions.js';
import { createHierarchyTierComponent } from '../components/HierarchyTierComponent.js';

export class HierarchyMappingSystem implements System {
  readonly id = 'hierarchy_mapping';
  readonly priority = 15;  // After TimeSystem (10)
  readonly requiredComponents = ['position'] as const;

  private updateInterval = 20;  // Every 20 ticks (1 second)
  private lastUpdate = 0;
  private ringworldId = 'ringworld_alpha';  // Could be configurable

  initialize(_world: World, _eventBus: EventBus): void {
    // No initialization needed
  }

  update(world: World, entities: Entity[], _deltaTime: number): void {
    // Only update periodically (positions don't change that fast)
    if (world.tick - this.lastUpdate < this.updateInterval) {
      return;
    }
    this.lastUpdate = world.tick;

    for (const entity of entities) {
      const pos = entity.getComponent('position') as PositionComponent;
      if (!pos) continue;

      // Check if position changed (via hash)
      const posHash = this.hashPosition(pos.x, pos.y);
      const existingTier = entity.getComponent('hierarchy_tier');

      if (existingTier && existingTier.positionHash === posHash) {
        continue;  // Position unchanged, skip
      }

      // Compute new tier coordinates
      const tiers = positionToTiers(pos.x, pos.y);

      // Create or update component
      const tierComponent = createHierarchyTierComponent({
        chunk: tiers.chunk,
        zone: tiers.zone,
        region: tiers.region,
        subsection: tiers.subsection,
        megasegment: tiers.megasegment,
        gigasegment: tiers.gigasegment,
        zoneId: tierCoordsToId('zone', tiers.zone.x, tiers.zone.y),
        regionId: tierCoordsToId('region', tiers.region.x, tiers.region.y),
        subsectionId: tierCoordsToId('subsection', tiers.subsection.x, tiers.subsection.y),
        megasegmentId: tierCoordsToId('megasegment', tiers.megasegment.x, tiers.megasegment.y),
        gigasegmentId: tierCoordsToId('gigasegment', tiers.gigasegment.x, tiers.gigasegment.y),
        ringworldId: this.ringworldId,
        computedAtTick: world.tick,
        positionHash: posHash,
      });

      // Add or update component
      if (existingTier) {
        (world as any).updateComponent(entity.id, 'hierarchy_tier', () => tierComponent);
      } else {
        (world as any).addComponent(entity.id, tierComponent);
      }
    }
  }

  private hashPosition(x: number, y: number): number {
    // Simple hash for change detection
    return Math.floor(x) * 10000 + Math.floor(y);
  }
}
```

### 3.2 BeliefAggregationSystem

**File:** `packages/core/src/systems/BeliefAggregationSystem.ts`

```typescript
/**
 * Aggregates belief data from DeityComponents and SpiritualComponents
 * by spatial tier. Provides data for hierarchy visualization.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { HierarchyTierComponent } from '../components/HierarchyTierComponent.js';

export interface TierBeliefStats {
  tierId: string;
  tierLevel: string;
  population: number;
  totalBelievers: number;
  beliefDensity: number;
  byDeity: Map<string, number>;  // deityId -> believer count
  dominantDeity: string | null;
  totalBeliefPower: number;      // Sum of belief strength
}

export interface TierPopulationStats {
  tierId: string;
  total: number;
  byBehavior: Map<string, number>;
  avgHappiness: number;
  avgHealth: number;
}

export class BeliefAggregationSystem implements System {
  readonly id = 'belief_aggregation';
  readonly priority = 110;  // After DeityEmergenceSystem (100)
  readonly requiredComponents = [] as const;  // Queries multiple types

  private aggregationInterval = 100;  // Every 100 ticks (5 seconds)
  private lastAggregation = 0;
  private eventBus: EventBus | null = null;

  // Cached aggregations
  private beliefByTier: Map<string, TierBeliefStats> = new Map();
  private populationByTier: Map<string, TierPopulationStats> = new Map();

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, _entities: Entity[], _deltaTime: number): void {
    if (world.tick - this.lastAggregation < this.aggregationInterval) {
      return;
    }
    this.lastAggregation = world.tick;

    this.aggregateBeliefs(world);
    this.aggregatePopulation(world);

    // Emit event for listeners
    this.eventBus?.emit({
      type: 'hierarchy:stats_updated',
      timestamp: world.tick,
      data: {
        belief: Array.from(this.beliefByTier.entries()),
        population: Array.from(this.populationByTier.entries()),
      },
    });
  }

  private aggregateBeliefs(world: World): void {
    // Reset
    this.beliefByTier.clear();

    // Get all agents with spiritual beliefs and tier mapping
    const believers = world.query()
      .with('agent')
      .with('spiritual')
      .with('hierarchy_tier')
      .executeEntities();

    // Get all deities for reference
    const deities = world.query()
      .with('deity')
      .executeEntities();

    const deityMap = new Map<string, Entity>();
    for (const deity of deities) {
      deityMap.set(deity.id, deity);
    }

    // Aggregate by tier
    for (const agent of believers) {
      const spiritual = agent.getComponent('spiritual') as SpiritualComponent;
      const tier = agent.getComponent('hierarchy_tier') as HierarchyTierComponent;

      if (!spiritual || !tier) continue;

      // Add to each tier level
      const tierIds = [
        { id: tier.zoneId, level: 'zone' },
        { id: tier.regionId, level: 'region' },
        { id: tier.subsectionId, level: 'subsection' },
        { id: tier.megasegmentId, level: 'megasegment' },
        { id: tier.gigasegmentId, level: 'gigasegment' },
        { id: tier.ringworldId, level: 'ringworld' },
      ];

      for (const { id, level } of tierIds) {
        if (!this.beliefByTier.has(id)) {
          this.beliefByTier.set(id, {
            tierId: id,
            tierLevel: level,
            population: 0,
            totalBelievers: 0,
            beliefDensity: 0,
            byDeity: new Map(),
            dominantDeity: null,
            totalBeliefPower: 0,
          });
        }

        const stats = this.beliefByTier.get(id)!;
        stats.population++;

        // Count as believer if faith > threshold
        if (spiritual.faith > 0.1) {
          stats.totalBelievers++;
          stats.totalBeliefPower += spiritual.faith;

          const allegiance = spiritual.deityAllegiance;
          if (allegiance) {
            stats.byDeity.set(allegiance, (stats.byDeity.get(allegiance) || 0) + 1);
          }
        }
      }
    }

    // Calculate derived stats
    for (const stats of this.beliefByTier.values()) {
      stats.beliefDensity = stats.population > 0
        ? stats.totalBelievers / stats.population
        : 0;

      // Find dominant deity
      let maxCount = 0;
      for (const [deityId, count] of stats.byDeity) {
        if (count > maxCount) {
          maxCount = count;
          stats.dominantDeity = deityId;
        }
      }
    }
  }

  private aggregatePopulation(world: World): void {
    this.populationByTier.clear();

    const agents = world.query()
      .with('agent')
      .with('hierarchy_tier')
      .executeEntities();

    for (const agent of agents) {
      const agentComp = agent.getComponent('agent');
      const tier = agent.getComponent('hierarchy_tier') as HierarchyTierComponent;
      const needs = agent.getComponent('needs');

      if (!tier) continue;

      const tierIds = [
        tier.zoneId,
        tier.regionId,
        tier.subsectionId,
        tier.megasegmentId,
        tier.gigasegmentId,
        tier.ringworldId,
      ];

      for (const id of tierIds) {
        if (!this.populationByTier.has(id)) {
          this.populationByTier.set(id, {
            tierId: id,
            total: 0,
            byBehavior: new Map(),
            avgHappiness: 0,
            avgHealth: 0,
          });
        }

        const stats = this.populationByTier.get(id)!;
        stats.total++;

        if (agentComp?.currentBehavior) {
          const behavior = agentComp.currentBehavior;
          stats.byBehavior.set(behavior, (stats.byBehavior.get(behavior) || 0) + 1);
        }

        // Track happiness/health for averaging (will compute average later)
        if (needs) {
          stats.avgHappiness += needs.happiness || 0.5;
          stats.avgHealth += 1 - (needs.health || 0);
        }
      }
    }

    // Compute averages
    for (const stats of this.populationByTier.values()) {
      if (stats.total > 0) {
        stats.avgHappiness /= stats.total;
        stats.avgHealth /= stats.total;
      }
    }
  }

  // Public API for external access

  getBeliefStats(tierId: string): TierBeliefStats | undefined {
    return this.beliefByTier.get(tierId);
  }

  getPopulationStats(tierId: string): TierPopulationStats | undefined {
    return this.populationByTier.get(tierId);
  }

  getAllBeliefStats(): Map<string, TierBeliefStats> {
    return new Map(this.beliefByTier);
  }

  getAllPopulationStats(): Map<string, TierPopulationStats> {
    return new Map(this.populationByTier);
  }

  getTotalBelieversForDeity(deityId: string): number {
    // Get from ringworld level (top aggregation)
    for (const stats of this.beliefByTier.values()) {
      if (stats.tierLevel === 'ringworld') {
        return stats.byDeity.get(deityId) || 0;
      }
    }
    return 0;
  }
}
```

### 3.3 DeityPowerScalingSystem

**File:** `packages/core/src/systems/DeityPowerScalingSystem.ts`

```typescript
/**
 * Scales deity powers based on total belief.
 * Maps belief count to Kardashev scale and unlocks abilities.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import { BeliefAggregationSystem } from './BeliefAggregationSystem.js';

export interface DeityAbility {
  id: string;
  name: string;
  description: string;
  minPowerLevel: number;     // log10 of believers needed
  beliefCostPerUse: number;  // Belief spent per use
  cooldownTicks: number;
}

export const DEITY_ABILITIES: DeityAbility[] = [
  {
    id: 'answer_prayer',
    name: 'Answer Prayer',
    description: 'Respond to a believer\'s prayer with a small boon',
    minPowerLevel: 3,     // 1,000 believers
    beliefCostPerUse: 10,
    cooldownTicks: 0,
  },
  {
    id: 'small_miracle',
    name: 'Small Miracle',
    description: 'Perform a minor miracle visible to nearby believers',
    minPowerLevel: 4,     // 10,000 believers
    beliefCostPerUse: 100,
    cooldownTicks: 200,
  },
  {
    id: 'bless_temple',
    name: 'Bless Temple',
    description: 'Enhance a temple\'s effectiveness',
    minPowerLevel: 5,     // 100,000 believers
    beliefCostPerUse: 500,
    cooldownTicks: 1200,
  },
  {
    id: 'manifest_dream',
    name: 'Manifest in Dream',
    description: 'Appear in a believer\'s dream with a message',
    minPowerLevel: 5,
    beliefCostPerUse: 200,
    cooldownTicks: 400,
  },
  {
    id: 'regional_protection',
    name: 'Regional Protection',
    description: 'Shield a region from disasters',
    minPowerLevel: 7,     // 10,000,000 believers
    beliefCostPerUse: 10000,
    cooldownTicks: 2400,
  },
  {
    id: 'mass_vision',
    name: 'Mass Vision',
    description: 'Send a vision to all believers in a region',
    minPowerLevel: 8,     // 100,000,000 believers
    beliefCostPerUse: 50000,
    cooldownTicks: 4800,
  },
  {
    id: 'avatar_manifestation',
    name: 'Manifest Avatar',
    description: 'Create a physical avatar in the world',
    minPowerLevel: 10,    // 10,000,000,000 believers
    beliefCostPerUse: 1000000,
    cooldownTicks: 14400,
  },
  {
    id: 'dimensional_rift',
    name: 'Dimensional Rift',
    description: 'Open a portal to another ringworld',
    minPowerLevel: 12,    // 1,000,000,000,000 believers
    beliefCostPerUse: 100000000,
    cooldownTicks: 144000,
  },
  {
    id: 'hive_mind_initiation',
    name: 'Initiate Hive Mind',
    description: 'Begin merging consciousness with all believers',
    minPowerLevel: 14,    // 100,000,000,000,000 believers
    beliefCostPerUse: 0,  // One-way transformation
    cooldownTicks: Infinity,
  },
];

export class DeityPowerScalingSystem implements System {
  readonly id = 'deity_power_scaling';
  readonly priority = 115;  // After BeliefAggregationSystem
  readonly requiredComponents = ['deity'] as const;

  private eventBus: EventBus | null = null;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, entities: Entity[], _deltaTime: number): void {
    const beliefSystem = world.getSystem('belief_aggregation') as BeliefAggregationSystem;
    if (!beliefSystem) return;

    for (const deity of entities) {
      const deityComp = deity.getComponent('deity') as DeityComponent;
      if (!deityComp) continue;

      // Get total believers from aggregation
      const totalBelievers = beliefSystem.getTotalBelieversForDeity(deity.id);

      // Also factor in deity's internal belief tracking
      const totalBelief = Math.max(
        totalBelievers,
        deityComp.beliefs?.currentBelief || 0
      );

      // Calculate power level (log10 scale)
      const powerLevel = totalBelief > 0 ? Math.log10(totalBelief) : 0;

      // Determine Kardashev tier
      const kardashevTier = this.powerToKardashev(powerLevel);

      // Get available abilities
      const availableAbilities = DEITY_ABILITIES.filter(
        a => powerLevel >= a.minPowerLevel
      );

      // Check for tier-up events
      const oldPower = (deityComp as any).powerLevel || 0;
      const oldTier = this.powerToKardashev(oldPower);

      if (kardashevTier > oldTier) {
        this.eventBus?.emit({
          type: 'deity:tier_up',
          timestamp: world.tick,
          data: {
            deityId: deity.id,
            deityName: deityComp.identity?.primaryName,
            oldTier,
            newTier: kardashevTier,
            powerLevel,
            totalBelief,
          },
        });
      }

      // Update deity with power info (extend component)
      (world as any).updateComponent(deity.id, 'deity', (d: any) => ({
        ...d,
        powerLevel,
        kardashevTier,
        totalBelieversAggregated: totalBelievers,
        availableAbilities: availableAbilities.map(a => a.id),
      }));
    }
  }

  private powerToKardashev(power: number): number {
    // Power 3 (1K) = Type 1 (local deity)
    // Power 6 (1M) = Type 2 (regional spirit)
    // Power 9 (1B) = Type 3 (ringworld deity)
    // Power 12 (1T) = Type 4 (stellar)
    // ... etc
    if (power < 3) return 0;
    return Math.floor((power - 3) / 3) + 1;
  }

  // Public API
  getAbilitiesForDeity(deityId: string, world: World): DeityAbility[] {
    const deity = world.getEntity(deityId);
    if (!deity) return [];

    const deityComp = deity.getComponent('deity') as any;
    const powerLevel = deityComp?.powerLevel || 0;

    return DEITY_ABILITIES.filter(a => powerLevel >= a.minPowerLevel);
  }
}
```

### 3.4 Register Systems

**File:** `packages/core/src/systems/registerAllSystems.ts`

Add imports and registrations:

```typescript
// Add imports
import { HierarchyMappingSystem } from './HierarchyMappingSystem.js';
import { BeliefAggregationSystem } from './BeliefAggregationSystem.js';
import { DeityPowerScalingSystem } from './DeityPowerScalingSystem.js';

export function registerAllSystems(registry: ISystemRegistry): void {
  // ... existing registrations ...

  // Hierarchy abstraction systems
  registry.register(new HierarchyMappingSystem());      // priority 15
  registry.register(new BeliefAggregationSystem());     // priority 110
  registry.register(new DeityPowerScalingSystem());     // priority 115
}
```

**File:** `packages/core/src/systems/index.ts`

Add exports:

```typescript
export * from './HierarchyMappingSystem.js';
export * from './BeliefAggregationSystem.js';
export * from './DeityPowerScalingSystem.js';
```

---

## Phase 4: Hierarchy Module Index

**File:** `packages/core/src/hierarchy/index.ts`

```typescript
export * from './TierDefinitions.js';
```

**File:** `packages/core/src/index.ts`

Add export:

```typescript
export * from './hierarchy/index.js';
```

---

## Phase 5: Bridge to Hierarchy Simulator

### 5.1 ECS Bridge

**File:** `packages/hierarchy-simulator/src/bridge/ECSBridge.ts`

```typescript
/**
 * Bridge between hierarchy simulator UI and core ECS.
 * Reads real game data instead of mock data.
 */

import type { World } from '@ai-village/core';
import type { BeliefAggregationSystem, TierBeliefStats, TierPopulationStats } from '@ai-village/core';
import type { DeityPowerScalingSystem } from '@ai-village/core';

export interface DeityInfo {
  id: string;
  name: string;
  domain: string | undefined;
  totalBelief: number;
  followers: number;
  powerLevel: number;
  kardashevTier: number;
  availableAbilities: string[];
}

export interface TierInfo {
  id: string;
  level: string;
  population: number;
  believers: number;
  beliefDensity: number;
  dominantDeity: string | null;
  stability: number;
}

export class ECSBridge {
  private world: World | null = null;
  private beliefSystem: BeliefAggregationSystem | null = null;
  private powerSystem: DeityPowerScalingSystem | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(world: World): void {
    this.world = world;
    this.beliefSystem = world.getSystem('belief_aggregation') as BeliefAggregationSystem;
    this.powerSystem = world.getSystem('deity_power_scaling') as DeityPowerScalingSystem;

    // Subscribe to events
    world.eventBus.subscribe('hierarchy:stats_updated', (event) => {
      this.notifyListeners('stats_updated', event.data);
    });

    world.eventBus.subscribe('deity:tier_up', (event) => {
      this.notifyListeners('deity_tier_up', event.data);
    });
  }

  disconnect(): void {
    this.world = null;
    this.beliefSystem = null;
    this.powerSystem = null;
  }

  // Event subscription
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notifyListeners(event: string, data: any): void {
    for (const callback of this.listeners.get(event) || []) {
      callback(data);
    }
  }

  // Data access

  getAllDeities(): DeityInfo[] {
    if (!this.world) return [];

    return this.world.query()
      .with('deity')
      .executeEntities()
      .map(entity => {
        const deity = entity.getComponent('deity') as any;
        return {
          id: entity.id,
          name: deity.identity?.primaryName || 'Unknown',
          domain: deity.identity?.domain,
          totalBelief: deity.beliefs?.currentBelief || 0,
          followers: deity.followers?.size || 0,
          powerLevel: deity.powerLevel || 0,
          kardashevTier: deity.kardashevTier || 0,
          availableAbilities: deity.availableAbilities || [],
        };
      });
  }

  getDeityById(deityId: string): DeityInfo | null {
    if (!this.world) return null;

    const entity = this.world.getEntity(deityId);
    if (!entity) return null;

    const deity = entity.getComponent('deity') as any;
    if (!deity) return null;

    return {
      id: entity.id,
      name: deity.identity?.primaryName || 'Unknown',
      domain: deity.identity?.domain,
      totalBelief: deity.beliefs?.currentBelief || 0,
      followers: deity.followers?.size || 0,
      powerLevel: deity.powerLevel || 0,
      kardashevTier: deity.kardashevTier || 0,
      availableAbilities: deity.availableAbilities || [],
    };
  }

  getTierStats(tierId: string): TierInfo | null {
    if (!this.beliefSystem) return null;

    const belief = this.beliefSystem.getBeliefStats(tierId);
    const pop = this.beliefSystem.getPopulationStats(tierId);

    if (!belief) return null;

    return {
      id: tierId,
      level: belief.tierLevel,
      population: belief.population,
      believers: belief.totalBelievers,
      beliefDensity: belief.beliefDensity,
      dominantDeity: belief.dominantDeity,
      stability: pop?.avgHappiness ? pop.avgHappiness * 100 : 50,
    };
  }

  getAllTiers(): TierInfo[] {
    if (!this.beliefSystem) return [];

    const result: TierInfo[] = [];
    for (const [tierId, belief] of this.beliefSystem.getAllBeliefStats()) {
      const pop = this.beliefSystem.getPopulationStats(tierId);
      result.push({
        id: tierId,
        level: belief.tierLevel,
        population: belief.population,
        believers: belief.totalBelievers,
        beliefDensity: belief.beliefDensity,
        dominantDeity: belief.dominantDeity,
        stability: pop?.avgHappiness ? pop.avgHappiness * 100 : 50,
      });
    }
    return result;
  }

  getTotalPopulation(): number {
    if (!this.world) return 0;
    return this.world.query()
      .with('agent')
      .executeEntities()
      .length;
  }

  getTotalBelievers(): number {
    if (!this.beliefSystem) return 0;

    // Get ringworld-level stats
    for (const stats of this.beliefSystem.getAllBeliefStats().values()) {
      if (stats.tierLevel === 'ringworld') {
        return stats.totalBelievers;
      }
    }
    return 0;
  }

  getCurrentTick(): number {
    return this.world?.tick || 0;
  }
}

// Singleton for easy access
export const ecsBridge = new ECSBridge();
```

### 5.2 Update Hierarchy Simulator

The hierarchy simulator's `SimulationController` and `HierarchyDOMRenderer` should be updated to optionally use the ECS bridge instead of mock data. This allows:

1. **Mock mode** - Current behavior, for standalone testing
2. **Live mode** - Connected to real ECS, shows actual game data

---

## Phase 6: Event Types

**File:** `packages/core/src/events/EventMap.ts`

Add new event types:

```typescript
// Add to EventMap interface
interface EventMap {
  // ... existing events ...

  // Hierarchy events
  'hierarchy:stats_updated': {
    belief: Array<[string, TierBeliefStats]>;
    population: Array<[string, TierPopulationStats]>;
  };

  // Deity progression events
  'deity:tier_up': {
    deityId: string;
    deityName: string;
    oldTier: number;
    newTier: number;
    powerLevel: number;
    totalBelief: number;
  };

  'deity:ability_unlocked': {
    deityId: string;
    abilityId: string;
    abilityName: string;
  };
}
```

---

## Summary: Files to Create/Modify

### New Files (7)

| File | Purpose |
|------|---------|
| `packages/core/src/components/HierarchyTierComponent.ts` | Spatial tier tracking |
| `packages/core/src/hierarchy/TierDefinitions.ts` | Tier configuration |
| `packages/core/src/hierarchy/index.ts` | Module exports |
| `packages/core/src/systems/HierarchyMappingSystem.ts` | Position → tier mapping |
| `packages/core/src/systems/BeliefAggregationSystem.ts` | Belief aggregation |
| `packages/core/src/systems/DeityPowerScalingSystem.ts` | Power calculation |
| `packages/hierarchy-simulator/src/bridge/ECSBridge.ts` | UI ↔ ECS connection |

### Modified Files (5)

| File | Changes |
|------|---------|
| `packages/core/src/components/index.ts` | Export new component |
| `packages/core/src/ecs/ComponentTypes.ts` | Add 'hierarchy_tier' type |
| `packages/core/src/systems/registerAllSystems.ts` | Register new systems |
| `packages/core/src/systems/index.ts` | Export new systems |
| `packages/core/src/index.ts` | Export hierarchy module |

---

## Testing

After implementation:

1. **Unit test aggregation**: Create world with agents + deities, verify stats aggregate correctly
2. **Integration test**: Run game, verify hierarchy_tier components appear on agents
3. **UI test**: Connect hierarchy simulator to game, verify real data displays
4. **Performance test**: 1000 agents, verify aggregation runs in <10ms

---

## Usage Example

```typescript
// In hierarchy simulator main.ts
import { ecsBridge } from './bridge/ECSBridge.js';

// When game loop is available
ecsBridge.connect(gameLoop.world);

// Subscribe to updates
ecsBridge.on('stats_updated', (data) => {
  console.log('Population by tier:', data.population);
  renderer.updateFromECS(data);
});

// Get deity info
const deities = ecsBridge.getAllDeities();
console.log('Active deities:', deities);

// Get tier info
const ringworld = ecsBridge.getTierStats('ringworld_alpha');
console.log('Ringworld population:', ringworld?.population);
```
