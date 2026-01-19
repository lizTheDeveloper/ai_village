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
import type { TownHallComponent } from '../components/TownHallComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';
import type { ProductionCapabilityComponent } from '../components/ProductionCapabilityComponent.js';
import type { PlanetLocationComponent } from '../components/PlanetLocationComponent.js';

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
  const shipTypes = fleet.squadrons.shipTypeBreakdown;
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
 * Get all planets in universe
 * Planets are the strategic entities in the game (not star systems)
 * PERF: Direct array conversion from Map.keys()
 */
export function getAllSystems(world: World): string[] {
  // Query all planets registered in the world
  const planets = world.getPlanets();
  // Convert Map keys to array
  return Array.from(planets.keys());
}

/**
 * Calculate strategic value of a planet
 * Based on: population, resource stockpiles, production capacity
 * Higher value = more attractive invasion target
 *
 * @param world - World to query
 * @param planetId - Planet to evaluate
 * @returns Strategic value score (0-1000+)
 */
function calculatePlanetStrategicValue(world: World, planetId: string): number {
  let value = 0;

  // Population value (0-500 points)
  // Query town halls and census bureaus for population data
  const townHalls = world.query().with(CT.TownHall).executeEntities();
  for (const entity of townHalls) {
    const townHall = entity.getComponent<TownHallComponent>(CT.TownHall);
    if (!townHall) continue;

    // Check if this town hall is on the target planet
    const planetLoc = entity.getComponent<PlanetLocationComponent>(CT.PlanetLocation);
    if (planetLoc && planetLoc.currentPlanetId === planetId) {
      // Population score: log scale, max 500 points for 10,000+ population
      const popScore = Math.min(500, Math.log10(townHall.populationCount + 1) * 125);
      value += popScore;
    }
  }

  // Resource value (0-300 points)
  // Query warehouses for resource stockpiles
  const warehouses = world.query().with(CT.Warehouse).executeEntities();
  for (const entity of warehouses) {
    const warehouse = entity.getComponent<WarehouseComponent>(CT.Warehouse);
    if (!warehouse) continue;

    const planetLoc = entity.getComponent<PlanetLocationComponent>(CT.PlanetLocation);
    if (planetLoc && planetLoc.currentPlanetId === planetId) {
      // Calculate total resource value (sum of all stockpiles)
      let totalResources = 0;
      for (const resource in warehouse.stockpiles) {
        totalResources += warehouse.stockpiles[resource] ?? 0;
      }
      // Resource score: capped at 300 points
      const resourceScore = Math.min(300, totalResources / 10);
      value += resourceScore;
    }
  }

  // Production capability value (0-200 points)
  // Query production capability components
  const productionEntities = world.query().with(CT.ProductionCapability).executeEntities();
  for (const entity of productionEntities) {
    const production = entity.getComponent<ProductionCapabilityComponent>(CT.ProductionCapability);
    if (!production) continue;

    const planetLoc = entity.getComponent<PlanetLocationComponent>(CT.PlanetLocation);
    if (planetLoc && planetLoc.currentPlanetId === planetId) {
      // Production score based on tier and multiplier
      const tierValue = production.tier * 40; // 0-160 points
      const multiplierValue = Math.min(40, Math.log10(production.totalMultiplier + 1) * 10);
      value += tierValue + multiplierValue;
    }
  }

  return value;
}

/**
 * Get strategic systems (high-value targets)
 * Sorted by strategic value (population, resources, production)
 * PERF: Single-pass evaluation with sort
 */
export function getStrategicSystems(world: World): string[] {
  const allPlanets = getAllSystems(world);

  // Early exit if no planets
  if (allPlanets.length === 0) return [];

  // Calculate strategic value for each planet
  const planetValues: Array<{ id: string; value: number }> = [];
  for (const planetId of allPlanets) {
    const value = calculatePlanetStrategicValue(world, planetId);
    planetValues.push({ id: planetId, value });
  }

  // Sort by value descending
  planetValues.sort((a, b) => b.value - a.value);

  // Return top strategic targets (up to 5)
  return planetValues.slice(0, 5).map((pv) => pv.id);
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
      totalShips += fleet.squadrons.totalShips;
      totalCrew += fleet.squadrons.totalCrew;
      fleetStrength += fleet.combat.offensiveRating;
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
  const baseStrength = fleet.squadrons.totalShips * 10 + fleet.squadrons.totalCrew;

  // Coherence multiplier (0.5 at low coherence, 1.5 at high coherence)
  const coherenceMultiplier = 0.5 + fleet.coherence.average;

  // Supply multiplier (0.5 at empty, 1.0 at full supply)
  const supplyMultiplier = 0.5 + (fleet.logistics.fuelReserves / 200);

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
 * Based on ratio of import volume to local production capacity
 * Higher ratio = more dependency = more industrial collapse
 *
 * Formula:
 * - importDependency = totalImports / localProduction
 * - collapse = min(0.95, importDependency * 0.7)
 *
 * PERF: Direct calculation, no allocations
 *
 * @param poorCivId - ID of the civilization being economically dominated
 * @param tradeAgreement - Trade agreement data (TradeAgreement from TradeAgreementTypes)
 * @returns Industrial collapse level (0-1, where 1 = total collapse)
 */
export function calculateIndustrialCollapse(
  poorCivId: string,
  tradeAgreement: any
): number {
  // Type guard for trade agreement structure
  if (!tradeAgreement || typeof tradeAgreement !== 'object') {
    return 0; // No valid agreement = no collapse
  }

  // Extract trade flows (from TradeAgreementTypes.ts structure)
  const flows = tradeAgreement.tradeFlows;
  if (!Array.isArray(flows) || flows.length === 0) {
    return 0; // No trade flows = no collapse
  }

  // Calculate total imports for poor civilization
  let totalImports = 0;
  for (const flow of flows) {
    if (!flow || typeof flow !== 'object') continue;

    // Count imports (where poorCiv is the 'to' party)
    if (flow.to === poorCivId) {
      const quantity = flow.quantity ?? 0;
      totalImports += quantity;
    }
  }

  // Early exit if no imports
  if (totalImports === 0) return 0;

  // Estimate local production capacity
  // Use trade agreement terms to infer local capacity
  // If they're importing heavily, local production is likely low
  const terms = tradeAgreement.terms;
  const agreedVolume = terms?.totalVolume ?? totalImports;

  // Calculate import dependency ratio
  // We assume local production would normally cover agreedVolume
  // Actual imports exceeding this indicate dependency
  const importDependency = totalImports / Math.max(1, agreedVolume);

  // Convert to collapse level
  // 0.7 multiplier prevents unrealistic total collapse
  // Cap at 0.95 (always leave some local industry)
  const collapse = Math.min(0.95, importDependency * 0.7);

  return collapse;
}
