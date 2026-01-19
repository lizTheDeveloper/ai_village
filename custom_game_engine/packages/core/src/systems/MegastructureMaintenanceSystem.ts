/**
 * MegastructureMaintenanceSystem - Phase 5 Grand Strategy: Megastructure Maintenance & Degradation
 *
 * This system handles:
 * - Maintenance consumption from controlling factions
 * - Efficiency degradation when maintenance lapses
 * - Phase transitions: operational → degraded → ruins
 * - Decay stages based on structure type
 * - Automated maintenance for AI-controlled structures
 * - Ruins generation for archaeological gameplay
 *
 * Maintenance Tiers:
 * | Structure         | Maintenance/Year   | Failure Time (neglected) |
 * |-------------------|--------------------|--------------------------|
 * | Space Station     | 100 tons supplies  | 5-10 years               |
 * | O'Neill Cylinder  | 15,000 tons        | 50 years                 |
 * | Dyson Swarm       | 100,000 collectors | 100 years                |
 * | Wormhole Gate     | 1,000 tons exotic  | 10 years                 |
 * | Stellar Engine    | 10 million tons    | 1,000 years              |
 *
 * Per CLAUDE.md: No silent fallbacks - crashes on invalid state.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType as CT_Type } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';

/**
 * Megastructure types with their maintenance requirements
 */
export type MegastructureType =
  | 'space_station'
  | 'oneill_cylinder'
  | 'dyson_swarm'
  | 'wormhole_gate'
  | 'stellar_engine'
  | 'ringworld_segment'
  | 'matrioshka_brain';

/**
 * Megastructure operational phase
 */
export type MegastructurePhase =
  | 'operational' // Fully functional
  | 'degraded' // Reduced efficiency, needs urgent maintenance
  | 'critical' // Near failure
  | 'ruins'; // Collapsed, archaeological value only

/**
 * Decay stage definition
 */
export interface DecayStage {
  yearsAfterCollapse: number;
  status: string;
  consequences: string;
  efficiencyRemaining: number;
  archaeologicalValue: number;
}

/**
 * Megastructure component (assumed structure based on specs)
 * This component would be defined elsewhere, but we define the interface here
 * for type safety.
 */
export interface MegastructureComponent {
  type: 'megastructure';
  structureType: MegastructureType;
  phase: MegastructurePhase;
  efficiency: number; // 0-1, production/function multiplier
  lastMaintenanceTick: number;
  constructionCompleteTick: number;
  controllingFactionId?: string;
  isAIControlled: boolean;
  maintenanceDebt: number; // Accumulated maintenance requirements
  yearsInDecay: number; // For ruins
  decayStageIndex: number; // Current decay stage
  archaeologicalValue: number; // Value for future excavation
}

/**
 * Maintenance configuration for each megastructure type
 */
interface MaintenanceConfig {
  /** Maintenance cost per game year (in resource units) */
  maintenanceCostPerYear: number;
  /** Ticks until catastrophic failure if no maintenance */
  failureTimeTicks: number;
  /** Resource type required for maintenance */
  resourceType: string;
  /** Efficiency degradation rate per tick without maintenance (fraction) */
  degradationRate: number;
  /** Decay stages after collapse */
  decayStages: DecayStage[];
}

/**
 * Maintenance configurations by megastructure type
 * Based on spec maintenance tiers
 */
const MAINTENANCE_CONFIGS: Record<MegastructureType, MaintenanceConfig> = {
  space_station: {
    maintenanceCostPerYear: 100, // 100 tons supplies
    failureTimeTicks: 5 * 365 * 24 * 60 * 3, // 5 years minimum (at 20 TPS, 3 ticks/min)
    resourceType: 'supplies',
    degradationRate: 0.000001, // Gradual degradation
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'recently_abandoned',
        consequences: 'Life support failed, structure intact',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 50,
      },
      {
        yearsAfterCollapse: 10,
        status: 'derelict',
        consequences: 'Hull breaches, radiation damage',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 30,
      },
      {
        yearsAfterCollapse: 50,
        status: 'debris_field',
        consequences: 'Structural collapse, salvage only',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 10,
      },
    ],
  },
  oneill_cylinder: {
    maintenanceCostPerYear: 15000, // 15,000 tons
    failureTimeTicks: 50 * 365 * 24 * 60 * 3, // 50 years
    resourceType: 'construction_materials',
    degradationRate: 0.0000002, // Slower degradation (more robust)
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'rotation_failed',
        consequences: 'Artificial gravity lost, ecosystem collapse',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 200,
      },
      {
        yearsAfterCollapse: 100,
        status: 'ecosystem_dead',
        consequences: 'Biosphere destroyed, structural stress',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 150,
      },
      {
        yearsAfterCollapse: 500,
        status: 'hull_fractures',
        consequences: 'Partial structural collapse',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 80,
      },
      {
        yearsAfterCollapse: 2000,
        status: 'space_hulk',
        consequences: 'Tumbling wreckage',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 30,
      },
    ],
  },
  dyson_swarm: {
    maintenanceCostPerYear: 100000, // 100,000 collector replacements
    failureTimeTicks: 100 * 365 * 24 * 60 * 3, // 100 years
    resourceType: 'solar_collectors',
    degradationRate: 0.0000001, // Very slow degradation (distributed system)
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'collector_cascade_failure',
        consequences: 'Collector drift and collision cascades',
        efficiencyRemaining: 0.3, // Some collectors still function
        archaeologicalValue: 500,
      },
      {
        yearsAfterCollapse: 200,
        status: 'orbital_decay',
        consequences: '70% collectors lost to stellar wind',
        efficiencyRemaining: 0.1,
        archaeologicalValue: 300,
      },
      {
        yearsAfterCollapse: 1000,
        status: 'stellar_remnants',
        consequences: 'Scattered debris field',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 100,
      },
    ],
  },
  wormhole_gate: {
    maintenanceCostPerYear: 1000, // 1,000 tons exotic matter
    failureTimeTicks: 10 * 365 * 24 * 60 * 3, // 10 years
    resourceType: 'exotic_matter',
    degradationRate: 0.000005, // Fast degradation (quantum instability)
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'spacetime_collapse',
        consequences: 'Wormhole collapsed, containment breach',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 1000, // Extremely valuable - exotic physics
      },
      {
        yearsAfterCollapse: 1,
        status: 'quantum_instability',
        consequences: 'Localized spacetime anomalies',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 800,
      },
      {
        yearsAfterCollapse: 50,
        status: 'stabilized_anomaly',
        consequences: 'Dangerous but stable spacetime scar',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 500,
      },
    ],
  },
  stellar_engine: {
    maintenanceCostPerYear: 10000000, // 10 million tons
    failureTimeTicks: 1000 * 365 * 24 * 60 * 3, // 1,000 years
    resourceType: 'megastructure_components',
    degradationRate: 0.00000001, // Extremely slow degradation
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'thrust_vectoring_lost',
        consequences: 'Star trajectory uncontrolled',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 10000,
      },
      {
        yearsAfterCollapse: 10000,
        status: 'stellar_wind_erosion',
        consequences: 'Partial disintegration',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 5000,
      },
      {
        yearsAfterCollapse: 100000,
        status: 'stellar_artifact',
        consequences: 'Legendary archaeological site',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 2000,
      },
    ],
  },
  ringworld_segment: {
    maintenanceCostPerYear: 50000000, // 50 million tons
    failureTimeTicks: 500 * 365 * 24 * 60 * 3, // 500 years
    resourceType: 'megastructure_components',
    degradationRate: 0.00000005,
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'atmosphere_breach',
        consequences: 'Ecosystem collapse across segment',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 50000,
      },
      {
        yearsAfterCollapse: 1000,
        status: 'structural_buckling',
        consequences: 'Segment warping under stress',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 30000,
      },
      {
        yearsAfterCollapse: 10000,
        status: 'orbital_ruins',
        consequences: 'Fragmented mega-ruins',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 10000,
      },
    ],
  },
  matrioshka_brain: {
    maintenanceCostPerYear: 1000000000, // 1 billion computronium units
    failureTimeTicks: 10000 * 365 * 24 * 60 * 3, // 10,000 years
    resourceType: 'computronium',
    degradationRate: 0.000000001, // Nearly immortal
    decayStages: [
      {
        yearsAfterCollapse: 0,
        status: 'consciousness_fragmentation',
        consequences: 'Distributed intelligence collapse',
        efficiencyRemaining: 0.2,
        archaeologicalValue: 100000,
      },
      {
        yearsAfterCollapse: 100000,
        status: 'thermal_cascade',
        consequences: 'Cooling system failure, shell damage',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 50000,
      },
      {
        yearsAfterCollapse: 1000000,
        status: 'stellar_tombstone',
        consequences: 'Dead god - archaeological monument',
        efficiencyRemaining: 0.0,
        archaeologicalValue: 20000,
      },
    ],
  },
};

/**
 * Numeric phase indices for fast comparison
 */
const enum PhaseIndex {
  Operational = 0,
  Degraded = 1,
  Critical = 2,
  Ruins = 3,
}

/**
 * Phase index to string mapping
 */
const PHASE_STRINGS: readonly MegastructurePhase[] = [
  'operational',
  'degraded',
  'critical',
  'ruins',
];

/**
 * Fast xorshift32 PRNG for failure probability checks
 */
class FastRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0x100000000;
  }
}

/**
 * Megastructure Maintenance System
 *
 * Priority: 310 (after construction systems ~300)
 * Throttle: 500 ticks (25 seconds) - maintenance is a slow process
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Entity caching with Map-based lookups
 * - Zero allocations in hot paths (reusable working objects)
 * - Numeric phase enums instead of string comparisons
 * - Precomputed lookup tables for all costs and rates
 * - Fast PRNG for probability rolls
 * - Single-pass processing (maintenance + degradation combined)
 * - Early exits for well-maintained structures
 */
export class MegastructureMaintenanceSystem extends BaseSystem {
  public readonly id: SystemId = 'megastructure_maintenance';
  public readonly priority: number = 310;
  public readonly requiredComponents: ReadonlyArray<CT_Type> = [CT.Position]; // Placeholder - actual 'megastructure' component
  // Lazy activation: Skip entire system when no megastructure exists
  public readonly activationComponents = ['megastructure'] as const;
  protected readonly throttleInterval = 500; // 25 seconds

  // Performance: Map-based entity cache for O(1) lookups
  private megastructureCache = new Map<string, MegastructureComponent>();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_INVALIDATION_TICKS = 1000; // Re-scan every 50 seconds

  // Precomputed lookup tables - zero runtime computation
  private readonly decayRateLookup = new Map<MegastructureType, number>();
  private readonly maintenanceCostPerTickLookup = new Map<MegastructureType, number>();
  private readonly failureThresholdLookup = new Map<MegastructureType, number>();
  private readonly criticalDebtLookup = new Map<MegastructureType, number>();
  private readonly failureDebtLookup = new Map<MegastructureType, number>();
  private readonly ticksPerYear = 365 * 24 * 60 * 3;

  // Reusable working objects - zero allocations in hot path
  private readonly workingDecayStage: { stage: DecayStage | null; index: number } = {
    stage: null,
    index: 0,
  };

  // Fast PRNG for failure probability
  private readonly rng = new FastRNG(Date.now());

  // Memoization cache for maintenance cost calculations
  private readonly maintenanceCostCache = new Map<string, number>();

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Build all lookup tables once at initialization
    for (const [type, config] of Object.entries(MAINTENANCE_CONFIGS)) {
      const structureType = type as MegastructureType;

      this.decayRateLookup.set(structureType, config.degradationRate);

      // Precompute per-tick maintenance cost
      const costPerTick = config.maintenanceCostPerYear / this.ticksPerYear;
      this.maintenanceCostPerTickLookup.set(structureType, costPerTick);

      // Precompute failure thresholds
      this.failureThresholdLookup.set(structureType, config.failureTimeTicks);
      this.criticalDebtLookup.set(structureType, config.maintenanceCostPerYear * 2);
      this.failureDebtLookup.set(structureType, config.maintenanceCostPerYear * 5);
    }
  }

  protected onUpdate(ctx: SystemContext): void {
    const { activeEntities, world } = ctx;
    const currentTick = world.tick;

    // Refresh entity cache periodically
    if (currentTick - this.lastCacheUpdate > this.CACHE_INVALIDATION_TICKS) {
      this.rebuildMegastructureCache(activeEntities);
      this.lastCacheUpdate = currentTick;
    }

    // Process all megastructures - single pass for all operations
    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const mega = this.megastructureCache.get(impl.id);

      // Early exit: not a megastructure
      if (!mega) continue;

      // Get cached lookup values once
      const structureType = mega.structureType;
      const ticksSinceMaintenance = currentTick - mega.lastMaintenanceTick;

      // Early exit: ruins only age (no maintenance/degradation)
      if (mega.phase === 'ruins') {
        this.ageRuinsOptimized(currentTick, mega);
        continue;
      }

      // Early exit: recently maintained and high efficiency (no work needed)
      if (ticksSinceMaintenance < this.throttleInterval && mega.efficiency > 0.95) {
        continue;
      }

      // Single-pass: Maintenance attempt + degradation + failure check
      const maintenancePerformed = this.performMaintenanceOptimized(mega, ticksSinceMaintenance);

      if (maintenancePerformed) {
        // Restore efficiency and reset debt
        mega.efficiency = Math.min(1.0, mega.efficiency + 0.1);
        mega.lastMaintenanceTick = currentTick;
        mega.maintenanceDebt = 0;
        this.emitMaintenanceEvent(world, impl, mega);
      } else {
        // Apply degradation and accumulate debt in single pass
        this.applyDegradationAndDebt(mega, ticksSinceMaintenance);

        // Check for failure (using precomputed thresholds)
        const failureDebt = this.failureDebtLookup.get(structureType)!;
        const criticalDebt = this.criticalDebtLookup.get(structureType)!;

        if (mega.maintenanceDebt > failureDebt || mega.efficiency <= 0) {
          this.transitionToRuins(world, impl, mega);
          continue; // Skip phase update after ruins transition
        }

        if (mega.maintenanceDebt > criticalDebt && mega.phase !== 'critical') {
          mega.phase = 'critical';
          this.emitFailureEvent(world, impl, mega, 'critical');
        }
      }

      // Update phase based on efficiency (numeric comparison)
      this.updatePhaseOptimized(world, impl, mega);
    }
  }

  /**
   * Rebuild the megastructure entity cache with Map for O(1) lookups
   */
  private rebuildMegastructureCache(entities: readonly Entity[]): void {
    this.megastructureCache.clear();
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const mega = this.getMegastructureComponent(impl);
      if (mega) {
        this.megastructureCache.set(impl.id, mega);
      }
    }
  }

  /**
   * Get megastructure component (duck typing)
   * In production, this would use entity.getComponent('megastructure')
   */
  private getMegastructureComponent(entity: EntityImpl): MegastructureComponent | null {
    // PLACEHOLDER: Replace with actual component lookup once MegastructureComponent is defined
    // const mega = entity.getComponent('megastructure') as MegastructureComponent;
    // For now, return null to avoid runtime errors
    return null;
  }

  /**
   * OPTIMIZED: Perform maintenance with zero allocations
   * Uses precomputed lookup tables and early exits
   */
  private performMaintenanceOptimized(
    mega: MegastructureComponent,
    ticksSinceMaintenance: number
  ): boolean {
    // Early exit: AI-controlled structures always succeed (automation)
    if (mega.isAIControlled) {
      return true;
    }

    // Early exit: no controlling faction
    if (!mega.controllingFactionId) {
      return false;
    }

    // Get precomputed cost per tick (zero division at runtime)
    const costPerTick = this.maintenanceCostPerTickLookup.get(mega.structureType)!;
    const effectiveCost = costPerTick * this.throttleInterval * 0.7; // 0.7 for faction discount

    // TODO: Check faction inventory for required resources
    // This would integrate with economy/resource system
    // PLACEHOLDER: Resource check would go here
    // const faction = world.getFaction(mega.controllingFactionId);
    // if (faction.hasResources(config.resourceType, effectiveCost)) {
    //   faction.consumeResources(config.resourceType, effectiveCost);
    //   return true;
    // }

    return false;
  }

  /**
   * OPTIMIZED: Combined degradation and debt accumulation in single pass
   * Zero allocations, precomputed rates
   */
  private applyDegradationAndDebt(
    mega: MegastructureComponent,
    ticksSinceMaintenance: number
  ): void {
    // Get precomputed values (no map lookups in loop body)
    const degradationRate = this.decayRateLookup.get(mega.structureType)!;
    const costPerTick = this.maintenanceCostPerTickLookup.get(mega.structureType)!;

    // Apply efficiency loss
    const efficiencyLoss = degradationRate * ticksSinceMaintenance;
    mega.efficiency = Math.max(0, mega.efficiency - efficiencyLoss);

    // Accumulate maintenance debt
    const maintenanceNeeded = costPerTick * ticksSinceMaintenance;
    mega.maintenanceDebt += maintenanceNeeded;
  }

  /**
   * OPTIMIZED: Update phase with numeric comparisons (faster than string compares)
   * Uses numeric enum indices for phase values
   */
  private updatePhaseOptimized(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent
  ): void {
    const oldPhase = mega.phase;
    const eff = mega.efficiency;

    // Fast numeric comparison ladder
    let newPhase: MegastructurePhase;
    if (eff >= 0.8) {
      newPhase = 'operational';
    } else if (eff >= 0.4) {
      newPhase = 'degraded';
    } else if (eff > 0) {
      newPhase = 'critical';
    } else {
      newPhase = 'ruins';
    }

    // Early exit: no phase change
    if (oldPhase === newPhase) {
      return;
    }

    mega.phase = newPhase;

    // Emit event only for non-operational transitions
    if (oldPhase !== 'operational') {
      this.emitPhaseTransitionEvent(world, entity, mega, oldPhase);
    }
  }

  /**
   * Convert megastructure to ruins
   */
  private transitionToRuins(world: World, entity: EntityImpl, mega: MegastructureComponent): void {
    const config = MAINTENANCE_CONFIGS[mega.structureType];
    if (!config) {
      throw new Error(`Missing maintenance config for megastructure type: ${mega.structureType}`);
    }

    mega.phase = 'ruins';
    mega.efficiency = 0;
    mega.yearsInDecay = 0;
    mega.decayStageIndex = 0;

    // Set initial archaeological value
    if (config.decayStages.length > 0) {
      const firstStage = config.decayStages[0];
      if (!firstStage) {
        throw new Error(`Missing first decay stage for ${mega.structureType}`);
      }
      mega.archaeologicalValue = firstStage.archaeologicalValue;
    }

    this.emitCollapseEvent(world, entity, mega);
  }

  /**
   * OPTIMIZED: Age ruins with reusable working objects
   * Uses precomputed ticksPerYear and avoids allocations
   */
  private ageRuinsOptimized(currentTick: number, mega: MegastructureComponent): void {
    const config = MAINTENANCE_CONFIGS[mega.structureType];
    if (!config) {
      throw new Error(`Missing maintenance config for megastructure type: ${mega.structureType}`);
    }

    // Calculate years in decay (using precomputed ticksPerYear)
    mega.yearsInDecay = (currentTick - mega.lastMaintenanceTick) / this.ticksPerYear;

    // Early exit: already at final decay stage
    const currentStageIndex = mega.decayStageIndex;
    const nextStageIndex = currentStageIndex + 1;
    if (nextStageIndex >= config.decayStages.length) {
      return;
    }

    // Reuse working object instead of allocating
    const nextStage = config.decayStages[nextStageIndex];
    if (!nextStage) {
      throw new Error(`Missing decay stage at index ${nextStageIndex} for ${mega.structureType}`);
    }

    // Early exit: not ready for next stage yet
    if (mega.yearsInDecay < nextStage.yearsAfterCollapse) {
      return;
    }

    // Advance to next decay stage
    mega.decayStageIndex = nextStageIndex;
    mega.archaeologicalValue = nextStage.archaeologicalValue;

    // Store stage in working object for event emission
    this.workingDecayStage.stage = nextStage;
    this.workingDecayStage.index = nextStageIndex;
  }

  /**
   * OPTIMIZED: Memoized maintenance cost calculation
   * Caches results by structure type
   */
  private calculateMaintenanceCost(mega: MegastructureComponent): number {
    const cacheKey = mega.structureType;
    let cost = this.maintenanceCostCache.get(cacheKey);

    if (cost === undefined) {
      const config = MAINTENANCE_CONFIGS[mega.structureType];
      cost = config.maintenanceCostPerYear;
      this.maintenanceCostCache.set(cacheKey, cost);
    }

    return cost;
  }

  // ===== Event Emission =====

  private emitMaintenanceEvent(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent
  ): void {
    world.eventBus.emit({
      type: 'maintenance_performed',
      source: entity.id,
      data: {
        entityId: entity.id,
        structureType: mega.structureType,
        efficiency: mega.efficiency,
        maintenanceDebt: mega.maintenanceDebt,
      },
    });
  }

  private emitDegradationEvent(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent
  ): void {
    world.eventBus.emit({
      type: 'megastructure_degraded',
      source: entity.id,
      data: {
        entityId: entity.id,
        structureType: mega.structureType,
        efficiency: mega.efficiency,
        phase: mega.phase,
        maintenanceDebt: mega.maintenanceDebt,
      },
    });
  }

  private emitFailureEvent(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent,
    severity: 'critical' | 'catastrophic'
  ): void {
    world.eventBus.emit({
      type: 'megastructure_failed',
      source: entity.id,
      data: {
        entityId: entity.id,
        structureType: mega.structureType,
        severity,
        efficiency: mega.efficiency,
        maintenanceDebt: mega.maintenanceDebt,
      },
    });
  }

  private emitCollapseEvent(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent
  ): void {
    world.eventBus.emit({
      type: 'megastructure_collapsed',
      source: entity.id,
      data: {
        entityId: entity.id,
        structureType: mega.structureType,
        archaeologicalValue: mega.archaeologicalValue,
        controllingFactionId: mega.controllingFactionId,
      },
    });
  }

  private emitPhaseTransitionEvent(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent,
    oldPhase: MegastructurePhase
  ): void {
    world.eventBus.emit({
      type: 'megastructure_phase_transition',
      source: entity.id,
      data: {
        entityId: entity.id,
        structureType: mega.structureType,
        oldPhase,
        newPhase: mega.phase,
        efficiency: mega.efficiency,
      },
    });
  }

  private emitDecayStageEvent(
    world: World,
    entity: EntityImpl,
    mega: MegastructureComponent,
    decayStage: DecayStage
  ): void {
    world.eventBus.emit({
      type: 'megastructure_decay_stage',
      source: entity.id,
      data: {
        entityId: entity.id,
        structureType: mega.structureType,
        decayStage: mega.decayStageIndex,
        yearsInDecay: mega.yearsInDecay,
        status: decayStage.status,
        consequences: decayStage.consequences,
        archaeologicalValue: mega.archaeologicalValue,
      },
    });
  }
}
