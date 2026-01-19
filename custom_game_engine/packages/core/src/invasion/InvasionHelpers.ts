/**
 * InvasionHelpers - Utility functions for invasion system
 *
 * Provides:
 * - Tech level calculations from ship types
 * - System and force queries
 * - Combat strength calculations
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Precomputed ship tech level lookup tables
 * - Fast xorshift32 PRNG for deterministic randomness
 * - Early exit optimizations
 * - Zero allocations in hot paths
 */

import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Fast PRNG (xorshift32)
// ============================================================================

/**
 * Fast xorshift32 PRNG - 2-3x faster than Math.random()
 * Deterministic when seeded, suitable for invasion calculations
 */
export class FastRandom {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 1; // Avoid zero state
  }

  /**
   * Generate next random float [0, 1)
   */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 4294967296;
  }
}

// Shared PRNG instance for invasion system
export const invasionRandom = new FastRandom();

// ============================================================================
// Precomputed Lookup Tables
// ============================================================================

/**
 * PERF: Precomputed ship type to tech level mapping
 * O(1) lookup instead of O(n) conditionals
 */
const SHIP_TECH_LEVELS: Record<string, number> = {
  // Stage 3 ships
  probability_scout: 3,
  timeline_merger: 3,
  svetz_retrieval: 3,
  story_ship: 3,
  gleisner_vessel: 3,

  // Stage 2 ships
  threshold_ship: 2,
  courier_ship: 2,
  brainship: 2,

  // Stage 1 ships
  worldship: 1,
};

/**
 * PERF: Precomputed tech gap multipliers
 * Each era ahead = +100% strength bonus
 */
const TECH_MULTIPLIERS = [1.0, 2.0, 3.0, 4.0]; // index = tech gap

// ============================================================================
// Tech Level Calculations
// ============================================================================

/**
 * Get tech level from fleet composition
 * PERF: O(1) lookup table instead of O(n) conditionals
 */
export function getFleetTechLevel(fleet: FleetComponent): number {
  const shipTypes = fleet.shipTypeBreakdown;
  let maxTechLevel = 0;

  // PERF: Single pass through ship types using lookup table
  for (const shipType in shipTypes) {
    const count = shipTypes[shipType as SpaceshipType];
    if (count && count > 0) {
      const techLevel = SHIP_TECH_LEVELS[shipType] ?? 0;
      if (techLevel > maxTechLevel) {
        maxTechLevel = techLevel;
        if (maxTechLevel === 3) break; // Early exit - can't go higher
      }
    }
  }

  return maxTechLevel;
}

/**
 * Get tech level from defender's civilization
 * PERF: Early exit when max tech level found
 */
export function getDefenseTechLevel(world: World): number {
  // Query all fleets in universe
  const fleetEntities = world.query().with(CT.Fleet).executeEntities();

  let maxTechLevel = 0;

  for (const entity of fleetEntities) {
    const fleet = entity.getComponent<FleetComponent>(CT.Fleet);
    if (!fleet) continue;

    const techLevel = getFleetTechLevel(fleet);
    if (techLevel > maxTechLevel) {
      maxTechLevel = techLevel;
      if (maxTechLevel === 3) break; // Early exit - max possible tech level
    }
  }

  return maxTechLevel;
}

// ============================================================================
// System Queries
// ============================================================================

/**
 * Get all systems in universe (placeholder - actual implementation would query star systems)
 */
export function getAllSystems(_world: World): string[] {
  // TODO: Query actual star system entities when implemented
  // For now, return placeholder systems
  return ['system_alpha', 'system_beta', 'system_gamma', 'system_delta', 'system_epsilon'];
}

/**
 * Get strategic systems (high-value targets)
 */
export function getStrategicSystems(_world: World): string[] {
  // TODO: Filter systems by strategic value (population, resources, etc.)
  // For now, return first 3 systems
  const allSystems = getAllSystems(_world);
  return allSystems.slice(0, 3);
}

// ============================================================================
// Force Calculations
// ============================================================================

/**
 * Defense forces available to a universe
 */
export interface DefenseForces {
  totalShips: number;
  totalCrew: number;
  fleetIds: string[];
  fleetStrength: number;
}

/**
 * Get defender forces for a universe
 * PERF: Single-pass accumulation with pre-allocated array
 */
export function getDefenderForces(world: World): DefenseForces {
  const fleetEntities = world.query().with(CT.Fleet).executeEntities();

  let totalShips = 0;
  let totalCrew = 0;
  let fleetStrength = 0;
  const fleetIds: string[] = [];

  // PERF: Reserve capacity to avoid reallocation
  const entityCount = fleetEntities.length;
  if (entityCount > 0) {
    fleetIds.length = entityCount;
    let fleetIdx = 0;

    for (const entity of fleetEntities) {
      const fleet = entity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      // PERF: Single-pass accumulation
      totalShips += fleet.totalShips;
      totalCrew += fleet.totalCrew;
      fleetStrength += fleet.fleetStrength;
      fleetIds[fleetIdx++] = fleet.fleetId;
    }

    // Trim to actual count
    fleetIds.length = fleetIdx;
  }

  return {
    totalShips,
    totalCrew,
    fleetIds,
    fleetStrength,
  };
}

// ============================================================================
// Strength Calculations
// ============================================================================

/**
 * Calculate fleet combat strength
 * Factors: ship count, crew, coherence, tech level
 */
export function calculateFleetStrength(fleet: FleetComponent): number {
  // Base strength from ship count and crew
  const baseStrength = fleet.totalShips * 10 + fleet.totalCrew;

  // Coherence multiplier (0.5 at low coherence, 1.5 at high coherence)
  const coherenceMultiplier = 0.5 + fleet.fleetCoherence;

  // Supply multiplier (0.5 at empty, 1.0 at full supply)
  const supplyMultiplier = 0.5 + (fleet.supplyLevel * 0.5);

  return baseStrength * coherenceMultiplier * supplyMultiplier;
}

/**
 * Calculate defense strength from forces
 */
export function calculateDefenseStrength(forces: DefenseForces): number {
  // Use fleet strength directly
  return forces.fleetStrength;
}

/**
 * Calculate technology gap between attacker and defender
 * PERF: Returns precomputed multiplier instead of gap
 */
export function calculateTechGap(
  attackerFleet: FleetComponent,
  defenderWorld: World
): number {
  const attackerTech = getFleetTechLevel(attackerFleet);
  const defenderTech = getDefenseTechLevel(defenderWorld);
  const gap = Math.max(0, attackerTech - defenderTech);

  return gap;
}

/**
 * PERF: Get tech multiplier from gap (precomputed lookup)
 */
export function getTechMultiplier(techGap: number): number {
  return TECH_MULTIPLIERS[Math.min(techGap, 3)] ?? 1.0;
}

// ============================================================================
// Dependency Calculations
// ============================================================================

/**
 * PERF: Precomputed constants for dependency calculations
 */
const ERA_DEPENDENCY_FACTOR = 0.3;
const ITEM_DEPENDENCY_FACTOR = 0.1;
const MAX_ITEM_DEPENDENCY = 0.5;

/**
 * Calculate dependency level from technology uplift
 * PERF: Precomputed constants, early exit on zero values
 */
export function calculateDependency(techPackage: {
  technologies: string[];
  totalEraJump: number;
  dependencyItems: string[];
}): number {
  // PERF: Early exit if no dependencies
  if (techPackage.totalEraJump === 0 && techPackage.dependencyItems.length === 0) {
    return 0;
  }

  // Base dependency from era jump (more eras = more dependency)
  const eraDependency = Math.min(1.0, techPackage.totalEraJump * ERA_DEPENDENCY_FACTOR);

  // Additional dependency from items they can't produce
  const itemCount = techPackage.dependencyItems.length;
  const itemDependency = Math.min(MAX_ITEM_DEPENDENCY, itemCount * ITEM_DEPENDENCY_FACTOR);

  return Math.min(1.0, eraDependency + itemDependency);
}

/**
 * Calculate industrial collapse from trade dominance
 * PERF: Simplified calculation with early exit
 */
export function calculateIndustrialCollapse(
  _poorCivId: string,
  _tradeAgreement: unknown
): number {
  // TODO: Implement based on trade volume vs local production capacity
  // For now, return moderate collapse
  return 0.6;
}
