/**
 * TradeEscortComponent - Fleet escort assignment for trade routes
 *
 * Allows fleets to protect trade caravans, reducing piracy risk and
 * improving trade efficiency. Connects fleet entities to trade routes.
 *
 * CLAUDE.md Compliance:
 * - Component type follows lowercase_with_underscores convention
 * - No silent fallbacks - all required fields must be present
 */

import type { Component } from '../ecs/Component.js';

/**
 * Trade Escort Component - Fleet protection for trade route
 */
export interface TradeEscortComponent extends Component {
  readonly type: 'trade_escort';
  readonly version: number;

  // ============================================================================
  // Identity
  // ============================================================================

  /** Fleet entity ID providing escort */
  fleetId: string;

  /** Trade route ID being protected */
  routeId: string;

  /** Current caravan being escorted (if assigned) */
  caravanId?: string;

  // ============================================================================
  // Escort Benefits
  // ============================================================================

  /**
   * Efficiency bonus applied to caravans (0.1-0.5)
   * 0.1 = 10% faster, 0.5 = 50% faster
   */
  escortBonus: number;

  /**
   * Protection level based on fleet strength
   * Higher values reduce pirate encounter risk
   */
  protectionLevel: number;

  // ============================================================================
  // Operating Costs
  // ============================================================================

  /** Fuel consumed per tick for escort duty */
  fuelCostPerTick: number;

  /** Tick when escort was assigned */
  assignedAt: number;
}

/**
 * Create a trade escort component
 *
 * @param fleetId - Fleet entity ID
 * @param routeId - Trade route ID
 * @param fleetStrength - Fleet combat strength (used to calculate bonuses)
 * @returns TradeEscortComponent
 */
export function createTradeEscort(
  fleetId: string,
  routeId: string,
  fleetStrength: number
): TradeEscortComponent {
  if (!fleetId) {
    throw new Error('fleetId is required for trade escort');
  }
  if (!routeId) {
    throw new Error('routeId is required for trade escort');
  }
  if (fleetStrength < 0) {
    throw new Error('fleetStrength must be non-negative');
  }

  // Calculate escort bonus: 10% base + up to 40% based on strength
  // Strength 1000 = 0.5 bonus (50% improvement)
  const escortBonus = Math.min(0.5, 0.1 + fleetStrength / 1000);

  // Protection level = fleet strength (reduces pirate risk)
  const protectionLevel = fleetStrength;

  // Fuel cost: 1% of fleet strength per tick
  const fuelCostPerTick = Math.ceil(fleetStrength / 100);

  return {
    type: 'trade_escort',
    version: 1,
    fleetId,
    routeId,
    escortBonus,
    protectionLevel,
    fuelCostPerTick,
    assignedAt: 0, // Set by system when assigned
  };
}
