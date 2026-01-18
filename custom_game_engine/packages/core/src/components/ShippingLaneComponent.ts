/**
 * ShippingLaneComponent - Physical trade route infrastructure
 *
 * Phase 2 of Grand Strategy Abstraction Layer (07-TRADE-LOGISTICS.md)
 *
 * Represents shipping lanes - major trade corridors that aggregate multiple
 * individual trade routes. Links to TradeAgreementSystem for formal agreements.
 *
 * Key features:
 * - Physical route properties (distance, travel time, passage crossings)
 * - Traffic management (active caravans, flow rates, capacity)
 * - Hazard tracking (pirates, weather, monsters, passage instability)
 * - Economic modeling (toll rates, ownership)
 * - Status tracking (active, blocked, contested, abandoned)
 *
 * CLAUDE.md Compliance:
 * - Component type follows lowercase_with_underscores convention
 * - No silent fallbacks - all required fields must be present
 */

import type { EntityId } from '../types.js';

/**
 * Shipping Lane Component - Physical trade route
 */
export interface ShippingLaneComponent {
  readonly type: 'shipping_lane';
  readonly version: number;

  // ============================================================================
  // Identity
  // ============================================================================

  /** Unique lane identifier */
  laneId: string;

  /** Human-readable name (e.g., "Northern Trade Corridor") */
  name: string;

  // ============================================================================
  // Endpoints
  // ============================================================================

  /** Origin settlement/station */
  originId: EntityId;
  originPosition: { x: number; y: number };

  /** Destination settlement/station */
  destinationId: EntityId;
  destinationPosition: { x: number; y: number };

  // ============================================================================
  // Physical Properties
  // ============================================================================

  /** Distance in world units */
  distance: number;

  /** Base travel time in ticks (without hazards/congestion) */
  travelTimeTicks: number;

  /**
   * Passage IDs if route crosses universe boundaries
   * Empty array for intra-universe routes
   */
  passageIds: string[];

  // ============================================================================
  // Traffic
  // ============================================================================

  /** Entity IDs of caravans/ships currently in transit on this lane */
  activeCaravans: EntityId[];

  /** Current aggregate flow rate (goods per tick) */
  flowRate: number;

  /** Maximum flow rate capacity (goods per tick) */
  capacity: number;

  // ============================================================================
  // Hazards
  // ============================================================================

  /** Active hazards affecting this lane */
  hazards: LaneHazard[];

  /** Safety rating (0-1, 1 = perfectly safe) */
  safetyRating: number;

  // ============================================================================
  // Economics
  // ============================================================================

  /** Toll cost per unit of goods transported */
  tollRate: number;

  /** Civilization/entity that controls this lane (collects tolls, enforces rules) */
  controlledBy?: EntityId;

  // ============================================================================
  // Status
  // ============================================================================

  /** Current operational status */
  status: 'active' | 'blocked' | 'contested' | 'abandoned';

  /** Last tick when a caravan used this lane */
  lastUsedTick: number;
}

/**
 * Lane Hazard - Dangers affecting the shipping lane
 */
export interface LaneHazard {
  /** Type of hazard */
  type: 'pirates' | 'weather' | 'monsters' | 'passage_instability';

  /** Severity (0-1, 1 = maximum danger) */
  severity: number;

  /** Specific location of hazard (optional, for localized threats) */
  location?: { x: number; y: number };

  /** When this hazard expires (optional, for temporary conditions) */
  activeUntilTick?: number;
}
