/**
 * MegastructureComponent - Massive engineering projects at cosmic scale
 *
 * Megastructures represent the pinnacle achievements of advanced civilizations -
 * massive engineering projects that fundamentally transform their worlds, star
 * systems, or even galaxies.
 *
 * Categories:
 * - Orbital: Space stations, O'Neill cylinders, orbital rings (tech 7-8)
 * - Planetary: Terraformers, planet crackers, world engines (tech 8-9)
 * - Stellar: Dyson swarms, stellar engines, star lifters (tech 9-10)
 * - Galactic: Wormhole networks, Matrioshka brains, Birch worlds (tech 10)
 * - Transcendent: Universe engines, dimensional gates (tech 10+)
 *
 * Key Mechanics:
 * - Multi-stage construction over years to centuries
 * - Requires massive resource investment (65+ exotic materials)
 * - Continuous maintenance required (neglect leads to catastrophic failure)
 * - Strategic impact (enable new capabilities, reshape civilizations)
 *
 * Integration:
 * - Tracked in AbstractTier.preserved (hierarchy-simulator)
 * - Appears in PlanetTier, SystemTier, SectorTier, GalaxyTier
 * - Uses SpaceflightItems.ts production chain
 *
 * @see openspec/specs/grand-strategy/09-MEGASTRUCTURES.md
 * @see packages/hierarchy-simulator/
 */

import type { Component } from '../ecs/Component.js';

/**
 * Megastructure category (determines scale and capabilities)
 */
export type MegastructureCategory =
  | 'orbital'        // Planet orbit: space stations, O'Neill cylinders, orbital rings
  | 'planetary'      // Entire planet: terraformers, planet crackers, world engines
  | 'stellar'        // Star system: Dyson swarms, stellar engines, star lifters
  | 'galactic'       // Sector/Galaxy: wormhole networks, Matrioshka brains
  | 'transcendent';  // Multiverse: universe engines, dimensional gates

/**
 * Spatial tier where megastructure exists
 */
export type MegastructureTier = 'planet' | 'system' | 'sector' | 'galaxy';

/**
 * Construction phase status
 */
export type ConstructionPhase =
  | 'planning'      // Design and resource allocation
  | 'building'      // Active construction in progress
  | 'operational'   // Construction complete, fully functional
  | 'degraded'      // Maintenance lapsed, efficiency reduced
  | 'ruins';        // Catastrophic failure, archaeological remnant

/**
 * Location of megastructure (tier-dependent)
 */
export interface MegastructureLocation {
  systemId?: string;      // Star system ID (for stellar/orbital structures)
  planetId?: string;      // Planet ID (for planetary/orbital structures)
  sectorId?: string;      // Sector ID (for galactic structures)
  coordinates?: {         // 3D coordinates for precise positioning
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Construction status and progress tracking
 */
export interface MegastructureConstruction {
  phase: ConstructionPhase;
  progress: number;          // 0-1 (overall completion percentage)
  startedAt: number;         // tick when construction began
  completedAt?: number;      // tick when construction finished (if operational)

  // Resources invested during construction
  resourcesInvested: Record<string, number>;  // itemId → quantity
  laborInvested: number;                      // person-years accumulated
  energyInvested: number;                     // kWh accumulated
}

/**
 * Maintenance requirements and degradation tracking
 */
export interface MegastructureMaintenance {
  lastMaintenanceAt: number;                  // tick of last maintenance
  maintenanceCostPerYear: Record<string, number>; // itemId → quantity/year
  energyCostPerYear: number;                  // kW continuous power draw

  // Degradation without maintenance
  degradationRate: number;                    // % efficiency lost per year (0-1)
  failureTime: number;                        // years until catastrophic failure

  // Debt accumulation when maintenance cannot be performed
  maintenanceDebt: number;                    // Accumulated maintenance requirements (resource units)
}

/**
 * Strategic value and control
 */
export interface MegastructureStrategic {
  militaryValue: number;     // 1-10 (strategic military importance)
  economicValue: number;     // 1-10 (economic impact)
  culturalValue: number;     // 1-10 (cultural/symbolic significance)

  controlledBy?: string;     // Faction/civilization ID that controls this
  contested: boolean;        // Is this being fought over?
}

/**
 * Historical event tracking
 */
export interface MegastructureEvent {
  tick: number;
  eventType: string;         // 'construction_started', 'phase_completed', 'maintenance_lapsed', etc.
  description: string;
}

/**
 * MegastructureComponent - Attached to entities or tracked in spatial tiers
 */
export interface MegastructureComponent extends Component {
  type: 'megastructure';

  // ============================================================================
  // IDENTITY
  // ============================================================================

  /** Unique ID for this megastructure */
  megastructureId: string;

  /** Human-readable name ("New Eden Orbital Ring", "Sol Dyson Swarm") */
  name: string;

  /** Category determines scale and tech requirements */
  category: MegastructureCategory;

  /** Specific structure type within category */
  structureType: string;  // 'dyson_swarm', 'wormhole_gate', 'space_station', etc.

  // ============================================================================
  // LOCATION
  // ============================================================================

  /** Spatial tier (planet/system/sector/galaxy) */
  tier: MegastructureTier;

  /** Location within that tier */
  location: MegastructureLocation;

  // ============================================================================
  // CONSTRUCTION
  // ============================================================================

  /** Construction status and progress */
  construction: MegastructureConstruction;

  // ============================================================================
  // OPERATIONAL STATUS
  // ============================================================================

  /** Is this megastructure currently operational? */
  operational: boolean;

  /** Current efficiency (0-1, reduced by maintenance lapses) */
  efficiency: number;

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  /** Maintenance requirements and degradation */
  maintenance: MegastructureMaintenance;

  // ============================================================================
  // RUINS TRACKING
  // ============================================================================

  /** Years spent in decay (ruins phase only) */
  yearsInDecay: number;

  /** Current decay stage index (ruins phase only) */
  decayStageIndex: number;

  /** Archaeological value for ruins excavation (ruins phase only) */
  archaeologicalValue: number;

  // ============================================================================
  // CAPABILITIES
  // ============================================================================

  /**
   * Structure-specific capabilities
   *
   * Examples:
   * - Dyson swarm: { energyOutput: 3.8e26, collectorCount: 10000000 }
   * - Wormhole: { sourceSystem: "Sol", destSystem: "Alpha Centauri", travelTime: 1 }
   * - Terraformer: { targetAtmosphere: {...}, estimatedYears: 500 }
   * - Space station: { populationCapacity: 1000, dockingPorts: 4 }
   */
  capabilities: Record<string, unknown>;

  // ============================================================================
  // STRATEGIC
  // ============================================================================

  /** Strategic value and control */
  strategic: MegastructureStrategic;

  // ============================================================================
  // HISTORY
  // ============================================================================

  /** Historical events for this megastructure */
  events: MegastructureEvent[];
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new megastructure component
 */
export function createMegastructureComponent(config: {
  megastructureId: string;
  name: string;
  category: MegastructureCategory;
  structureType: string;
  tier: MegastructureTier;
  location: MegastructureLocation;
  currentTick: number;
  capabilities?: Record<string, unknown>;
}): MegastructureComponent {
  return {
    type: 'megastructure',
    version: 1,
    megastructureId: config.megastructureId,
    name: config.name,
    category: config.category,
    structureType: config.structureType,
    tier: config.tier,
    location: config.location,
    construction: {
      phase: 'planning',
      progress: 0,
      startedAt: config.currentTick,
      resourcesInvested: {},
      laborInvested: 0,
      energyInvested: 0,
    },
    operational: false,
    efficiency: 1.0,
    maintenance: {
      lastMaintenanceAt: config.currentTick,
      maintenanceCostPerYear: {},
      energyCostPerYear: 0,
      degradationRate: 0.01,  // 1% efficiency loss per year (default)
      failureTime: 100,       // 100 years until failure (default)
      maintenanceDebt: 0,     // No debt initially
    },
    yearsInDecay: 0,          // Not in decay initially
    decayStageIndex: 0,       // No decay stage initially
    archaeologicalValue: 0,   // No archaeological value initially
    capabilities: config.capabilities || {},
    strategic: {
      militaryValue: 1,
      economicValue: 1,
      culturalValue: 1,
      contested: false,
    },
    events: [
      {
        tick: config.currentTick,
        eventType: 'planning_started',
        description: `Planning for ${config.name} initiated`,
      },
    ],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Start construction phase
 */
export function startConstruction(
  megastructure: MegastructureComponent,
  tick: number
): void {
  megastructure.construction.phase = 'building';
  megastructure.events.push({
    tick,
    eventType: 'construction_started',
    description: `Construction of ${megastructure.name} has begun`,
  });
}

/**
 * Update construction progress
 */
export function updateConstructionProgress(
  megastructure: MegastructureComponent,
  progressDelta: number,
  tick: number
): void {
  // Early exit: check phase first (cheapest condition)
  if (megastructure.construction.phase !== 'building') {
    throw new Error('Cannot update progress - megastructure is not in building phase');
  }

  // Inline Math.min for hot path
  const newProgress = megastructure.construction.progress + progressDelta;
  megastructure.construction.progress = newProgress > 1.0 ? 1.0 : newProgress;

  // Check if construction is complete (avoid function call overhead if not complete)
  if (newProgress >= 1.0) {
    completeConstruction(megastructure, tick);
  }
}

/**
 * Complete construction and make operational
 */
export function completeConstruction(
  megastructure: MegastructureComponent,
  tick: number
): void {
  megastructure.construction.phase = 'operational';
  megastructure.construction.progress = 1.0;
  megastructure.construction.completedAt = tick;
  megastructure.operational = true;
  megastructure.efficiency = 1.0;

  megastructure.events.push({
    tick,
    eventType: 'construction_completed',
    description: `${megastructure.name} construction completed - now operational`,
  });
}

/**
 * Perform maintenance (resets degradation)
 */
export function performMaintenance(
  megastructure: MegastructureComponent,
  tick: number
): void {
  megastructure.maintenance.lastMaintenanceAt = tick;
  megastructure.efficiency = 1.0;

  if (megastructure.construction.phase === 'degraded') {
    megastructure.construction.phase = 'operational';
  }

  megastructure.events.push({
    tick,
    eventType: 'maintenance_performed',
    description: `Maintenance completed on ${megastructure.name}`,
  });
}

// Precomputed constant for degradation threshold
const DEGRADATION_THRESHOLD = 0.8;

/**
 * Apply degradation due to lack of maintenance
 */
export function applyDegradation(
  megastructure: MegastructureComponent,
  yearsPassed: number,
  tick: number
): void {
  // Early exit: only operational structures degrade (cheapest check first)
  if (!megastructure.operational) {
    return;
  }

  const efficiencyLoss = megastructure.maintenance.degradationRate * yearsPassed;
  const newEfficiency = megastructure.efficiency - efficiencyLoss;

  // Inline Math.max for hot path
  megastructure.efficiency = newEfficiency > 0 ? newEfficiency : 0;

  // Check thresholds in order of severity (catastrophic first to avoid unnecessary phase change)
  if (newEfficiency <= 0) {
    catastrophicFailure(megastructure, tick);
  } else if (newEfficiency < DEGRADATION_THRESHOLD) {
    megastructure.construction.phase = 'degraded';
  }
}

/**
 * Catastrophic failure (structure becomes ruins)
 */
export function catastrophicFailure(
  megastructure: MegastructureComponent,
  tick: number
): void {
  megastructure.construction.phase = 'ruins';
  megastructure.operational = false;
  megastructure.efficiency = 0;

  megastructure.events.push({
    tick,
    eventType: 'catastrophic_failure',
    description: `${megastructure.name} has suffered catastrophic failure - now ruins`,
  });
}

/**
 * Add resources to construction
 */
export function addResources(
  megastructure: MegastructureComponent,
  resources: Record<string, number>
): void {
  for (const [itemId, quantity] of Object.entries(resources)) {
    megastructure.construction.resourcesInvested[itemId] =
      (megastructure.construction.resourcesInvested[itemId] || 0) + quantity;
  }
}

/**
 * Add labor to construction
 */
export function addLabor(
  megastructure: MegastructureComponent,
  personYears: number
): void {
  megastructure.construction.laborInvested += personYears;
}

/**
 * Add energy to construction
 */
export function addEnergy(
  megastructure: MegastructureComponent,
  kWh: number
): void {
  megastructure.construction.energyInvested += kWh;
}

/**
 * Check if megastructure is contested
 */
export function isContested(megastructure: MegastructureComponent): boolean {
  return megastructure.strategic.contested;
}

/**
 * Set megastructure control
 */
export function setControl(
  megastructure: MegastructureComponent,
  civilizationId: string,
  tick: number
): void {
  const previousController = megastructure.strategic.controlledBy;
  megastructure.strategic.controlledBy = civilizationId;

  if (previousController && previousController !== civilizationId) {
    megastructure.events.push({
      tick,
      eventType: 'control_changed',
      description: `Control of ${megastructure.name} transferred from ${previousController} to ${civilizationId}`,
    });
  }
}

/**
 * Calculate total strategic value
 */
export function getTotalStrategicValue(megastructure: MegastructureComponent): number {
  return megastructure.strategic.militaryValue +
         megastructure.strategic.economicValue +
         megastructure.strategic.culturalValue;
}

// Reusable empty object to avoid allocations for non-operational structures
const EMPTY_CAPABILITIES: Record<string, unknown> = {};

/**
 * Get effective capabilities (reduced by efficiency)
 */
export function getEffectiveCapabilities(
  megastructure: MegastructureComponent
): Record<string, unknown> {
  // Early exit: non-operational structures have no capabilities
  if (!megastructure.operational) {
    return EMPTY_CAPABILITIES;
  }

  // Cache efficiency to avoid repeated property access
  const efficiency = megastructure.efficiency;
  const effective: Record<string, unknown> = {};

  // Use for-in loop (faster than Object.entries for small objects)
  for (const key in megastructure.capabilities) {
    const value = megastructure.capabilities[key];
    // Type check inlined
    effective[key] = typeof value === 'number' ? value * efficiency : value;
  }

  return effective;
}
