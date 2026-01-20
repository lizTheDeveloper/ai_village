/**
 * MiningOperationComponent - Tracks resource extraction operations
 *
 * Attached to entities representing mining operations at stellar phenomena or planets.
 * Handles resource harvesting, stockpile management, and transport logistics.
 *
 * Used by StellarMiningSystem to:
 * - Calculate harvest rates based on tech level and difficulty
 * - Accumulate resources in stockpile
 * - Trigger transport missions when stockpile is full
 * - Transfer resources to civilization warehouses
 *
 * See: packages/core/src/systems/StellarMiningSystem.ts
 */

import type { Component } from '../ecs/Component.js';

/**
 * Mining operation at a stellar phenomenon or planet
 */
export interface MiningOperationComponent extends Component {
  type: 'mining_operation';

  // ========== Location ==========

  /** Location being mined (stellar phenomenon or planet ID) */
  locationId: string;

  /** Location type */
  locationType: 'stellar_phenomenon' | 'planet';

  /** Resource being extracted */
  resourceType: string;

  /** Civilization/nation conducting the operation */
  civilizationId: string;

  // ========== Fleet Assignment ==========

  /** Ship entity IDs assigned to this operation */
  assignedShips: string[];

  /** Total crew assigned (from all ships) */
  totalCrew: number;

  /** Mining equipment quality (0-1, from ships and tech) */
  equipmentQuality: number;

  // ========== Extraction Parameters ==========

  /** Base harvest rate (units per tick, from resource definition) */
  baseHarvestRate: number;

  /** Extraction difficulty (0-1, from resource definition) */
  difficulty: number;

  /** Required tech level for efficient extraction */
  requiredTechLevel: number;

  /** Civilization's current tech level */
  civilizationTechLevel: number;

  /** Mining efficiency (0-1, calculated from tech level vs required) */
  efficiency: number;

  /** Actual harvest rate (baseHarvestRate × efficiency × shipBonuses) */
  actualHarvestRate: number;

  // ========== Stockpile ==========

  /** Current stockpile (units) */
  stockpile: number;

  /** Stockpile capacity before transport required */
  stockpileCapacity: number;

  /** Total harvested since operation started */
  totalHarvested: number;

  /** Total shipped to civilization (via transport missions) */
  totalShipped: number;

  // ========== Operation Status ==========

  /** Operation status */
  status: 'active' | 'paused' | 'depleted' | 'abandoned';

  /** Tick when operation started */
  startTick: number;

  /** Tick when operation ended (null if ongoing) */
  endTick: number | null;

  /** Estimated remaining resources at location (null = infinite/unknown) */
  estimatedRemaining: number | null;

  // ========== Transport ==========

  /** Pending transport mission IDs */
  pendingTransportMissions: string[];

  /** Last stockpile full notification tick */
  lastStockpileFullNotificationTick: number;
}

/**
 * Create a mining operation component
 */
export function createMiningOperationComponent(
  locationId: string,
  locationType: 'stellar_phenomenon' | 'planet',
  resourceType: string,
  civilizationId: string,
  baseHarvestRate: number,
  difficulty: number,
  civilizationTechLevel: number,
  startTick: number
): MiningOperationComponent {
  // Calculate required tech level from difficulty
  const requiredTechLevel = 9 + difficulty * 3;

  // Calculate initial efficiency
  const efficiency = calculateMiningEfficiency(requiredTechLevel, civilizationTechLevel);

  return {
    type: 'mining_operation',
    version: 1,
    locationId,
    locationType,
    resourceType,
    civilizationId,
    assignedShips: [],
    totalCrew: 0,
    equipmentQuality: 0.5, // Default, updated when ships assigned
    baseHarvestRate,
    difficulty,
    requiredTechLevel,
    civilizationTechLevel,
    efficiency,
    actualHarvestRate: 0, // Calculated when ships assigned
    stockpile: 0,
    stockpileCapacity: 1000, // Default capacity
    totalHarvested: 0,
    totalShipped: 0,
    status: 'active',
    startTick,
    endTick: null,
    estimatedRemaining: null,
    pendingTransportMissions: [],
    lastStockpileFullNotificationTick: 0,
  };
}

/**
 * Calculate mining efficiency based on tech level
 *
 * If civilizationTechLevel < requiredTechLevel:
 *   - Exponential penalty: efficiency = max(0.01, exp(-deficit × 0.5))
 * If civilizationTechLevel >= requiredTechLevel:
 *   - Diminishing returns: efficiency = min(1.0, 0.6 + surplus × 0.2)
 */
export function calculateMiningEfficiency(
  requiredTechLevel: number,
  civilizationTechLevel: number
): number {
  if (civilizationTechLevel < requiredTechLevel) {
    // Below required tech - exponential penalty
    const deficit = requiredTechLevel - civilizationTechLevel;
    return Math.max(0.01, Math.exp(-deficit * 0.5));
  }

  // At or above required tech - diminishing returns
  const surplus = civilizationTechLevel - requiredTechLevel;
  return Math.min(1.0, 0.6 + surplus * 0.2);
}

/**
 * Calculate actual harvest rate including ship bonuses
 *
 * actualHarvestRate = baseHarvestRate × efficiency × equipmentBonus × crewBonus
 */
export function calculateActualHarvestRate(operation: MiningOperationComponent): number {
  // Equipment bonus: 0.5x to 1.5x based on quality
  const equipmentBonus = 0.5 + operation.equipmentQuality;

  // Crew bonus: +0.1% per crew member (diminishing returns)
  const crewBonus = 1.0 + Math.log(1 + operation.totalCrew * 0.001);

  return (
    operation.baseHarvestRate *
    operation.efficiency *
    equipmentBonus *
    crewBonus
  );
}

/**
 * Assign ships to mining operation
 */
export function assignShipsToMining(
  operation: MiningOperationComponent,
  shipIds: string[],
  totalCrew: number,
  averageEquipmentQuality: number
): void {
  operation.assignedShips.push(...shipIds);
  operation.totalCrew += totalCrew;

  // Update equipment quality (weighted average)
  const totalShips = operation.assignedShips.length;
  operation.equipmentQuality =
    (operation.equipmentQuality * (totalShips - shipIds.length) +
      averageEquipmentQuality * shipIds.length) /
    totalShips;

  // Recalculate harvest rate
  operation.actualHarvestRate = calculateActualHarvestRate(operation);
}

/**
 * Remove ships from mining operation
 */
export function removeShipsFromMining(
  operation: MiningOperationComponent,
  shipIds: string[],
  removedCrew: number
): void {
  for (const shipId of shipIds) {
    const index = operation.assignedShips.indexOf(shipId);
    if (index !== -1) {
      operation.assignedShips.splice(index, 1);
    }
  }

  operation.totalCrew = Math.max(0, operation.totalCrew - removedCrew);

  // Recalculate harvest rate
  operation.actualHarvestRate = calculateActualHarvestRate(operation);

  // If no ships assigned, pause operation
  if (operation.assignedShips.length === 0) {
    operation.status = 'paused';
  }
}

/**
 * Process harvesting for one tick
 * Returns amount harvested this tick
 */
export function processHarvesting(operation: MiningOperationComponent): number {
  if (operation.status !== 'active') {
    return 0;
  }

  const harvested = operation.actualHarvestRate;

  operation.stockpile += harvested;
  operation.totalHarvested += harvested;

  // Check if estimated remaining depleted
  if (operation.estimatedRemaining !== null) {
    operation.estimatedRemaining -= harvested;
    if (operation.estimatedRemaining <= 0) {
      operation.status = 'depleted';
      operation.estimatedRemaining = 0;
    }
  }

  return harvested;
}

/**
 * Check if stockpile is full
 */
export function isStockpileFull(operation: MiningOperationComponent): boolean {
  return operation.stockpile >= operation.stockpileCapacity;
}

/**
 * Transfer stockpile to civilization (via transport)
 */
export function transferStockpile(
  operation: MiningOperationComponent,
  amountTransferred: number
): void {
  if (amountTransferred > operation.stockpile) {
    throw new Error(
      `Cannot transfer ${amountTransferred} units, stockpile only has ${operation.stockpile}`
    );
  }

  operation.stockpile -= amountTransferred;
  operation.totalShipped += amountTransferred;
}
