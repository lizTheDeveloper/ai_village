/**
 * TradeCaravanComponent - Active trade shipment in transit
 *
 * Phase 2 of Grand Strategy Abstraction Layer (07-TRADE-LOGISTICS.md)
 *
 * Represents a caravan or ship actively transporting goods along a shipping lane.
 * Links to both ShippingLaneComponent (physical route) and TradeAgreementSystem
 * (formal agreement being fulfilled).
 *
 * Key features:
 * - Progress tracking along lane (0 = origin, 1 = destination)
 * - Cargo manifest with item types and quantities
 * - Protection (escorts, guards)
 * - Status monitoring (traveling, delayed, attacked, arrived, lost)
 * - Time estimation (departure, expected arrival)
 *
 * CLAUDE.md Compliance:
 * - Component type follows lowercase_with_underscores convention
 * - No silent fallbacks - all required fields must be present
 */

import type { EntityId } from '../types.js';

/**
 * Trade Caravan Component - Shipment in transit
 */
export interface TradeCaravanComponent {
  readonly type: 'trade_caravan';

  // ============================================================================
  // Identity
  // ============================================================================

  /** Unique caravan identifier */
  caravanId: string;

  /** Shipping lane this caravan is traveling on */
  laneId: string;

  /** Trade agreement being fulfilled by this shipment */
  agreementId: string;

  // ============================================================================
  // Position & Movement
  // ============================================================================

  /**
   * Progress along the lane
   * 0.0 = at origin
   * 1.0 = at destination
   */
  progress: number;

  /**
   * Speed (progress per tick)
   * Example: 0.01 = completes journey in 100 ticks
   */
  speed: number;

  // ============================================================================
  // Cargo
  // ============================================================================

  /** Items being transported */
  cargo: CargoItem[];

  /** Total value of cargo (for insurance, piracy calculations) */
  cargoValue: number;

  // ============================================================================
  // Protection
  // ============================================================================

  /** Escort ships protecting this caravan (Ship domain entity IDs) */
  escortShipIds: EntityId[];

  /** Guard agents accompanying this caravan (Agent entity IDs) */
  guardAgentIds: EntityId[];

  // ============================================================================
  // Status
  // ============================================================================

  /** Current status */
  status: 'traveling' | 'delayed' | 'attacked' | 'arrived' | 'lost';

  /** Tick when caravan departed origin */
  departedTick: number;

  /** Estimated arrival tick (based on speed, adjusted for hazards) */
  expectedArrivalTick: number;
}

/**
 * Cargo Item - Individual item in caravan manifest
 */
export interface CargoItem {
  /** Item type identifier */
  itemId: string;

  /** Quantity being transported */
  quantity: number;
}
