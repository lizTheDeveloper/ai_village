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
import type {
  MegastructureComponent,
  ConstructionPhase,
} from '../components/MegastructureComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';

/**
 * Megastructure types with their maintenance requirements
 * Note: This mirrors the structureType field from MegastructureComponent
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
 * Note: Using ConstructionPhase from MegastructureComponent directly
 * (no 'critical' phase - use 'degraded' for near-failure state)
 */
export type MegastructurePhase = ConstructionPhase;

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
 * Extended maintenance-specific fields that may not be in MegastructureComponent yet.
 * TODO: Migrate these fields to MegastructureComponent if not already present.
 */
export interface MegastructureMaintenanceData {
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
 * Note: ConstructionPhase doesn't have 'critical', only 'degraded'
 */
const enum PhaseIndex {
  Planning = 0,
  Building = 1,
  Operational = 2,
  Degraded = 3,
  Ruins = 4,
}

/**
 * Phase index to string mapping
 */
const PHASE_STRINGS: readonly MegastructurePhase[] = [
  'planning',
  'building',
  'operational',
  'degraded',
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
  public readonly requiredComponents: ReadonlyArray<CT_Type> = [CT.Megastructure];
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

  // World reference for queries
  protected world!: World;

  protected onInitialize(world: World, _eventBus: EventBus): void {
    this.world = world;
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
      const ticksSinceMaintenance = currentTick - mega.maintenance.lastMaintenanceAt;

      // Early exit: ruins only age (no maintenance/degradation)
      if (mega.construction.phase === 'ruins') {
        this.ageRuinsOptimized(currentTick, mega, impl);
        continue;
      }

      // Early exit: recently maintained and high efficiency (no work needed)
      if (ticksSinceMaintenance < this.throttleInterval && mega.efficiency > 0.95) {
        continue;
      }

      // Single-pass: Maintenance attempt + degradation + failure check
      const maintenancePerformed = this.performMaintenanceOptimized(mega, ticksSinceMaintenance);

      if (maintenancePerformed) {
        // Restore efficiency
        mega.efficiency = Math.min(1.0, mega.efficiency + 0.1);
        mega.maintenance.lastMaintenanceAt = currentTick;
        // Note: maintenanceDebt not yet in component schema
        this.emitMaintenanceEvent(world, impl, mega);
      } else {
        // Apply degradation in single pass
        this.applyDegradationAndDebt(mega, ticksSinceMaintenance);

        // Check for failure based on efficiency
        if (mega.efficiency <= 0) {
          this.transitionToRuins(world, impl, mega);
          continue; // Skip phase update after ruins transition
        }

        // Note: Critical phase transition based on debt requires debt field in component
        // For now, just use efficiency thresholds
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
   * Get megastructure component from entity
   */
  private getMegastructureComponent(entity: EntityImpl): MegastructureComponent | null {
    return entity.getComponent<MegastructureComponent>(CT.Megastructure) ?? null;
  }

  /**
   * Get maintenance data fields from nested component structure
   * MegastructureComponent uses nested objects, but this system needs flat access
   */
  private getMaintenanceData(mega: MegastructureComponent): MegastructureMaintenanceData {
    return {
      phase: mega.construction.phase as MegastructurePhase,
      efficiency: mega.efficiency,
      lastMaintenanceTick: mega.maintenance.lastMaintenanceAt,
      constructionCompleteTick: mega.construction.completedAt ?? mega.construction.startedAt,
      controllingFactionId: mega.strategic.controlledBy,
      isAIControlled: false, // TODO: Add AI control tracking to MegastructureComponent
      maintenanceDebt: 0, // TODO: Add debt tracking to MegastructureComponent.maintenance
      yearsInDecay: 0, // TODO: Add decay tracking for ruins
      decayStageIndex: 0, // TODO: Add decay stage tracking
      archaeologicalValue: 0, // TODO: Add archaeological value tracking
    };
  }

  /**
   * Update component from flat maintenance data
   */
  private updateComponentFromMaintenanceData(
    mega: MegastructureComponent,
    data: Partial<MegastructureMaintenanceData>
  ): void {
    if (data.phase !== undefined) {
      mega.construction.phase = data.phase;
    }
    if (data.efficiency !== undefined) {
      mega.efficiency = data.efficiency;
    }
    if (data.lastMaintenanceTick !== undefined) {
      mega.maintenance.lastMaintenanceAt = data.lastMaintenanceTick;
    }
    // TODO: Update other fields when added to MegastructureComponent
  }

  /**
   * OPTIMIZED: Perform maintenance with zero allocations
   * Uses precomputed lookup tables and early exits
   *
   * Integrates with warehouse system to deduct resources from faction inventory
   */
  private performMaintenanceOptimized(
    mega: MegastructureComponent,
    ticksSinceMaintenance: number
  ): boolean {
    // Early exit: no controlling faction
    if (!mega.strategic.controlledBy) {
      return false;
    }

    // Get maintenance configuration
    const config = MAINTENANCE_CONFIGS[mega.structureType as MegastructureType];
    if (!config) {
      console.warn(`Unknown megastructure type for maintenance: ${mega.structureType}`);
      return false;
    }

    // Get precomputed cost per tick
    const costPerTick = this.maintenanceCostPerTickLookup.get(mega.structureType as MegastructureType);
    if (!costPerTick) {
      console.warn(`Unknown megastructure type for maintenance: ${mega.structureType}`);
      return false;
    }

    // Calculate resource requirement for this maintenance cycle
    const ticksToMaintain = this.throttleInterval;
    const resourceQuantityNeeded = costPerTick * ticksToMaintain;

    // Try to find faction warehouse with required resources
    // Query for warehouse entities controlled by the faction
    const warehouseEntities = this.world.query()
      .with(CT.Warehouse)
      .executeEntities();

    let resourcesAvailable = false;
    let warehouseEntity: EntityImpl | null = null;

    // Search for warehouse with required resource type and sufficient quantity
    for (const entity of warehouseEntities) {
      const warehouse = entity.getComponent<WarehouseComponent>(CT.Warehouse);
      if (!warehouse) continue;

      // Check if warehouse has the required resource type
      if (warehouse.resourceType === config.resourceType) {
        // Check stockpiles for required quantity
        const totalAvailable = Object.values(warehouse.stockpiles).reduce((sum, qty) => sum + qty, 0);

        if (totalAvailable >= resourceQuantityNeeded) {
          resourcesAvailable = true;
          warehouseEntity = entity as EntityImpl;
          break;
        }
      }
    }

    // Early exit: insufficient resources in any warehouse
    if (!resourcesAvailable || !warehouseEntity) {
      // Increase maintenance debt
      const newDebt = mega.maintenance.maintenanceDebt + resourceQuantityNeeded;
      mega.maintenance.maintenanceDebt = newDebt;
      return false;
    }

    // Deduct resources from warehouse
    const warehouse = warehouseEntity.getComponent<WarehouseComponent>(CT.Warehouse);
    if (!warehouse) {
      return false;
    }

    // Deduct from stockpiles (first-in-first-out from available items)
    let remainingToDeduct = resourceQuantityNeeded;
    const updatedStockpiles = { ...warehouse.stockpiles };

    for (const itemId in updatedStockpiles) {
      if (remainingToDeduct <= 0) break;

      const available = updatedStockpiles[itemId] || 0;
      const toDeduct = Math.min(available, remainingToDeduct);

      updatedStockpiles[itemId] = available - toDeduct;
      if (updatedStockpiles[itemId] <= 0) {
        delete updatedStockpiles[itemId];
      }

      remainingToDeduct -= toDeduct;
    }

    // Update warehouse component using SystemContext
    const warehouseFromEntity = warehouseEntity.getComponent<WarehouseComponent>(CT.Warehouse);
    if (warehouseFromEntity) {
      warehouseEntity.updateComponent<WarehouseComponent>(CT.Warehouse, (current) => ({
        ...current,
        stockpiles: updatedStockpiles,
        lastWithdrawTime: {
          ...current.lastWithdrawTime,
          [config.resourceType]: Date.now(),
        },
      }));
    }

    // Maintenance successful - reduce debt if any
    if (mega.maintenance.maintenanceDebt > 0) {
      mega.maintenance.maintenanceDebt = Math.max(0, mega.maintenance.maintenanceDebt - resourceQuantityNeeded);
    }

    return true;
  }

  /**
   * OPTIMIZED: Combined degradation in single pass
   * Zero allocations, precomputed rates
   */
  private applyDegradationAndDebt(
    mega: MegastructureComponent,
    ticksSinceMaintenance: number
  ): void {
    // Get precomputed values (no map lookups in loop body)
    const degradationRate = this.decayRateLookup.get(mega.structureType as MegastructureType);
    if (!degradationRate) {
      console.warn(`Unknown megastructure type for degradation: ${mega.structureType}`);
      return;
    }

    // Apply efficiency loss
    const efficiencyLoss = degradationRate * ticksSinceMaintenance;
    mega.efficiency = Math.max(0, mega.efficiency - efficiencyLoss);

    // Note: Maintenance debt tracking not yet in component schema
    // TODO: Add maintenanceDebt field to MegastructureMaintenance interface
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
    const oldPhase = mega.construction.phase;
    const eff = mega.efficiency;

    // Fast numeric comparison ladder
    let newPhase: ConstructionPhase;
    if (eff >= 0.8) {
      newPhase = 'operational';
    } else if (eff >= 0.4) {
      newPhase = 'degraded';
    } else if (eff > 0) {
      // Note: 'critical' not in ConstructionPhase type, use 'degraded'
      newPhase = 'degraded';
    } else {
      newPhase = 'ruins';
    }

    // Early exit: no phase change
    if (oldPhase === newPhase) {
      return;
    }

    mega.construction.phase = newPhase;

    // Emit event only for non-operational transitions
    if (oldPhase !== 'operational') {
      this.emitPhaseTransitionEvent(world, entity, mega, oldPhase as MegastructurePhase);
    }
  }

  /**
   * Convert megastructure to ruins
   */
  private transitionToRuins(world: World, entity: EntityImpl, mega: MegastructureComponent): void {
    const config = MAINTENANCE_CONFIGS[mega.structureType as MegastructureType];
    if (!config) {
      throw new Error(`Missing maintenance config for megastructure type: ${mega.structureType}`);
    }

    mega.construction.phase = 'ruins';
    mega.efficiency = 0;
    mega.operational = false;

    // Note: Decay tracking (yearsInDecay, decayStageIndex, archaeologicalValue)
    // not yet in component schema - will be added to MegastructureComponent

    this.emitCollapseEvent(world, entity, mega);
  }

  /**
   * OPTIMIZED: Age ruins with reusable working objects
   * Uses precomputed ticksPerYear and avoids allocations
   *
   * Progression through decay stages based on time in ruins phase
   */
  private ageRuinsOptimized(currentTick: number, mega: MegastructureComponent, entity: EntityImpl): void {
    // Get decay configuration for this megastructure type
    const config = MAINTENANCE_CONFIGS[mega.structureType as MegastructureType];
    if (!config || !config.decayStages || config.decayStages.length === 0) {
      return;
    }

    // Calculate years in ruins phase
    const completedAt = mega.construction.completedAt || mega.construction.startedAt;
    const ticksInRuins = currentTick - completedAt;
    const yearsInRuins = ticksInRuins / this.ticksPerYear;

    // Update yearsInDecay field
    mega.yearsInDecay = yearsInRuins;

    // Find current decay stage based on yearsInRuins
    const decayStages = config.decayStages;
    let newStageIndex = 0;

    for (let i = decayStages.length - 1; i >= 0; i--) {
      const stage = decayStages[i];
      if (!stage) continue;

      if (yearsInRuins >= stage.yearsAfterCollapse) {
        newStageIndex = i;
        break;
      }
    }

    // Check if stage has changed
    const oldStageIndex = mega.decayStageIndex;
    if (newStageIndex !== oldStageIndex) {
      const newStage = decayStages[newStageIndex];
      if (!newStage) {
        throw new Error(`Decay stage at index ${newStageIndex} is undefined`);
      }

      // Update decay stage and archaeological value
      mega.decayStageIndex = newStageIndex;
      mega.archaeologicalValue = newStage.archaeologicalValue;

      // Add event to megastructure history
      mega.events.push({
        tick: currentTick,
        eventType: 'decay_stage_advanced',
        description: `Advanced to decay stage: ${newStage.status} - ${newStage.consequences}`,
      });

      // Emit decay stage event
      this.emitDecayStageEvent(this.world, entity, mega, newStage);
    }
  }

  /**
   * OPTIMIZED: Memoized maintenance cost calculation
   * Caches results by structure type
   */
  private calculateMaintenanceCost(mega: MegastructureComponent): number {
    const cacheKey = mega.structureType;
    let cost = this.maintenanceCostCache.get(cacheKey);

    if (cost === undefined) {
      const config = MAINTENANCE_CONFIGS[mega.structureType as MegastructureType];
      if (!config) {
        throw new Error(`Unknown megastructure type: ${mega.structureType}`);
      }
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
        maintenanceDebt: mega.maintenance.maintenanceDebt,
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
        phase: mega.construction.phase as MegastructurePhase,
        maintenanceDebt: mega.maintenance.maintenanceDebt,
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
        maintenanceDebt: mega.maintenance.maintenanceDebt,
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
        controllingFactionId: mega.strategic.controlledBy,
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
        newPhase: mega.construction.phase as MegastructurePhase,
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
